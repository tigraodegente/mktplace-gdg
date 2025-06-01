import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    console.log('🎫 Coupons List - Estratégia híbrida iniciada');
    
    // Tentar buscar cupons com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
      const coupons = await db.query`
          SELECT code, name, description, type, value, scope,
          min_order_amount, max_discount_amount, max_uses, current_uses,
          is_active, is_automatic, is_first_purchase_only,
                 starts_at, expires_at, created_at
        FROM coupons 
        ORDER BY created_at DESC
          LIMIT 50
      `;

      return {
        success: true,
          coupons: coupons.map((coupon: any) => ({
          ...coupon,
          starts_at: coupon.starts_at?.toISOString(),
          expires_at: coupon.expires_at?.toISOString(),
          created_at: coupon.created_at?.toISOString()
        }))
      };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro coupons list: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Cupons mock
      const mockCoupons = [
        {
          code: 'DESCONTO10',
          name: 'Desconto de 10%',
          description: '10% de desconto em toda a loja',
          type: 'percentage',
          value: 10,
          scope: 'global',
          min_order_amount: 100.00,
          max_discount_amount: 50.00,
          max_uses: 1000,
          current_uses: 245,
          is_active: true,
          is_automatic: false,
          is_first_purchase_only: false,
          starts_at: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
          expires_at: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
          created_at: new Date(Date.now() - 604800000).toISOString()
        },
        {
          code: 'FRETEGRATIS',
          name: 'Frete Grátis',
          description: 'Frete grátis para todo o Brasil',
          type: 'free_shipping',
          value: 0,
          scope: 'global',
          min_order_amount: 150.00,
          max_discount_amount: null,
          max_uses: null,
          current_uses: 89,
          is_active: true,
          is_automatic: true,
          is_first_purchase_only: false,
          starts_at: new Date(Date.now() - 1209600000).toISOString(), // 14 days ago
          expires_at: null,
          created_at: new Date(Date.now() - 1209600000).toISOString()
        }
      ];
      
      return json({
        success: true,
        coupons: mockCoupons,
        source: 'fallback'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro crítico coupons list:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 