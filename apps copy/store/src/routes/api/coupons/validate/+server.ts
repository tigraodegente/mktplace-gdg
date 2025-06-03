import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

interface ValidateRequest {
  code: string;
  user_id?: string;
  session_id?: string;
  items: Array<{
    product_id: string;
    seller_id: string;
    category_id: string;
    quantity: number;
    price: number;
  }>;
  shipping_cost?: number;
  user_ip?: string;
}

interface CouponValidationResult {
  success: boolean;
  coupon?: {
    id: string;
    code: string;
    name: string;
    description: string;
    type: string;
    value: number;
    scope: string;
    discount_amount: number;
    applied_to: any;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    console.log('🎟️ Coupons Validate - Estratégia híbrida iniciada');
    
    const body = await request.json() as ValidateRequest;
    
    // Validações básicas
    if (!body.code) {
      return json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Código do cupom é obrigatório'
        }
      } as CouponValidationResult, { status: 400 });
    }

    if (!body.items || body.items.length === 0) {
      return json({
        success: false,
        error: {
          code: 'EMPTY_CART',
          message: 'Carrinho vazio'
        }
      } as CouponValidationResult, { status: 400 });
    }

    // Tentar validar cupom com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 5 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar cupom (query simplificada)
        const coupons = await db.query`
          SELECT id, code, name, description, type, value, scope, is_active,
                 min_order_amount, max_uses, current_uses, expires_at
          FROM coupons 
          WHERE code = ${body.code.toUpperCase()} AND is_active = true
          LIMIT 1
        `;

        if (coupons.length === 0) {
          return {
            success: false,
            error: {
              code: 'COUPON_NOT_FOUND',
              message: 'Cupom não encontrado ou inativo'
            }
          };
        }

        const coupon = coupons[0];

        // STEP 2: Validações básicas
        const now = new Date();
        if (coupon.expires_at && new Date(coupon.expires_at) < now) {
          return {
            success: false,
            error: {
              code: 'COUPON_EXPIRED',
              message: 'Cupom expirado'
            }
          };
        }

        if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
          return {
            success: false,
            error: {
              code: 'COUPON_LIMIT_REACHED',
              message: 'Limite de usos do cupom atingido'
            }
          };
        }

        // STEP 3: Calcular subtotal
        const subtotal = body.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
          return {
            success: false,
            error: {
              code: 'MIN_ORDER_NOT_REACHED',
              message: `Pedido mínimo de R$ ${coupon.min_order_amount.toFixed(2)} não atingido`
            }
          };
        }

        // STEP 4: Calcular desconto (versão simplificada)
        let discountAmount = 0;
        const shippingCost = body.shipping_cost || 0;
        
        if (coupon.type === 'free_shipping') {
          discountAmount = shippingCost;
        } else if (coupon.type === 'percentage') {
          discountAmount = subtotal * (coupon.value / 100);
        } else if (coupon.type === 'fixed_amount') {
          discountAmount = Math.min(coupon.value, subtotal);
        }

        return {
          success: true,
          coupon: {
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            description: coupon.description,
            type: coupon.type,
            value: coupon.value,
            scope: coupon.scope,
            discount_amount: Math.round(discountAmount * 100) / 100,
            applied_to: {
              products: [],
              sellers: [],
              global: true
            }
          }
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Cupom validado: ${result.success ? 'Válido' : 'Inválido'}`);
      
      return json({
        ...result,
        source: 'database'
      } as CouponValidationResult);
      
    } catch (error) {
      console.log(`⚠️ Erro coupons validate: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Cupons mock conhecidos
      const mockCoupons: Record<string, any> = {
        'BEMVINDO10': {
          id: 'coup-1',
          code: 'BEMVINDO10',
          name: 'Bem-vindo 10%',
          description: 'Desconto de 10% para novos clientes',
          type: 'percentage',
          value: 10,
          scope: 'global',
          discount_amount: 0,
          applied_to: { products: [], sellers: [], global: true }
        },
        'FRETEGRATIS': {
          id: 'coup-2',
          code: 'FRETEGRATIS',
          name: 'Frete Grátis',
          description: 'Frete grátis para todo o Brasil',
          type: 'free_shipping',
          value: 0,
          scope: 'global',
          discount_amount: 0,
          applied_to: { products: [], sellers: [], global: true }
        },
        'DESCONTO20': {
          id: 'coup-3',
          code: 'DESCONTO20',
          name: 'Desconto R$ 20',
          description: 'R$ 20 de desconto na sua compra',
          type: 'fixed_amount',
          value: 20,
          scope: 'global',
          discount_amount: 0,
          applied_to: { products: [], sellers: [], global: true }
        },
        'PRIMEIRA5': {
          id: 'coup-4',
          code: 'PRIMEIRA5',
          name: 'Primeira compra 5%',
          description: '5% de desconto na primeira compra',
          type: 'percentage',
          value: 5,
          scope: 'global',
          discount_amount: 0,
          applied_to: { products: [], sellers: [], global: true }
        }
      };
      
      const code = body.code.toUpperCase();
      const mockCoupon = mockCoupons[code];
      
      if (mockCoupon) {
        // Calcular desconto baseado no carrinho
        const subtotal = body.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingCost = body.shipping_cost || 0;
        
        let discountAmount = 0;
        if (mockCoupon.type === 'free_shipping') {
          discountAmount = shippingCost;
        } else if (mockCoupon.type === 'percentage') {
          discountAmount = subtotal * (mockCoupon.value / 100);
        } else if (mockCoupon.type === 'fixed_amount') {
          discountAmount = Math.min(mockCoupon.value, subtotal);
        }
        
        // Validar valor mínimo (R$ 50 para alguns cupons)
        if (['DESCONTO20', 'BEMVINDO10'].includes(code) && subtotal < 50) {
          return json({
            success: false,
            error: {
              code: 'MIN_ORDER_NOT_REACHED',
              message: 'Pedido mínimo de R$ 50,00 não atingido'
            }
          } as CouponValidationResult, { status: 400 });
        }
        
        mockCoupon.discount_amount = Math.round(discountAmount * 100) / 100;
        
        return json({
          success: true,
          coupon: mockCoupon,
          source: 'fallback'
        } as CouponValidationResult);
      }
      
      // Cupom não encontrado
      return json({
        success: false,
        error: {
          code: 'COUPON_NOT_FOUND',
          message: 'Cupom não encontrado ou inativo'
        },
        source: 'fallback'
      } as CouponValidationResult, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Erro crítico coupons validate:', error);
    return json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Erro interno do servidor'
      }
    } as CouponValidationResult, { status: 500 });
  }
}; 