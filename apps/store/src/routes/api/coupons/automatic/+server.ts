import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

interface AutomaticCouponsRequest {
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

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json() as AutomaticCouponsRequest;
    
    if (!body.items || body.items.length === 0) {
      return json({
        success: false,
        error: 'Carrinho vazio'
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Buscar cupons automáticos ativos
      const automaticCouponsResult = await db.query`
        SELECT * FROM coupons 
        WHERE is_automatic = true
        AND is_active = true
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY 
          CASE 
            WHEN type = 'free_shipping' THEN 1
            WHEN type = 'percentage' THEN 2
            WHEN type = 'fixed_amount' THEN 3
            ELSE 4
          END,
          value DESC
      `;

      const appliedCoupons = [];
      let totalDiscount = 0;

      for (const coupon of automaticCouponsResult) {
        // Verificar se o cupom pode ser aplicado
        const validation = await validateAutomaticCoupon(db, coupon, body, body.user_id);
        
        if (validation.success && validation.discount_amount > 0) {
          appliedCoupons.push({
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            description: coupon.description,
            type: coupon.type,
            value: coupon.value,
            discount_amount: validation.discount_amount,
            applied_to: validation.applied_to
          });

          totalDiscount += validation.discount_amount;

          // Se não for cumulativo, parar aqui
          if (!coupon.is_cumulative) {
            break;
          }
        }
      }

      return {
        success: true,
        automatic_coupons: appliedCoupons,
        total_discount: Math.round(totalDiscount * 100) / 100
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao buscar cupons automáticos:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// Função auxiliar para validar cupom automático
async function validateAutomaticCoupon(db: any, coupon: any, requestData: AutomaticCouponsRequest, userId?: string) {
  try {
    // 1. Verificar limite de usos
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return { success: false, discount_amount: 0 };
    }

    // 2. Verificar limite por usuário
    if (userId && coupon.max_uses_per_customer) {
      const userUsageResult = await db.query`
        SELECT COUNT(*) as usage_count
        FROM coupon_usage
        WHERE coupon_id = ${coupon.id}
        AND user_id = ${userId}
      `;

      if (parseInt(userUsageResult[0].usage_count) >= coupon.max_uses_per_customer) {
        return { success: false, discount_amount: 0 };
      }
    }

    // 3. Verificar primeira compra
    if (coupon.is_first_purchase_only && userId) {
      const orderCountResult = await db.query`
        SELECT COUNT(*) as order_count
        FROM orders
        WHERE user_id = ${userId}
        AND status != 'cancelled'
      `;

      if (parseInt(orderCountResult[0].order_count) > 0) {
        return { success: false, discount_amount: 0 };
      }
    }

    // 4. Calcular subtotal e validar valor mínimo
    const subtotal = requestData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return { success: false, discount_amount: 0 };
    }

    // 5. Validar quantidade mínima
    const totalQuantity = requestData.items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (coupon.min_quantity && totalQuantity < coupon.min_quantity) {
      return { success: false, discount_amount: 0 };
    }

    // 6. Calcular desconto
    const discountCalculation = await calculateAutomaticDiscount(db, coupon, requestData.items, requestData.shipping_cost);
    
    if (!discountCalculation.success) {
      return { success: false, discount_amount: 0 };
    }

    // 7. Aplicar limite máximo
    let finalDiscount = discountCalculation.discount_amount || 0;
    if (coupon.max_discount_amount && finalDiscount > coupon.max_discount_amount) {
      finalDiscount = coupon.max_discount_amount;
    }

    return {
      success: true,
      discount_amount: finalDiscount,
      applied_to: discountCalculation.applied_to
    };

  } catch (error) {
    console.error('❌ Erro ao validar cupom automático:', error);
    return { success: false, discount_amount: 0 };
  }
}

// Função para calcular desconto automático
async function calculateAutomaticDiscount(db: any, coupon: any, items: any[], shippingCost: number = 0) {
  const appliedTo = {
    products: [] as string[],
    sellers: [] as string[],
    global: false
  };

  let discountAmount = 0;
  let applicableAmount = 0;

  switch (coupon.scope) {
    case 'global':
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
      if (!coupon.seller_id) {
        return { success: false };
      }

      const sellerItems = items.filter(item => item.seller_id === coupon.seller_id);
      if (sellerItems.length === 0) {
        return { success: false };
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
      const eligibleProductsResult = await db.query`
        SELECT product_id FROM coupon_products 
        WHERE coupon_id = ${coupon.id}
      `;

      const eligibleProductIds = eligibleProductsResult.map((row: any) => row.product_id);
      const eligibleItems = items.filter(item => eligibleProductIds.includes(item.product_id));
      
      if (eligibleItems.length === 0) {
        return { success: false };
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
      const eligibleCategoriesResult = await db.query`
        SELECT category_id FROM coupon_categories 
        WHERE coupon_id = ${coupon.id}
      `;

      const eligibleCategoryIds = eligibleCategoriesResult.map((row: any) => row.category_id);
      const categoryItems = items.filter(item => eligibleCategoryIds.includes(item.category_id));
      
      if (categoryItems.length === 0) {
        return { success: false };
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
      return { success: false };
  }

  return {
    success: true,
    discount_amount: Math.round(discountAmount * 100) / 100,
    applied_to: appliedTo
  };
} 