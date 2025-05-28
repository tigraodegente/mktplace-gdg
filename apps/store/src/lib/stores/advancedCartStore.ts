/**
 * Advanced Cart Store
 * 
 * Gerencia o estado global do carrinho com funcionalidades avançadas:
 * - Agrupamento por vendedor
 * - Cálculo de frete com cache
 * - Sistema de cupons
 * - Persistência em localStorage
 * - Modos de entrega (agrupada/expressa)
 */

import { writable, derived, get } from 'svelte/store';
import type { Product } from '@mktplace/shared-types';
import type { CartItem, SellerGroup, ShippingOption, Coupon, CartState, ShippingMode, ProductShipping } from '$lib/types/cart';
import { formatCurrency } from '@mktplace/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  CART: 'advancedCart',
  ZIP_CODE: 'cartZipCode',
  SHIPPING_MODE: 'cartShippingMode',
  COUPON: 'cartCoupon'
} as const;

const SHIPPING_CONFIG = {
  GROUPED_WEIGHT_MULTIPLIER: 4,
  EXPRESS_WEIGHT_MULTIPLIER: 8,
  FREE_SHIPPING_THRESHOLD: 199,
  DEFAULT_PRODUCT_WEIGHT: 0.5,
  API_DELAY: 500,
  PRODUCT_API_DELAY: 200
} as const;

const SHIPPING_DELAYS = {
  GROUPED_MIN: 7,
  GROUPED_VARIANCE: 3,
  EXPRESS_MIN: 2,
  EXPRESS_VARIANCE: 2
} as const;

// ============================================================================
// MOCK SERVICES (TODO: Replace with real API calls)
// ============================================================================

async function calculateShipping(
  sellerId: string, 
  zipCode: string, 
  items: CartItem[], 
  mode: ShippingMode
): Promise<ShippingOption[]> {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, SHIPPING_CONFIG.API_DELAY));
  
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.product.weight || SHIPPING_CONFIG.DEFAULT_PRODUCT_WEIGHT) * item.quantity, 
    0
  );
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity, 
    0
  );
  
  if (mode === 'grouped') {
    // Entrega agrupada - um frete por seller
    const basePrice = totalWeight * SHIPPING_CONFIG.GROUPED_WEIGHT_MULTIPLIER;
    const isFreeShipping = subtotal >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD;
    
    const options: ShippingOption[] = [
      {
        id: 'grouped-economic',
        name: 'Entrega Agrupada Econômica',
        price: isFreeShipping ? 0 : basePrice,
        estimatedDays: SHIPPING_DELAYS.GROUPED_MIN + Math.floor(Math.random() * SHIPPING_DELAYS.GROUPED_VARIANCE),
        isFree: isFreeShipping,
        mode: 'grouped'
      }
    ];
    
    return options;
  } else {
    // Entrega expressa - retornar opção geral (será calculado por produto)
    const expressPrice = totalWeight * SHIPPING_CONFIG.EXPRESS_WEIGHT_MULTIPLIER;
    
    return [
      {
        id: 'express-individual',
        name: 'Entrega Expressa Individual',
        price: expressPrice,
        estimatedDays: SHIPPING_DELAYS.EXPRESS_MIN + Math.floor(Math.random() * SHIPPING_DELAYS.EXPRESS_VARIANCE),
        isFree: false,
        mode: 'express'
      }
    ];
  }
}

async function calculateProductShipping(product: Product, zipCode: string): Promise<ProductShipping> {
  // Simular cálculo individual por produto
  await new Promise(resolve => setTimeout(resolve, SHIPPING_CONFIG.PRODUCT_API_DELAY));
  
  const weight = product.weight || SHIPPING_CONFIG.DEFAULT_PRODUCT_WEIGHT;
  const basePrice = weight * SHIPPING_CONFIG.EXPRESS_WEIGHT_MULTIPLIER;
  
  return {
    productId: product.id,
    price: basePrice + (Math.random() * 10),
    estimatedDays: SHIPPING_DELAYS.EXPRESS_MIN + Math.floor(Math.random() * SHIPPING_DELAYS.EXPRESS_VARIANCE)
  };
}

async function validateCoupon(code: string): Promise<Coupon | null> {
  // Simular validação de cupom
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Cupons disponíveis para a conta do usuário (viriam da API)
  const userCoupons: Coupon[] = [
    { 
      code: 'BEMVINDO10', 
      type: 'percentage', 
      value: 10, 
      scope: 'cart', 
      description: '10% OFF - Boas vindas' 
    },
    { 
      code: 'FRETE20', 
      type: 'fixed', 
      value: 20, 
      scope: 'shipping', 
      description: 'R$ 20 OFF no frete', 
      minValue: 100 
    },
    { 
      code: 'NATAL15', 
      type: 'percentage', 
      value: 15, 
      scope: 'cart', 
      description: '15% OFF - Promoção de Natal' 
    },
    { 
      code: 'CLIENTE50', 
      type: 'fixed', 
      value: 50, 
      scope: 'cart', 
      description: 'R$ 50 OFF - Cliente especial', 
      minValue: 200 
    }
  ];
  
  return userCoupons.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
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

function createAdvancedCartStore() {
  // ===== State Stores =====
  const items = writable<CartItem[]>(loadFromStorage(STORAGE_KEYS.CART, []));
  const zipCode = writable<string>(loadFromStorage(STORAGE_KEYS.ZIP_CODE, ''));
  const shippingMode = writable<ShippingMode>(loadFromStorage(STORAGE_KEYS.SHIPPING_MODE, 'express'));
  const loadingShipping = writable<boolean>(false);
  const shippingCache = writable<Record<string, ShippingOption[]>>({});
  const appliedCoupon = writable<Coupon | null>(loadFromStorage(STORAGE_KEYS.COUPON, null));
  const shippingInfo = writable<Record<string, any>>({});
  
  // ===== Persistence Subscriptions =====
  items.subscribe(value => saveToStorage(STORAGE_KEYS.CART, value));
  zipCode.subscribe(value => saveToStorage(STORAGE_KEYS.ZIP_CODE, value));
  shippingMode.subscribe(value => saveToStorage(STORAGE_KEYS.SHIPPING_MODE, value));
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
    [items, shippingMode, shippingInfo], 
    ([$items, $mode, $shippingInfo]) => {
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
            total: 0,
            groupedShipping: undefined,
            expressShipping: undefined
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
        
        // Aplicar informações de frete
        const sellerShipping = $shippingInfo[group.sellerId];
        if (sellerShipping) {
          group.groupedShipping = sellerShipping.groupedShipping;
          group.expressShipping = sellerShipping.expressShipping;
          
          if (sellerShipping.shippingOptions) {
            group.shippingOptions = sellerShipping.shippingOptions;
          }
        }
        
        // Calcular frete baseado no modo
        if ($mode === 'grouped') {
          group.shippingCost = group.groupedShipping?.price || 0;
        } else {
          // Somar fretes individuais dos produtos
          group.shippingCost = group.items.reduce(
            (sum, item) => sum + (item.individualShipping?.price || 0), 
            0
          );
        }
        
        group.total = group.subtotal - group.discount + group.shippingCost;
      });
      
      return Object.values(groups);
    }
  );
  
  // Totais do carrinho
  const cartTotals = derived(
    [sellerGroups, items, appliedCoupon], 
    ([$groups, $items, $appliedCoupon]) => {
      const cartSubtotal = $groups.reduce((sum, group) => sum + group.subtotal, 0);
      const totalShipping = $groups.reduce((sum, group) => sum + group.shippingCost, 0);
      const totalDiscount = $groups.reduce((sum, group) => sum + group.discount, 0);
      
      // Calcular desconto do cupom
      let couponDiscount = 0;
      if ($appliedCoupon) {
        const baseValue = $appliedCoupon.scope === 'shipping' 
          ? totalShipping 
          : cartSubtotal;
        couponDiscount = calculateDiscount(baseValue, $appliedCoupon);
      }
      
      const finalTotal = cartSubtotal + totalShipping - totalDiscount - couponDiscount;
      
      return {
        cartSubtotal,
        totalShipping,
        totalDiscount: totalDiscount + couponDiscount,
        couponDiscount,
        cartTotal: finalTotal,
        installmentValue: finalTotal / 12 // Valor parcelado em 12x
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
  
  // Calcular frete para todos os sellers
  async function calculateAllShipping(zip: string) {
    if (!zip || zip.length < 8) return;
    
    loadingShipping.set(true);
    const $items = get(items);
    const $groups = get(sellerGroups);
    const $mode = get(shippingMode);
    const cache = get(shippingCache);
    
    try {
      const newShippingInfo: Record<string, any> = {};
      
      if ($mode === 'grouped') {
        // Calcular frete agrupado por seller
        for (const group of $groups) {
          const cacheKey = `${group.sellerId}-${zip}-grouped`;
          
          if (cache[cacheKey]) {
            // Usar cache
            const options = cache[cacheKey];
            newShippingInfo[group.sellerId] = {
              groupedShipping: {
                price: options[0].price,
                estimatedDays: options[0].estimatedDays
              },
              shippingOptions: options
            };
          } else {
            // Calcular novo
            const options = await calculateShipping(group.sellerId, zip, group.items, 'grouped');
            
            // Atualizar cache
            shippingCache.update(c => ({ ...c, [cacheKey]: options }));
            
            // Atualizar grupo
            if (options.length > 0) {
              newShippingInfo[group.sellerId] = {
                groupedShipping: {
                  price: options[0].price,
                  estimatedDays: options[0].estimatedDays
                },
                shippingOptions: options
              };
            }
          }
        }
      } else {
        // Calcular frete individual por produto
        for (const group of $groups) {
          const productShippings: ShippingOption[] = [];
          
          for (const item of group.items) {
            const shipping = await calculateProductShipping(item.product, zip);
            updateProductShipping(item.product.id, group.sellerId, shipping);
            
            // Criar opção de frete para o produto
            productShippings.push({
              id: `express-${item.product.id}`,
              name: `Entrega Expressa - ${item.product.name}`,
              price: shipping.price,
              estimatedDays: shipping.estimatedDays,
              isFree: false,
              mode: 'express'
            });
          }
          
          // Calcular totais express para o grupo
          const totalExpressPrice = productShippings.reduce((sum, opt) => sum + opt.price, 0);
          const minDays = Math.min(...productShippings.map(opt => opt.estimatedDays));
          
          newShippingInfo[group.sellerId] = {
            expressShipping: {
              price: totalExpressPrice,
              estimatedDays: minDays
            },
            shippingOptions: productShippings
          };
        }
      }
      
      // Atualizar shipping info
      shippingInfo.set(newShippingInfo);
    } finally {
      loadingShipping.set(false);
    }
  }
  
  // Atualizar frete individual do produto
  function updateProductShipping(
    productId: string, 
    sellerId: string, 
    shipping: ProductShipping
  ) {
    items.update(currentItems => {
      return currentItems.map(item => {
        if (item.product.id === productId && item.sellerId === sellerId) {
          return { ...item, individualShipping: shipping };
        }
        return item;
      });
    });
  }
  
  // Mudar modalidade de entrega
  function setShippingMode(mode: ShippingMode) {
    shippingMode.set(mode);
    
    // Recalcular fretes se já tiver CEP
    const $zip = get(zipCode);
    if ($zip) {
      calculateAllShipping($zip);
    }
  }
  
  // Aplicar cupom
  async function applyCoupon(code: string) {
    const coupon = await validateCoupon(code);
    
    if (!coupon) {
      throw new Error('Cupom inválido ou expirado');
    }
    
    // Verificar valor mínimo
    const $totals = get(cartTotals);
    if (coupon.minValue && $totals.cartSubtotal < coupon.minValue) {
      throw new Error(`Valor mínimo de ${formatCurrency(coupon.minValue)} não atingido`);
    }
    
    appliedCoupon.set(coupon);
    return coupon;
  }
  
  // Remover cupom
  function removeCoupon() {
    appliedCoupon.set(null);
  }
  
  // Limpar carrinho
  function clearCart() {
    items.set([]);
    shippingCache.set({});
  }
  
  // ===== Public API =====
  return {
    // States
    items,
    sellerGroups,
    cartTotals,
    zipCode,
    shippingMode,
    loadingShipping,
    appliedCoupon,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    calculateAllShipping,
    setShippingMode,
    applyCoupon,
    removeCoupon
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const advancedCartStore = createAdvancedCartStore(); 