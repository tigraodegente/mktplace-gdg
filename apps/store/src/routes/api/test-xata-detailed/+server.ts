import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

export const GET: RequestHandler = async () => {
  try {
    const xata = getXataClient();
    
    // Testar query simples em products
    try {
      const result = await xata.db.products
        .filter({ is_active: true })
        .getPaginated({ pagination: { size: 1 } });
      
      return json({
        success: true,
        message: 'Xata ORM funcionando!',
        data: {
          totalProducts: result.meta.page.cursor ? 'mais de 1' : result.records.length,
          firstProduct: result.records[0] ? {
            id: result.records[0].id,
            name: result.records[0].name,
            price: result.records[0].price
          } : null
        }
      });
    } catch (error) {
      return json({
        success: false,
        error: {
          message: 'Erro ao buscar produtos',
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    return json({
      success: false,
      error: {
        message: 'Erro ao inicializar Xata',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}; 