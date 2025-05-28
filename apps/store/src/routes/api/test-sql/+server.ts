import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

export const GET: RequestHandler = async () => {
  try {
    const xata = getXataClient();
    
    // Usar SQL direto através do Xata
    const result = await xata.sql`
      SELECT id, name, price, is_active 
      FROM products 
      WHERE is_active = true 
      LIMIT 5
    `;
    
    return json({
      success: true,
      message: 'SQL direto funcionando!',
      data: {
        products: result.records,
        count: result.records.length
      }
    });
    
  } catch (error) {
    return json({
      success: false,
      error: {
        message: 'Erro ao executar SQL',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}; 