import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

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
    console.log('🎫 Coupons Automatic - Estratégia híbrida iniciada');
    
    const body = await request.json() as AutomaticCouponsRequest;
    
    if (!body.items || body.items.length === 0) {
      return json({
        success: false,
        error: 'Carrinho vazio'
      }, { status: 400 });
    }

    // Tentar buscar cupons automáticos com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 2 segundos
      const queryPromise = (async () => {
        // Buscar cupons automáticos ativos (query simplificada)
        const automaticCoupons = await db.query`
          SELECT id, code, name, description, type, value, scope,
                 min_order_amount, max_discount_amount, is_cumulative
          FROM coupons 
          WHERE is_automatic = true AND is_active = true
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY value DESC
          LIMIT 10
      `;

      const appliedCoupons = [];
      let totalDiscount = 0;
        const subtotal = body.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        for (const coupon of automaticCoupons) {
          // Validação simplificada
          if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
            continue;
          }

          let discountAmount = 0;
          
          // Cálculo simplificado do desconto
          if (coupon.type === 'percentage') {
            discountAmount = subtotal * (coupon.value / 100);
          } else if (coupon.type === 'fixed_amount') {
            discountAmount = Math.min(coupon.value, subtotal);
          } else if (coupon.type === 'free_shipping') {
            discountAmount = body.shipping_cost || 0;
          }

          // Aplicar limite máximo
          if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
            discountAmount = coupon.max_discount_amount;
          }

          if (discountAmount > 0) {
          appliedCoupons.push({
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            description: coupon.description,
            type: coupon.type,
            value: coupon.value,
              discount_amount: Math.round(discountAmount * 100) / 100,
              applied_to: { global: true }
          });

            totalDiscount += discountAmount;

            // Se não for cumulativo, parar
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
      console.log(`⚠️ Erro cupons automáticos: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Cupons mock
      const subtotal = body.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const mockCoupons = [];
      let totalDiscount = 0;

      // Cupom de frete grátis para pedidos acima de R$ 150
      if (subtotal >= 150 && body.shipping_cost && body.shipping_cost > 0) {
        mockCoupons.push({
          id: 'auto-freeshipping',
          code: 'FRETEGRATIS150',
          name: 'Frete Grátis',
          description: 'Frete grátis para pedidos acima de R$ 150',
          type: 'free_shipping',
          value: 0,
          discount_amount: body.shipping_cost,
          applied_to: { global: true }
        });
        totalDiscount += body.shipping_cost;
      }

      // Cupom de desconto percentual para pedidos acima de R$ 200
      if (subtotal >= 200) {
        const discountAmount = subtotal * 0.05; // 5% de desconto
        mockCoupons.push({
          id: 'auto-discount5',
          code: 'DESCONTO5',
          name: 'Desconto de 5%',
          description: '5% de desconto para pedidos acima de R$ 200',
          type: 'percentage',
          value: 5,
          discount_amount: Math.round(discountAmount * 100) / 100,
          applied_to: { global: true }
        });
        totalDiscount += discountAmount;
      }

      return json({
        success: true,
        automatic_coupons: mockCoupons,
        total_discount: Math.round(totalDiscount * 100) / 100,
        source: 'fallback'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro crítico cupons automáticos:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};