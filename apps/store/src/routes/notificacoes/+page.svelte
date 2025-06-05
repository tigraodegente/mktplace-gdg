<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	// Estado das notificações
	let notifications: any[] = [];
	let loading = true;
	let error = '';
	let selectedIds: string[] = [];
	let currentFilter = 'all';
	
	// Paginação
	let currentPage = 1;
	let totalPages = 1;
	let total = 0;
	
	// Estado para expansão de texto
	let mostrarMais = false;
	
	// Filtros
	const filters = [
		{ key: 'all', label: 'Todas', count: 0 },
		{ key: 'order_status', label: 'Pedidos', count: 0 },
		{ key: 'promotion', label: 'Promoções', count: 0 },
		{ key: 'support', label: 'Suporte', count: 0 },
		{ key: 'unread', label: 'Não lidas', count: 0 }
	];
	
	onMount(() => {
		loadNotifications();
	});
	
	async function loadNotifications() {
		try {
			loading = true;
			error = '';
			
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: '10'
			});
			
			if (currentFilter !== 'all') {
				if (currentFilter === 'unread') {
					params.set('unread_only', 'true');
				} else {
					params.set('type', currentFilter);
				}
			}
			
			const response = await fetch(`/api/notifications?${params}`);
			const data = await response.json();
			
			if (data.success) {
				notifications = data.data.notifications;
				currentPage = data.data.pagination.page;
				totalPages = data.data.pagination.pages;
				total = data.data.pagination.total;
			} else {
				error = 'Erro ao carregar notificações';
			}
		} catch (err) {
			error = 'Erro de conexão';
			console.error('Erro:', err);
		} finally {
			loading = false;
		}
	}
	
	async function markAsRead(notificationIds: string[]) {
		try {
			const response = await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					notification_ids: notificationIds,
					action: 'mark_as_read'
				})
			});
			
			if (response.ok) {
				await loadNotifications();
				selectedIds = [];
			}
		} catch (err) {
			console.error('Erro ao marcar como lida:', err);
		}
	}
	
	async function deleteNotifications(notificationIds: string[]) {
		if (!confirm('Tem certeza que deseja remover essas notificações?')) return;
		
		try {
			const response = await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					notification_ids: notificationIds,
					action: 'delete'
				})
			});
			
			if (response.ok) {
				await loadNotifications();
				selectedIds = [];
			}
		} catch (err) {
			console.error('Erro ao deletar notificações:', err);
		}
	}
	
	function toggleSelection(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter(item => item !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}
	
	function selectAll() {
		selectedIds = notifications.map(n => n.id);
	}
	
	function clearSelection() {
		selectedIds = [];
	}
	
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) {
			return 'Hoje';
		} else if (diffDays === 1) {
			return 'Ontem';
		} else if (diffDays < 7) {
			return `${diffDays} dias atrás`;
		} else {
			return date.toLocaleDateString('pt-BR');
		}
	}
	
	function getNotificationIcon(type: string) {
		switch (type) {
			case 'order_status':
				return `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
				</svg>`;
			case 'promotion':
				return `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
				</svg>`;
			case 'support':
				return `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>`;
			case 'price_drop':
				return `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>`;
			default:
				return `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 015.896 12a8.547 8.547 0 011.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5"/>
				</svg>`;
		}
	}
	
	function changeFilter(filter: string) {
		currentFilter = filter;
		currentPage = 1;
		loadNotifications();
	}
	
	function changePage(page: number) {
		currentPage = page;
		loadNotifications();
	}
	
	function toggleMostrarMais() {
		mostrarMais = !mostrarMais;
	}
</script>

<svelte:head>
	<title>Notificações - Grão de Gente Marketplace</title>
	<meta name="description" content="Central de notificações do marketplace Grão de Gente" />
	<meta name="keywords" content="notificações, alertas, atualizações, grão de gente, marketplace" />
</svelte:head>

<!-- Header Padrão do Projeto - Mobile First Responsive -->
<div class="bg-white shadow-sm border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
					<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8a6 6 0 1 1 12 0v4l2 2H4l2-2V8Z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20a2 2 0 1 0 4 0"/>
					</svg>
				</div>
				<div>
					<h1 class="text-2xl sm:text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">Central de Notificações</h1>
					<p class="mt-1 text-gray-600 text-sm sm:text-base" style="font-family: 'Lato', sans-serif;">
						{#if total > 0}
							{total} {total === 1 ? 'notificação' : 'notificações'} • Mantenha-se atualizado
						{:else}
							Sua central de atualizações e alertas
						{/if}
					</p>
				</div>
			</div>
			
			<a 
				href="/" 
				class="text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors text-sm sm:text-base px-4 py-2 sm:px-0 sm:py-0 bg-[#00BFB3]/5 sm:bg-transparent rounded-lg sm:rounded-none"
				style="font-family: 'Lato', sans-serif;"
			>
				<span class="sm:hidden">Voltar</span>
				<span class="hidden sm:inline">← Continuar Comprando</span>
			</a>
		</div>
		
		<!-- Descrição expandível -->
		<div class="mt-6 pt-6 border-t border-gray-200">
			<div class="text-center">
				<p class="text-gray-600 text-base leading-relaxed mb-4" style="font-family: 'Lato', sans-serif;">
					Fique por dentro de tudo! Receba atualizações sobre seus pedidos, 
					promoções exclusivas e novidades da loja.
				</p>
			</div>
		</div>
	</div>
</div>

<!-- Conteúdo Principal -->
<main class="py-4 sm:py-6 lg:py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Filtros Responsivos -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
			<div class="flex items-center gap-3 mb-4 sm:mb-6">
				<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
					<svg class="h-4 w-4 sm:h-5 sm:w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
					</svg>
				</div>
				<h2 class="text-base sm:text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
					Filtrar Notificações
				</h2>
			</div>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
				{#each filters as filter}
					<button
						onclick={() => changeFilter(filter.key)}
						class="flex items-center justify-center px-3 sm:px-4 py-3 text-left rounded-lg transition-colors text-xs sm:text-sm font-medium border touch-manipulation
							{currentFilter === filter.key 
								? 'bg-[#00BFB3] text-white border-[#00BFB3]' 
								: 'text-gray-700 hover:bg-gray-50 border-gray-200 bg-white'}"
						style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
					>
						<span class="truncate">{filter.label}</span>
						{#if filter.count > 0}
							<span class="ml-2 text-xs {currentFilter === filter.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'} px-2 py-1 rounded-full flex-shrink-0">
								{filter.count}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		{#if !loading && notifications.length > 0}
			<!-- Action Bar -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
				<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
							<svg class="h-4 w-4 sm:h-5 sm:w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 715.896 12a8.547 8.547 0 711.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5"/>
							</svg>
						</div>
						<div>
							<h2 class="text-base sm:text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
								Central de Notificações
							</h2>
							<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
								{#if selectedIds.length > 0}
									{selectedIds.length} {selectedIds.length === 1 ? 'notificação selecionada' : 'notificações selecionadas'}
								{:else}
									Gerencie suas atualizações e alertas
								{/if}
							</p>
						</div>
					</div>
					
					<div class="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
						{#if selectedIds.length > 0}
							<button
								onclick={() => markAsRead(selectedIds)}
								class="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-lg hover:bg-[#00A89D] transition-colors touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<span class="hidden sm:inline">Marcar Lidas</span>
								<span class="sm:hidden">Lidas</span>
							</button>
							<button
								onclick={() => deleteNotifications(selectedIds)}
								class="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
								<span class="hidden sm:inline">Remover</span>
								<span class="sm:hidden">Excluir</span>
							</button>
							<button
								onclick={clearSelection}
								class="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								Cancelar
							</button>
						{:else}
							<button
								onclick={selectAll}
								class="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span class="hidden sm:inline">Selecionar Todas</span>
								<span class="sm:hidden">Todas</span>
							</button>
							<button
								onclick={() => loadNotifications()}
								class="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-lg hover:bg-[#00A89D] transition-colors touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Atualizar
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		{#if loading}
			<!-- Loading State -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
				<div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
					<div class="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-2 border-[#00BFB3] border-t-transparent"></div>
				</div>
				<h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" style="font-family: 'Lato', sans-serif;">
					Carregando notificações
				</h2>
				<p class="text-sm sm:text-base text-gray-600" style="font-family: 'Lato', sans-serif;">
					Aguarde enquanto buscamos suas notificações...
				</p>
			</div>
		{:else if error}
			<!-- Error State -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
				<div class="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
					<svg class="h-8 w-8 sm:h-10 sm:w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" style="font-family: 'Lato', sans-serif;">
					Erro ao carregar
				</h2>
				<p class="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8" style="font-family: 'Lato', sans-serif;">
					{error}
				</p>
				<button
					onclick={() => loadNotifications()}
					class="inline-flex items-center justify-center px-6 py-3 bg-[#00BFB3] text-white text-sm font-semibold rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
					style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					Tentar novamente
				</button>
			</div>
		{:else if notifications.length === 0}
			<!-- Estado vazio -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
				<div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
					<svg class="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8a6 6 0 1 1 12 0v4l2 2H4l2-2V8Z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20a2 2 0 1 0 4 0"/>
					</svg>
				</div>
				<h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" style="font-family: 'Lato', sans-serif;">
					{currentFilter === 'all' ? 'Nenhuma notificação ainda' : 'Nenhuma notificação encontrada'}
				</h2>
				<p class="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed" style="font-family: 'Lato', sans-serif;">
					{currentFilter === 'all' 
						? 'Você será notificado aqui sobre atualizações de pedidos, promoções exclusivas e novidades da loja.'
						: `Nenhuma notificação do tipo "${filters.find(f => f.key === currentFilter)?.label}" encontrada.`}
				</p>
				
				<div class="flex flex-col sm:flex-row gap-3 justify-center max-w-sm sm:max-w-none mx-auto">
					{#if currentFilter !== 'all'}
						<button 
							onclick={() => changeFilter('all')}
							class="inline-flex items-center justify-center px-6 py-3 bg-white text-[#00BFB3] text-sm font-semibold rounded-lg border border-[#00BFB3] hover:bg-[#00BFB3] hover:text-white focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
							style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 715.896 12a8.547 8.547 0 711.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5" />
							</svg>
							Ver Todas
						</button>
					{/if}
					<a
						href="/"
						class="inline-flex items-center justify-center px-6 py-3 bg-[#00BFB3] text-white text-sm font-semibold rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
						style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						Explorar Produtos
					</a>
				</div>
			</div>
		{:else}
			<!-- Lista de Notificações -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
				<div class="flex items-center gap-3 mb-4 sm:mb-6">
					<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
						<svg class="h-4 w-4 sm:h-5 sm:w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 715.896 12a8.547 8.547 0 711.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5"/>
						</svg>
					</div>
					<h3 class="text-base sm:text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
						Suas Notificações
					</h3>
				</div>
				
				<div class="space-y-4 sm:space-y-6">
					{#each notifications as notification (notification.id)}
						<div class="border-l-4 {notification.is_read ? 'border-gray-300' : 'border-[#00BFB3]'} bg-gray-50 rounded-r-lg">
							<div class="p-3 sm:p-4">
								<div class="flex items-start gap-3 sm:gap-4">
									<!-- Checkbox -->
									<label class="flex items-center mt-1 flex-shrink-0">
										<input
											type="checkbox"
											checked={selectedIds.includes(notification.id)}
											onchange={() => toggleSelection(notification.id)}
											class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3] touch-manipulation"
										/>
									</label>

									<!-- Ícone -->
									<div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
										<div class="text-[#00BFB3] scale-75 sm:scale-100">
											{@html getNotificationIcon(notification.type)}
										</div>
									</div>

									<!-- Conteúdo -->
									<div class="flex-1 min-w-0">
										<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
											<h3 class="text-sm sm:text-base font-medium text-gray-900 {notification.is_read ? 'opacity-75' : ''} leading-tight" style="font-family: 'Lato', sans-serif;">
												{notification.title}
											</h3>
											<span class="text-xs sm:text-sm text-gray-500 whitespace-nowrap flex-shrink-0" style="font-family: 'Lato', sans-serif;">
												{formatDate(notification.sent_at)}
											</span>
										</div>
										<p class="text-xs sm:text-sm text-gray-700 mt-1 {notification.is_read ? 'opacity-75' : ''} leading-relaxed" style="font-family: 'Lato', sans-serif;">
											{notification.content}
										</p>
										
										<!-- Ações -->
										<div class="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
											{#if !notification.is_read}
												<button
													onclick={() => markAsRead([notification.id])}
													class="text-xs sm:text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors touch-manipulation"
													style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
												>
													Marcar como lida
												</button>
											{/if}
											<button
												onclick={() => deleteNotifications([notification.id])}
												class="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium transition-colors touch-manipulation"
												style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
											>
												Remover
											</button>
											{#if notification.data?.order_id}
												<a
													href="/meus-pedidos/{notification.data.order_id}"
													class="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors touch-manipulation"
													style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
												>
													Ver pedido
												</a>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Paginação Responsiva -->
			{#if totalPages > 1}
				<div class="flex items-center justify-center space-x-1 sm:space-x-2 mt-6 sm:mt-8">
					<button
						onclick={() => changePage(currentPage - 1)}
						disabled={currentPage === 1}
						class="px-3 sm:px-4 py-2 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-200 transition-all touch-manipulation"
						style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
					>
						<span class="hidden sm:inline">Anterior</span>
						<span class="sm:hidden">‹</span>
					</button>
					
					<div class="flex space-x-1 sm:space-x-2 max-w-[200px] sm:max-w-none overflow-x-auto">
						{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
							{#if pageNum === currentPage || Math.abs(pageNum - currentPage) <= 1 || pageNum === 1 || pageNum === totalPages}
								<button 
									onclick={() => changePage(pageNum)}
									class="px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg transition-all touch-manipulation flex-shrink-0"
									class:bg-[#00BFB3]={pageNum === currentPage}
									class:text-white={pageNum === currentPage}
									class:bg-white={pageNum !== currentPage}
									class:text-gray-700={pageNum !== currentPage}
									class:border={pageNum !== currentPage}
									class:border-gray-300={pageNum !== currentPage}
									class:hover:bg-gray-50={pageNum !== currentPage}
									class:focus:ring-2={pageNum !== currentPage}
									class:focus:ring-gray-200={pageNum !== currentPage}
									style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
								>
									{pageNum}
								</button>
							{:else if Math.abs(pageNum - currentPage) === 2 && (pageNum === 2 || pageNum === totalPages - 1)}
								<span class="px-2 text-gray-500 flex items-center" style="font-family: 'Lato', sans-serif;">...</span>
							{/if}
						{/each}
					</div>
					
					<button
						onclick={() => changePage(currentPage + 1)}
						disabled={currentPage === totalPages}
						class="px-3 sm:px-4 py-2 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-200 transition-all touch-manipulation"
						style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
					>
						<span class="hidden sm:inline">Próxima</span>
						<span class="sm:hidden">›</span>
					</button>
				</div>
			{/if}
		{/if}
	</div>
</main>

<style>
	/* Animação suave para as notificações */
	.space-y-4 > *, .space-y-6 > * {
		animation: fadeIn 0.3s ease-in-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Melhorias responsivas mobile-first */
	@media (max-width: 640px) {
		/* Scrolling suave no mobile */
		html {
			scroll-behavior: smooth;
		}
		
		/* Reduzir padding em elementos pequenos */
		.responsive-padding {
			padding: 0.75rem !important;
		}
		
		/* Paginação com scrolling horizontal suave */
		.overflow-x-auto {
			scrollbar-width: none;
			-ms-overflow-style: none;
		}
		
		.overflow-x-auto::-webkit-scrollbar {
			display: none;
		}
	}
	
	/* Tablets */
	@media (min-width: 641px) and (max-width: 1024px) {
		/* Ajustes específicos para tablets */
		.tablet-padding {
			padding: 1.5rem;
		}
	}
	
	/* Remove hover effects em dispositivos touch */
	@media (hover: none) and (pointer: coarse) {
		.bg-white:hover {
			box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
		}
	}
	
	/* Melhorias de acessibilidade */
	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
	
	@media (prefers-contrast: high) {
		/* High contrast adjustments */
		button {
			background-color: #000 !important;
			color: #fff !important;
			border-color: #000 !important;
		}
	}
	
	/* Otimizações para dispositivos de baixa potência */
	@media (prefers-reduced-data: reduce) {
		.bg-gradient-to-br {
			background: #f9fafb !important;
		}
		
		.shadow-sm, .shadow-md {
			box-shadow: none !important;
			border: 1px solid #e5e7eb !important;
		}
	}
	
	/* Touch improvements */
	@supports (-webkit-touch-callout: none) {
		.touch-manipulation {
			-webkit-touch-callout: none;
			-webkit-user-select: none;
			user-select: none;
		}
		
		button, a {
			-webkit-tap-highlight-color: transparent;
		}
	}
	
	/* Focus improvements para navegação por teclado */
	button:focus, a:focus {
		outline: 2px solid #00BFB3;
		outline-offset: 2px;
	}
	
	/* Performance improvements */
	.transition-all {
		will-change: transform, opacity;
	}
	
	/* Preparação para dark mode futuro */
	@media (prefers-color-scheme: dark) {
		/* Será implementado futuramente */
	}
	
	/* Grid responsive melhorado */
	@media (max-width: 640px) {
		.grid-cols-2.sm\:grid-cols-3 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	
	/* Melhorias na aparência dos filtros */
	.filter-button-active {
		background: linear-gradient(135deg, #00BFB3 0%, #00A89D 100%);
		box-shadow: 0 2px 4px rgba(0, 191, 179, 0.2);
	}
	
	/* Loading spinner melhorado */
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	
	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style> 