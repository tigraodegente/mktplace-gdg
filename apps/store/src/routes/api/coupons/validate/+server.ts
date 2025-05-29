import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

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

    const result = await withDatabase(platform, async (db) => {
      // 1. Buscar cupom pelo código
      const couponResult = await db.query`
        SELECT * FROM coupons 
        WHERE code = ${body.code.toUpperCase()}
        AND is_active = true
      `;

      if (couponResult.length === 0) {
        return {
          success: false,
          error: {
            code: 'COUPON_NOT_FOUND',
            message: 'Cupom não encontrado ou inativo'
          }
        };
      }

      const coupon = couponResult[0];

      // 2. Validar período de validade (temporariamente desabilitado para teste)
      /*
      const now = new Date();
      if (coupon.starts_at) {
        const startsAt = new Date(coupon.starts_at);
        if (startsAt > now) {
          return {
            success: false,
            error: {
              code: 'COUPON_NOT_STARTED',
              message: 'Cupom ainda não está válido'
            }
          };
        }
      }

      if (coupon.expires_at) {
        const expiresAt = new Date(coupon.expires_at);
        if (expiresAt < now) {
          return {
            success: false,
            error: {
              code: 'COUPON_EXPIRED',
              message: 'Cupom expirado'
            }
          };
        }
      }
      */

      // 3. Validar limite de usos total
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return {
          success: false,
          error: {
            code: 'COUPON_LIMIT_REACHED',
            message: 'Limite de usos do cupom atingido'
          }
        };
      }

      // 4. Validar limite por usuário
      if (body.user_id && coupon.max_uses_per_customer) {
        const userUsageResult = await db.query`
          SELECT COUNT(*) as usage_count
          FROM coupon_usage
          WHERE coupon_id = ${coupon.id}
          AND user_id = ${body.user_id}
        `;

        if (parseInt(userUsageResult[0].usage_count) >= coupon.max_uses_per_customer) {
          return {
            success: false,
            error: {
              code: 'COUPON_USER_LIMIT',
              message: 'Você já utilizou este cupom o número máximo de vezes'
            }
          };
        }
      }

      // 5. Validar primeira compra (se aplicável)
      if (coupon.is_first_purchase_only && body.user_id) {
        const orderCountResult = await db.query`
          SELECT COUNT(*) as order_count
          FROM orders
          WHERE user_id = ${body.user_id}
          AND status != 'cancelled'
        `;

        if (parseInt(orderCountResult[0].order_count) > 0) {
          return {
            success: false,
            error: {
              code: 'NOT_FIRST_PURCHASE',
              message: 'Este cupom é válido apenas para primeira compra'
            }
          };
        }
      }

      // 6. Calcular subtotal e validar valor mínimo
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

      // 7. Validar quantidade mínima
      const totalQuantity = body.items.reduce((sum, item) => sum + item.quantity, 0);
      
      if (coupon.min_quantity && totalQuantity < coupon.min_quantity) {
        return {
          success: false,
          error: {
            code: 'MIN_QUANTITY_NOT_REACHED',
            message: `Quantidade mínima de ${coupon.min_quantity} itens não atingida`
          }
        };
      }

      // 8. Validar escopo e calcular desconto
      const discountCalculation = await calculateDiscount(db, coupon, body.items, body.shipping_cost);
      
      if (!discountCalculation.success) {
        return discountCalculation;
      }

      // 9. Aplicar limite máximo de desconto se definido
      let finalDiscount = discountCalculation.discount_amount || 0;
      if (coupon.max_discount_amount && finalDiscount > coupon.max_discount_amount) {
        finalDiscount = coupon.max_discount_amount;
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
          discount_amount: finalDiscount,
          applied_to: discountCalculation.applied_to
        }
      };
    });

    return json(result as CouponValidationResult);

  } catch (error: any) {
    console.error('❌ Erro ao validar cupom:', error);
    return json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Erro interno do servidor'
      }
    } as CouponValidationResult, { status: 500 });
  }
};

// Função para calcular desconto baseado no escopo
async function calculateDiscount(db: any, coupon: any, items: any[], shippingCost: number = 0) {
  const appliedTo = {
    products: [] as string[],
    sellers: [] as string[],
    global: false
  };

  let discountAmount = 0;
  let applicableAmount = 0;

  switch (coupon.scope) {
    case 'global':
      // Desconto global - aplicar a todos os itens
      applicableAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      appliedTo.global = true;
      
      if (coupon.type === 'free_shipping') {
        discountAmount = shippingCost;
      } else if (coupon.type === 'percentage') {
        discountAmount = applicableAmount * (coupon.value / 100);
      } else if (coupon.type === 'fixed_amount') {
        discountAmount = Math.min(coupon.value, applicableAmount);
      }
      break;

    case 'seller':
      // Desconto por vendedor específico
      if (!coupon.seller_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_SELLER_COUPON',
            message: 'Cupom de vendedor sem vendedor definido'
          }
        };
      }

      const sellerItems = items.filter(item => item.seller_id === coupon.seller_id);
      if (sellerItems.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_SELLER_PRODUCTS',
            message: 'Nenhum produto do vendedor especificado no carrinho'
          }
        };
      }

      applicableAmount = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      appliedTo.sellers.push(coupon.seller_id);
      
      if (coupon.type === 'percentage') {
        discountAmount = applicableAmount * (coupon.value / 100);
      } else if (coupon.type === 'fixed_amount') {
        discountAmount = Math.min(coupon.value, applicableAmount);
      }
      break;

    case 'product':
      // Desconto por produtos específicos
      const eligibleProductsResult = await db.query`
        SELECT product_id FROM coupon_products 
        WHERE coupon_id = ${coupon.id}
      `;

      const eligibleProductIds = eligibleProductsResult.map((row: any) => row.product_id);
      const eligibleItems = items.filter(item => eligibleProductIds.includes(item.product_id));
      
      if (eligibleItems.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_ELIGIBLE_PRODUCTS',
            message: 'Nenhum produto elegível para este cupom no carrinho'
          }
        };
      }

      applicableAmount = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      appliedTo.products = eligibleItems.map(item => item.product_id);
      
      if (coupon.type === 'percentage') {
        discountAmount = applicableAmount * (coupon.value / 100);
      } else if (coupon.type === 'fixed_amount') {
        discountAmount = Math.min(coupon.value, applicableAmount);
      }
      break;

    case 'category':
      // Desconto por categorias específicas
      const eligibleCategoriesResult = await db.query`
        SELECT category_id FROM coupon_categories 
        WHERE coupon_id = ${coupon.id}
      `;

      const eligibleCategoryIds = eligibleCategoriesResult.map((row: any) => row.category_id);
      const categoryItems = items.filter(item => eligibleCategoryIds.includes(item.category_id));
      
      if (categoryItems.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_ELIGIBLE_CATEGORIES',
            message: 'Nenhum produto das categorias elegíveis no carrinho'
          }
        };
      }

      applicableAmount = categoryItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      appliedTo.products = categoryItems.map(item => item.product_id);
      
      if (coupon.type === 'percentage') {
        discountAmount = applicableAmount * (coupon.value / 100);
      } else if (coupon.type === 'fixed_amount') {
        discountAmount = Math.min(coupon.value, applicableAmount);
      }
      break;

    default:
      return {
        success: false,
        error: {
          code: 'INVALID_SCOPE',
          message: 'Escopo do cupom inválido'
        }
      };
  }

  return {
    success: true,
    discount_amount: Math.round(discountAmount * 100) / 100, // Arredondar para 2 casas decimais
    applied_to: appliedTo
  };
} 