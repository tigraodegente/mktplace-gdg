import { writable, derived, get } from 'svelte/store';

// Definindo Product localmente até resolver imports
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  [key: string]: any; // Permitir propriedades adicionais
}

export interface WishlistItem extends Product {
  addedAt: Date;
}

// Criar a store principal da wishlist
function createWishlistStore() {
  // Estado inicial - tentar carregar do localStorage
  const storedWishlist = typeof window !== 'undefined' 
    ? localStorage.getItem('wishlist') 
    : null;
  
  const initialItems: WishlistItem[] = storedWishlist 
    ? JSON.parse(storedWishlist) 
    : [];

  // Store principal
  const { subscribe, set, update } = writable<WishlistItem[]>(initialItems);

  // Salvar no localStorage sempre que houver mudanças
  subscribe((items) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wishlist', JSON.stringify(items));
    }
  });

  return {
    subscribe,
    
    // Adicionar item à wishlist
    addItem: (product: Product) => {
      update(items => {
        // Verificar se o produto já está na wishlist
        const exists = items.some(item => item.id === product.id);
        
        if (!exists) {
          return [...items, { ...product, addedAt: new Date() }];
        }
        
        return items;
      });
    },
    
    // Remover item da wishlist
    removeItem: (productId: string) => {
      update(items => items.filter(item => item.id !== productId));
    },
    
    // Verificar se um produto está na wishlist
    hasItem: (productId: string): boolean => {
      const items = get({ subscribe });
      return items.some(item => item.id === productId);
    },
    
    // Limpar toda a wishlist
    clear: () => {
      set([]);
    },
    
    // Toggle item (adicionar se não existe, remover se existe)
    toggleItem: (product: Product) => {
      const items = get({ subscribe });
      const exists = items.some(item => item.id === product.id);
      
      if (exists) {
        update(items => items.filter(item => item.id !== product.id));
      } else {
        update(items => [...items, { ...product, addedAt: new Date() }]);
      }
    }
  };
}

// Criar a instância da store
export const wishlistStore = createWishlistStore();

// Store derivada para contar o total de itens
export const wishlistCount = derived(
  wishlistStore,
  $wishlist => $wishlist.length
);

// Store derivada para verificar se a wishlist está vazia
export const isWishlistEmpty = derived(
  wishlistStore,
  $wishlist => $wishlist.length === 0
); 