import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform, params, request }) => {
  try {
    const { id } = params;
    const { isHelpful, sessionId } = await request.json();

    const db = getDatabase(platform);

    // Verificar se já votou (por sessão)
    const existingVote = await db.query(`
      SELECT id FROM faq_feedback 
      WHERE faq_item_id = $1 AND session_id = $2
    `, id, sessionId);

    if (existingVote.length > 0) {
      return json({ success: false, error: 'Você já votou nesta FAQ' }, { status: 400 });
    }

    // Salvar feedback
    await db.query(`
      INSERT INTO faq_feedback (faq_item_id, session_id, is_helpful, created_at)
      VALUES ($1, $2, $3, NOW())
    `, id, sessionId, isHelpful);

    // Atualizar contador na FAQ
    if (isHelpful) {
      await db.query(`
        UPDATE faq_items 
        SET helpful_count = helpful_count + 1 
        WHERE id = $1
      `, id);
    } else {
      await db.query(`
        UPDATE faq_items 
        SET not_helpful_count = not_helpful_count + 1 
        WHERE id = $1
      `, id);
    }

    // Buscar contadores atualizados
    const updatedFaq = await db.query(`
      SELECT helpful_count, not_helpful_count 
      FROM faq_items 
      WHERE id = $1
    `, id);

    return json({
      success: true,
      helpful_count: updatedFaq[0]?.helpful_count || 0,
      not_helpful_count: updatedFaq[0]?.not_helpful_count || 0
    });

  } catch (error: any) {
    console.error('❌ Erro ao salvar voto FAQ:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 