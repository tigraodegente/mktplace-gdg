import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const code = url.searchParams.get('code') || 'TESTE10';
    
    const result = await withDatabase(platform, async (db) => {
      const couponResult = await db.query`
        SELECT code, starts_at, expires_at, is_active
        FROM coupons 
        WHERE code = ${code}
      `;

      if (couponResult.length === 0) {
        return { success: false, error: 'Cupom não encontrado' };
      }

      const coupon = couponResult[0];
      const now = new Date();
      
      return {
        success: true,
        coupon_code: coupon.code,
        is_active: coupon.is_active,
        current_time: now.toISOString(),
        starts_at: coupon.starts_at?.toISOString(),
        expires_at: coupon.expires_at?.toISOString(),
        validations: {
          is_active: coupon.is_active,
          has_starts_at: !!coupon.starts_at,
          starts_at_check: coupon.starts_at ? new Date(coupon.starts_at) <= now : true,
          has_expires_at: !!coupon.expires_at,
          expires_at_check: coupon.expires_at ? new Date(coupon.expires_at) > now : true,
          overall_valid: coupon.is_active && 
            (coupon.starts_at ? new Date(coupon.starts_at) <= now : true) &&
            (coupon.expires_at ? new Date(coupon.expires_at) > now : true)
        }
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao debugar datas:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 