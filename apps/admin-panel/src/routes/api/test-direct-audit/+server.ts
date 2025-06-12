import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    console.log('🧪 Teste direto de inserção na audit_logs...');
    const db = getDatabase(platform);
    
    // Teste de inserção direta
    const testData = {
      entity_type: 'products',
      entity_id: 'test-product-id',
      action: 'update',
      changes: JSON.stringify({ description: { from: 'old', to: 'new' } }),
      user_name: 'Usuário Teste',
      user_email: 'teste@admin.com',
      source: 'admin_panel'
    };
    
    console.log('📋 Inserindo registro de teste:', testData);
    
    const result = await db.query(`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, changes, user_name, user_email, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      testData.entity_type,
      testData.entity_id,
      testData.action,
      testData.changes,
      testData.user_name,
      testData.user_email,
      testData.source
    ]);
    
    console.log('✅ Registro inserido:', result[0]);
    
    // Verificar se foi inserido
    const checkResult = await db.query(`
      SELECT * FROM audit_logs 
      WHERE entity_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [testData.entity_id]);
    
    await db.close();
    
    return json({
      success: true,
      message: 'Teste de inserção direta realizado',
      inserted: result[0],
      found: checkResult[0] || null
    });
    
  } catch (error) {
    console.error('❌ Erro no teste direto:', error);
    return json({
      success: false,
      error: 'Erro no teste direto',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 