import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { auditService } from '$lib/services/auditService';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    console.log('🧪 Testando sistema de auditoria...');
    const db = getDatabase(platform);
    
    // Buscar um produto para teste
    const products = await db.query('SELECT * FROM products LIMIT 1');
    
    if (products.length === 0) {
      await db.close();
      return json({
        success: false,
        error: 'Nenhum produto encontrado para teste'
      });
    }
    
    const product = products[0];
    console.log(`📋 Produto para teste: ${product.name} (${product.id})`);
    
    // Simular alteração de dados
    const originalData = {
      name: product.name,
      description: product.description || '',
      price: product.price
    };
    
    const newData = {
      name: product.name,
      description: (product.description || '') + ' - Teste auditoria',
      price: product.price
    };
    
    // Calcular mudanças
    const changes = auditService.calculateChanges(originalData, newData);
    
    // Registrar auditoria
    await auditService.logAudit(
      'products',
      product.id,
      'update',
      {
        changes,
        old_values: originalData,
        new_values: newData,
        context: {
          user_id: 'test-user-id',
          user_name: 'Usuário Teste',
          user_email: 'teste@admin.com',
          source: 'admin_panel'
        },
        platform
      }
    );
    
    // Buscar o histórico recém criado
    const history = await auditService.getEntityHistory('products', product.id, { limit: 5, platform });
    
    await db.close();
    
    console.log(`✅ Teste de auditoria concluído. ${history.length} registros encontrados`);
    
    return json({
      success: true,
      message: 'Sistema de auditoria testado com sucesso',
      test_data: {
        product_id: product.id,
        product_name: product.name,
        changes_detected: Object.keys(changes).length,
        changes,
        history_count: history.length,
        latest_history: history[0] || null
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de auditoria:', error);
    return json({
      success: false,
      error: 'Erro no teste de auditoria',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 