import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform, request }) => {
  try {
    const { adminKey } = await request.json();
    
    if (adminKey !== 'gdg-create-tables-2024') {
      return json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const db = getDatabase(platform);

    console.log('🔨 Criando tabelas FAQ...');

    // 1. Categorias FAQ (usando IDs string simples)
    await db.query(`
      CREATE TABLE IF NOT EXISTS faq_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Itens FAQ
    await db.query(`
      CREATE TABLE IF NOT EXISTS faq_items (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        not_helpful_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 3. Feedback FAQ  
    await db.query(`
      CREATE TABLE IF NOT EXISTS faq_feedback (
        id SERIAL PRIMARY KEY,
        faq_item_id TEXT NOT NULL,
        session_id TEXT,
        is_helpful BOOLEAN,
        feedback_text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 4. Categorias de suporte
    await db.query(`
      CREATE TABLE IF NOT EXISTS support_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'help-circle',
        color TEXT DEFAULT '#6366f1',
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Verificar tabelas criadas (PostgreSQL)
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE 'faq_%' OR table_name LIKE 'support_%')
    `);

    console.log('✅ Tabelas FAQ criadas:', result);

    return json({
      success: true,
      message: 'Tabelas criadas com sucesso!',
      tables: result
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar tabelas FAQ:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 