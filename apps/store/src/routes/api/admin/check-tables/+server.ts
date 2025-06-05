import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);

    // Verificar estrutura das tabelas FAQ
    const faqCategoriesStructure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'faq_categories' 
      ORDER BY ordinal_position
    `);

    const faqItemsStructure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'faq_items' 
      ORDER BY ordinal_position
    `);

    const faqFeedbackStructure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'faq_feedback' 
      ORDER BY ordinal_position
    `);

    return json({
      success: true,
      tables: {
        faq_categories: faqCategoriesStructure,
        faq_items: faqItemsStructure,
        faq_feedback: faqFeedbackStructure
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar tabelas:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 