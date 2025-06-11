import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  try {
    console.log('🔌 Dev: Buscando variantes de produtos...');
    const db = getDatabase();
    
    // Parâmetros de query
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    
    console.log('📊 Parâmetros:', { page, limit, search, status });
    
    // Query para buscar variantes com informações dos produtos e opções
    let whereConditions = ['1=1'];
    
    if (search) {
      whereConditions.push(`(p.name ILIKE '%${search}%' OR pv.sku ILIKE '%${search}%')`);
    }
    
    if (status === 'active') {
      whereConditions.push('pv.is_active = true AND p.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('(pv.is_active = false OR p.is_active = false)');
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Query principal - buscar variantes com produto e opções
    const query = `
      SELECT 
        pv.id,
        pv.sku,
        pv.price,
        pv.original_price,
        pv.cost,
        pv.quantity,
        pv.weight,
        pv.barcode,
        pv.is_active,
        pv.created_at,
        pv.updated_at,
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        
        -- Buscar as opções da variante
        COALESCE(
          json_agg(
            CASE 
              WHEN po.name IS NOT NULL THEN 
                json_build_object(
                  'option_name', po.name,
                  'option_value', pov.value,
                  'display_value', COALESCE(pov.display_value, pov.value)
                )
              ELSE NULL
            END
          ) FILTER (WHERE po.name IS NOT NULL), 
          '[]'::json
        ) as options
        
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id  
      LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
      LEFT JOIN product_options po ON po.id = pov.option_id
      WHERE ${whereClause}
      GROUP BY pv.id, pv.sku, pv.price, pv.original_price, pv.cost, pv.quantity, 
               pv.weight, pv.barcode, pv.is_active, pv.created_at, pv.updated_at,
               p.id, p.name, p.slug
      ORDER BY pv.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `;
    
    // Query para total
    const countQuery = `
      SELECT COUNT(DISTINCT pv.id) as total
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      WHERE ${whereClause}
    `;
    
    console.log('🔍 Executando queries...');
    
    // Executar queries
    const [data, countResult] = await Promise.all([
      db.query(query),
      db.query(countQuery)
    ]);
    
    console.log('✅ Variantes encontradas:', data.length);
    console.log('✅ Total no banco:', countResult[0]?.total || 0);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return json({
      success: true,
      data: data.map((row: any) => ({
        id: row.id,
        sku: row.sku || 'Sem SKU',
        price: parseFloat(row.price || '0'),
        original_price: parseFloat(row.original_price || '0'),
        cost: parseFloat(row.cost || '0'),
        quantity: parseInt(row.quantity || '0'),
        weight: parseFloat(row.weight || '0'),
        barcode: row.barcode,
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
        updated_at: row.updated_at,
        product: {
          id: row.product_id,
          name: row.product_name,
          slug: row.product_slug
        },
        options: Array.isArray(row.options) ? row.options : [],
        // Para compatibilidade com o template
        name: `${row.product_name} - ${row.sku}`,
        type: 'product_variant',
        values: Array.isArray(row.options) ? row.options.map((opt: any) => opt.display_value || opt.option_value) : [],
        products_count: 1 // Cada variante é de 1 produto
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('❌ Erro detalhado ao buscar variantes:', error);
    console.error('❌ Stack trace:', (error as Error).stack);
    return json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR',
          message: 'Erro ao buscar variantes',
          details: (error as Error).message
        } 
      },
      { status: 500 }
    );
  }
};

// Manter outros métodos simples por agora
export const POST: RequestHandler = async ({ request }) => {
  return json({
    success: false,
    error: { message: 'Criação de variantes deve ser feita via produtos' }
  }, { status: 501 });
};

export const PUT: RequestHandler = async ({ request, url }) => {
  return json({
    success: false,
    error: { message: 'Edição de variantes deve ser feita via produtos' }
  }, { status: 501 });
};

export const DELETE: RequestHandler = async ({ url }) => {
  return json({
    success: false,
    error: { message: 'Exclusão de variantes deve ser feita via produtos' }
  }, { status: 501 });
}; 