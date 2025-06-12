import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async () => {
  try {
    console.log('🔌 Dev: Buscando estatísticas de variações...');
    const db = getDatabase();
    
    // Query para estatísticas das variações (formato compatível com produtos)
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE pv.is_active = true AND p.is_active = true) as active,
        COUNT(*) FILTER (WHERE pv.is_active = false OR p.is_active = false) as inactive,
        COUNT(*) FILTER (WHERE pv.quantity <= 10 AND pv.quantity > 0) as low_stock,
        COUNT(*) FILTER (WHERE pv.quantity = 0) as out_of_stock,
        COUNT(DISTINCT p.id) as products_with_variations,
        AVG(pv.price) as avg_price,
        SUM(pv.quantity) as total_stock
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
    `;
    
    console.log('🔍 Executando queries de estatísticas...');
    
    // Executar query
    const statsResult = await db.query(statsQuery);
    const stats = statsResult[0] || {};
    
    const response = {
      // Formato padrão dos produtos (obrigatório para pageConfig)
      total: parseInt(stats.total || '0'),
      active: parseInt(stats.active || '0'),
      inactive: parseInt(stats.inactive || '0'),
      low_stock: parseInt(stats.low_stock || '0'),
      
      // Campos adicionais específicos das variações
      out_of_stock: parseInt(stats.out_of_stock || '0'),
      products_with_variations: parseInt(stats.products_with_variations || '0'),
      avg_price: parseFloat(stats.avg_price || '0'),
      total_stock: parseInt(stats.total_stock || '0'),
      
      // Campos legados para compatibilidade (se necessário)
      total_variations: parseInt(stats.total || '0'),
      active_variations: parseInt(stats.active || '0'),
      inactive_variations: parseInt(stats.inactive || '0')
    };
    
    console.log('✅ Estatísticas de variações:', response);
    
    return json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de variações:', error);
    console.error('❌ Stack trace:', (error as Error).stack);
    return json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR',
          message: 'Erro ao buscar estatísticas de variações',
          details: (error as Error).message
        } 
      },
      { status: 500 }
    );
  }
}; 