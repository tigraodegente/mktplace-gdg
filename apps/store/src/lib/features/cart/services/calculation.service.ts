/**
 * Calculation Service - Cart Feature
 * 
 * Responsável por todos os cálculos do carrinho
 * Funções puras extraídas para melhor testabilidade
 */

import type { CartItem, SellerGroup, Coupon, CartTotals } from '../../shared/types/commerce';

// =============================================================================
// TIPOS E INTERFACES
// =============================================================================

export interface CalculationConfig {
  maxInstallments?: number;
  roundingPrecision?: number;
  freeShippingThreshold?: number;
}

export interface DiscountCalculation {
  originalValue: number;
  discountValue: number;
  finalValue: number;
  discountPercentage: number;
}

export interface GroupCalculationResult {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  itemCount: number;
}

// =============================================================================
// CALCULATION SERVICE
// =============================================================================

export class CartCalculationService {
  private maxInstallments: number;
  private roundingPrecision: number;
  private freeShippingThreshold: number;
  
  constructor(config: CalculationConfig = {}) {
    this.maxInstallments = config.maxInstallments || 12;
    this.roundingPrecision = config.roundingPrecision || 2;
    this.freeShippingThreshold = config.freeShippingThreshold || 0;
  }
  
  /**
   * Calcula desconto de cupom
   */
  calculateDiscount(value: number, coupon: Coupon): number {
    if (coupon.minValue && value < coupon.minValue) return 0;
    
    let discount = 0;
    
    if (coupon.type === 'percentage') {
      discount = value * (coupon.value / 100);
      // Aplicar desconto máximo se definido
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, value);
    } else if (coupon.type === 'free_shipping') {
      // Frete grátis não afeta o subtotal diretamente
      discount = 0;
    }
    
    return this.roundValue(discount);
  }
  
  /**
   * Calcula desconto detalhado
   */
  calculateDetailedDiscount(value: number, coupon: Coupon): DiscountCalculation {
    const discountValue = this.calculateDiscount(value, coupon);
    const finalValue = value - discountValue;
    const discountPercentage = value > 0 ? (discountValue / value) * 100 : 0;
    
    return {
      originalValue: this.roundValue(value),
      discountValue: this.roundValue(discountValue),
      finalValue: this.roundValue(finalValue),
      discountPercentage: this.roundValue(discountPercentage)
    };
  }
  
  /**
   * Calcula totais de um grupo de vendedor
   */
  calculateGroupTotals(group: SellerGroup): GroupCalculationResult {
    // Calcular subtotal dos itens
    let subtotal = 0;
    let itemCount = 0;
    
    group.items.forEach(item => {
      const itemPrice = item.product.price * item.quantity;
      
      // Aplicar desconto do item se houver
      let itemDiscount = 0;
      if (item.appliedCoupon) {
        itemDiscount = this.calculateDiscount(itemPrice, item.appliedCoupon);
      }
      
      subtotal += itemPrice - itemDiscount;
      itemCount += item.quantity;
    });
    
    // Aplicar desconto do grupo/vendedor
    let groupDiscount = 0;
    if (group.appliedCoupon) {
      groupDiscount = this.calculateDiscount(subtotal, group.appliedCoupon);
    }
    
    const total = subtotal - groupDiscount + (group.shippingCost || 0);
    
    return {
      subtotal: this.roundValue(subtotal),
      discount: this.roundValue(groupDiscount),
      shipping: this.roundValue(group.shippingCost || 0),
      total: this.roundValue(total),
      itemCount
    };
  }
  
  /**
   * Calcula totais gerais do carrinho
   */
  calculateCartTotals(groups: SellerGroup[], globalCoupon?: Coupon | null): CartTotals {
    let cartSubtotal = 0;
    let totalDiscount = 0;
    let totalShipping = 0;
    let itemCount = 0;
    
    // Somar totais de todos os grupos
    groups.forEach(group => {
      const groupResult = this.calculateGroupTotals(group);
      cartSubtotal += groupResult.subtotal;
      totalDiscount += groupResult.discount;
      totalShipping += groupResult.shipping;
      itemCount += groupResult.itemCount;
    });
    
    // Aplicar cupom global
    let couponDiscount = 0;
    let freeShippingSavings = 0;
    
    if (globalCoupon && globalCoupon.scope === 'cart') {
      if (globalCoupon.type === 'free_shipping') {
        freeShippingSavings = totalShipping;
        // Não alterar totalShipping aqui, será gerenciado pela página
      } else {
        couponDiscount = this.calculateDiscount(cartSubtotal, globalCoupon);
      }
    }
    
    const totalDiscountWithCoupon = totalDiscount + couponDiscount;
    const cartTotal = cartSubtotal - totalDiscountWithCoupon + totalShipping - freeShippingSavings;
    
    return {
      cartSubtotal: this.roundValue(cartSubtotal),
      totalShipping: this.roundValue(totalShipping),
      totalDiscount: this.roundValue(totalDiscountWithCoupon),
      couponDiscount: this.roundValue(couponDiscount),
      freeShippingSavings: this.roundValue(freeShippingSavings),
      cartTotal: this.roundValue(Math.max(0, cartTotal)), // Nunca negativo
      installmentValue: this.roundValue(Math.max(0, cartTotal) / this.maxInstallments)
    };
  }
  
  /**
   * Calcula valor de parcelamento
   */
  calculateInstallments(total: number, installments?: number): number {
    const maxInstallments = installments || this.maxInstallments;
    if (total <= 0 || maxInstallments <= 0) return 0;
    
    return this.roundValue(total / maxInstallments);
  }
  
  /**
   * Verifica se qualifica para frete grátis
   */
  qualifiesForFreeShipping(subtotal: number): boolean {
    return this.freeShippingThreshold > 0 && subtotal >= this.freeShippingThreshold;
  }
  
  /**
   * Calcula quanto falta para frete grátis
   */
  calculateRemainingForFreeShipping(subtotal: number): number {
    if (this.freeShippingThreshold <= 0) return 0;
    if (subtotal >= this.freeShippingThreshold) return 0;
    
    return this.roundValue(this.freeShippingThreshold - subtotal);
  }
  
  /**
   * Calcula economia total
   */
  calculateTotalSavings(originalPrice: number, finalPrice: number): number {
    if (originalPrice <= finalPrice) return 0;
    return this.roundValue(originalPrice - finalPrice);
  }
  
  /**
   * Calcula percentual de economia
   */
  calculateSavingsPercentage(originalPrice: number, finalPrice: number): number {
    if (originalPrice <= 0 || originalPrice <= finalPrice) return 0;
    
    const savings = originalPrice - finalPrice;
    const percentage = (savings / originalPrice) * 100;
    
    return this.roundValue(percentage);
  }
  
  /**
   * Agrupa itens por vendedor
   */
  groupItemsBySeller(items: CartItem[]): SellerGroup[] {
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
    
    // Calcular totais para cada grupo
    Object.values(groups).forEach(group => {
      const result = this.calculateGroupTotals(group);
      group.subtotal = result.subtotal;
      group.discount = result.discount;
      group.total = result.total;
    });
    
    return Object.values(groups);
  }
  
  /**
   * Valida se valor está dentro de limites aceitáveis
   */
  validateValue(value: number): boolean {
    return !isNaN(value) && isFinite(value) && value >= 0;
  }
  
  /**
   * Arredonda valor com precisão configurada
   */
  private roundValue(value: number): number {
    if (!this.validateValue(value)) return 0;
    
    const factor = Math.pow(10, this.roundingPrecision);
    return Math.round(value * factor) / factor;
  }
}

// =============================================================================
// FACTORY E SINGLETON
// =============================================================================

let defaultInstance: CartCalculationService | null = null;

/**
 * Obtém instância padrão do service (singleton)
 */
export function getCartCalculationService(): CartCalculationService {
  if (!defaultInstance) {
    defaultInstance = new CartCalculationService();
  }
  return defaultInstance;
}

/**
 * Cria nova instância com configuração específica
 */
export function createCartCalculationService(config: CalculationConfig): CartCalculationService {
  return new CartCalculationService(config);
}

// =============================================================================
// FUNÇÕES DE COMPATIBILIDADE (Para migração gradual)
// =============================================================================

/**
 * @deprecated Use getCartCalculationService().calculateDiscount()
 */
export function calculateDiscount(value: number, coupon: Coupon): number {
  return getCartCalculationService().calculateDiscount(value, coupon);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number, currency = 'BRL'): string {
  if (!getCartCalculationService().validateValue(value)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(value);
}

/**
 * Formata percentual para exibição
 */
export function formatPercentage(value: number): string {
  if (!getCartCalculationService().validateValue(value)) return '0%';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value / 100);
}

/**
 * Converte string monetária para número
 */
export function parseCurrency(value: string): number {
  if (!value || typeof value !== 'string') return 0;
  
  // Remove formatação e converte para número
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
} 