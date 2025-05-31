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
				return '📦';
			case 'promotion':
				return '🏷️';
			case 'support':
				return '💬';
			case 'price_drop':
				return '💰';
			default:
				return '🔔';
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
</script>

<svelte:head>
	<title>Notificações - Grão de Gente Marketplace</title>
	<meta name="description" content="Central de notificações do marketplace" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-6xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Notificações</h1>
			<p class="text-gray-600">
				{#if total > 0}
					{total} {total === 1 ? 'notificação' : 'notificações'}
				{:else}
					Nenhuma notificação
				{/if}
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
			<!-- Sidebar com filtros -->
			<div class="lg:col-span-1">
				<div class="bg-white rounded-lg shadow-sm p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
					<nav class="space-y-2">
						{#each filters as filter}
							<button
								onclick={() => changeFilter(filter.key)}
								class="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors
									{currentFilter === filter.key 
										? 'bg-[#00BFB3] text-white' 
										: 'text-gray-700 hover:bg-gray-100'}"
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
				{#if selectedIds.length > 0}
					<!-- Ações em lote -->
					<div class="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
						<span class="text-sm text-gray-600">
							{selectedIds.length} {selectedIds.length === 1 ? 'notificação selecionada' : 'notificações selecionadas'}
						</span>
						<div class="flex gap-2">
							<button
								onclick={() => markAsRead(selectedIds)}
								class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
							>
								Marcar como lida
							</button>
							<button
								onclick={() => deleteNotifications(selectedIds)}
								class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
							>
								Remover
							</button>
							<button
								onclick={clearSelection}
								class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
							>
								Cancelar
							</button>
						</div>
					</div>
				{:else}
					<!-- Ações gerais -->
					<div class="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
						<div class="flex gap-2">
							<button
								onclick={selectAll}
								class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
								disabled={notifications.length === 0}
							>
								Selecionar todas
							</button>
						</div>
						<button
							onclick={() => loadNotifications()}
							class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] text-sm"
						>
							Atualizar
						</button>
					</div>
				{/if}

				{#if loading}
					<!-- Loading -->
					<div class="bg-white rounded-lg shadow-sm p-8 text-center">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3] mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando notificações...</p>
					</div>
				{:else if error}
					<!-- Erro -->
					<div class="bg-white rounded-lg shadow-sm p-8 text-center">
						<div class="text-red-500 mb-4">
							<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<p class="text-gray-900 font-medium mb-2">Erro ao carregar</p>
						<p class="text-gray-600 mb-4">{error}</p>
						<button
							onclick={() => loadNotifications()}
							class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D]"
						>
							Tentar novamente
						</button>
					</div>
				{:else if notifications.length === 0}
					<!-- Estado vazio -->
					<div class="bg-white rounded-lg shadow-sm p-8 text-center">
						<div class="text-gray-400 mb-4">
							<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-5 5v-5zM11.613 15.552c-.86.097-1.74-.013-2.613-.373a8.547 8.547 0 01-1.928-1.176A8.547 8.547 0 015.896 12a8.547 8.547 0 011.176-1.928c.553-.675 1.176-1.276 1.928-1.771A8.547 8.547 0 0111.613 7.5" />
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-900 mb-2">Nenhuma notificação</h3>
						<p class="text-gray-600">
							{currentFilter === 'all' 
								? 'Você não tem notificações no momento'
								: `Nenhuma notificação do tipo "${filters.find(f => f.key === currentFilter)?.label}"`}
						</p>
					</div>
				{:else}
					<!-- Lista de notificações -->
					<div class="space-y-3">
						{#each notifications as notification (notification.id)}
							<div class="bg-white rounded-lg shadow-sm border-l-4 {notification.is_read ? 'border-gray-300' : 'border-[#00BFB3]'}">
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
										<div class="text-2xl mt-1">
											{getNotificationIcon(notification.type)}
										</div>

										<!-- Conteúdo -->
										<div class="flex-1 min-w-0">
											<div class="flex items-start justify-between">
												<h3 class="text-lg font-medium text-gray-900 {notification.is_read ? 'opacity-75' : ''}">
													{notification.title}
												</h3>
												<span class="text-sm text-gray-500 whitespace-nowrap ml-4">
													{formatDate(notification.sent_at)}
												</span>
											</div>
											<p class="text-gray-700 mt-1 {notification.is_read ? 'opacity-75' : ''}">
												{notification.content}
											</p>
											
											<!-- Ações -->
											<div class="flex items-center gap-2 mt-3">
												{#if !notification.is_read}
													<button
														onclick={() => markAsRead([notification.id])}
														class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium"
													>
														Marcar como lida
													</button>
												{/if}
												<button
													onclick={() => deleteNotifications([notification.id])}
													class="text-sm text-red-600 hover:text-red-700 font-medium"
												>
													Remover
												</button>
												{#if notification.data?.order_id}
													<a
														href="/meus-pedidos/{notification.data.order_id}"
														class="text-sm text-blue-600 hover:text-blue-700 font-medium"
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

					<!-- Paginação -->
					{#if totalPages > 1}
						<div class="mt-8 flex items-center justify-center gap-2">
							<button
								onclick={() => changePage(currentPage - 1)}
								disabled={currentPage === 1}
								class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Anterior
							</button>
							
							{#each Array(totalPages) as _, i}
								{#if i + 1 === currentPage}
									<span class="px-3 py-2 text-sm bg-[#00BFB3] text-white rounded-lg">
										{i + 1}
									</span>
								{:else if i + 1 === 1 || i + 1 === totalPages || Math.abs(i + 1 - currentPage) <= 2}
									<button
										onclick={() => changePage(i + 1)}
										class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
									>
										{i + 1}
									</button>
								{:else if Math.abs(i + 1 - currentPage) === 3}
									<span class="px-3 py-2 text-sm">...</span>
								{/if}
							{/each}
							
							<button
								onclick={() => changePage(currentPage + 1)}
								disabled={currentPage === totalPages}
								class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Próxima
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div> 