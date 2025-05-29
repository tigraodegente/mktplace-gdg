import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const code = url.searchParams.get('code') || 'TESTE10';
    
    const result = await withDatabase(platform, async (db) => {
      // Buscar cupom
      const couponResult = await db.query`
        SELECT * FROM coupons 
        WHERE code = ${code.toUpperCase()}
        AND is_active = true
        LIMIT 1
      `;

      if (couponResult.length === 0) {
        return {
          success: false,
          error: 'Cupom não encontrado'
        };
      }

      const coupon = couponResult[0];
      
      // Calcular desconto simples para R$ 100
      const orderValue = 100;
      let discount = 0;
      
      if (coupon.type === 'percentage') {
        discount = orderValue * (parseFloat(coupon.value) / 100);
      } else if (coupon.type === 'fixed_amount') {
        discount = Math.min(parseFloat(coupon.value), orderValue);
      }

      return {
        success: true,
        coupon: {
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          type: coupon.type,
          value: parseFloat(coupon.value),
          discount_for_100: discount
        }
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro no teste simples:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};
 