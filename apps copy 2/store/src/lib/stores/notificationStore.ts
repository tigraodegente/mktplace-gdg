import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

// Constants
const STORAGE_KEY = 'notifications';
const NOTIFICATION_ID_PREFIX = 'notif';
const MAX_NOTIFICATIONS = 100; // Limitar número de notificações para performance
const SAVE_THROTTLE_MS = 500; // Throttle para salvar no localStorage

// Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'order' | 'promotion';

export interface Notification {
	readonly id: string;
	readonly title: string;
	readonly message: string;
	readonly type: NotificationType;
	readonly createdAt: Date;
	read: boolean;
	link?: string;
	icon?: string;
}

export type NotificationInput = Omit<Notification, 'id' | 'createdAt' | 'read'>;

// Interfaces para melhor organização
interface NotificationStore extends Readable<Notification[]> {
	addNotification: (notification: NotificationInput) => string;
	markAsRead: (notificationId: string) => void;
	markAllAsRead: () => void;
	removeNotification: (notificationId: string) => void;
	clearAll: () => void;
	clearRead: () => void;
}

// Utility functions
const generateNotificationId = (): string => {
	return `${NOTIFICATION_ID_PREFIX}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const isClient = typeof window !== 'undefined';

// Storage functions com melhor tratamento de erros
const storage = {
	load(): Notification[] {
		if (!isClient) return [];
		
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return [];
			
			const parsed = JSON.parse(stored);
			// Validar e converter dados
			return parsed
				.filter((n: any) => n.id && n.title && n.message && n.type)
				.map((n: any) => ({
					...n,
					createdAt: new Date(n.createdAt)
				}))
				.slice(0, MAX_NOTIFICATIONS); // Limitar quantidade
		} catch (error) {
			console.error('[NotificationStore] Erro ao carregar notificações:', error);
			return [];
		}
	},
	
	save: (() => {
		let saveTimeout: NodeJS.Timeout | null = null;
		
		return (notifications: Notification[]) => {
			if (!isClient) return;
			
			// Cancelar save anterior se existir (throttling)
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}
			
			saveTimeout = setTimeout(() => {
				try {
					// Limitar quantidade antes de salvar
					const toSave = notifications.slice(0, MAX_NOTIFICATIONS);
					localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
				} catch (error) {
					console.error('[NotificationStore] Erro ao salvar notificações:', error);
				}
			}, SAVE_THROTTLE_MS);
		};
	})()
};

// Factory function para criar o store
function createNotificationStore(): NotificationStore {
	const { subscribe, set, update } = writable<Notification[]>(storage.load());
	
	// Helper para atualizar e salvar
	const updateAndSave = (updater: (notifications: Notification[]) => Notification[]) => {
		update(notifications => {
			const updated = updater(notifications);
			storage.save(updated);
			return updated;
		});
	};
	
	return {
		subscribe,
		
		addNotification(notification: NotificationInput): string {
			const newNotification: Notification = {
				...notification,
				id: generateNotificationId(),
				createdAt: new Date(),
				read: false
			};
			
			updateAndSave(notifications => [newNotification, ...notifications]);
			
			return newNotification.id;
		},
		
		markAsRead(notificationId: string): void {
			updateAndSave(notifications => 
				notifications.map(n => 
					n.id === notificationId ? { ...n, read: true } : n
				)
			);
		},
		
		markAllAsRead(): void {
			updateAndSave(notifications => 
				notifications.map(n => ({ ...n, read: true }))
			);
		},
		
		removeNotification(notificationId: string): void {
			updateAndSave(notifications => 
				notifications.filter(n => n.id !== notificationId)
			);
		},
		
		clearAll(): void {
			set([]);
			storage.save([]);
		},
		
		clearRead(): void {
			updateAndSave(notifications => 
				notifications.filter(n => !n.read)
			);
		}
	};
}

// Singleton instance
export const notificationStore = createNotificationStore();

// Derived stores com tipos explícitos
export const unreadCount: Readable<number> = derived(
	notificationStore,
	$notifications => $notifications.filter(n => !n.read).length
);

export const hasUnread: Readable<boolean> = derived(
	unreadCount,
	$count => $count > 0
);

// Função separada para logout
export function clearNotificationsOnLogout(): void {
	if (isClient) {
		localStorage.removeItem(STORAGE_KEY);
		notificationStore.clearAll();
	}
}

// Notification helpers com melhor organização
export const notificationHelpers = {
	order: {
		statusUpdate(orderId: string, status: string): string {
			return notificationStore.addNotification({
				title: 'Atualização do Pedido',
				message: `Seu pedido #${orderId} está ${status}`,
				type: 'order',
				link: `/meus-pedidos/${orderId}`
			});
		}
	},
	
	promotion: {
		announce(title: string, message: string, link?: string): string {
			return notificationStore.addNotification({
				title,
				message,
				type: 'promotion',
				link
			});
		}
	},
	
	product: {
		available(productName: string, productSlug: string): string {
			return notificationStore.addNotification({
				title: 'Produto Disponível!',
				message: `${productName} está disponível novamente`,
				type: 'success',
				link: `/produto/${productSlug}`
			});
		}
	},
	
	cart: {
		abandoned(): string {
			return notificationStore.addNotification({
				title: 'Você esqueceu alguns itens!',
				message: 'Finalize sua compra antes que acabem',
				type: 'warning',
				link: '/carrinho'
			});
		}
	}
}; 