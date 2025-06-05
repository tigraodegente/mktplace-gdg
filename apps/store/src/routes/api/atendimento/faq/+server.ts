import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    console.log('❓ FAQ GET - Buscando dados do banco');
    
    const categoryId = url.searchParams.get('category_id');
    const search = url.searchParams.get('search');

    const db = getDatabase(platform);
    
    // Construir query dinâmica
    let faqQuery = `
      SELECT 
        f.id, f.question, f.answer, f.view_count, f.helpful_count, f.not_helpful_count,
        fc.name as category_name, fc.id as category_id, f.created_at
      FROM faq_items f
      JOIN faq_categories fc ON f.category_id = fc.id
      WHERE f.is_active = true AND fc.is_active = true
    `;
    
    let queryParams = [];
    let paramIndex = 1;

    if (categoryId) {
      faqQuery += ` AND f.category_id = $${paramIndex}`;
      queryParams.push(categoryId);
      paramIndex++;
    }

    if (search) {
      faqQuery += ` AND (f.question ILIKE $${paramIndex} OR f.answer ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    faqQuery += ` ORDER BY f.order_index ASC, f.helpful_count DESC`;

    const faq = await db.query(faqQuery, ...queryParams);
    
    // Buscar categorias também
    const categories = await db.query(`
      SELECT id, name, description, order_index
      FROM faq_categories
      WHERE is_active = true
      ORDER BY order_index ASC
    `);

    console.log(`✅ FAQ GET: ${faq.length} itens encontrados`);

    return json({ 
      success: true, 
      faq, 
      categories, 
      source: 'database' 
    });

  } catch (error: any) {
    console.error('❌ Erro FAQ GET:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 