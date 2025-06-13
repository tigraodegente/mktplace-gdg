import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    console.log('🚀 Executando migrações em falta...');
    const db = getDatabase(platform);
    
    const results = [];
    
    // Definir o caminho base para as migrações (vai 2 níveis acima do admin-panel)
    const migrationBasePath = join(process.cwd(), '../../schema/migrations');
    
    // Migração 011: Webhooks System
    try {
      console.log('📋 Executando 011_webhooks_system.sql...');
      const webhookSQL = readFileSync(
        join(migrationBasePath, '011_webhooks_system.sql'), 
        'utf8'
      );
      
      if (webhookSQL.trim()) {
        await db.query(webhookSQL);
        results.push({
          migration: '011_webhooks_system.sql',
          status: 'success',
          message: 'Sistema de webhooks criado com sucesso'
        });
        console.log('✅ 011_webhooks_system.sql executada com sucesso!');
      } else {
        results.push({
          migration: '011_webhooks_system.sql',
          status: 'skipped',
          message: 'Arquivo vazio'
        });
      }
    } catch (error) {
      console.error('❌ Erro na migração webhooks:', error);
      results.push({
        migration: '011_webhooks_system.sql',
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    // Migração 012: Seller Prompt Management
    try {
      console.log('📋 Executando 012_seller_prompt_management.sql...');
      const sellerPromptSQL = readFileSync(
        join(migrationBasePath, '012_seller_prompt_management.sql'), 
        'utf8'
      );
      
      await db.query(sellerPromptSQL);
      results.push({
        migration: '012_seller_prompt_management.sql',
        status: 'success',
        message: 'Sistema de prompts por vendedor criado com sucesso'
      });
      console.log('✅ 012_seller_prompt_management.sql executada com sucesso!');
    } catch (error) {
      console.error('❌ Erro na migração seller prompts:', error);
      results.push({
        migration: '012_seller_prompt_management.sql',
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    await db.close();
    
    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`🎉 ${successCount} migrações executadas com sucesso!`);
    
    return json({
      success: true,
      message: `${successCount} migrações executadas com sucesso`,
      results
    });
    
  } catch (error) {
    console.error('❌ Erro geral ao executar migrações:', error);
    return json({
      success: false,
      error: 'Erro ao executar migrações',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 