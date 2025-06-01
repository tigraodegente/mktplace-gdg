import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    console.log('🔍 DEBUG DIRECT - Testando conexão direta Neon (sem Hyperdrive)');
    
    // Conectar DIRETAMENTE no Neon sem Hyperdrive
    const { Client } = await import('pg') as any;
    
    const client = new Client({
      connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
      connectionTimeoutMillis: 5000,
      query_timeout: 10000
    });
    
    try {
      console.log('🔌 Conectando diretamente no Neon...');
      await client.connect();
      console.log('✅ Conectado no Neon');
      
      // Teste simples
      console.log('📊 Testando COUNT simples...');
      const result = await client.query('SELECT COUNT(*) as total FROM products WHERE is_active = true');
      const total = result.rows[0]?.total || 0;
      console.log(`✅ Total produtos: ${total}`);
      
      // Teste smartphones
      console.log('📱 Testando smartphones...');
      const smartphonesResult = await client.query(`
        SELECT p.id, p.name 
        FROM products p 
        LEFT JOIN categories c ON c.id = p.category_id 
        WHERE p.is_active = true AND c.slug = 'smartphones' 
        LIMIT 3
      `);
      console.log(`✅ Smartphones: ${smartphonesResult.rows.length}`);
      
      await client.end();
      
      return json({
        success: true,
        method: 'DIRECT_CONNECTION',
        results: {
          totalProducts: parseInt(total),
          smartphones: smartphonesResult.rows.length,
          smartphonesList: smartphonesResult.rows.map((row: any) => ({ id: row.id, name: row.name }))
        }
      });
      
    } catch (dbError) {
      await client.end();
      throw dbError;
    }
    
  } catch (error) {
    console.error('❌ ERRO DIRECT:', error);
    return json({
      success: false,
      method: 'DIRECT_CONNECTION',
      error: {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : 'N/A'
      }
    }, { status: 500 });
  }
}; 