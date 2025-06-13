import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    const results = {};
    
    // Testar cada tabela principal
    const tablesToTest = [
      'virtual_fields',
      'formula_templates', 
      'ai_analysis_sessions',
      'ai_suggestions',
      'languages',
      'entity_translations',
      'webhook_endpoints',
      'webhook_events',
      'seller_prompts',
      'prompt_templates',
      'ai_providers',
      'ai_models'
    ];
    
    for (const table of tablesToTest) {
      try {
        const count = await db.query(`SELECT COUNT(*) as total FROM ${table}`);
        results[table] = {
          exists: true,
          records: parseInt(count[0]?.total || '0'),
          status: 'ok'
        };
      } catch (error) {
        results[table] = {
          exists: false,
          records: 0,
          status: 'error',
          error: error.message
        };
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_tables: tablesToTest.length,
        working_tables: Object.values(results).filter(r => r.status === 'ok').length,
        total_records: Object.values(results).reduce((sum, r) => sum + r.records, 0)
      },
      details: results
    });
    
  } catch (error) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 