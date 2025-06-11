import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async () => {
  try {
    console.log('🔌 Dev: NEON - Verificando estrutura da tabela product_history');
    const db = getDatabase();
    
    // Verificar se tabela existe
    const tableExists = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_history'
    `);
    
    // Verificar estrutura da tabela
    const columns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'product_history'
      ORDER BY ordinal_position
    `);
    
    // Contar registros existentes
    const count = await db.query(`
      SELECT COUNT(*) as total FROM product_history
    `);
    
    console.log('📊 Informações da tabela product_history:', {
      exists: tableExists.length > 0,
      columns: columns.length,
      records: count[0]?.total
    });
    
    return json({
      success: true,
      data: {
        exists: tableExists.length > 0,
        columns: columns,
        totalRecords: count[0]?.total || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error);
    return json({
      success: false,
      error: 'Erro ao verificar tabela',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 