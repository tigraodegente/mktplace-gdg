import { writable } from 'svelte/store';
import type { CartItem } from '$lib/types/checkout';

interface CartState {
  items: CartItem[];
  totals: {
    itemCount: number;
    subtotal: number;
    total: number;
  };
}

const initialState: CartState = {
  items: [],
  totals: {
    itemCount: 0,
    subtotal: 0,
    total: 0
  }
};

function createCartStore() {
  const { subscribe, set, update } = writable<CartState>(initialState);

  function calculateTotals(items: CartItem[]) {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    return {
      itemCount,
      subtotal,
      total: subtotal
    };
  }

  return {
    subscribe,
    
    // Actions
    addItem: (item: CartItem) => {
      update(state => {
        const existingIndex = state.items.findIndex(i => i.productId === item.productId);
        let newItems;
        
        if (existingIndex >= 0) {
          newItems = [...state.items];
          newItems[existingIndex].quantity += item.quantity;
        } else {
          newItems = [...state.items, item];
        }
        
        return {
          items: newItems,
          totals: calculateTotals(newItems)
        };
      });
    },
    
    updateQuantity: (productId: string, quantity: number) => {
      update(state => {
        const newItems = state.items.map(item => 
          item.productId === productId 
            ? { ...item, quantity: Math.max(0, quantity) }
            : item
        ).filter(item => item.quantity > 0);
        
        return {
          items: newItems,
          totals: calculateTotals(newItems)
        };
      });
    },
    
    removeItem: (productId: string) => {
      update(state => {
        const newItems = state.items.filter(item => item.productId !== productId);
        return {
          items: newItems,
          totals: calculateTotals(newItems)
        };
      });
    },
    
    clear: () => {
      set(initialState);
    },
    
    loadFromStorage: () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('cart');
        if (saved) {
          try {
            const items = JSON.parse(saved);
            set({
              items,
              totals: calculateTotals(items)
            });
          } catch (error) {
            console.error('Erro ao carregar carrinho:', error);
          }
        }
      }
    },
    
    saveToStorage: (items: CartItem[]) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(items));
      }
    }
  };
}

export const cartStore = createCartStore(); 