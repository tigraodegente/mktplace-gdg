<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import ModernIcon from './ModernIcon.svelte';
	
	// Stores
	import { 
		menuState,
		menuSettings,
		menuStats,
		searchQuery,
		baseMenuItems,
		menuActions,
		getStatValue,
		formatBadgeNumber,
		type MenuItem
	} from '$lib/stores/menuStore';

	// Props
	interface Props {
		user?: any;
		isOpen?: boolean;
	}
	
	let { user = null, isOpen = $bindable(false) }: Props = $props();

	// Estados locais
	let expandedSections = $state<Set<string>>(new Set(['principal']));
	let searchTerm = $state('');

	// Filtrar itens do menu baseado no role do usuário
	const filteredMenuItems = $derived(
		user ? baseMenuItems.filter(item => {
			// super_admin tem acesso a tudo que admin tem
			if (user.role === 'super_admin') {
				return item.roles.includes('admin');
			}
			return item.roles.includes(user.role as 'admin' | 'vendor' | 'super_admin');
		}) : []
	);

	// Menu items com badges dinâmicos
	const menuItemsWithBadges = $derived(filteredMenuItems.map(item => ({
		...item,
		badge: item.badgeKey && $menuStats ? getStatValue($menuStats, item.badgeKey) : undefined,
		isFavorite: $menuSettings.favorites.includes(item.href)
	})));

	// Filtrar por busca
	const searchedItems = $derived(searchTerm.trim() 
		? menuItemsWithBadges.filter(item => 
			item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
			item.category?.toLowerCase().includes(searchTerm.toLowerCase())
		)
		: menuItemsWithBadges);

	// Agrupar por categoria
	const categorizedItems = $derived(searchedItems.reduce((acc, item) => {
		const category = item.category || 'other';
		if (!acc[category]) acc[category] = [];
		acc[category].push(item);
		return acc;
	}, {} as Record<string, typeof menuItemsWithBadges>));

	// Nomes das categorias
	const categoryNames: Record<string, string> = {
		main: 'Principal',
		ecommerce: 'E-commerce', 
		users: 'Usuários',
		sales: 'Vendas',
		financial: 'Financeiro',
		analytics: 'Relatórios',
		system: 'Sistema',
		other: 'Outros'
	};

	// Verificar rota ativa
	function isActiveRoute(href: string): boolean {
		if (href === '/') return $page.url.pathname === href;
		return $page.url.pathname.startsWith(href);
	}

	// Toggle favorito
	function toggleFavorite(href: string, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		menuActions.toggleFavorite(href);
	}

	// Fechar menu
	function closeMenu() {
		isOpen = false;
	}

	// Navegar e fechar
	function navigateAndClose() {
		isOpen = false;
	}
</script>

<!-- Menu Lateral -->
{#if isOpen}
	<!-- Backdrop para mobile -->
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
		on:click={closeMenu}
		transition:fade={{ duration: 300 }}
	></div>

	<!-- Menu Panel -->
	<div 
		class="fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white/95 backdrop-blur-xl border-r border-white/20 shadow-2xl flex flex-col z-50"
		transition:fly={{ x: -288, duration: 400, easing: cubicOut }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200/50 bg-gradient-to-r from-[#00BFB3]/10 to-transparent">
			<div class="flex items-center gap-3">
				<div class="w-10 lg:w-12 h-10 lg:h-12 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-xl flex items-center justify-center text-white font-bold text-lg lg:text-xl">
					G
				</div>
				<div>
					<h1 class="text-base lg:text-lg font-bold text-gray-900">Admin Panel</h1>
					<p class="text-xs lg:text-sm text-gray-500">Marketplace GDG</p>
				</div>
			</div>
			<button
				on:click={closeMenu}
				class="p-2 rounded-lg hover:bg-gray-100 text-slate-600 hover:text-slate-900 transition-all duration-200"
				title="Fechar Menu"
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Search Bar -->
		<div class="p-3 lg:p-4 border-b border-gray-200/50">
			<div class="relative">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Buscar no menu..."
					class="w-full px-3 lg:px-4 py-2 lg:py-3 pl-8 lg:pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors text-sm"
				/>
				<svg class="absolute left-2 lg:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 lg:space-y-4">
			{#if searchTerm.trim()}
				<!-- Resultados da busca -->
				<div class="space-y-2">
					<h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
						Resultados ({searchedItems.length})
					</h3>
					{#each searchedItems as item}
						<a
							href={item.href}
							on:click={navigateAndClose}
							class="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl text-slate-700 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 transition-all duration-200 {isActiveRoute(item.href) ? 'bg-gradient-to-r from-[#00BFB3]/20 to-[#00BFB3]/10 text-[#00BFB3] font-semibold border-l-4 border-[#00BFB3]' : ''}"
						>
							<span class="text-base lg:text-lg">{item.icon}</span>
							<span class="flex-1 text-sm lg:text-base">{item.label}</span>
							
							<!-- Favorito -->
							<button
								on:click={(e) => toggleFavorite(item.href, e)}
								class="p-1 rounded-lg hover:bg-gray-200 transition-colors {item.isFavorite ? 'text-yellow-500' : 'text-gray-400'}"
								title={item.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
							>
								<span class="text-sm">{item.isFavorite ? '⭐' : '☆'}</span>
							</button>
							
							{#if item.badge && item.badge > 0}
								<div class="px-2 py-1 bg-[#00BFB3] text-white text-xs rounded-full font-semibold min-w-[1.5rem] text-center">
									{formatBadgeNumber(item.badge)}
								</div>
							{/if}
						</a>
					{/each}
				</div>
			{:else}
				<!-- Menu por categorias -->
				{#each Object.entries(categorizedItems) as [category, items]}
					{#if items.length > 0}
						<div class="space-y-2">
							<h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
								{categoryNames[category] || category}
							</h3>
							{#each items as item}
								<a
									href={item.href}
									on:click={navigateAndClose}
									class="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl text-slate-700 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 transition-all duration-200 {isActiveRoute(item.href) ? 'bg-gradient-to-r from-[#00BFB3]/20 to-[#00BFB3]/10 text-[#00BFB3] font-semibold border-l-4 border-[#00BFB3]' : ''}"
								>
									<span class="text-base lg:text-lg">{item.icon}</span>
									<span class="flex-1 text-sm lg:text-base">{item.label}</span>
									
									<!-- Favorito -->
									<button
										on:click={(e) => toggleFavorite(item.href, e)}
										class="p-1 rounded-lg hover:bg-gray-200 transition-colors {item.isFavorite ? 'text-yellow-500' : 'text-gray-400'}"
										title={item.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
									>
										<span class="text-sm">{item.isFavorite ? '⭐' : '☆'}</span>
									</button>
									
									{#if item.badge && item.badge > 0}
										<div class="px-2 py-1 bg-[#00BFB3] text-white text-xs rounded-full font-semibold min-w-[1.5rem] text-center">
											{formatBadgeNumber(item.badge)}
										</div>
									{/if}
								</a>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</nav>

		<!-- Footer de Configurações -->
		<div class="p-3 lg:p-4 border-t border-gray-200/50 bg-gradient-to-r from-slate-50/50 to-transparent space-y-2">
			<!-- Configurações -->
			<div class="grid grid-cols-2 gap-2">
				<button
					on:click={menuActions.toggleAutoHide}
					class="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-all duration-200 {$menuSettings.autoHide ? 'bg-[#00BFB3]/10 text-[#00BFB3]' : ''}"
					title="Auto-esconder menu"
				>
					<span>{$menuSettings.autoHide ? '🔒' : '🔓'}</span>
					<span class="hidden lg:inline">Auto-hide</span>
				</button>
				
				<button
					on:click={menuActions.toggleQuickAccess}
					class="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-all duration-200 {$menuSettings.quickAccess ? 'bg-[#00BFB3]/10 text-[#00BFB3]' : ''}"
					title="Quick access no hover"
				>
					<span>⚡</span>
					<span class="hidden lg:inline">Quick</span>
				</button>
			</div>
		</div>
	</div>
{/if} 