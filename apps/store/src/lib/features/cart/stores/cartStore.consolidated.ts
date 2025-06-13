/**
 * CART STORE CONSOLIDADO - Versão Final Unificada
 * 
 * Este store consolida todas as funcionalidades dos stores anteriores
 * mantendo compatibilidade total com código existente.
 * 
 * Migração segura: todos os exports existentes são preservados
 */

import { writable, derived, get } from 'svelte/store';
import { nanoid } from 'nanoid';
import { user } from '$lib/stores/authStore';

// ============================================================================
// IMPORTS DE TIPOS - Unificando referências
// ============================================================================

// Usando tipos consolidados (mantem compatibilidade)
import type { 
  CartItem, 
  SellerGroup, 
  Coupon,
  AppliedBenefits 
} from '$lib/types/cart';

// Tipos internos específicos do store
interface ConsolidatedCartTotals {
  cartSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  couponDiscount: number;
  freeShippingSavings: number;
  cartTotal: number;
  installmentValue: number;
  hasFreeShipping: boolean;
  
  // Compatibilidade com sistema antigo
  cart_subtotal?: number;
  total_shipping?: number;
  total_discount?: number;
  cart_total?: number;
  item_discounts?: number;
  shipping_discount?: number;
  cashback_total?: number;
  points_total?: number;
  max_installments?: number;
  pix_discount?: number;
  pix_total?: number;
  has_free_shipping?: boolean;
  has_express_shipping?: boolean;
  estimated_delivery_days?: number;
}

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================

const STORAGE_KEYS = {
  CART: 'mktplace_cart',
  COUPON: 'mktplace_cart_coupon', 
  SESSION: 'mktplace_cart_session',
  ZIP_CODE: 'mktplace_cart_zip',
  
  // Compatibilidade com sistema antigo
  LEGACY_CART: 'cart',
  LEGACY_COUPON: 'cartCoupon',
  LEGACY_SESSION: 'cartSessionId'
} as const;

const CART_CONFIG = {
  MAX_ITEMS: 50,
  MAX_QUANTITY_PER_ITEM: 99,
  SESSION_DURATION_HOURS: 24,
  AUTO_SAVE_INTERVAL_MS: 1000,
  MIGRATION_VERSION: '3.1.0'
} as const;

// ============================================================================
// UTILITÁRIOS DE MIGRAÇÃO E COMPATIBILIDADE
// ============================================================================

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return nanoid(32);
  
  // Tentar carregar de qualquer uma das chaves (nova ou legacy)
  let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION) || 
                 localStorage.getItem(STORAGE_KEYS.LEGACY_SESSION);
                 
  if (!sessionId) {
    sessionId = nanoid(32);
    // Salvar nas duas chaves para compatibilidade
    localStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
    localStorage.setItem(STORAGE_KEYS.LEGACY_SESSION, sessionId);
  }
  
  return sessionId;
}

function loadFromStorage<T>(key: string, legacyKey: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  
  try {
    // Tentar nova chave primeiro, depois legacy
    const saved = localStorage.getItem(key) || localStorage.getItem(legacyKey);
    if (!saved) return fallback;
    
    const parsed = JSON.parse(saved);
    
    // Se carregou da legacy, migrar para nova chave
    if (!localStorage.getItem(key) && localStorage.getItem(legacyKey)) {
      localStorage.setItem(key, saved);
      console.log(`🔄 Migrated ${legacyKey} → ${key}`);
    }
    
    return parsed;
  } catch (error) {
    console.warn(`Erro ao carregar ${key}/${legacyKey}:`, error);
    return fallback;
  }
}

function saveToStorage(key: string, legacyKey: string, value: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    const serialized = JSON.stringify(value);
    // Salvar nas duas chaves para compatibilidade total
    localStorage.setItem(key, serialized);
    localStorage.setItem(legacyKey, serialized);
  } catch (error) {
    console.warn(`Erro ao salvar ${key}:`, error);
  }
}

function calculateDiscount(value: number, coupon: Coupon): number {
  if (coupon.minValue && value < coupon.minValue) return 0;
  
  switch (coupon.type) {
    case 'percentage':
      return value * (coupon.value / 100);
    case 'fixed':
      return Math.min(coupon.value, value);
    case 'free_shipping':
      return 0; // Calculado separadamente
    default:
      return 0;
  }
}

// ============================================================================
// SERVICES DE CUPOM (Consolidados)
// ============================================================================

async function validateCouponApi(code: string, items: CartItem[]): Promise<Coupon | null> {
  try {
    const currentUser = get(user);
    const sessionId = getOrCreateSessionId();
    
    const request = {
      code: code.toUpperCase(),
      user_id: currentUser?.id,
      session_id: sessionId,
      items: items.map((item: CartItem) => ({
        product_id: item.product.id,
        seller_id: item.sellerId,
        category_id: (item.product as any).category_id,
        quantity: item.quantity,
        price: item.product.price
      })),
      shipping_cost: 0,
      current_total: items.reduce((sum: number, item: CartItem) => 
        sum + (item.product.price * item.quantity), 0)
    };

    const response = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const result = await response.json();

    if (result.success && result.coupon) {
      return {
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        scope: result.coupon.scope === 'global' ? 'cart' : result.coupon.scope,
        description: result.coupon.description || result.coupon.name,
        minValue: result.coupon.min_order_amount || 0
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return null;
  }
}

// ============================================================================
// STORE CONSOLIDADO - CRIAÇÃO
// ============================================================================

function createConsolidatedCartStore() {
  // ===== Estado Reativo Base =====
  const items = writable<CartItem[]>(
    loadFromStorage(STORAGE_KEYS.CART, STORAGE_KEYS.LEGACY_CART, [])
  );
  
  const appliedCoupon = writable<Coupon | null>(
    loadFromStorage(STORAGE_KEYS.COUPON, STORAGE_KEYS.LEGACY_COUPON, null)
  );
  
  const zipCode = writable<string>(
    loadFromStorage(STORAGE_KEYS.ZIP_CODE, '', '')
  );
  
  const isLoading = writable<boolean>(false);
  const lastError = writable<string | null>(null);

  // ===== Persistência Automática (Compatibilidade Dupla) =====
  items.subscribe(value => {
    saveToStorage(STORAGE_KEYS.CART, STORAGE_KEYS.LEGACY_CART, value);
    lastError.set(null);
  });
  
  appliedCoupon.subscribe(value => {
    if (value) {
      saveToStorage(STORAGE_KEYS.COUPON, STORAGE_KEYS.LEGACY_COUPON, value);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.COUPON);
        localStorage.removeItem(STORAGE_KEYS.LEGACY_COUPON);
      }
    }
  });

  zipCode.subscribe(value => {
    saveToStorage(STORAGE_KEYS.ZIP_CODE, '', value);
  });

  // ===== Derived Stores Consolidados =====
  
  const sellerGroups = derived(
    [items, appliedCoupon],
    ([$items, $appliedCoupon]) => {
      const groups: Record<string, SellerGroup> = {};
      
      $items.forEach(item => {
        const sellerId = item.sellerId;
        
        if (!groups[sellerId]) {
          groups[sellerId] = {
            sellerId: sellerId,
            sellerName: item.sellerName,
            items: [],
            subtotal: 0,
            discount: 0,
            total: 0,
            shippingOptions: [],
            shippingCost: 0,
            hasFreeShipping: false
          };
        }
        
        groups[sellerId].items.push(item);
      });
      
      // Calcular totais por grupo
      Object.values(groups).forEach(group => {
        group.subtotal = group.items.reduce((sum, item) => {
          return sum + (item.product.price * item.quantity);
        }, 0);
        
        if (group.appliedCoupon) {
          group.discount = calculateDiscount(group.subtotal, group.appliedCoupon);
        }
        
        if ($appliedCoupon?.type === 'free_shipping') {
          group.hasFreeShipping = true;
        }
        
        group.total = group.subtotal - group.discount;
      });
      
      return Object.values(groups);
    }
  );
  
  // Totais consolidados com DUPLA COMPATIBILIDADE
  const cartTotals = derived(
    [sellerGroups, appliedCoupon],
    ([$groups, $appliedCoupon]) => {
      const cartSubtotal = $groups.reduce((sum, group) => sum + group.subtotal, 0);
      const totalDiscount = $groups.reduce((sum, group) => sum + group.discount, 0);
      
      let couponDiscount = 0;
      let freeShippingSavings = 0;
      
      if ($appliedCoupon && $appliedCoupon.scope === 'cart') {
        if ($appliedCoupon.type === 'free_shipping') {
          freeShippingSavings = 0; // Calculado externamente
        } else {
          couponDiscount = calculateDiscount(cartSubtotal, $appliedCoupon);
        }
      }
      
      const totalDiscountWithCoupon = totalDiscount + couponDiscount;
      const finalTotal = cartSubtotal - totalDiscountWithCoupon;
      
      // Retorno com DUPLA INTERFACE para compatibilidade total
      const consolidatedTotals: ConsolidatedCartTotals = {
        // Interface nova (padrão)
        cartSubtotal,
        totalShipping: 0,
        totalDiscount: totalDiscountWithCoupon,
        couponDiscount,
        freeShippingSavings,
        cartTotal: finalTotal,
        installmentValue: finalTotal / 12,
        hasFreeShipping: $appliedCoupon?.type === 'free_shipping',
        
        // Interface legacy (compatibilidade)
        cart_subtotal: cartSubtotal,
        total_shipping: 0,
        total_discount: totalDiscountWithCoupon,
        cart_total: finalTotal,
        item_discounts: totalDiscount,
        shipping_discount: 0,
        cashback_total: 0,
        points_total: 0,
        max_installments: 12,
        pix_discount: finalTotal * 0.05,
        pix_total: finalTotal * 0.95,
        has_free_shipping: $appliedCoupon?.type === 'free_shipping',
        has_express_shipping: false,
        estimated_delivery_days: 7
      };
      
      return consolidatedTotals;
    }
  );

  const totalItemsStore = derived(items, ($items) => {
    return $items.reduce((sum, item) => sum + item.quantity, 0);
  });

  // ===== AÇÕES CONSOLIDADAS =====
  
  function addItem(
    product: any,
    sellerId: string,
    sellerName: string,
    quantity: number = 1,
    options?: { color?: string; size?: string }
  ): void {
    if (quantity <= 0 || quantity > CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
      lastError.set(`Quantidade deve ser entre 1 e ${CART_CONFIG.MAX_QUANTITY_PER_ITEM}`);
      return;
    }

    items.update(currentItems => {
      const existingIndex = currentItems.findIndex(item => 
        item.product.id === product.id &&
        item.sellerId === sellerId &&
        item.selectedColor === options?.color &&
        item.selectedSize === options?.size
      );
      
      if (existingIndex >= 0) {
        const newQuantity = currentItems[existingIndex].quantity + quantity;
        if (newQuantity > CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
          lastError.set(`Quantidade máxima por item: ${CART_CONFIG.MAX_QUANTITY_PER_ITEM}`);
          return currentItems;
        }
        
        currentItems[existingIndex].quantity = newQuantity;
        return [...currentItems];
      } else {
        const newItem: CartItem = {
          product,
          quantity,
          selectedColor: options?.color,
          selectedSize: options?.size,
          sellerId: sellerId,
          sellerName: sellerName
        };
        
        return [...currentItems, newItem];
      }
    });
  }
  
  function removeItem(
    productId: string,
    sellerId: string,
    options?: { color?: string; size?: string }
  ): void {
    items.update(currentItems => {
      return currentItems.filter(item => 
        !(item.product.id === productId &&
          item.sellerId === sellerId &&
          item.selectedColor === options?.color &&
          item.selectedSize === options?.size)
      );
    });
  }
  
  function updateQuantity(
    productId: string,
    sellerId: string,
    quantity: number,
    options?: { color?: string; size?: string }
  ): void {
    if (quantity <= 0) {
      removeItem(productId, sellerId, options);
      return;
    }
    
    if (quantity > CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
      lastError.set(`Quantidade máxima por item: ${CART_CONFIG.MAX_QUANTITY_PER_ITEM}`);
      return;
    }
    
    items.update(currentItems => {
      const index = currentItems.findIndex(item => 
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
  }
  
  async function applyCoupon(code: string): Promise<void> {
    if (!code.trim()) {
      lastError.set('Código do cupom é obrigatório');
      return;
    }
    
    isLoading.set(true);
    lastError.set(null);
    
    try {
      const currentItems = get(items);
      const coupon = await validateCouponApi(code.trim(), currentItems);
      
      if (!coupon) {
        throw new Error('Cupom inválido ou expirado');
      }
      
      const $totals = get(cartTotals);
      if (coupon.minValue && $totals.cartSubtotal < coupon.minValue) {
        throw new Error(`Pedido mínimo de R$ ${coupon.minValue.toFixed(2)} para usar este cupom`);
      }
      
      appliedCoupon.set(coupon);
    } catch (error) {
      lastError.set(error instanceof Error ? error.message : 'Erro ao aplicar cupom');
      throw error;
    } finally {
      isLoading.set(false);
    }
  }
  
  function removeCoupon(): void {
    appliedCoupon.set(null);
  }
  
  function clearCart(): void {
    items.set([]);
    appliedCoupon.set(null);
  }
  
  // FUNÇÃO DE COMPATIBILIDADE para sistemas antigos
  function getTotalItems(): number {
    return get(totalItemsStore);
  }

  // ===== RETURN COM COMPATIBILIDADE TOTAL =====
  return {
    // Stores principais
    items,
    appliedCoupon,
    sellerGroups,
    cartTotals,
    zipCode,
    isLoading,
    lastError,
    totalItems: totalItemsStore,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    removeCoupon,
    clearCart,
    
    // Função de compatibilidade legacy
    getTotalItems,
    
    // Metadados
    version: CART_CONFIG.MIGRATION_VERSION,
    isConsolidated: true
  };
}

// ============================================================================
// EXPORTS CONSOLIDADOS
// ============================================================================

export const consolidatedCartStore = createConsolidatedCartStore();

// Exports de compatibilidade - MANTÉM TUDO FUNCIONANDO
export const cartStore = consolidatedCartStore;
export const advancedCartStore = consolidatedCartStore;
export const unifiedCartStore = consolidatedCartStore;

// Export default para compatibilidade máxima
export default consolidatedCartStore; 