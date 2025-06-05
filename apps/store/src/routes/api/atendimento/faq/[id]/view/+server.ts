import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform, params }) => {
  try {
    const { id } = params;
    const db = getDatabase(platform);

    // Incrementar view_count
    await db.query(`
      UPDATE faq_items 
      SET view_count = view_count + 1 
      WHERE id = $1
    `, id);

    // Buscar contador atualizado
    const updatedFaq = await db.query(`
      SELECT view_count 
      FROM faq_items 
      WHERE id = $1
    `, id);

    return json({
      success: true,
      view_count: updatedFaq[0]?.view_count || 0
    });

  } catch (error: any) {
    console.error('❌ Erro ao incrementar visualização FAQ:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 