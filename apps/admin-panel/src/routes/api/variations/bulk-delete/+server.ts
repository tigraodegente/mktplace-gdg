import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return json({
        success: false,
        error: 'IDs são obrigatórios'
      }, { status: 400 });
    }
    
    console.log('🗑️ Excluindo variações em lote:', ids);
    
    // Excluir em transação
    await db.query('BEGIN');
    
    try {
      // Primeiro, excluir as associações com option_values
      await db.query(
        `DELETE FROM variant_option_values WHERE variant_id = ANY($1::uuid[])`,
        [ids]
      );
      
      // Depois, excluir as variações
      const deleteResult = await db.query(
        `DELETE FROM product_variants WHERE id = ANY($1::uuid[]) RETURNING id, sku`,
        [ids]
      );
      
      await db.query('COMMIT');
      
      console.log('✅ Variações excluídas com sucesso:', deleteResult.length);
      
      return json({
        success: true,
        message: `${deleteResult.length} variação(ões) excluída(s) com sucesso!`,
        data: {
          deleted_count: deleteResult.length,
          deleted_ids: deleteResult.map((r: any) => r.id),
          deleted_skus: deleteResult.map((r: any) => r.sku)
        }
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Erro ao excluir variações em lote:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 