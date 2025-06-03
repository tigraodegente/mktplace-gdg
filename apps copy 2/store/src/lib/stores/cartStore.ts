/**
 * Cart Store - Versão Limpa
 * 
 * Gerencia o estado global do carrinho com funcionalidades essenciais:
 * - Agrupamento por vendedor
 * - Sistema de cupons
 * - Persistência em localStorage
 * 
 * Nota: Sistema de frete foi movido para ShippingCartService
 */

import { writable, derived, get } from 'svelte/store';
import type { CartItem, SellerGroup, Coupon } from '$lib/types/cart';
import { user } from './authStore';
import { nanoid } from 'nanoid';

// Tipo temporário para Product (usar interface existente)
type Product = any;

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  CART: 'cart',
  COUPON: 'cartCoupon',
  SESSION: 'cartSessionId'
} as const;

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function getOrCreateSessionId(): string {
  let sessionId = '';
  
  if (typeof window !== 'undefined') {
    sessionId = localStorage.getItem(STORAGE_KEYS.SESSION) || '';
    
    if (!sessionId) {
      sessionId = nanoid(32);
      localStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
    }
  }
  
  return sessionId;
}

// ============================================================================
// CUPOM SERVICES (Integrado com API)
// ============================================================================

async function validateCoupon(code: string, items: CartItem[]): Promise<Coupon | null> {
  try {
    // Preparar dados para enviar para API
    const cartItems = items.map(item => ({
      product_id: item.product.id,
      seller_id: item.sellerId,
      category_id: (item.product as any).category?.id || '',
      quantity: item.quantity,
      price: item.product.price
    }));

    // Obter user_id do authStore e session_id do localStorage
    const currentUser = get(user);
    const sessionId = getOrCreateSessionId();

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
        shipping_cost: 0 // Será calculado pelo sistema de frete real
      })
    });

    const result = await response.json();

    if (result.success && result.coupon) {
      // Mapear tipo correto da API
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
    } else {
      console.warn('Erro na validação do cupom:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return null;
  }
}

async function getAutomaticCoupons(items: CartItem[]): Promise<Coupon[]> {
  try {
    // Preparar dados para enviar para API
    const cartItems = items.map(item => ({
      product_id: item.product.id,
      seller_id: item.sellerId,
      category_id: (item.product as any).category?.id || '',
      quantity: item.quantity,
      price: item.product.price
    }));

    // Obter user_id do authStore e session_id do localStorage
    const currentUser = get(user);
    const sessionId = getOrCreateSessionId();

    const response = await fetch('/api/coupons/automatic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: cartItems,
        user_id: currentUser?.id,
        session_id: sessionId,
        shipping_cost: 0 // Será calculado pelo sistema de frete real
      })
    });

    const result = await response.json();

    if (result.success && result.automatic_coupons) {
      return result.automatic_coupons.map((coupon: any) => ({
        code: coupon.code,
        type: coupon.type === 'percentage' ? 'percentage' : 'fixed',
        value: coupon.value,
        scope: coupon.scope === 'global' ? 'cart' : coupon.scope,
        description: coupon.description || coupon.name,
        minValue: coupon.min_order_amount || 0,
        discount_amount: coupon.discount_amount,
        applied_to: coupon.applied_to,
        is_automatic: true
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error('Erro ao buscar cupons automáticos:', error);
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateDiscount(value: number, coupon: Coupon): number {
  if (coupon.minValue && value < coupon.minValue) return 0;
  
  if (coupon.type === 'percentage') {
    return value * (coupon.value / 100);
  } else {
    return Math.min(coupon.value, value);
  }
}

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

function createCartStore() {
  // ===== State Stores =====
  const items = writable<CartItem[]>(loadFromStorage(STORAGE_KEYS.CART, []));
  const appliedCoupon = writable<Coupon | null>(loadFromStorage(STORAGE_KEYS.COUPON, null));
  
  // ===== Persistence Subscriptions =====
  items.subscribe(value => saveToStorage(STORAGE_KEYS.CART, value));
  appliedCoupon.subscribe(value => {
    if (value) {
      saveToStorage(STORAGE_KEYS.COUPON, value);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.COUPON);
    }
  });
  
  // ===== Derived Stores =====
  
  // Agrupar por seller
  const sellerGroups = derived(
    [items], 
    ([$items]) => {
      const groups: Record<string, SellerGroup> = {};
      
      // Agrupar items por seller
      $items.forEach(item => {
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
      
      // Calcular totais por grupo
      Object.values(groups).forEach(group => {
        // Calcular subtotal
        group.subtotal = group.items.reduce((sum, item) => {
          const itemPrice = item.product.price * item.quantity;
          const itemDiscount = item.appliedCoupon 
            ? calculateDiscount(itemPrice, item.appliedCoupon) 
            : 0;
          return sum + itemPrice - itemDiscount;
        }, 0);
        
        // Aplicar cupom do seller se houver
        if (group.appliedCoupon) {
          group.discount = calculateDiscount(group.subtotal, group.appliedCoupon);
        }
        
        // Total sem frete (frete é calculado pelo sistema novo)
        group.total = group.subtotal - group.discount;
      });
      
      return Object.values(groups);
    }
  );
  
  // Totais do carrinho (integrado com página do carrinho)
  const cartTotals = derived(
    [sellerGroups, appliedCoupon], 
    ([$groups, $appliedCoupon]) => {
      const cartSubtotal = $groups.reduce((sum, group) => sum + group.subtotal, 0);
      const totalDiscount = $groups.reduce((sum, group) => sum + group.discount, 0);
      
      // Calcular desconto do cupom (apenas cupons normais, não frete grátis)
      let couponDiscount = 0;
      
      if ($appliedCoupon && $appliedCoupon.scope === 'cart') {
        if ($appliedCoupon.type === 'free_shipping') {
          // Para cupom de frete grátis, não calcular desconto aqui
          // O sistema da página do carrinho gerencia isso baseado no frete real
          console.log(`🚚 CUPOM FRETE GRÁTIS DETECTADO - Gerenciado pelo sistema real da página`);
        } else {
          // Cupom de desconto normal
          couponDiscount = calculateDiscount(cartSubtotal, $appliedCoupon);
        }
      }
      
      const totalDiscountWithCoupon = totalDiscount + couponDiscount;
      const finalTotal = cartSubtotal - totalDiscountWithCoupon;
      
      return {
        cartSubtotal,
        totalShipping: 0, // Sempre 0 aqui, calculado na página do carrinho
        totalDiscount: totalDiscountWithCoupon,
        couponDiscount,
        freeShippingSavings: 0, // Calculado na página do carrinho
        hasFreeShipping: $appliedCoupon?.type === 'free_shipping',
        cartTotal: finalTotal,
        installmentValue: finalTotal / 12
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
  }
  
  // Aplicar cupom
  async function applyCoupon(code: string) {
    const currentItems = get(items);
    const coupon = await validateCoupon(code, currentItems);
    
    if (!coupon) {
      throw new Error('Cupom inválido ou expirado');
    }

    // Verificar valor mínimo
    const $totals = get(cartTotals);
    
    if (coupon.minValue && $totals.cartSubtotal < coupon.minValue) {
      throw new Error(`Pedido mínimo de R$ ${coupon.minValue.toFixed(2)} para usar este cupom`);
    }
    
    appliedCoupon.set(coupon);
  }
  
  // Remover cupom
  function removeCoupon() {
    console.log('🗑️ REMOVENDO CUPOM');
    const currentCoupon = get(appliedCoupon);
    if (currentCoupon) {
      console.log('📋 Cupom removido:', currentCoupon.code);
      
      const beforeTotals = get(cartTotals);
      console.log('💰 TOTAIS ANTES DA REMOÇÃO:');
      console.log('├─ Subtotal:', beforeTotals.cartSubtotal.toFixed(2));
      console.log('├─ Desconto:', beforeTotals.totalDiscount.toFixed(2));
      console.log('└─ Total:', beforeTotals.cartTotal.toFixed(2));
    }
    
    appliedCoupon.set(null);
    
    setTimeout(() => {
      const afterTotals = get(cartTotals);
      console.log('💰 TOTAIS APÓS REMOÇÃO:');
      console.log('├─ Subtotal:', afterTotals.cartSubtotal.toFixed(2));
      console.log('├─ Desconto:', afterTotals.totalDiscount.toFixed(2));
      console.log('└─ Total:', afterTotals.cartTotal.toFixed(2));
      console.log('🗑️ REMOÇÃO DE CUPOM - CONCLUÍDA');
      console.log('=====================================');
    }, 100);
  }
  
  // Limpar carrinho
  function clearCart() {
    items.set([]);
    appliedCoupon.set(null);
  }
  
  // Total de itens
  function totalItems() {
    return get(items).reduce((sum, item) => sum + item.quantity, 0);
  }
  
  return {
    // Stores
    items,
    appliedCoupon,
    sellerGroups,
    cartTotals,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    removeCoupon,
    clearCart,
    totalItems
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const cartStore = createCartStore();

// Alias para compatibilidade com código existente
export const advancedCartStore = cartStore; 