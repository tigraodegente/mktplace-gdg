import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Verificar estrutura da tabela coupons
      const structure = await db.query`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'coupons'
        ORDER BY ordinal_position
      `;

      // Verificar se existe algum cupom
      const count = await db.query`
        SELECT COUNT(*) as total FROM coupons
      `;

      return {
        success: true,
        table_structure: structure,
        total_coupons: parseInt(count[0].total)
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao verificar estrutura:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 