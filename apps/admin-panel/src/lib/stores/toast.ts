import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	title: string;
	message?: string;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);
	
	function add(toast: Omit<Toast, 'id'>) {
		const id = Math.random().toString(36).substring(2, 9);
		const newToast: Toast = {
			id,
			duration: 5000,
			...toast
		};
		
		update(toasts => [...toasts, newToast]);
		
		// Auto remover após duration
		if (newToast.duration && newToast.duration > 0) {
			setTimeout(() => {
				remove(id);
			}, newToast.duration);
		}
		
		return id;
	}
	
	function remove(id: string) {
		update(toasts => toasts.filter(t => t.id !== id));
	}
	
	function clear() {
		update(() => []);
	}
	
	// Funções de conveniência
	const success = (title: string, message?: string) => 
		add({ type: 'success', title, message });
		
	const error = (title: string, message?: string) => 
		add({ type: 'error', title, message });
		
	const warning = (title: string, message?: string) => 
		add({ type: 'warning', title, message });
		
	const info = (title: string, message?: string) => 
		add({ type: 'info', title, message });
	
	return {
		subscribe,
		add,
		remove,
		clear,
		success,
		error,
		warning,
		info
	};
}

export const toast = createToastStore(); 