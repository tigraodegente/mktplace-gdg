import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    console.log('🔍 Verificando status das migrações implementadas...');
    const db = getDatabase(platform);
    
    // Lista de tabelas das migrações implementadas
    const expectedTables = [
      'virtual_fields',           // 008_virtual_fields_system.sql
      'formula_templates',        // 008_virtual_fields_system.sql
      'ai_analysis_sessions',     // 009_ai_approval_workflow.sql
      'ai_suggestions',           // 009_ai_approval_workflow.sql
      'languages',                // 010_multi_language_system.sql
      'entity_translations',      // 010_multi_language_system.sql
      'webhook_endpoints',        // 011_webhooks_system.sql
      'webhook_events',           // 011_webhooks_system.sql
      'seller_prompts',           // 012_seller_prompt_management.sql
      'prompt_templates',         // 012_seller_prompt_management.sql
      'ai_providers',             // 013_ai_provider_management.sql
      'ai_models'                 // 013_ai_provider_management.sql
    ];
    
    const results: Record<string, { exists: boolean; records: number; error?: string }> = {};
    
    for (const tableName of expectedTables) {
      try {
        const tableExists = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        `, [tableName]);
        
        if (tableExists.length > 0) {
          // Se existe, contar registros
          const count = await db.query(`SELECT COUNT(*) as total FROM ${tableName}`);
          results[tableName] = {
            exists: true,
            records: parseInt(count[0]?.total || '0')
          };
        } else {
          results[tableName] = {
            exists: false,
            records: 0
          };
        }
      } catch (error) {
        results[tableName] = {
          exists: false,
          records: 0,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    }
    
    // Resumo por migração
    const migrationStatus = {
      '008_virtual_fields_system': {
        tables: ['virtual_fields', 'formula_templates'],
        applied: results.virtual_fields?.exists && results.formula_templates?.exists
      },
      '009_ai_approval_workflow': {
        tables: ['ai_analysis_sessions', 'ai_suggestions'],
        applied: results.ai_analysis_sessions?.exists && results.ai_suggestions?.exists
      },
      '010_multi_language_system': {
        tables: ['languages', 'entity_translations'],
        applied: results.languages?.exists && results.entity_translations?.exists
      },
      '011_webhooks_system': {
        tables: ['webhook_endpoints', 'webhook_events'],
        applied: results.webhook_endpoints?.exists && results.webhook_events?.exists
      },
      '012_seller_prompt_management': {
        tables: ['seller_prompts', 'prompt_templates'],
        applied: results.seller_prompts?.exists && results.prompt_templates?.exists
      },
      '013_ai_provider_management': {
        tables: ['ai_providers', 'ai_models'],
        applied: results.ai_providers?.exists && results.ai_models?.exists
      }
    };
    
    await db.close();
    
    const totalApplied = Object.values(migrationStatus).filter(m => m.applied).length;
    const totalMigrations = Object.keys(migrationStatus).length;
    
    console.log(`📊 Status: ${totalApplied}/${totalMigrations} migrações aplicadas`);
    
    return json({
      success: true,
      data: {
        summary: {
          totalMigrations,
          totalApplied,
          allApplied: totalApplied === totalMigrations
        },
        migrationStatus,
        tableDetails: results
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar migrações:', error);
    return json({
      success: false,
      error: 'Erro ao verificar migrações',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 