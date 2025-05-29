import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      const coupons = await db.query`
        SELECT 
          code, name, description, type, value, scope,
          min_order_amount, max_discount_amount, max_uses, current_uses,
          is_active, is_automatic, is_first_purchase_only,
          starts_at, expires_at,
          created_at
        FROM coupons 
        ORDER BY created_at DESC
      `;

      return {
        success: true,
        coupons: coupons.map(coupon => ({
          ...coupon,
          starts_at: coupon.starts_at?.toISOString(),
          expires_at: coupon.expires_at?.toISOString(),
          created_at: coupon.created_at?.toISOString()
        }))
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao listar cupons:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 