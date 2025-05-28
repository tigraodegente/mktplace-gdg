<script lang="ts">
	import { notificationStore, type Notification, type NotificationType } from '$lib/stores/notificationStore';
	import { toastStore } from '$lib/stores/toastStore';
	import { fade, slide } from 'svelte/transition';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import { goto } from '$app/navigation';

	// Constants
	const NOTIFICATION_ICONS: Record<NotificationType | 'default', string> = {
		order: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M16 16h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2m4 4h.01M12 12v8m-4-4l4 4 4-4"/>
		</svg>`,
		promotion: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z"/>
		</svg>`,
		success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
		</svg>`,
		warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
		</svg>`,
		error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
		</svg>`,
		info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
		</svg>`,
		default: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
		</svg>`
	};

	const NOTIFICATION_COLORS: Record<NotificationType, string> = {
		order: '#00BFB3',
		promotion: '#FF8403',
		success: '#00BFB3',
		warning: '#FF8403',
		error: '#F17179',
		info: '#0EA5E9'
	};

	const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	};

	const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
		hour: '2-digit',
		minute: '2-digit'
	};

	// Types
	type FilterType = 'all' | 'unread';
	type GroupedNotifications = Record<string, Notification[]>;

	// State
	let notifications = $state<Notification[]>([]);
	let filter = $state<FilterType>('all');
	
	// Subscribe to notifications
	$effect(() => {
		const unsubscribe = notificationStore.subscribe(value => {
			notifications = value;
		});
		
		return unsubscribe;
	});
	
	// Computed values
	const unreadCount = $derived(() => notifications.filter(n => !n.read).length);
	const hasUnread = $derived(() => unreadCount() > 0);
	const hasRead = $derived(() => notifications.some(n => n.read));
	
	// Filtered notifications
	const filteredNotifications = $derived(() => {
		return filter === 'unread' 
			? notifications.filter(n => !n.read)
			: notifications;
	});
	
	// Group notifications by date with memoization
	const groupedNotifications = $derived((): GroupedNotifications => {
		const groups: GroupedNotifications = {};
		const today = new Date();
		const todayStr = today.toDateString();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = yesterday.toDateString();
		
		for (const notification of filteredNotifications()) {
			const date = new Date(notification.createdAt);
			const dateStr = date.toDateString();
			
			let key: string;
			if (dateStr === todayStr) {
				key = 'Hoje';
			} else if (dateStr === yesterdayStr) {
				key = 'Ontem';
			} else {
				key = date.toLocaleDateString('pt-BR', DATE_FORMAT_OPTIONS);
			}
			
			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(notification);
		}
		
		return groups;
	});

	// Actions
	async function handleNotificationClick(notification: Notification): Promise<void> {
		if (!notification.read) {
			notificationStore.markAsRead(notification.id);
		}
		
		if (notification.link) {
			await goto(notification.link);
		}
	}
	
	function markAllAsRead(): void {
		notificationStore.markAllAsRead();
		toastStore.success('Todas as notificações foram marcadas como lidas');
	}
	
	async function clearAll(): Promise<void> {
		if (confirm('Tem certeza que deseja limpar todas as notificações?')) {
			notificationStore.clearAll();
			toastStore.success('Notificações removidas');
		}
	}
	
	function clearRead(): void {
		notificationStore.clearRead();
		toastStore.success('Notificações lidas removidas');
	}
	
	function removeNotification(id: string, event: Event): void {
		event.stopPropagation();
		notificationStore.removeNotification(id);
	}
	
	// Helper functions
	function getNotificationIcon(type: NotificationType): string {
		return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
	}
	
	function getNotificationColor(type: NotificationType): string {
		return NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.info;
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('pt-BR', TIME_FORMAT_OPTIONS);
	}
</script>

<AuthGuard>
	<div class="min-h-screen bg-gray-50">
		<!-- Header Section -->
		<div class="bg-white border-b border-gray-200">
			<div class="container mx-auto px-4 py-6 max-w-4xl">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-[28px] font-bold text-[#2C1D1D]" style="font-family: 'Lato', sans-serif; font-weight: 700;">
							Notificações
						</h1>
						<p class="text-[15px] text-gray-600 mt-1" style="font-family: 'Lato', sans-serif; font-weight: 400;">
							Acompanhe todas as novidades e atualizações da sua conta
						</p>
					</div>
					
					<!-- Ícone decorativo -->
					<div class="hidden sm:block">
						<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-full flex items-center justify-center">
							<svg class="w-6 h-6 text-[#00BFB3]" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2C10.9 2 10 2.9 10 4C10 4.1 10.01 4.19 10.02 4.29C7.71 5.13 6 7.39 6 10V16L4 18V19H20V18L18 16V10C18 7.39 16.29 5.13 13.98 4.29C13.99 4.19 14 4.1 14 4C14 2.9 13.1 2 12 2ZM12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"/>
							</svg>
						</div>
					</div>
				</div>
			</div>
		</div>
		
		<div class="container mx-auto px-4 py-6 max-w-4xl">
			<!-- Filtros e Ações -->
			<div class="bg-white rounded-[12px] shadow-sm border border-gray-200 p-4 mb-6">
				<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div class="flex gap-2">
						<button
							onclick={() => filter = 'all'}
							class="px-5 py-2.5 rounded-[8px] text-[14px] font-medium transition-all {filter === 'all' ? 'bg-[#00BFB3] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							style="font-family: 'Lato', sans-serif; font-weight: 600;"
							aria-pressed={filter === 'all'}
						>
							Todas ({notifications.length})
						</button>
						<button
							onclick={() => filter = 'unread'}
							class="px-5 py-2.5 rounded-[8px] text-[14px] font-medium transition-all {filter === 'unread' ? 'bg-[#00BFB3] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							style="font-family: 'Lato', sans-serif; font-weight: 600;"
							aria-pressed={filter === 'unread'}
						>
							Não lidas ({unreadCount()})
						</button>
					</div>
					
					<div class="flex items-center gap-3">
						{#if hasUnread()}
							<button
								onclick={markAllAsRead}
								class="text-[13px] text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors flex items-center gap-1"
								style="font-family: 'Lato', sans-serif; font-weight: 600;"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Marcar todas como lidas
							</button>
						{/if}
						
						<!-- Menu de ações -->
						{#if notifications.length > 0}
							<div class="relative">
								<button
									class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[8px] transition-all"
									aria-label="Mais opções"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
									</svg>
								</button>
							</div>
						{/if}
					</div>
				</div>
				
				{#if notifications.length > 0}
					<div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
						{#if hasRead()}
							<button
								onclick={clearRead}
								class="text-[12px] text-gray-500 hover:text-gray-700 font-medium transition-colors"
								style="font-family: 'Lato', sans-serif; font-weight: 500;"
							>
								Limpar lidas
							</button>
						{/if}
						<button
							onclick={clearAll}
							class="text-[12px] text-red-500 hover:text-red-600 font-medium transition-colors"
							style="font-family: 'Lato', sans-serif; font-weight: 500;"
						>
							Limpar todas
						</button>
					</div>
				{/if}
			</div>
			
			<!-- Lista de Notificações -->
			{#if filteredNotifications().length === 0}
				<div class="bg-white rounded-[12px] shadow-sm border border-gray-200 p-12 text-center" transition:fade={{ duration: 200 }}>
					<div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
						</svg>
					</div>
					<h3 class="text-[18px] font-semibold text-gray-800 mb-2" style="font-family: 'Lato', sans-serif; font-weight: 600;">
						{filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
					</h3>
					<p class="text-[14px] text-gray-500 max-w-sm mx-auto" style="font-family: 'Lato', sans-serif; font-weight: 400;">
						Quando você receber notificações sobre seus pedidos, promoções ou novidades, elas aparecerão aqui
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each Object.entries(groupedNotifications()) as [date, dateNotifications] (date)}
						<div transition:slide={{ duration: 300 }}>
							<!-- Data Header -->
							<div class="flex items-center gap-3 mb-3">
								<h3 class="text-[12px] font-semibold text-gray-500 uppercase tracking-wider" style="font-family: 'Lato', sans-serif; font-weight: 700;">
									{date}
								</h3>
								<div class="flex-1 h-px bg-gray-200"></div>
							</div>
							
							<div class="space-y-3">
								{#each dateNotifications as notification (notification.id)}
									<div
										class="w-full bg-white rounded-[12px] border {notification.read ? 'border-gray-200' : 'border-[#00BFB3]/30 shadow-sm'} p-4 hover:shadow-md transition-all text-left group cursor-pointer"
										onclick={() => handleNotificationClick(notification)}
										onkeydown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
										role="button"
										tabindex="0"
										aria-label="Ver notificação: {notification.title}"
										transition:fade={{ duration: 200 }}
									>
										<div class="flex items-start gap-4">
											<!-- Ícone -->
											<div 
												class="w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0 {notification.read ? 'opacity-70' : ''}"
												style="background-color: {getNotificationColor(notification.type)}15; color: {getNotificationColor(notification.type)}"
											>
												{@html getNotificationIcon(notification.type)}
											</div>
											
											<!-- Conteúdo -->
											<div class="flex-1 min-w-0">
												<div class="flex items-start justify-between gap-3">
													<div class="flex-1">
														<h4 class="text-[16px] text-[#2C1D1D] mb-1 {!notification.read ? 'font-bold' : 'font-semibold'}" style="font-family: 'Lato', sans-serif;">
															{notification.title}
														</h4>
														<p class="text-[14px] text-gray-600 leading-relaxed" style="font-family: 'Lato', sans-serif; font-weight: 400;">
															{notification.message}
														</p>
														<div class="flex items-center gap-3 mt-2">
															<p class="text-[12px] text-gray-500" style="font-family: 'Lato', sans-serif; font-weight: 400;">
																{formatTime(new Date(notification.createdAt))}
															</p>
															{#if notification.link}
																<span class="text-[#00BFB3] text-[12px] font-medium inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style="font-family: 'Lato', sans-serif; font-weight: 600;">
																	Ver detalhes
																	<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
																	</svg>
																</span>
															{/if}
														</div>
													</div>
													
													<!-- Indicador não lida + Botão remover -->
													<div class="flex items-start gap-2">
														{#if !notification.read}
															<div class="w-2 h-2 bg-[#00BFB3] rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
														{/if}
														
														<button
															onclick={(e) => removeNotification(notification.id, e)}
															class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[6px] transition-all opacity-0 group-hover:opacity-100"
															aria-label="Remover notificação"
															type="button"
														>
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
															</svg>
														</button>
													</div>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
			
			<!-- Dica no rodapé -->
			{#if notifications.length > 0}
				<div class="mt-8 p-4 bg-[#00BFB3]/5 rounded-[12px] border border-[#00BFB3]/20">
					<div class="flex items-start gap-3">
						<svg class="w-5 h-5 text-[#00BFB3] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-[13px] text-gray-700" style="font-family: 'Lato', sans-serif; font-weight: 400;">
							<strong style="font-weight: 600;">Dica:</strong> Clique em uma notificação para marcá-la como lida e ver mais detalhes. As notificações são salvas localmente no seu navegador.
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</AuthGuard>

<style>
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style> 