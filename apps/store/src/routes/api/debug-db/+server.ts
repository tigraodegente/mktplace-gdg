import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const tableName = url.searchParams.get('table') || 'orders';
    
    const result = await withDatabase(platform, async (db) => {
      // Listar todas as tabelas
      const tables = await db.query`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;
      
      // Se a tabela especifica existe, mostrar sua estrutura
      let tableStructure = null;
      const tableExists = tables.some(t => t.table_name === tableName);
      
      if (tableExists) {
        tableStructure = await db.query`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = ${tableName} AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
      }
      
      // Buscar um registro de exemplo se for orders
      let sampleRecord = null;
      if (tableName === 'orders' && tableExists) {
        try {
          const records = await db.query`SELECT * FROM orders LIMIT 1`;
          sampleRecord = records[0] || null;
        } catch (e: any) {
          sampleRecord = { error: e.message };
        }
      }
      
      return {
        database: 'Local PostgreSQL',
        allTables: tables.map(t => t.table_name),
        requestedTable: tableName,
        tableExists,
        tableStructure,
        sampleRecord
      };
    });
    
    return json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao debugar banco:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 