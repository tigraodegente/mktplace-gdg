import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    console.log('🔄 Migrando histórico de produtos para sistema universal...');
    const db = getDatabase(platform);
    
    // Verificar se existe a tabela product_history
    const checkProductHistory = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_history'
    `);
    
    if (checkProductHistory.length === 0) {
      await db.close();
      return json({
        success: false,
        error: 'Tabela product_history não encontrada'
      });
    }
    
    // Verificar se existe a tabela audit_logs
    const checkAuditLogs = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
    `);
    
    if (checkAuditLogs.length === 0) {
      await db.close();
      return json({
        success: false,
        error: 'Tabela audit_logs não encontrada. Execute setup-universal-audit primeiro.'
      });
    }
    
    // Contar registros existentes
    const existingCount = await db.query(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE entity_type = 'products'
    `);
    
    const productHistoryCount = await db.query(`
      SELECT COUNT(*) as count 
      FROM product_history
    `);
    
    console.log(`📊 Registros audit_logs existentes: ${existingCount[0]?.count || 0}`);
    console.log(`📊 Registros product_history: ${productHistoryCount[0]?.count || 0}`);
    
    // Migrar dados
    const result = await db.query(`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, changes,
        user_name, user_email, created_at, source
      )
      SELECT 
        'products' as entity_type,
        product_id::text as entity_id,
        CASE 
          WHEN action = 'updated' THEN 'update'
          WHEN action = 'created' THEN 'create'
          WHEN action = 'deleted' THEN 'delete'
          ELSE action::text
        END as action,
        changes,
        COALESCE(user_name, 'Sistema') as user_name,
        COALESCE(user_email, 'sistema@admin.com') as user_email,
        created_at,
        'migration_from_product_history' as source
      FROM product_history
      WHERE NOT EXISTS (
        SELECT 1 FROM audit_logs al 
        WHERE al.entity_type = 'products' 
        AND al.entity_id = product_history.product_id::text
        AND al.created_at = product_history.created_at
        AND al.source IS NULL
      )
    `);
    
    // Contar registros após migração
    const finalCount = await db.query(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE entity_type = 'products'
    `);
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Migração de histórico concluída com sucesso',
        migrated: finalCount[0]?.count - existingCount[0]?.count,
        total_audit_logs: finalCount[0]?.count
      }
    });
    
  } catch (error) {
    console.error('❌ Erro na migração de histórico:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido na migração'
    }, { status: 500 });
  }
}; 