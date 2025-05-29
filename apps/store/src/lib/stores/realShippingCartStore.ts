/**
 * Real Shipping Cart Store
 * 
 * Versão atualizada do advancedCartStore que integra com 
 * o sistema universal de frete (Frenet + outras transportadoras)
 */

import { writable, derived, get } from 'svelte/store';
import type { Product } from '@mktplace/shared-types';
import { formatCurrency } from '@mktplace/utils';
import { UniversalShippingService, type ShippingQuote, type ShippingOption } from '$lib/services/universalShippingService';

// ============================================================================
// TYPES ATUALIZADOS
// ============================================================================

export interface CartItem {
  product: Product;
  quantity: number;
  sellerId: string;
  sellerName: string;
  selectedColor?: string;
  selectedSize?: string;
  shippingOption?: ShippingOption; // Opção de frete selecionada
}

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotal: number;
  shippingQuote?: ShippingQuote;        // Cotações disponíveis
  selectedShipping?: ShippingOption;    // Frete selecionado
  total: number;
}

export interface CartTotals {
  cartSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  cartTotal: number;
  installmentValue: number;
  freeShippingProgress?: {
    current: number;
    needed: number;
    remaining: number;
    progress: number; // 0-100
  };
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  CART: 'realShippingCart',
  ZIP_CODE: 'cartZipCode',
  SHIPPING_SELECTIONS: 'cartShippingSelections'
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error(`Erro ao carregar ${key} do localStorage:`, e);
    return fallback;
  }
}

function saveToStorage(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erro ao salvar ${key} no localStorage:`, e);
  }
}

// ============================================================================
// STORE CREATION
// ============================================================================

function createRealShippingCartStore() {
  // ===== State Stores =====
  const items = writable<CartItem[]>(loadFromStorage(STORAGE_KEYS.CART, []));
  const zipCode = writable<string>(loadFromStorage(STORAGE_KEYS.ZIP_CODE, ''));
  const loadingShipping = writable<boolean>(false);
  const shippingQuotes = writable<ShippingQuote[]>([]);
  const shippingSelections = writable<Record<string, string>>(
    loadFromStorage(STORAGE_KEYS.SHIPPING_SELECTIONS, {})
  );
  
  // ===== Persistence Subscriptions =====
  items.subscribe(value => saveToStorage(STORAGE_KEYS.CART, value));
  zipCode.subscribe(value => saveToStorage(STORAGE_KEYS.ZIP_CODE, value));
  shippingSelections.subscribe(value => saveToStorage(STORAGE_KEYS.SHIPPING_SELECTIONS, value));
  
  // ===== Derived Stores =====
  
  // Agrupar itens por seller
  const sellerGroups = derived(
    [items, shippingQuotes, shippingSelections],
    ([$items, $quotes, $selections]) => {
      const groups: Record<string, SellerGroup> = {};
      
      // Agrupar itens por seller
      $items.forEach(item => {
        if (!groups[item.sellerId]) {
          groups[item.sellerId] = {
            sellerId: item.sellerId,
            sellerName: item.sellerName,
            items: [],
            subtotal: 0,
            total: 0
          };
        }
        groups[item.sellerId].items.push(item);
      });
      
      // Calcular subtotais e aplicar dados de frete
      Object.values(groups).forEach(group => {
        // Calcular subtotal
        group.subtotal = group.items.reduce((sum, item) => {
          return sum + (item.product.price * item.quantity);
        }, 0);
        
        // Buscar quote de frete para este seller
        const quote = $quotes.find(q => q.sellerId === group.sellerId);
        group.shippingQuote = quote;
        
        // Buscar opção de frete selecionada
        const selectedOptionId = $selections[group.sellerId];
        if (selectedOptionId && quote) {
          group.selectedShipping = quote.options.find(opt => opt.id === selectedOptionId);
        }
        
        // Calcular total do grupo
        const shippingCost = group.selectedShipping?.price || 0;
        group.total = group.subtotal + shippingCost;
      });
      
      return Object.values(groups);
    }
  );
  
  // Totais do carrinho
  const cartTotals = derived(
    [sellerGroups],
    ([$groups]) => {
      const cartSubtotal = $groups.reduce((sum, group) => sum + group.subtotal, 0);
      const totalShipping = $groups.reduce((sum, group) => sum + (group.selectedShipping?.price || 0), 0);
      const cartTotal = cartSubtotal + totalShipping;
      
      // Calcular progresso para frete grátis (baseado no maior threshold encontrado)
      let freeShippingProgress;
      const maxThreshold = Math.max(
        ...$groups.map(g => g.shippingQuote?.options.find(opt => opt.isFree)?.originalPrice || 0),
        199 // Fallback padrão
      );
      
      if (maxThreshold > 0) {
        const remaining = Math.max(0, maxThreshold - cartSubtotal);
        freeShippingProgress = {
          current: cartSubtotal,
          needed: maxThreshold,
          remaining,
          progress: Math.min(100, (cartSubtotal / maxThreshold) * 100)
        };
      }
      
      return {
        cartSubtotal,
        totalShipping,
        totalDiscount: 0, // TODO: Implementar cupons
        cartTotal,
        installmentValue: cartTotal / 12,
        freeShippingProgress
      };
    }
  );
  
  // ===== Actions =====
  
  // Adicionar item ao carrinho
  function addItem(
    product: Product,
    sellerId: string,
    sellerName: string,
    quantity = 1,
    options?: { color?: string; size?: string }
  ) {
    items.update(currentItems => {
      const existingIndex = currentItems.findIndex(
        item =>
          item.product.id === product.id &&
          item.sellerId === sellerId &&
          item.selectedColor === options?.color &&
          item.selectedSize === options?.size
      );
      
      if (existingIndex >= 0) {
        // Atualizar quantidade do item existente
        currentItems[existingIndex].quantity += quantity;
        return [...currentItems];
      } else {
        // Adicionar novo item
        return [...currentItems, {
          product,
          quantity,
          sellerId,
          sellerName,
          selectedColor: options?.color,
          selectedSize: options?.size
        }];
      }
    });
    
    // Limpar cotações para recalcular
    clearShippingQuotes();
  }
  
  // Remover item do carrinho
  function removeItem(
    productId: string,
    sellerId: string,
    options?: { color?: string; size?: string }
  ) {
    items.update(currentItems => {
      return currentItems.filter(item =>
        !(item.product.id === productId &&
        item.sellerId === sellerId &&
        item.selectedColor === options?.color &&
        item.selectedSize === options?.size)
      );
    });
    
    clearShippingQuotes();
  }
  
  // Atualizar quantidade
  function updateQuantity(
    productId: string,
    sellerId: string,
    quantity: number,
    options?: { color?: string; size?: string }
  ) {
    if (quantity <= 0) {
      removeItem(productId, sellerId, options);
      return;
    }
    
    items.update(currentItems => {
      const index = currentItems.findIndex(
        item =>
          item.product.id === productId &&
          item.sellerId === sellerId &&
          item.selectedColor === options?.color &&
          item.selectedSize === options?.size
      );
      
      if (index >= 0) {
        currentItems[index].quantity = quantity;
        return [...currentItems];
      }
      
      return currentItems;
    });
    
    clearShippingQuotes();
  }
  
  // Calcular frete para todos os sellers
  async function calculateAllShipping(zip: string, platform?: any) {
    if (!zip || zip.length < 8) return;
    
    loadingShipping.set(true);
    const $items = get(items);
    
    try {
      // Agrupar itens por seller
      const itemsBySeller: Record<string, any[]> = {};
      $items.forEach(item => {
        if (!itemsBySeller[item.sellerId]) {
          itemsBySeller[item.sellerId] = [];
        }
        itemsBySeller[item.sellerId].push({
          product: item.product,
          quantity: item.quantity,
          sellerId: item.sellerId,
          sellerName: item.sellerName
        });
      });
      
      // Calcular frete usando o serviço universal
      const quotes = await UniversalShippingService.calculateShippingForCart(
        platform,
        zip,
        itemsBySeller
      );
      
      shippingQuotes.set(quotes);
      zipCode.set(zip);
      
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      shippingQuotes.set([]);
    } finally {
      loadingShipping.set(false);
    }
  }
  
  // Selecionar opção de frete para um seller
  function selectShippingOption(sellerId: string, optionId: string) {
    shippingSelections.update(selections => ({
      ...selections,
      [sellerId]: optionId
    }));
  }
  
  // Limpar cotações de frete
  function clearShippingQuotes() {
    shippingQuotes.set([]);
    shippingSelections.set({});
  }
  
  // Limpar carrinho
  function clearCart() {
    items.set([]);
    clearShippingQuotes();
  }
  
  // Total de itens
  function totalItems() {
    return get(items).reduce((sum, item) => sum + item.quantity, 0);
  }
  
  // Verificar se tem frete grátis disponível
  function hasFreeShippingAvailable() {
    const $quotes = get(shippingQuotes);
    return $quotes.some(quote => 
      quote.options.some(option => option.isFree)
    );
  }
  
  // Obter melhor opção de frete para cada seller (menor preço)
  function getBestShippingOptions() {
    const $quotes = get(shippingQuotes);
    const bestOptions: Record<string, ShippingOption> = {};
    
    $quotes.forEach(quote => {
      if (quote.options.length > 0) {
        // Priorizar frete grátis, depois menor preço
        const freeOption = quote.options.find(opt => opt.isFree);
        const cheapestOption = quote.options.reduce((best, current) => 
          current.price < best.price ? current : best
        );
        
        bestOptions[quote.sellerId] = freeOption || cheapestOption;
      }
    });
    
    return bestOptions;
  }
  
  // Auto-selecionar melhores opções de frete
  function autoSelectBestShipping() {
    const bestOptions = getBestShippingOptions();
    
    shippingSelections.update(selections => {
      const newSelections = { ...selections };
      
      Object.entries(bestOptions).forEach(([sellerId, option]) => {
        newSelections[sellerId] = option.id;
      });
      
      return newSelections;
    });
  }
  
  return {
    // Stores
    items,
    zipCode,
    loadingShipping,
    shippingQuotes,
    shippingSelections,
    sellerGroups,
    cartTotals,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    calculateAllShipping,
    selectShippingOption,
    clearShippingQuotes,
    clearCart,
    totalItems,
    hasFreeShippingAvailable,
    getBestShippingOptions,
    autoSelectBestShipping
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const realShippingCartStore = createRealShippingCartStore(); 