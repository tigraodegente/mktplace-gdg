import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform, request }) => {
  try {
    const { faqId, feedback, sessionId } = await request.json();

    if (!faqId || !feedback || !sessionId) {
      return json({ success: false, error: 'Dados obrigatórios não fornecidos' }, { status: 400 });
    }

    const db = getDatabase(platform);

    // Salvar feedback qualitativo
    await db.query(`
      INSERT INTO faq_feedback (faq_item_id, session_id, is_helpful, feedback_text, created_at)
      VALUES ($1, $2, NULL, $3, NOW())
    `, faqId, sessionId, feedback);

    return json({
      success: true,
      message: 'Feedback salvo com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao salvar feedback FAQ:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 