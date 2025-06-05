import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Tipos
export interface MenuItem {
	label: string;
	href: string;
	icon: string;
	roles: ('admin' | 'vendor')[];
	badge?: number;
	badgeKey?: string;
	children?: MenuItem[];
	category?: string;
}

export interface MenuStats {
	products: { total: number; active: number; pending: number };
	orders: { total: number; pending: number };
	users: { total: number; customers: number; vendors: number };
	reviews: { total: number; pending: number };
	returns: { total: number; pending: number };
	coupons: { total: number; active: number };
	categories: { total: number; active: number };
	pages: { total: number; published: number };
	wishlists: { total: number; public: number };
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

// Inicializar com dados mock
export const mockStats: MenuStats = {
	products: { total: 247, active: 189, pending: 12 },
	orders: { total: 1543, pending: 23 },
	users: { total: 8920, customers: 8456, vendors: 464 },
	reviews: { total: 2891, pending: 8 },
	returns: { total: 156, pending: 5 },
	coupons: { total: 45, active: 32 },
	categories: { total: 89, active: 67 },
	pages: { total: 24, published: 18 },
	wishlists: { total: 156, public: 89 }
};

menuStats.set(mockStats);

// Menu items base com categorias
export const baseMenuItems: MenuItem[] = [
	// Principal
	{ label: 'Dashboard', href: '/', icon: '🏠', roles: ['admin', 'vendor'], category: 'main' },
	
	// E-commerce
	{ label: 'Produtos', href: '/produtos', icon: '📦', roles: ['admin', 'vendor'], badgeKey: 'products.total', category: 'ecommerce' },
	{ label: 'Pedidos', href: '/pedidos', icon: '📋', roles: ['admin', 'vendor'], badgeKey: 'orders.pending', category: 'ecommerce' },
	{ label: 'Categorias', href: '/categorias', icon: '📁', roles: ['admin'], badgeKey: 'categories.active', category: 'ecommerce' },
	{ label: 'Marcas', href: '/marcas', icon: '🏷️', roles: ['admin'], category: 'ecommerce' },
	{ label: 'Cupons', href: '/cupons', icon: '🎟️', roles: ['admin', 'vendor'], badgeKey: 'coupons.active', category: 'ecommerce' },
	
	// Clientes e Vendedores
	{ label: 'Usuários', href: '/usuarios', icon: '👥', roles: ['admin'], category: 'users' },
	{ label: 'Vendedores', href: '/vendedores', icon: '🏪', roles: ['admin'], category: 'users' },
	{ label: 'Avaliações', href: '/avaliacoes', icon: '⭐', roles: ['admin', 'vendor'], badgeKey: 'reviews.total', category: 'users' },
	{ label: 'Listas de Presentes', href: '/listas-presentes', icon: '🎁', roles: ['admin'], badgeKey: 'wishlists.total', category: 'users' },
	
	// Vendas e Entregas
	{ label: 'Devoluções', href: '/devolucoes', icon: '↩️', roles: ['admin', 'vendor'], badgeKey: 'returns.pending', category: 'sales' },
	{ label: 'Frete', href: '/frete', icon: '🚚', roles: ['admin'], category: 'sales' },
	{ label: 'Modalidades de Frete', href: '/modalidades-frete', icon: '⚙️', roles: ['admin'], category: 'sales' },
	{ label: 'Transportadoras', href: '/transportadoras', icon: '🚐', roles: ['admin'], category: 'sales' },
	{ label: 'Zonas de Frete', href: '/zonas', icon: '🌍', roles: ['admin'], category: 'sales' },
	{ label: 'Tarifas Base', href: '/tarifas', icon: '💰', roles: ['admin'], category: 'sales' },
	{ label: 'Envios', href: '/envios', icon: '📤', roles: ['admin'], category: 'sales' },
	{ label: 'Cotações', href: '/cotacoes', icon: '📄', roles: ['admin'], category: 'sales' },
	
	// Financeiro e Pagamento
	{ label: 'Financeiro', href: '/financeiro', icon: '💳', roles: ['admin'], category: 'financial' },
	{ label: 'Métodos de Pagamento', href: '/metodos-pagamento', icon: '💵', roles: ['admin'], category: 'financial' },
	
	// Análises
	{ label: 'Relatórios', href: '/relatorios', icon: '📊', roles: ['admin'], category: 'analytics' },
	
	// Sistema
	{ label: 'Integrações', href: '/integracoes', icon: '🔗', roles: ['admin'], category: 'system' },
	{ label: 'Páginas', href: '/paginas', icon: '📝', roles: ['admin'], badgeKey: 'pages.total', category: 'system' },
	{ label: 'Configurações', href: '/configuracoes', icon: '⚙️', roles: ['admin'], category: 'system' }
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