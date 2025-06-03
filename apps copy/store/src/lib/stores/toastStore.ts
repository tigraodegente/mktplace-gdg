import { writable } from 'svelte/store';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

function createToastStore() {
  const { subscribe, update } = writable<ToastNotification[]>([]);
  
  let defaultPosition: ToastNotification['position'] = 'top-right';
  let defaultDuration = 5000;
  
  return {
    subscribe,
    
    /**
     * Adiciona uma nova notificação
     */
    add(notification: Omit<ToastNotification, 'id'>) {
      const id = crypto.randomUUID();
      const toast: ToastNotification = {
        id,
        duration: defaultDuration,
        position: defaultPosition,
        ...notification
      };
      
      update(toasts => [...toasts, toast]);
      
      // Auto remove após duração
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          this.remove(id);
        }, toast.duration);
      }
      
      return id;
    },
    
    /**
     * Remove uma notificação específica
     */
    remove(id: string) {
      update(toasts => toasts.filter(t => t.id !== id));
    },
    
    /**
     * Remove todas as notificações
     */
    clear() {
      update(() => []);
    },
    
    /**
     * Métodos de conveniência para cada tipo
     */
    success(message: string, title?: string, options?: Partial<ToastNotification>) {
      return this.add({ ...options, type: 'success', message, title });
    },
    
    error(message: string, title?: string, options?: Partial<ToastNotification>) {
      return this.add({ ...options, type: 'error', message, title });
    },
    
    warning(message: string, title?: string, options?: Partial<ToastNotification>) {
      return this.add({ ...options, type: 'warning', message, title });
    },
    
    info(message: string, title?: string, options?: Partial<ToastNotification>) {
      return this.add({ ...options, type: 'info', message, title });
    },
    
    /**
     * Configurações globais
     */
    setDefaultPosition(position: ToastNotification['position']) {
      defaultPosition = position;
    },
    
    setDefaultDuration(duration: number) {
      defaultDuration = duration;
    }
  };
}

export const toastStore = createToastStore(); 