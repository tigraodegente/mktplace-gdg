import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    // Parâmetros de busca
    const searchQuery = url.searchParams.get('q')?.trim() || '';
    const categories = url.searchParams.get('categoria')?.split(',').filter(Boolean) || [];
    const brands = url.searchParams.get('marca')?.split(',').filter(Boolean) || [];
    const priceMin = url.searchParams.get('preco_min') ? Number(url.searchParams.get('preco_min')) : undefined;
    const priceMax = url.searchParams.get('preco_max') ? Number(url.searchParams.get('preco_max')) : undefined;
    const hasDiscount = url.searchParams.get('promocao') === 'true';
    const inStock = url.searchParams.get('disponivel') !== 'false';
    const sortBy = url.searchParams.get('ordenar') || 'relevancia';
    const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('itens')) || 20));
    
    const result = await withDatabase(platform, async (db) => {
      // Construir condições WHERE
      const conditions: string[] = ['p.is_active = true'];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (inStock) {
        conditions.push('p.quantity > 0');
      }
      
      if (categories.length > 0) {
        conditions.push(`p.category_id = ANY($${paramIndex})`);
        params.push(categories);
        paramIndex++;
      }
      
      if (brands.length > 0) {
        conditions.push(`p.brand_id = ANY($${paramIndex})`);
        params.push(brands);
        paramIndex++;
      }
      
      if (priceMin !== undefined) {
        conditions.push(`p.price >= $${paramIndex}`);
        params.push(priceMin);
        paramIndex++;
      }
      
      if (priceMax !== undefined) {
        conditions.push(`p.price <= $${paramIndex}`);
        params.push(priceMax);
        paramIndex++;
      }
      
      if (hasDiscount) {
        conditions.push('p.original_price > 0 AND p.price < p.original_price');
      }
      
      if (searchQuery) {
        conditions.push(`(
          p.name ILIKE $${paramIndex} OR 
          p.description ILIKE $${paramIndex} OR
          to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('portuguese', $${paramIndex + 1})
        )`);
        params.push(`%${searchQuery}%`);
        params.push(searchQuery);
        paramIndex += 2;
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Ordenação
      let orderBy = '';
      switch (sortBy) {
        case 'menor-preco':
          orderBy = 'p.price ASC';
          break;
        case 'maior-preco':
          orderBy = 'p.price DESC';
          break;
        case 'mais-vendidos':
          orderBy = 'p.sales_count DESC';
          break;
        case 'melhor-avaliados':
          orderBy = 'p.rating_average DESC NULLS LAST, p.rating_count DESC';
          break;
        case 'lancamentos':
          orderBy = 'p.created_at DESC';
          break;
        default:
          orderBy = 'p.featured DESC, p.sales_count DESC';
      }
      
      // Calcular offset
      const offset = (page - 1) * limit;
      
      // Query principal com imagens
      const productsQuery = `
        WITH product_images AS (
          SELECT 
            pi.product_id,
            array_agg(pi.url ORDER BY pi.position) as images
          FROM product_images pi
          GROUP BY pi.product_id
        )
        SELECT 
          p.*,
          COALESCE(pi.images, ARRAY[]::text[]) as images,
          c.name as category_name,
          b.name as brand_name,
          s.company_name as seller_name
        FROM products p
        LEFT JOIN product_images pi ON pi.product_id = p.id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);
      
      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        WHERE ${whereClause}
      `;
      
      // Executar queries em paralelo
      const [products, countResult] = await Promise.all([
        db.query(productsQuery, ...params),
        db.query(countQuery, ...params.slice(0, -2)) // Remove limit e offset
      ]);
      
      const totalCount = parseInt(countResult[0].total);
      
      // Formatar produtos
      const formattedProducts = products.map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        original_price: product.original_price ? Number(product.original_price) : undefined,
        discount: product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : undefined,
        images: product.images || [],
        image: product.images?.[0] || '',
        category_id: product.category_id,
        category_name: product.category_name,
        brand_id: product.brand_id,
        brand_name: product.brand_name,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        is_active: product.is_active,
        stock: product.quantity,
        rating: product.rating_average ? Number(product.rating_average) : undefined,
        reviews_count: product.rating_count,
        sold_count: product.sales_count,
        tags: product.tags || [],
        created_at: product.created_at,
        updated_at: product.updated_at,
        is_featured: product.featured || false
      }));
      
      // Buscar facetas (categorias e marcas disponíveis)
      const facetsQuery = `
        WITH category_counts AS (
          SELECT c.id, c.name, COUNT(p.id) as count
          FROM categories c
          INNER JOIN products p ON p.category_id = c.id
          WHERE p.is_active = true AND c.is_active = true
          GROUP BY c.id, c.name
          HAVING COUNT(p.id) > 0
          ORDER BY count DESC
          LIMIT 20
        ),
        brand_counts AS (
          SELECT b.id, b.name, COUNT(p.id) as count
          FROM brands b
          INNER JOIN products p ON p.brand_id = b.id
          WHERE p.is_active = true AND b.is_active = true
          GROUP BY b.id, b.name
          HAVING COUNT(p.id) > 0
          ORDER BY count DESC
          LIMIT 20
        )
        SELECT 
          json_build_object(
            'categories', COALESCE(
              (SELECT json_agg(row_to_json(cc)) FROM category_counts cc),
              '[]'::json
            ),
            'brands', COALESCE(
              (SELECT json_agg(row_to_json(bc)) FROM brand_counts bc),
              '[]'::json
            )
          ) as facets
      `;
      
      const facetsResult = await db.query(facetsQuery);
      const facets = facetsResult[0].facets;
      
      return {
        products: formattedProducts,
        totalCount,
        page,
        limit,
        facets
      };
    });
    
    return json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return json({
      success: false,
      error: { 
        message: 'Erro ao buscar produtos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
}; 