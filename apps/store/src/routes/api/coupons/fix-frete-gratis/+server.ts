import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      console.log('🔧 Corrigindo cupom FRETEGRATIS...');

      // Corrigir o cupom FRETEGRATIS para free_shipping
      await db.query`
        UPDATE coupons 
        SET 
          type = 'free_shipping',
          value = 0.00,
          name = 'Frete Grátis',
          description = 'Frete grátis para compras acima de R$ 150',
          min_order_amount = 150.00,
          is_active = true,
          expires_at = NOW() + INTERVAL '90 days'
        WHERE code = 'FRETEGRATIS'
      `;

      // Verificar se foi atualizado
      const updated = await db.query`
        SELECT code, type, value, description, min_order_amount, is_active
        FROM coupons 
        WHERE code = 'FRETEGRATIS'
      `;

      console.log('✅ Cupom FRETEGRATIS corrigido');

      return {
        success: true,
        message: 'Cupom FRETEGRATIS corrigido com sucesso',
        cupom_corrigido: updated[0] || null
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao corrigir cupom:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 