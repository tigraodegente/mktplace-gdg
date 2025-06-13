/**
 * Cart Store - Versão Refatorada com Services
 * 
 * NOVA ARQUITETURA com services extraídos
 * Mantém 100% compatibilidade com API existente
 */

import { writable, derived, get } from 'svelte/store';
import type { 
  CartItem, 
  SellerGroup, 
  Coupon, 
  CartTotals,
  Product 
} from '../../shared/types/commerce';
import { user } from '../../../stores/authStore';

// Services
import { getCartPersistenceService, STORAGE_KEYS } from '../services/persistence.service';
import { getCartSessionService } from '../services/session.service';
import { getCartCouponService } from '../services/coupon.service';
import { getCartCalculationService } from '../services/calculation.service';

// =============================================================================
// FEATURE FLAGS
// =============================================================================

const USE_SERVICES = true; // Flag para controlar uso dos services

// =============================================================================
// STORE FACTORY COM SERVICES
// =============================================================================

function createRefactoredCartStore() {
  // Services (injetados via factory)
  const persistenceService = getCartPersistenceService();
  const sessionService = getCartSessionService();
  const couponService = getCartCouponService();
  const calculationService = getCartCalculationService();
  
  // ===== Estado Reativo =====
  const items = writable<CartItem[]>(persistenceService.loadFromStorage(STORAGE_KEYS.CART, []));
  const appliedCoupon = writable<Coupon | null>(persistenceService.loadFromStorage(STORAGE_KEYS.COUPON, null));
  
  // ===== Persistência Automática =====
  items.subscribe(value => persistenceService.saveToStorage(STORAGE_KEYS.CART, value));
  appliedCoupon.subscribe(value => {
    if (value) {
      persistenceService.saveToStorage(STORAGE_KEYS.COUPON, value);
    } else {
      persistenceService.removeFromStorage(STORAGE_KEYS.COUPON);
    }
  });
  
  // ===== Computações Derivadas =====
  
  const sellerGroups = derived(
    [items], 
    ([$items]) => {
      if (USE_SERVICES) {
        // Usar service de cálculo
        return calculationService.groupItemsBySeller($items);
      } else {
        // Implementação inline (fallback)
        return groupItemsInline($items);
      }
    }
  );
  
  const cartTotals = derived(
    [sellerGroups, appliedCoupon], 
    ([$groups, $appliedCoupon]) => {
      if (USE_SERVICES) {
        // Usar service de cálculo
        return calculationService.calculateCartTotals($groups, $appliedCoupon);
      } else {
        // Implementação inline (fallback)
        return calculateTotalsInline($groups, $appliedCoupon);
      }
    }
  );
  
  // ===== AÇÕES =====
  
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
        currentItems[existingIndex].quantity += quantity;
        return [...currentItems];
      } else {
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
  }
  
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
  }
  
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
  }
  
  async function applyCoupon(code: string) {
    const currentItems = get(items);
    
    let coupon: Coupon | null;
    
    if (USE_SERVICES) {
      // Usar service de cupom
      coupon = await couponService.validateCoupon(code, currentItems);
    } else {
      // Implementação inline (fallback)
      coupon = await validateCouponInline(code, currentItems);
    }
    
    if (!coupon) {
      throw new Error('Cupom inválido ou expirado');
    }

    const $totals = get(cartTotals);
    
    if (coupon.minValue && $totals.cartSubtotal < coupon.minValue) {
      throw new Error(`Pedido mínimo de R$ ${coupon.minValue.toFixed(2)} para usar este cupom`);
    }
    
    appliedCoupon.set(coupon);
  }
  
  function removeCoupon() {
    console.log('🗑️ REMOVENDO CUPOM (Refactored Store)');
    appliedCoupon.set(null);
  }
  
  function clearCart() {
    items.set([]);
    appliedCoupon.set(null);
  }
  
  function totalItems() {
    return get(items).reduce((sum, item) => sum + item.quantity, 0);
  }

  // ===== API PÚBLICA (100% Compatível) =====
  return {
    // Stores - Mantém exata compatibilidade
    items,
    appliedCoupon,
    sellerGroups,
    cartTotals,
    
    // Actions - Mesma assinatura
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    removeCoupon,
    clearCart,
    totalItems,
    
    // Meta info para debugging
    __version: '2.1.0-refactored',
    __isNewStore: true,
    __usesServices: USE_SERVICES
  };
}

// =============================================================================
// FALLBACK FUNCTIONS (Para quando services estão desabilitados)
// =============================================================================

function groupItemsInline(items: CartItem[]): SellerGroup[] {
  const groups: Record<string, SellerGroup> = {};
  
  items.forEach(item => {
    if (!groups[item.sellerId]) {
      groups[item.sellerId] = {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        items: [],
        subtotal: 0,
        shippingOptions: [],
        shippingCost: 0,
        discount: 0,
        total: 0
      };
    }
    groups[item.sellerId].items.push(item);
  });
  
  Object.values(groups).forEach(group => {
    group.subtotal = group.items.reduce((sum, item) => {
      const itemPrice = item.product.price * item.quantity;
      const itemDiscount = item.appliedCoupon 
        ? calculateDiscountInline(itemPrice, item.appliedCoupon) 
        : 0;
      return sum + itemPrice - itemDiscount;
    }, 0);
    
    if (group.appliedCoupon) {
      group.discount = calculateDiscountInline(group.subtotal, group.appliedCoupon);
    }
    
    group.total = group.subtotal - group.discount;
  });
  
  return Object.values(groups);
}

function calculateTotalsInline(groups: SellerGroup[], appliedCoupon: Coupon | null): CartTotals {
  const cartSubtotal = groups.reduce((sum, group) => sum + group.subtotal, 0);
  const totalDiscount = groups.reduce((sum, group) => sum + group.discount, 0);
  
  let couponDiscount = 0;
  
  if (appliedCoupon && appliedCoupon.scope === 'cart') {
    if (appliedCoupon.type === 'free_shipping') {
      console.log(`🚚 CUPOM FRETE GRÁTIS DETECTADO - Gerenciado pelo sistema real da página`);
    } else {
      couponDiscount = calculateDiscountInline(cartSubtotal, appliedCoupon);
    }
  }
  
  const totalDiscountWithCoupon = totalDiscount + couponDiscount;
  const finalTotal = cartSubtotal - totalDiscountWithCoupon;
  
  return {
    cartSubtotal,
    totalShipping: 0,
    totalDiscount: totalDiscountWithCoupon,
    couponDiscount,
    freeShippingSavings: 0,
    cartTotal: finalTotal,
    installmentValue: finalTotal / 12
  };
}

function calculateDiscountInline(value: number, coupon: Coupon): number {
  if (coupon.minValue && value < coupon.minValue) return 0;
  
  if (coupon.type === 'percentage') {
    return value * (coupon.value / 100);
  } else {
    return Math.min(coupon.value, value);
  }
}

async function validateCouponInline(code: string, items: CartItem[]): Promise<Coupon | null> {
  // Implementação inline básica como fallback
  try {
    const cartItems = items.map(item => ({
      product_id: item.product.id,
      seller_id: item.sellerId,
      category_id: (item.product as any).category?.id || '',
      quantity: item.quantity,
      price: item.product.price
    }));

    const currentUser = get(user) as any;
    const sessionId = getCartSessionService().getOrCreateSessionId();

    const response = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: code.toUpperCase(),
        items: cartItems,
        user_id: currentUser?.id,
        session_id: sessionId,
        shipping_cost: 0
      })
    });

    const result = await response.json();

    if (result.success && result.coupon) {
      let couponType: 'percentage' | 'fixed' | 'free_shipping' = 'fixed';
      if (result.coupon.type === 'percentage') {
        couponType = 'percentage';
      } else if (result.coupon.type === 'free_shipping') {
        couponType = 'free_shipping';
      } else {
        couponType = 'fixed';
      }

      return {
        code: result.coupon.code,
        type: couponType,
        value: result.coupon.value,
        scope: result.coupon.scope === 'global' ? 'cart' : result.coupon.scope,
        description: result.coupon.description || result.coupon.name,
        minValue: result.coupon.min_order_amount || 0,
        ...(result.coupon.discount_amount && { discount_amount: result.coupon.discount_amount }),
        ...(result.coupon.applied_to && { applied_to: result.coupon.applied_to })
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao validar cupom (inline):', error);
    return null;
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const refactoredCartStore = createRefactoredCartStore();

// Alias para compatibilidade
export const refactoredAdvancedCartStore = refactoredCartStore; 