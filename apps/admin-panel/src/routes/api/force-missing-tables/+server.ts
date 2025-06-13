import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    const results = [];
    
    // Criar webhook_endpoints
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS webhook_endpoints (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          url TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      results.push({ table: 'webhook_endpoints', status: 'success' });
    } catch (error) {
      results.push({ table: 'webhook_endpoints', status: 'error', message: error.message });
    }

    // Criar seller_prompts  
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS seller_prompts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          prompt_text TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      results.push({ table: 'seller_prompts', status: 'success' });
    } catch (error) {
      results.push({ table: 'seller_prompts', status: 'error', message: error.message });
    }

    // Criar prompt_templates
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS prompt_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          template_content TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      results.push({ table: 'prompt_templates', status: 'success' });
    } catch (error) {
      results.push({ table: 'prompt_templates', status: 'error', message: error.message });
    }

    await db.close();
    
    return json({
      success: true,
      results
    });
    
  } catch (error) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 