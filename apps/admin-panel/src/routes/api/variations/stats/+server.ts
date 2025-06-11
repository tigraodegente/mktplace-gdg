import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async () => {
  try {
    console.log('🔌 Dev: Buscando estatísticas de variantes...');
    const db = getDatabase();
    
    // Query para estatísticas das variantes de produtos
    const statsQuery = `
      SELECT 
        COUNT(*) as total_variants,
        COUNT(*) FILTER (WHERE pv.is_active = true AND p.is_active = true) as active_variants,
        COUNT(*) FILTER (WHERE pv.is_active = false OR p.is_active = false) as inactive_variants,
        COUNT(DISTINCT p.id) as products_with_variants
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
    `;
    
    // Query para estatísticas de opções
    const optionsQuery = `
      SELECT 
        COUNT(DISTINCT po.id) as total_options,
        COUNT(DISTINCT pov.id) as total_option_values
      FROM product_options po
      LEFT JOIN product_option_values pov ON pov.option_id = po.id
    `;
    
    console.log('🔍 Executando queries de estatísticas...');
    
    // Executar ambas as queries
    const [statsResult, optionsResult] = await Promise.all([
      db.query(statsQuery),
      db.query(optionsQuery)
    ]);
    
    const stats = statsResult[0] || {};
    const options = optionsResult[0] || {};
    
    const response = {
      total_variations: parseInt(stats.total_variants || '0'),
      active_variations: parseInt(stats.active_variants || '0'),
      inactive_variations: parseInt(stats.inactive_variants || '0'),
      types_count: parseInt(options.total_options || '0'),
      used_variations: parseInt(stats.total_variants || '0'), // Todas as variantes são "usadas"
      products_with_variations: parseInt(stats.products_with_variants || '0'),
      total_option_values: parseInt(options.total_option_values || '0')
    };
    
    console.log('✅ Estatísticas de variantes:', response);
    
    return json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de variantes:', error);
    console.error('❌ Stack trace:', (error as Error).stack);
    return json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR',
          message: 'Erro ao buscar estatísticas de variantes',
          details: (error as Error).message
        } 
      },
      { status: 500 }
    );
  }
}; 