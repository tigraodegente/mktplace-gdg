/**
 * Cart Store - Versão Unificada e Final
 * 
 * Store definitivo que substitui todas as versões anteriores
 * Usa tipos unificados e segue padrões do projeto
 */

import { writable, derived, get } from 'svelte/store';
import { nanoid } from 'nanoid';

// Tipos do sistema atual (serão migrados para o sistema unificado)
import type { CartItem, SellerGroup, Coupon } from '$lib/types/cart';
import { user } from '$lib/stores/authStore';

// Tipo Product local temporário
type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  weight?: number;
  seller_id: string;
  category_id?: string;
  images: string[];
  seller?: {
    logo?: string;
  };
  [key: string]: any;
};

// Tipos temporários até migração completa
type AppliedCoupon = Coupon;
type CartTotals = {
  cart_subtotal: number;
  total_shipping: number;
  total_discount: number;
  cart_total: number;
  coupon_discount: number;
  item_discounts: number;
  shipping_discount: number;
  free_shipping_savings: number;
  cashback_total: number;
  points_total: number;
  installment_value: number;
  max_installments: number;
  pix_discount?: number;
  pix_total?: number;
  has_free_shipping: boolean;
  has_express_shipping: boolean;
  estimated_delivery_days: number;
};

type CouponValidationRequest = {
  code: string;
  user_id?: string;
  session_id?: string;
  items: Array<{
    product_id: string;
    seller_id: string;
    category_id?: string;
    quantity: number;
    price: number;
  }>;
  shipping_cost: number;
  current_total: number;
};

// ============================================================================
// CONSTANTES E CONFIGURAÇÃO
// ============================================================================

const STORAGE_KEYS = {
  CART: 'mktplace_cart',
  COUPON: 'mktplace_cart_coupon',
  SESSION: 'mktplace_cart_session',
  ZIP_CODE: 'mktplace_cart_zip'
} as const;

const CART_CONFIG = {
  MAX_ITEMS: 50,
  MAX_QUANTITY_PER_ITEM: 99,
  SESSION_DURATION_HOURS: 24,
  AUTO_SAVE_INTERVAL_MS: 1000
} as const;

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return nanoid(32);
  
  let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!sessionId) {
    sessionId = nanoid(32);
    localStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
  }
  return sessionId;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn(`Erro ao carregar ${key} do localStorage:`, error);
    return fallback;
  }
}

function saveToStorage(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Erro ao salvar ${key} no localStorage:`, error);
  }
}

function calculateDiscount(value: number, coupon: AppliedCoupon): number {
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
// SERVICES
// ============================================================================

async function validateCouponApi(code: string, items: CartItem[]): Promise<AppliedCoupon | null> {
  try {
    const currentUser = get(user);
    const sessionId = getOrCreateSessionId();
    
           const request: CouponValidationRequest = {
         code: code.toUpperCase(),
         user_id: currentUser?.id,
         session_id: sessionId,
         items: items.map((item: CartItem) => ({
           product_id: item.product.id,
           seller_id: item.sellerId,
           category_id: item.product.category_id,
           quantity: item.quantity,
           price: item.product.price
         })),
         shipping_cost: 0, // Será calculado pelo sistema de frete
         current_total: items.reduce((sum: number, item: CartItem) => sum + (item.product.price * item.quantity), 0)
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
// STORE CREATION
// ============================================================================

function createUnifiedCartStore() {
  // ===== Estado Reativo =====
  const items = writable<CartItem[]>(loadFromStorage(STORAGE_KEYS.CART, []));
  const appliedCoupon = writable<AppliedCoupon | null>(loadFromStorage(STORAGE_KEYS.COUPON, null));
  const zipCode = writable<string>(loadFromStorage(STORAGE_KEYS.ZIP_CODE, ''));
  const isLoading = writable<boolean>(false);
  const lastError = writable<string | null>(null);

  // ===== Persistência Automática =====
  items.subscribe(value => {
    saveToStorage(STORAGE_KEYS.CART, value);
    // Limpar erro ao modificar carrinho
    lastError.set(null);
  });
  
  appliedCoupon.subscribe(value => {
    if (value) {
      saveToStorage(STORAGE_KEYS.COUPON, value);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.COUPON);
      }
    }
  });

  zipCode.subscribe(value => {
    saveToStorage(STORAGE_KEYS.ZIP_CODE, value);
  });

  // ===== Derived Stores =====
  
  // Agrupamento por vendedor
  const sellerGroups = derived(
    [items, appliedCoupon],
    ([$items, $appliedCoupon]) => {
      const groups: Record<string, SellerGroup> = {};
      
      // Agrupar itens por vendedor
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
        // Subtotal do grupo
        group.subtotal = group.items.reduce((sum, item) => {
          return sum + (item.product.price * item.quantity);
        }, 0);
        
        // Aplicar cupom específico do grupo se houver
        if (group.appliedCoupon) {
          group.discount = calculateDiscount(group.subtotal, group.appliedCoupon);
        }
        
        // Verificar frete grátis
        if ($appliedCoupon?.type === 'free_shipping') {
          group.hasFreeShipping = true;
        }
        
        // Total do grupo (sem frete, calculado externamente)
        group.total = group.subtotal - group.discount;
      });
      
      return Object.values(groups);
    }
  );
  
  // Totais do carrinho
  const cartTotals = derived(
    [sellerGroups, appliedCoupon],
    ([$groups, $appliedCoupon]) => {
      const cartSubtotal = $groups.reduce((sum, group) => sum + group.subtotal, 0);
      const totalDiscount = $groups.reduce((sum, group) => sum + group.discount, 0);
      
      // Calcular desconto do cupom global
      let couponDiscount = 0;
      let freeShippingSavings = 0;
      
      if ($appliedCoupon && $appliedCoupon.scope === 'cart') {
        if ($appliedCoupon.type === 'free_shipping') {
          // Para frete grátis, não aplicar desconto aqui
          // Será calculado pelo sistema de frete
          freeShippingSavings = 0; // Calculado externamente
        } else {
          couponDiscount = calculateDiscount(cartSubtotal, $appliedCoupon);
        }
      }
      
      const totalDiscountWithCoupon = totalDiscount + couponDiscount;
      const finalTotal = cartSubtotal - totalDiscountWithCoupon;
      
      const totals: CartTotals = {
        cart_subtotal: cartSubtotal,
        total_shipping: 0, // Calculado externamente
        total_discount: totalDiscountWithCoupon,
        cart_total: finalTotal,
        
        // Detalhes de desconto
        coupon_discount: couponDiscount,
        item_discounts: totalDiscount,
        shipping_discount: 0,
        
        // Benefícios
        free_shipping_savings: freeShippingSavings,
        cashback_total: 0,
        points_total: 0,
        
        // Parcelamento
        installment_value: finalTotal / 12,
        max_installments: 12,
        
        // PIX
        pix_discount: finalTotal * 0.05, // 5% desconto PIX
        pix_total: finalTotal * 0.95,
        
        // Metadados
        has_free_shipping: $appliedCoupon?.type === 'free_shipping',
        has_express_shipping: false,
        estimated_delivery_days: 7
      };
      
      return totals;
    }
  );

  // Total de itens
  const totalItems = derived(items, ($items) => {
    return $items.reduce((sum, item) => sum + item.quantity, 0);
  });

  // Validação do carrinho
  const validation = derived(
    [items, cartTotals],
    ([$items, $totals]) => {
      const errors: any[] = [];
      const warnings: any[] = [];
      
      // Validar limite de itens
      if ($items.length > CART_CONFIG.MAX_ITEMS) {
        errors.push({
          type: 'general',
          code: 'MAX_ITEMS_EXCEEDED',
          message: `Máximo de ${CART_CONFIG.MAX_ITEMS} itens por carrinho`
        });
      }
      
      // Validar carrinho vazio
      if ($items.length === 0) {
        warnings.push({
          type: 'general',
          code: 'EMPTY_CART',
          message: 'Carrinho vazio'
        });
      }
      
      // Validar total mínimo (exemplo)
      const minOrderValue = 10.00;
      if ($totals.cart_total < minOrderValue && $items.length > 0) {
        warnings.push({
          type: 'general',
          code: 'MIN_ORDER_VALUE',
          message: `Valor mínimo do pedido: R$ ${minOrderValue.toFixed(2)}`
        });
      }
      
      return {
        is_valid: errors.length === 0,
        has_warnings: warnings.length > 0,
        errors,
        warnings,
        stock_validation: { valid: true, out_of_stock_items: [], low_stock_items: [] },
        pricing_validation: { valid: true, price_changes: [] },
        shipping_validation: { valid: true, zip_code_required: true, invalid_zip_code: false, no_shipping_options: [] }
      };
    }
  );

  // ===== AÇÕES =====
  
  function addItem(
    product: Product,
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
      // Verificar se item já existe
      const existingIndex = currentItems.findIndex(item => 
        item.product.id === product.id &&
        item.sellerId === sellerId &&
        item.selectedColor === options?.color &&
        item.selectedSize === options?.size
      );
      
      if (existingIndex >= 0) {
        // Atualizar quantidade
        const newQuantity = currentItems[existingIndex].quantity + quantity;
        if (newQuantity > CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
          lastError.set(`Quantidade máxima por item: ${CART_CONFIG.MAX_QUANTITY_PER_ITEM}`);
          return currentItems;
        }
        
        currentItems[existingIndex].quantity = newQuantity;
        return [...currentItems];
      } else {
        // Adicionar novo item
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
          item.seller_id === sellerId &&
          item.selected_color === options?.color &&
          item.selected_size === options?.size)
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
        item.seller_id === sellerId &&
        item.selected_color === options?.color &&
        item.selected_size === options?.size
      );
      
      if (index >= 0) {
        currentItems[index].quantity = quantity;
        currentItems[index].updated_at = new Date().toISOString();
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
      
      // Verificar valor mínimo
      const currentTotals = get(cartTotals);
      if (coupon.minValue && currentTotals.cart_subtotal < coupon.minValue) {
        throw new Error(`Pedido mínimo de R$ ${coupon.minValue.toFixed(2)} para usar este cupom`);
      }
      
      appliedCoupon.set(coupon);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao aplicar cupom';
      lastError.set(message);
      throw error;
    } finally {
      isLoading.set(false);
    }
  }
  
  function removeCoupon(): void {
    appliedCoupon.set(null);
    lastError.set(null);
  }
  
  function clearCart(): void {
    items.set([]);
    appliedCoupon.set(null);
    lastError.set(null);
  }

  function updateZipCode(newZipCode: string): void {
    const cleanZip = newZipCode.replace(/\D/g, '');
    if (cleanZip.length === 8) {
      zipCode.set(cleanZip);
    }
  }

  // ===== API PÚBLICA =====
  return {
    // Stores principais
    items: { subscribe: items.subscribe },
    appliedCoupon: { subscribe: appliedCoupon.subscribe },
    zipCode: { subscribe: zipCode.subscribe },
    isLoading: { subscribe: isLoading.subscribe },
    lastError: { subscribe: lastError.subscribe },
    
    // Derived stores
    sellerGroups: { subscribe: sellerGroups.subscribe },
    cartTotals: { subscribe: cartTotals.subscribe },
    totalItems: { subscribe: totalItems.subscribe },
    validation: { subscribe: validation.subscribe },
    
    // Ações
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    removeCoupon,
    clearCart,
    updateZipCode,
    
    // Helpers
    getSessionId: getOrCreateSessionId,
    
    // Metadados
    __version: '3.0.0-unified',
    __isUnified: true,
    __config: CART_CONFIG
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const unifiedCartStore = createUnifiedCartStore();

// Para debugging
if (typeof window !== 'undefined') {
  (window as any).__unifiedCartStore = unifiedCartStore;
} 