<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';
	
	// Stores
	import { 
		menuState, 
		menuSettings,
		menuStats,
		searchQuery,
		isAutoHideActive,
		lastActivity,
		baseMenuItems,
		menuActions,
		getStatValue,
		formatBadgeNumber,
		type MenuItem,
		type MenuPosition
	} from '$lib/stores/menuStore';

	// Props
	export let user: any = null;

	// Estados locais
	let showMenu = false;
	let buttonPosition = { x: 0, y: 0 };
	let isDragging = false;
	let dragStart = { x: 0, y: 0, buttonX: 0, buttonY: 0 };
	let hovering = false;
	let autoHideTimer: number;
	let searchInput = '';

	// Menu items filtrados por role
	$: filteredMenuItems = user ? baseMenuItems.filter(item => item.roles.includes(user.role)) : [];

	// Menu items com badges dinâmicos
	$: menuItemsWithBadges = filteredMenuItems.map(item => ({
		...item,
		badge: item.badgeKey && $menuStats ? getStatValue($menuStats, item.badgeKey) : undefined,
		isFavorite: $menuSettings.favorites.includes(item.href)
	}));

	// Filtrar por busca
	$: searchedItems = searchInput.trim() 
		? menuItemsWithBadges.filter(item => 
			item.label.toLowerCase().includes(searchInput.toLowerCase()) ||
			item.category?.toLowerCase().includes(searchInput.toLowerCase())
		)
		: menuItemsWithBadges;

	// Quick access items (favoritos + mais usados)
	$: quickAccessItems = menuItemsWithBadges
		.filter(item => $menuSettings.favorites.includes(item.href))
		.slice(0, 6);

	// Agrupar por categoria
	$: categorizedItems = searchedItems.reduce((acc, item) => {
		const category = item.category || 'other';
		if (!acc[category]) acc[category] = [];
		acc[category].push(item);
		return acc;
	}, {} as Record<string, typeof menuItemsWithBadges>);

	// Nomes das categorias
	const categoryNames = {
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

	// Toggle menu principal
	function toggleMenu() {
		showMenu = !showMenu;
		if (showMenu) {
			menuActions.updateActivity();
		}
	}

	// Toggle menu minimizado
	function toggleMinimized() {
		$menuState = $menuState === 'minimized' ? 'floating' : 'minimized';
		menuActions.updateActivity();
	}

	// Drag functionality
	function handleDragStart(e: MouseEvent | TouchEvent) {
		isDragging = true;
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		
		dragStart = {
			x: clientX,
			y: clientY,
			buttonX: buttonPosition.x,
			buttonY: buttonPosition.y
		};
		
		menuActions.updateActivity();
		e.preventDefault();
	}

	function handleDragMove(e: MouseEvent | TouchEvent) {
		if (!isDragging) return;
		
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		
		buttonPosition.x = dragStart.buttonX + (clientX - dragStart.x);
		buttonPosition.y = dragStart.buttonY + (clientY - dragStart.y);
		
		// Manter dentro dos limites da tela
		const margin = 10;
		buttonPosition.x = Math.max(margin, Math.min(window.innerWidth - 80, buttonPosition.x));
		buttonPosition.y = Math.max(margin, Math.min(window.innerHeight - 80, buttonPosition.y));
		
		e.preventDefault();
	}

	function handleDragEnd() {
		if (isDragging) {
			isDragging = false;
			// Salvar nova posição
			menuActions.updatePosition({ x: buttonPosition.x, y: buttonPosition.y });
		}
	}

	// Auto-hide functionality
	function startAutoHide() {
		if (!$menuSettings.autoHide) return;
		
		clearTimeout(autoHideTimer);
		autoHideTimer = setTimeout(() => {
			if (!hovering && !showMenu && $menuState === 'floating') {
				isAutoHideActive.set(true);
			}
		}, 3000);
	}

	function stopAutoHide() {
		clearTimeout(autoHideTimer);
		isAutoHideActive.set(false);
	}

	// Activity tracking
	function updateActivity() {
		menuActions.updateActivity();
		stopAutoHide();
		startAutoHide();
	}

	// Toggle favorito
	function toggleFavorite(href: string, e: Event) {
		e.preventDefault();
		e.stopPropagation();
		menuActions.toggleFavorite(href);
	}

	onMount(() => {
		// Carregar posição salva ou usar padrão
		const savedPosition = $menuSettings.position;
		if (savedPosition.x === 0 && savedPosition.y === 100) {
			// Primeira vez - posicionar no canto direito
			buttonPosition.x = window.innerWidth - 100;
			buttonPosition.y = 100;
			menuActions.updatePosition(buttonPosition);
		} else {
			buttonPosition = { ...savedPosition };
		}
		
		// Activity listeners para auto-hide
		const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
		events.forEach(event => {
			document.addEventListener(event, updateActivity, true);
		});

		// Drag listeners
		document.addEventListener('mousemove', handleDragMove);
		document.addEventListener('mouseup', handleDragEnd);
		document.addEventListener('touchmove', handleDragMove);
		document.addEventListener('touchend', handleDragEnd);

		// Auto-hide inicial
		startAutoHide();

		return () => {
			clearTimeout(autoHideTimer);
			events.forEach(event => {
				document.removeEventListener(event, updateActivity, true);
			});
			document.removeEventListener('mousemove', handleDragMove);
			document.removeEventListener('mouseup', handleDragEnd);
			document.removeEventListener('touchmove', handleDragMove);
			document.removeEventListener('touchend', handleDragEnd);
		};
	});
</script>

<!-- Botão Flutuante Principal -->
<div 
	class="fixed z-50 transition-all duration-300 {$isAutoHideActive ? 'opacity-30 scale-90' : 'opacity-100 scale-100'}"
	style="left: {buttonPosition.x}px; top: {buttonPosition.y}px;"
	class:cursor-grabbing={isDragging}
>
	<button
		on:click={toggleMenu}
		on:mousedown={handleDragStart}
		on:touchstart={handleDragStart}
		on:mouseenter={() => { hovering = true; stopAutoHide(); }}
		on:mouseleave={() => { hovering = false; startAutoHide(); }}
		class="w-16 h-16 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/20 flex items-center justify-center relative"
		title="Menu Principal (arraste para mover)"
	>
		<!-- Ícone Hambúrguer -->
		<div class="flex flex-col gap-1">
			<div class="w-5 h-0.5 bg-white rounded-full transition-all duration-300"></div>
			<div class="w-5 h-0.5 bg-white rounded-full transition-all duration-300"></div>
			<div class="w-5 h-0.5 bg-white rounded-full transition-all duration-300"></div>
		</div>
		
		<!-- Badge de notificação -->
		{#if $menuStats?.orders?.pending && $menuStats.orders.pending > 0}
			<div class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
				{$menuStats.orders.pending > 99 ? '99+' : $menuStats.orders.pending}
			</div>
		{/if}
	</button>

	<!-- Quick Access Panel (no hover) -->
	{#if hovering && $menuSettings.quickAccess && quickAccessItems.length > 0 && !isDragging && !showMenu}
		<div 
			class="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 flex flex-col gap-2"
			transition:fly={{ y: 20, duration: 300, easing: backOut }}
		>
			{#each quickAccessItems as item, index}
				<a
					href={item.href}
					class="relative w-12 h-12 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur-md border border-white/20 text-slate-700 hover:text-[#00BFB3] transition-all duration-300 hover:scale-110 hover:shadow-lg {isActiveRoute(item.href) ? 'bg-gradient-to-br from-[#00BFB3] to-[#00A89D] text-white' : ''}"
					title={item.label}
					style="transition-delay: {index * 50}ms"
					transition:scale={{ duration: 200, delay: index * 50 }}
				>
					<span class="text-lg">{item.icon}</span>
					{#if item.badge && item.badge > 0}
						<div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border border-white">
							{item.badge > 9 ? '9+' : item.badge}
						</div>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>

<!-- Menu Minimizado -->
{#if $menuState === 'minimized'}
	<div 
		class="fixed left-2 top-1/2 transform -translate-y-1/2 z-50 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-2 space-y-2 flex flex-col items-center"
		transition:fly={{ x: -100, duration: 300 }}
	>
		<!-- Botão para expandir -->
		<button
			on:click={toggleMinimized}
			class="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#00BFB3] to-[#00A89D] text-white hover:scale-105 transition-all duration-200"
			title="Expandir Menu"
		>
			<span class="text-lg">📋</span>
		</button>
		
		<!-- Quick access compacto -->
		{#each quickAccessItems.slice(0, 4) as item}
			<a
				href={item.href}
				class="relative w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 transition-all duration-200 {isActiveRoute(item.href) ? 'bg-gradient-to-br from-[#00BFB3] to-[#00A89D] text-white' : ''}"
				title={item.label}
			>
				<span class="text-sm">{item.icon}</span>
				{#if item.badge && item.badge > 0}
					<div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border border-white">
						{item.badge > 9 ? '9+' : item.badge}
					</div>
				{/if}
			</a>
		{/each}
	</div>
{/if}

<!-- Menu Overlay Completo -->
{#if showMenu}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
		on:click={toggleMenu}
		transition:fade={{ duration: 300 }}
	></div>

	<!-- Menu Panel -->
	<div 
		class="fixed left-0 top-0 bottom-0 w-80 bg-white/95 backdrop-blur-xl border-r border-white/20 shadow-2xl flex flex-col z-50"
		transition:fly={{ x: -400, duration: 400, easing: cubicOut }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-[#00BFB3]/10 to-transparent">
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-xl flex items-center justify-center text-white font-bold text-xl">
					G
				</div>
				<div>
					<h1 class="text-lg font-bold text-gray-900">Admin Panel</h1>
					<p class="text-sm text-gray-500">Marketplace GDG</p>
				</div>
			</div>
			<button
				on:click={toggleMenu}
				class="p-2 rounded-lg hover:bg-gray-100 text-slate-600 hover:text-slate-900 transition-all duration-200"
				title="Fechar Menu"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Search Bar -->
		<div class="p-4 border-b border-gray-200/50">
			<div class="relative">
				<input
					type="text"
					bind:value={searchInput}
					placeholder="Buscar no menu..."
					class="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors text-sm"
				/>
				<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto p-4 space-y-4">
			{#if searchInput.trim()}
				<!-- Resultados da busca -->
				<div class="space-y-2">
					<h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
						Resultados ({searchedItems.length})
					</h3>
					{#each searchedItems as item}
						<a
							href={item.href}
							on:click={toggleMenu}
							class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 transition-all duration-200 {isActiveRoute(item.href) ? 'bg-gradient-to-r from-[#00BFB3]/20 to-[#00BFB3]/10 text-[#00BFB3] font-semibold border-l-4 border-[#00BFB3]' : ''}"
						>
							<span class="text-lg">{item.icon}</span>
							<span class="flex-1">{item.label}</span>
							
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
									on:click={toggleMenu}
									class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 transition-all duration-200 {isActiveRoute(item.href) ? 'bg-gradient-to-r from-[#00BFB3]/20 to-[#00BFB3]/10 text-[#00BFB3] font-semibold border-l-4 border-[#00BFB3]' : ''}"
								>
									<span class="text-lg">{item.icon}</span>
									<span class="flex-1">{item.label}</span>
									
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
		<div class="p-4 border-t border-gray-200/50 bg-gradient-to-r from-slate-50/50 to-transparent space-y-2">
			<!-- Configurações -->
			<div class="grid grid-cols-2 gap-2">
				<button
					on:click={menuActions.toggleAutoHide}
					class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-all duration-200 {$menuSettings.autoHide ? 'bg-[#00BFB3]/10 text-[#00BFB3]' : ''}"
					title="Auto-esconder menu"
				>
					<span>{$menuSettings.autoHide ? '🔒' : '🔓'}</span>
					<span>Auto-hide</span>
				</button>
				
				<button
					on:click={menuActions.toggleQuickAccess}
					class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-all duration-200 {$menuSettings.quickAccess ? 'bg-[#00BFB3]/10 text-[#00BFB3]' : ''}"
					title="Quick access no hover"
				>
					<span>⚡</span>
					<span>Quick</span>
				</button>
			</div>
			
			<!-- Botões de ação -->
			<div class="flex gap-2">
				<button
					on:click={toggleMinimized}
					class="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-all duration-200 text-sm"
				>
					<span>📌</span>
					<span>Minimizar</span>
				</button>
				
				<button
					on:click={toggleMenu}
					class="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-all duration-200 text-sm"
				>
					<span>✕</span>
					<span>Fechar</span>
				</button>
			</div>
		</div>
	</div>
{/if} 