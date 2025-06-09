import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { withAdminAuth } from '@mktplace/utils/auth/middleware';

// GET - Estatísticas de produtos
export const GET: RequestHandler = withAdminAuth(async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Query para estatísticas básicas
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN featured = true THEN 1 ELSE 0 END) as featured
      FROM products 
      WHERE status != 'archived'
    `;
    
    const result = await db.query(statsQuery);
    const stats = result[0];
    
    await db.close();
    
    return json({
      success: true,
      data: {
        total: parseInt(stats.total || 0),
        active: parseInt(stats.active || 0),
        inactive: parseInt(stats.inactive || 0),
        low_stock: parseInt(stats.low_stock || 0),
        out_of_stock: parseInt(stats.out_of_stock || 0),
        featured: parseInt(stats.featured || 0)
      },
      meta: {
        timestamp: new Date().toISOString(),
        source: 'admin-panel'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de produtos:', error);
    
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      }
    }, { status: 500 });
  }
}); 