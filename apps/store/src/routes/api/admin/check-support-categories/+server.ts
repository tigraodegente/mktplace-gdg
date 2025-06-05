import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);

    // Verificar estrutura da tabela support_categories
    const supportCategoriesStructure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'support_categories' 
      ORDER BY ordinal_position
    `);

    return json({
      success: true,
      support_categories: supportCategoriesStructure
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar tabela support_categories:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 