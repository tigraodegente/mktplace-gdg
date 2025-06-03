import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Verificar se updated_at existe
    const updatedAtCheck = await db.query`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'products' 
        AND column_name = 'updated_at'
    `;
    
    // Listar todas as colunas
    const allColumns = await db.query`
      SELECT 
        column_name,
        data_type
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'products'
      ORDER BY 
        ordinal_position
    `;
    
    return json({
      updated_at_exists: updatedAtCheck.length > 0,
      updated_at_details: updatedAtCheck[0] || null,
      total_columns: allColumns.length,
      columns: allColumns.map(c => ({ name: c.column_name, type: c.data_type }))
    });
    
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 