/**
 * Coupon Service - Cart Feature
 * 
 * Responsável por validação e gestão de cupons
 * Integração com API e lógica de negócio isolada
 */

import { get } from 'svelte/store';
import { user } from '../../../stores/authStore';
import { getCartSessionService } from './session.service';
import type { CartItem, Coupon } from '../../shared/types/commerce';

// =============================================================================
// TIPOS E INTERFACES
// =============================================================================

export interface ApiCartItem {
  product_id: string;
  seller_id: string;
  category_id: string;
  quantity: number;
  price: number;
}

export interface CouponValidationRequest {
  code: string;
  items: ApiCartItem[];
  userId?: string;
  sessionId?: string;
  shippingCost?: number;
}

export interface CouponValidationResponse {
  success: boolean;
  coupon?: any;
  error?: {
    code: string;
    message: string;
  };
}

export interface CouponServiceConfig {
  apiBaseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'vendor';
  avatar?: string;
  permissions?: string[];
}

// =============================================================================
// COUPON SERVICE
// =============================================================================

export class CartCouponService {
  private apiBaseUrl: string;
  private timeout: number;
  private retries: number;
  private debug: boolean;
  
  constructor(config: CouponServiceConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl || '';
    this.timeout = config.timeout || 10000; // 10s
    this.retries = config.retries || 2;
    this.debug = config.debug || false;
  }
  
  /**
   * Valida cupom via API
   */
  async validateCoupon(code: string, items: CartItem[]): Promise<Coupon | null> {
    try {
      this.log('Validando cupom:', code);
      
      const request = this.buildValidationRequest(code, items);
      const response = await this.callValidationAPI(request);
      
      if (response.success && response.coupon) {
        const mappedCoupon = this.mapCouponResponse(response.coupon);
        this.log('Cupom válido:', mappedCoupon);
        return mappedCoupon;
      }
      
      this.log('Cupom inválido:', response.error);
      return null;
      
    } catch (error) {
      this.logError('Erro na validação de cupom:', error);
      return null;
    }
  }
  
  /**
   * Busca cupons automáticos aplicáveis
   */
  async getAutomaticCoupons(items: CartItem[]): Promise<Coupon[]> {
    try {
      this.log('Buscando cupons automáticos...');
      
      const request = this.buildValidationRequest('', items);
      const response = await this.callAutomaticCouponsAPI(request);
      
      if (response.success && response.automatic_coupons) {
        const coupons = response.automatic_coupons.map((coupon: any) => 
          this.mapCouponResponse(coupon)
        );
        this.log('Cupons automáticos encontrados:', coupons.length);
        return coupons;
      }
      
      return [];
      
    } catch (error) {
      this.logError('Erro ao buscar cupons automáticos:', error);
      return [];
    }
  }
  
  /**
   * Constrói request de validação
   */
  private buildValidationRequest(code: string, items: CartItem[]): CouponValidationRequest {
    const cartItems = items.map(item => ({
      product_id: item.product.id,
      seller_id: item.sellerId,
      category_id: (item.product as any).category?.id || '',
      quantity: item.quantity,
      price: item.product.price
    }));

    const currentUser = get(user) as AuthUser | null;
    const sessionId = getCartSessionService().getOrCreateSessionId();

    return {
      code: code.toUpperCase(),
      items: cartItems,
      userId: currentUser?.id,
      sessionId,
      shippingCost: 0
    };
  }
  
  /**
   * Chama API de validação de cupom
   */
  private async callValidationAPI(request: CouponValidationRequest): Promise<any> {
    const url = `${this.apiBaseUrl}/api/coupons/validate`;
    
    const fetchPromise = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: request.code,
        items: request.items,
        user_id: request.userId,
        session_id: request.sessionId,
        shipping_cost: request.shippingCost
      })
    });
    
    // Aplicar timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.timeout);
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Chama API de cupons automáticos
   */
  private async callAutomaticCouponsAPI(request: CouponValidationRequest): Promise<any> {
    const url = `${this.apiBaseUrl}/api/coupons/automatic`;
    
    const fetchPromise = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: request.items,
        user_id: request.userId,
        session_id: request.sessionId,
        shipping_cost: request.shippingCost
      })
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.timeout);
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Mapeia resposta da API para formato interno
   */
  private mapCouponResponse(apiCoupon: any): Coupon {
    // Mapear tipo correto da API
    let couponType: 'percentage' | 'fixed' | 'free_shipping' = 'fixed';
    if (apiCoupon.type === 'percentage') {
      couponType = 'percentage';
    } else if (apiCoupon.type === 'free_shipping') {
      couponType = 'free_shipping';
    } else {
      couponType = 'fixed';
    }

    return {
      code: apiCoupon.code,
      type: couponType,
      value: apiCoupon.value,
      scope: apiCoupon.scope === 'global' ? 'cart' : apiCoupon.scope,
      description: apiCoupon.description || apiCoupon.name,
      minValue: apiCoupon.min_order_amount || 0,
      ...(apiCoupon.discount_amount && { discount_amount: apiCoupon.discount_amount }),
      ...(apiCoupon.applied_to && { applied_to: apiCoupon.applied_to })
    };
  }
  
  /**
   * Valida cupom offline (regras básicas)
   */
  validateCouponOffline(coupon: Coupon, cartSubtotal: number): { valid: boolean; error?: string } {
    // Verificar valor mínimo
    if (coupon.minValue && cartSubtotal < coupon.minValue) {
      return {
        valid: false,
        error: `Pedido mínimo de R$ ${coupon.minValue.toFixed(2)} para usar este cupom`
      };
    }
    
    // Verificar validade (se presente)
    if (coupon.validUntil && new Date() > new Date(coupon.validUntil)) {
      return {
        valid: false,
        error: 'Cupom expirado'
      };
    }
    
    // Verificar limite de uso (se presente)
    if (coupon.usageLimit && coupon.usageCount && coupon.usageCount >= coupon.usageLimit) {
      return {
        valid: false,
        error: 'Cupom esgotado'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Calcula preview do desconto sem aplicar
   */
  calculateCouponPreview(coupon: Coupon, cartSubtotal: number): number {
    const validation = this.validateCouponOffline(coupon, cartSubtotal);
    if (!validation.valid) return 0;
    
    if (coupon.type === 'percentage') {
      const discount = cartSubtotal * (coupon.value / 100);
      return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
    } else if (coupon.type === 'fixed') {
      return Math.min(coupon.value, cartSubtotal);
    } else {
      // free_shipping não tem desconto direto no subtotal
      return 0;
    }
  }
  
  /**
   * Logging condicional
   */
  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[CouponService] ${message}`, data || '');
    }
  }
  
  /**
   * Error logging
   */
  private logError(message: string, error: any): void {
    console.error(`[CouponService] ${message}`, error);
  }
}

// =============================================================================
// FACTORY E SINGLETON
// =============================================================================

let defaultInstance: CartCouponService | null = null;

/**
 * Obtém instância padrão do service (singleton)
 */
export function getCartCouponService(): CartCouponService {
  if (!defaultInstance) {
    defaultInstance = new CartCouponService({
      debug: typeof window !== 'undefined' && window.location.hostname === 'localhost'
    });
  }
  return defaultInstance;
}

/**
 * Cria nova instância com configuração específica
 */
export function createCartCouponService(config: CouponServiceConfig): CartCouponService {
  return new CartCouponService(config);
}

// =============================================================================
// FUNÇÕES DE COMPATIBILIDADE (Para migração gradual)
// =============================================================================

/**
 * @deprecated Use getCartCouponService().validateCoupon()
 */
export async function validateCoupon(code: string, items: CartItem[]): Promise<Coupon | null> {
  return await getCartCouponService().validateCoupon(code, items);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Valida formato de código de cupom
 */
export function isValidCouponCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Remover espaços e converter para maiúscula
  const cleanCode = code.trim().toUpperCase();
  
  // Validar formato (letras, números, hífens)
  const validFormat = /^[A-Z0-9-]{3,20}$/;
  return validFormat.test(cleanCode);
}

/**
 * Formata código de cupom
 */
export function formatCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Obtém tipo de cupom em português
 */
export function getCouponTypeDescription(type: Coupon['type']): string {
  switch (type) {
    case 'percentage':
      return 'Percentual';
    case 'fixed':
      return 'Valor fixo';
    case 'free_shipping':
      return 'Frete grátis';
    default:
      return 'Desconto';
  }
} 