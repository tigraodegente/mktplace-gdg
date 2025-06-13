import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Tipos
export interface MenuItem {
	label: string;
	href: string;
	icon: string;
	roles: ('admin' | 'vendor' | 'super_admin')[];
	badge?: number;
	badgeKey?: string;
	children?: MenuItem[];
	category?: string;
}

export interface MenuStats {
	products: { total: number; active: number; pending: number; low_stock: number };
	stock: { alerts: number; low_stock: number; out_of_stock: number; critical: number };
	orders: { total: number; pending: number; processing: number; shipped: number };
	users: { total: number; customers: number; vendors: number; new_today: number };
	reviews: { total: number; pending: number; flagged: number; unread: number };
	returns: { total: number; pending: number; approved: number; critical: number };
	coupons: { total: number; active: number; expiring: number; used_today: number };
	categories: { total: number; active: number; trending: number };
	pages: { total: number; published: number; draft: number; needs_review: number };
	wishlists: { total: number; public: number; shared_today: number };
	banners: { total: number; active: number; expiring: number; low_performance: number };
	newsletter: { subscribers: number; active: number; unsubscribed_today: number; campaigns: number };
	analytics: { alerts: number; reports_pending: number; insights: number };
	financial: { transactions_pending: number; payouts_pending: number; disputes: number };
	logs: { today: number; errors: number; warnings: number; critical: number };
	system: { integrations_down: number; api_errors: number; performance_issues: number };
	ai: { pending_approvals: number; providers_down: number; analysis_queue: number; failed_enrichments: number };
	translations: { pending: number; failed: number; queued: number; completed_today: number };
	webhooks: { failed: number; queued: number; active: number; errors_today: number };
}

export type MenuState = 'hidden' | 'floating' | 'overlay' | 'minimized';

export interface MenuPosition {
	x: number;
	y: number;
}

export interface MenuSettings {
	autoHide: boolean;
	quickAccess: boolean;
	position: MenuPosition;
	favorites: string[];
}

// Funções de localStorage
function loadSettings(): MenuSettings {
	if (!browser) return getDefaultSettings();
	
	try {
		const saved = localStorage.getItem('gdg-menu-settings');
		if (saved) {
			return { ...getDefaultSettings(), ...JSON.parse(saved) };
		}
	} catch (error) {
		console.warn('Erro ao carregar configurações do menu:', error);
	}
	
	return getDefaultSettings();
}

function saveSettings(settings: MenuSettings) {
	if (!browser) return;
	
	try {
		localStorage.setItem('gdg-menu-settings', JSON.stringify(settings));
	} catch (error) {
		console.warn('Erro ao salvar configurações do menu:', error);
	}
}

function getDefaultSettings(): MenuSettings {
	return {
		autoHide: false,
		quickAccess: true,
		position: { x: 0, y: 100 },
		favorites: ['/produtos', '/pedidos', '/usuarios']
	};
}

// Estados do menu
export const menuState = writable<MenuState>('floating');
export const menuSettings = writable<MenuSettings>(loadSettings());
export const menuStats = writable<MenuStats | null>(null);
export const searchQuery = writable<string>('');
export const isAutoHideActive = writable<boolean>(false);
export const lastActivity = writable<number>(Date.now());

// Estados derivados
export const isAutoHide = writable(false);
export const quickAccessVisible = writable(true);
export const isMobileMenuOpen = writable(false);

// Sincronizar settings com localStorage
menuSettings.subscribe(settings => {
	saveSettings(settings);
});

// Inicializar com dados mock dinâmicos
export const mockStats: MenuStats = {
	products: { total: 2847, active: 2189, pending: 42, low_stock: 15 },
	stock: { alerts: 23, low_stock: 15, out_of_stock: 8, critical: 3 },
	orders: { total: 15432, pending: 89, processing: 156, shipped: 234 },
	users: { total: 89203, customers: 84560, vendors: 4643, new_today: 12 },
	reviews: { total: 28915, pending: 47, flagged: 8, unread: 23 },
	returns: { total: 1567, pending: 34, approved: 12, critical: 5 },
	coupons: { total: 245, active: 132, expiring: 8, used_today: 45 },
	categories: { total: 189, active: 167, trending: 12 },
	pages: { total: 124, published: 98, draft: 18, needs_review: 8 },
	wishlists: { total: 1567, public: 890, shared_today: 23 },
	banners: { total: 45, active: 32, expiring: 3, low_performance: 7 },
	newsletter: { subscribers: 45832, active: 43291, unsubscribed_today: 12, campaigns: 8 },
	analytics: { alerts: 5, reports_pending: 3, insights: 12 },
	financial: { transactions_pending: 67, payouts_pending: 23, disputes: 4 },
	logs: { today: 2847, errors: 12, warnings: 45, critical: 2 },
	system: { integrations_down: 1, api_errors: 8, performance_issues: 3 },
	ai: { pending_approvals: 15, providers_down: 0, analysis_queue: 43, failed_enrichments: 3 },
	translations: { pending: 127, failed: 5, queued: 89, completed_today: 234 },
	webhooks: { failed: 8, queued: 23, active: 156, errors_today: 12 }
};

menuStats.set(mockStats);

// Menu items com ícones ModernIcon e badges inteligentes
export const baseMenuItems: MenuItem[] = [
	// Principal
	{ label: 'Dashboard', href: '/', icon: 'Home', roles: ['admin', 'vendor'], category: 'main' },
	
	// E-commerce
	{ label: 'Produtos', href: '/produtos', icon: 'Package', roles: ['admin', 'vendor'], badgeKey: 'products.pending', category: 'ecommerce' },
	{ label: 'Variações', href: '/variacoes', icon: 'Settings', roles: ['admin', 'vendor'], category: 'ecommerce' },
	{ label: 'Estoque', href: '/estoque', icon: 'BarChart3', roles: ['admin', 'vendor'], badgeKey: 'stock.alerts', category: 'ecommerce' },
	{ label: 'Pedidos', href: '/pedidos', icon: 'ShoppingCart', roles: ['admin', 'vendor'], badgeKey: 'orders.pending', category: 'ecommerce' },
	{ label: 'Categorias', href: '/categorias', icon: 'Folder', roles: ['admin'], badgeKey: 'categories.trending', category: 'ecommerce' },
	{ label: 'Marcas', href: '/marcas', icon: 'Tag', roles: ['admin'], category: 'ecommerce' },
	{ label: 'Cupons', href: '/cupons', icon: 'Ticket', roles: ['admin', 'vendor'], badgeKey: 'coupons.expiring', category: 'ecommerce' },
	
	// Clientes e Vendedores
	{ label: 'Usuários', href: '/usuarios', icon: 'Users', roles: ['admin'], badgeKey: 'users.new_today', category: 'users' },
	{ label: 'Vendedores', href: '/vendedores', icon: 'Store', roles: ['admin'], category: 'users' },
	{ label: 'Avaliações', href: '/avaliacoes', icon: 'Star', roles: ['admin', 'vendor'], badgeKey: 'reviews.pending', category: 'users' },
	{ label: 'Listas de Presentes', href: '/listas-presentes', icon: 'Gift', roles: ['admin'], badgeKey: 'wishlists.shared_today', category: 'users' },
	
	// Vendas e Entregas
	{ label: 'Devoluções', href: '/devolucoes', icon: 'RotateCcw', roles: ['admin', 'vendor'], badgeKey: 'returns.critical', category: 'sales' },
	{ label: 'Armazéns', href: '/armazens', icon: 'Warehouse', roles: ['admin'], category: 'sales' },
	{ label: 'Frete', href: '/frete', icon: 'Truck', roles: ['admin'], category: 'sales' },
	{ label: 'Modalidades de Frete', href: '/modalidades-frete', icon: 'Settings', roles: ['admin'], category: 'sales' },
	{ label: 'Configurações de Frete', href: '/configuracoes-frete', icon: 'Wrench', roles: ['admin'], category: 'sales' },
	{ label: 'Transportadoras', href: '/transportadoras', icon: 'Truck', roles: ['admin'], category: 'sales' },
	{ label: 'Zonas de Frete', href: '/zonas', icon: 'Globe', roles: ['admin'], category: 'sales' },
	{ label: 'Tarifas Base', href: '/tarifas', icon: 'DollarSign', roles: ['admin'], category: 'sales' },
	{ label: 'Envios', href: '/envios', icon: 'Send', roles: ['admin'], badgeKey: 'orders.shipped', category: 'sales' },
	{ label: 'Cotações', href: '/cotacoes', icon: 'FileText', roles: ['admin'], category: 'sales' },
	
	// Financeiro e Pagamento
	{ label: 'Financeiro', href: '/financeiro', icon: 'CreditCard', roles: ['admin'], badgeKey: 'financial.transactions_pending', category: 'financial' },
	{ label: 'Métodos de Pagamento', href: '/metodos-pagamento', icon: 'DollarSign', roles: ['admin'], category: 'financial' },
	
	// Marketing
	{ label: 'Banners', href: '/banners', icon: 'Image', roles: ['admin'], badgeKey: 'banners.expiring', category: 'marketing' },
	{ label: 'Newsletter', href: '/newsletter', icon: 'Mail', roles: ['admin'], badgeKey: 'newsletter.unsubscribed_today', category: 'marketing' },
	
	// Análises
	{ label: 'Relatórios', href: '/relatorios', icon: 'BarChart3', roles: ['admin'], badgeKey: 'analytics.reports_pending', category: 'analytics' },
	{ label: 'Analytics Vendedores', href: '/analytics-vendedores', icon: 'TrendingUp', roles: ['admin'], badgeKey: 'analytics.insights', category: 'analytics' },
	{ label: 'Dashboard Financeiro', href: '/dashboard-financeiro', icon: 'PieChart', roles: ['admin'], badgeKey: 'financial.payouts_pending', category: 'analytics' },
	
	// Sistema
	{ label: 'Integrações', href: '/integracoes', icon: 'Link', roles: ['admin'], badgeKey: 'system.integrations_down', category: 'system' },
	{ label: 'Páginas', href: '/paginas', icon: 'FileText', roles: ['admin'], badgeKey: 'pages.needs_review', category: 'system' },
	{ label: 'Page Builder', href: '/paginas/builder', icon: 'Palette', roles: ['admin'], category: 'system' },
	{ label: 'Logs & Auditoria', href: '/logs', icon: 'Search', roles: ['admin'], badgeKey: 'logs.critical', category: 'system' },
	{ label: 'Configurações', href: '/configuracoes', icon: 'Settings', roles: ['admin'], badgeKey: 'system.performance_issues', category: 'system' },
	
	// Funcionalidades IA
	{ label: 'Campos Virtuais', href: '/campos-virtuais', icon: 'Cpu', roles: ['admin'], category: 'ai' },
	{ label: 'Aprovação IA', href: '/aprovacao-ia', icon: 'CheckCircle', roles: ['admin'], badgeKey: 'ai.pending_approvals', category: 'ai' },
	{ label: 'Multi-idiomas', href: '/multi-idiomas', icon: 'Globe', roles: ['admin'], badgeKey: 'translations.pending', category: 'ai' },
	{ label: 'Webhooks', href: '/webhooks', icon: 'Webhook', roles: ['admin'], badgeKey: 'webhooks.failed', category: 'ai' },
	{ label: 'Prompts Vendedores', href: '/prompts-vendedores', icon: 'MessageSquare', roles: ['admin'], category: 'ai' },
	{ label: 'Provedores IA', href: '/provedores-ia', icon: 'Bot', roles: ['admin'], badgeKey: 'ai.providers_down', category: 'ai' }
];

// Funções auxiliares
export function getStatValue(stats: MenuStats, path: string): number {
	const keys = path.split('.');
	let value: any = stats;
	for (const key of keys) {
		value = value?.[key];
	}
	return typeof value === 'number' ? value : 0;
}

export function formatBadgeNumber(num: number): string {
	if (num >= 1000000) {
		return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
	} else if (num >= 1000) {
		return (num / 1000).toFixed(1).replace('.0', '') + 'K';
	}
	return num.toString();
}

// Ações do menu
export const menuActions = {
	toggle: () => {
		menuState.update(state => {
			switch (state) {
				case 'hidden':
					return 'floating';
				case 'floating':
					return 'overlay';
				case 'overlay':
					return 'minimized';
				case 'minimized':
					return 'hidden';
				default:
					return 'floating';
			}
		});
	},
	
	show: () => menuState.set('overlay'),
	hide: () => menuState.set('hidden'),
	minimize: () => menuState.set('minimized'),
	setFloating: () => menuState.set('floating'),
	
	toggleMobile: () => {
		isMobileMenuOpen.update(open => !open);
	},
	
	closeMobile: () => {
		isMobileMenuOpen.set(false);
	},
	
	// Funcionalidades avançadas
	updatePosition: (position: MenuPosition) => {
		menuSettings.update(settings => ({
			...settings,
			position
		}));
	},
	
	toggleAutoHide: () => {
		menuSettings.update(settings => ({
			...settings,
			autoHide: !settings.autoHide
		}));
	},
	
	toggleQuickAccess: () => {
		menuSettings.update(settings => ({
			...settings,
			quickAccess: !settings.quickAccess
		}));
	},
	
	toggleFavorite: (href: string) => {
		menuSettings.update(settings => {
			const favorites = [...settings.favorites];
			const index = favorites.indexOf(href);
			
			if (index >= 0) {
				favorites.splice(index, 1);
			} else {
				favorites.push(href);
			}
			
			return {
				...settings,
				favorites
			};
		});
	},
	
	updateActivity: () => {
		lastActivity.set(Date.now());
		if (browser) {
			isAutoHideActive.set(false);
		}
	}
}; 