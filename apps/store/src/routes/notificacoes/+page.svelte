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

<!-- Header Padrão do Projeto -->
<div class="bg-white shadow-sm border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">Notificações</h1>
				<p class="mt-1 text-gray-600" style="font-family: 'Lato', sans-serif;">
				{#if total > 0}
						{total} {total === 1 ? 'notificação' : 'notificações'} • Mantenha-se atualizado
				{:else}
						Sua central de atualizações e alertas
				{/if}
			</p>
		</div>

			<a 
				href="/" 
				class="text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors"
				style="font-family: 'Lato', sans-serif;"
			>
				← Continuar Comprando
			</a>
		</div>
		
		<!-- Descrição expandível -->
		<div class="mt-6 pt-6 border-t border-gray-200">
			<div class="text-center">
				<p class="text-gray-600 text-base leading-relaxed mb-4" style="font-family: 'Lato', sans-serif;">
					Fique por dentro de tudo! Receba atualizações sobre seus pedidos, 
					promoções exclusivas e novidades da loja.
				</p>
				
				<button
					onclick={toggleMostrarMais}
					class="inline-flex items-center gap-2 text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors text-sm"
					style="font-family: 'Lato', sans-serif;"
				>
					<span>{mostrarMais ? 'Ver Menos' : 'Ver Mais'}</span>
					<svg 
						class="w-4 h-4 transition-transform {mostrarMais ? 'rotate-180' : ''}" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if mostrarMais}
					<div class="mt-4 text-gray-600 text-base leading-relaxed" style="font-family: 'Lato', sans-serif;">
						<p>
							Use os filtros para encontrar rapidamente o que procura e mantenha sua central organizada. 
							Ative as notificações para ser o primeiro a saber sobre ofertas especiais e lançamentos.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Conteúdo Principal -->
<main class="py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
			<!-- Sidebar com filtros -->
			<div class="lg:col-span-1">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">Filtros</h2>
					<nav class="space-y-2">
						{#each filters as filter}
							<button
								onclick={() => changeFilter(filter.key)}
								class="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors text-sm font-medium
									{currentFilter === filter.key 
										? 'bg-[#00BFB3] text-white' 
										: 'text-gray-700 hover:bg-gray-50'}"
								style="font-family: 'Lato', sans-serif;"
							>
								<span>{filter.label}</span>
								{#if filter.count > 0}
									<span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
										{filter.count}
									</span>
								{/if}
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<!-- Lista de notificações -->
			<div class="lg:col-span-3">
				{#if !loading && notifications.length > 0}
					<!-- Action Bar igual aos outros -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
						<div class="flex justify-between items-center">
							<div class="flex items-center gap-3">
								<svg class="h-6 w-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 715.896 12a8.547 8.547 0 711.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5"/>
								</svg>
								<div>
									<h2 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
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
							
							<div class="flex gap-3">
								{#if selectedIds.length > 0}
							<button
								onclick={() => markAsRead(selectedIds)}
										class="inline-flex items-center px-4 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
										style="font-family: 'Lato', sans-serif;"
							>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
										Marcar Lidas
							</button>
							<button
								onclick={() => deleteNotifications(selectedIds)}
										class="inline-flex items-center px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-md border border-red-200 hover:bg-red-50 transition-colors"
										style="font-family: 'Lato', sans-serif;"
							>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
								Remover
							</button>
							<button
								onclick={clearSelection}
										class="inline-flex items-center px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
										style="font-family: 'Lato', sans-serif;"
							>
								Cancelar
							</button>
				{:else}
							<button
								onclick={selectAll}
										class="inline-flex items-center px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
										style="font-family: 'Lato', sans-serif;"
							>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Selecionar Todas
							</button>
						<button
							onclick={() => loadNotifications()}
										class="inline-flex items-center px-4 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
										style="font-family: 'Lato', sans-serif;"
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
					<!-- Loading -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3] mx-auto mb-4"></div>
						<p class="text-gray-600" style="font-family: 'Lato', sans-serif;">Carregando notificações...</p>
					</div>
				{:else if error}
					<!-- Erro -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
						<div class="text-red-500 mb-4">
							<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<p class="text-gray-900 font-medium mb-2" style="font-family: 'Lato', sans-serif;">Erro ao carregar</p>
						<p class="text-gray-600 mb-4" style="font-family: 'Lato', sans-serif;">{error}</p>
						<button
							onclick={() => loadNotifications()}
							class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] font-medium transition-colors"
							style="font-family: 'Lato', sans-serif;"
						>
							Tentar novamente
						</button>
					</div>
				{:else if notifications.length === 0}
					<!-- Estado vazio igual aos outros -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
						<svg class="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 715.896 12a8.547 8.547 0 711.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5" />
							</svg>
						<h2 class="text-xl font-medium text-gray-900 mb-2" style="font-family: 'Lato', sans-serif;">
							{currentFilter === 'all' ? 'Nenhuma notificação ainda' : 'Nenhuma notificação encontrada'}
						</h2>
						<p class="text-gray-600 mb-8 max-w-md mx-auto" style="font-family: 'Lato', sans-serif;">
							{currentFilter === 'all' 
								? 'Você será notificado aqui sobre atualizações de pedidos, promoções exclusivas e novidades da loja.'
								: `Nenhuma notificação do tipo "${filters.find(f => f.key === currentFilter)?.label}" encontrada.`}
						</p>
						
						<div class="flex flex-col sm:flex-row gap-3 justify-center">
							{#if currentFilter !== 'all'}
								<button 
									onclick={() => changeFilter('all')}
									class="inline-flex items-center px-6 py-2 bg-white text-[#00BFB3] text-sm font-medium rounded-md border border-[#00BFB3] hover:bg-[#00BFB3] hover:text-white transition-colors"
									style="font-family: 'Lato', sans-serif;"
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 715.896 12a8.547 8.547 0 711.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5" />
									</svg>
									Ver Todas
								</button>
							{/if}
							<button 
								onclick={() => window.location.href = '/'}
								class="inline-flex items-center px-6 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
								style="font-family: 'Lato', sans-serif;"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								Explorar Produtos
							</button>
						</div>
					</div>
				{:else}
					<!-- Lista de notificações igual aos outros -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<div class="flex items-center gap-3 mb-6">
							<svg class="h-5 w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 715.896 12a8.547 8.547 0 711.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5"/>
							</svg>
							<h3 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
								Suas Notificações
							</h3>
						</div>
						
						<div class="space-y-4">
						{#each notifications as notification (notification.id)}
								<div class="border-l-4 {notification.is_read ? 'border-gray-300' : 'border-[#00BFB3]'} bg-gray-50 rounded-r-lg">
								<div class="p-4">
									<div class="flex items-start gap-4">
										<!-- Checkbox -->
										<label class="flex items-center mt-1">
											<input
												type="checkbox"
												checked={selectedIds.includes(notification.id)}
												onchange={() => toggleSelection(notification.id)}
												class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
											/>
										</label>

										<!-- Ícone -->
											<div class="text-[#00BFB3] mt-1">
												{@html getNotificationIcon(notification.type)}
										</div>

										<!-- Conteúdo -->
										<div class="flex-1 min-w-0">
											<div class="flex items-start justify-between">
													<h3 class="text-lg font-medium text-gray-900 {notification.is_read ? 'opacity-75' : ''}" style="font-family: 'Lato', sans-serif;">
													{notification.title}
												</h3>
													<span class="text-sm text-gray-500 whitespace-nowrap ml-4" style="font-family: 'Lato', sans-serif;">
													{formatDate(notification.sent_at)}
												</span>
											</div>
												<p class="text-gray-700 mt-1 {notification.is_read ? 'opacity-75' : ''}" style="font-family: 'Lato', sans-serif;">
												{notification.content}
											</p>
											
											<!-- Ações -->
												<div class="flex items-center gap-4 mt-3">
												{#if !notification.is_read}
													<button
														onclick={() => markAsRead([notification.id])}
															class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors"
															style="font-family: 'Lato', sans-serif;"
													>
														Marcar como lida
													</button>
												{/if}
												<button
													onclick={() => deleteNotifications([notification.id])}
														class="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
														style="font-family: 'Lato', sans-serif;"
												>
													Remover
												</button>
												{#if notification.data?.order_id}
													<a
														href="/meus-pedidos/{notification.data.order_id}"
															class="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
															style="font-family: 'Lato', sans-serif;"
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

					<!-- Paginação -->
					{#if totalPages > 1}
						<div class="mt-8 flex items-center justify-center gap-2">
							<button
								onclick={() => changePage(currentPage - 1)}
								disabled={currentPage === 1}
								class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
								style="font-family: 'Lato', sans-serif;"
							>
								Anterior
							</button>
							
							{#each Array(totalPages) as _, i}
								{#if i + 1 === currentPage}
									<span class="px-3 py-2 text-sm bg-[#00BFB3] text-white rounded-lg font-medium" style="font-family: 'Lato', sans-serif;">
										{i + 1}
									</span>
								{:else if i + 1 === 1 || i + 1 === totalPages || Math.abs(i + 1 - currentPage) <= 2}
									<button
										onclick={() => changePage(i + 1)}
										class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
										style="font-family: 'Lato', sans-serif;"
									>
										{i + 1}
									</button>
								{:else if Math.abs(i + 1 - currentPage) === 3}
									<span class="px-3 py-2 text-sm" style="font-family: 'Lato', sans-serif;">...</span>
								{/if}
							{/each}
							
							<button
								onclick={() => changePage(currentPage + 1)}
								disabled={currentPage === totalPages}
								class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
								style="font-family: 'Lato', sans-serif;"
							>
								Próxima
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</main>

<style>
	/* Animação suave para as notificações */
	.space-y-4 > * {
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
	
	/* Motion preferences */
	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style> 