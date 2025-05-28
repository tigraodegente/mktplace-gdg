import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const query = url.searchParams.get('q') || '';
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 20);
    
    if (query.length < 2) {
      return json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }
    
    const result = await withDatabase(platform, async (db) => {
      // Buscar sugestões de produtos, categorias e marcas em paralelo
      const [productSuggestions, categorySuggestions, brandSuggestions] = await Promise.all([
        // Produtos - busca por nome com imagem principal
        db.query`
          WITH product_images AS (
            SELECT DISTINCT ON (product_id) 
              product_id, 
              url as image_url
            FROM product_images
            ORDER BY product_id, position
          )
          SELECT 
            p.id,
            p.name,
            p.slug,
            p.price,
            p.original_price,
            p.rating_average,
            p.sales_count,
            pi.image_url
          FROM products p
          LEFT JOIN product_images pi ON pi.product_id = p.id
          WHERE 
            p.name ILIKE ${`%${query}%`}
            AND p.is_active = true
            AND p.quantity > 0
          ORDER BY 
            CASE WHEN p.name ILIKE ${`${query}%`} THEN 0 ELSE 1 END,
            p.sales_count DESC
          LIMIT ${limit}
        `,
        
        // Categorias - busca por nome
        db.query`
          SELECT 
            c.id,
            c.name,
            c.slug,
            COUNT(DISTINCT p.id)::text as product_count
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true AND p.quantity > 0
          WHERE 
            c.name ILIKE ${`%${query}%`}
            AND c.is_active = true
          GROUP BY c.id, c.name, c.slug
          HAVING COUNT(DISTINCT p.id) > 0
          ORDER BY 
            CASE WHEN c.name ILIKE ${`${query}%`} THEN 0 ELSE 1 END,
            COUNT(DISTINCT p.id) DESC
          LIMIT 5
        `,
        
        // Marcas - busca por nome
        db.query`
          SELECT 
            b.id,
            b.name,
            b.slug,
            COUNT(DISTINCT p.id)::text as product_count
          FROM brands b
          LEFT JOIN products p ON p.brand_id = b.id AND p.is_active = true AND p.quantity > 0
          WHERE 
            b.name ILIKE ${`%${query}%`}
            AND b.is_active = true
          GROUP BY b.id, b.name, b.slug
          HAVING COUNT(DISTINCT p.id) > 0
          ORDER BY 
            CASE WHEN b.name ILIKE ${`${query}%`} THEN 0 ELSE 1 END,
            COUNT(DISTINCT p.id) DESC
          LIMIT 5
        `
      ]);
      
      // Formatar sugestões
      const suggestions = [];
      
      // Adicionar produtos
      productSuggestions.forEach((product: any) => {
        const discount = product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : null;
          
        suggestions.push({
          type: 'product',
          id: product.id,
          text: product.name,
          slug: product.slug,
          image: product.image_url,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          discount,
          rating: product.rating_average ? Number(product.rating_average) : undefined,
          soldCount: product.sales_count
        });
      });
      
      // Adicionar categorias
      categorySuggestions.forEach((category: any) => {
        suggestions.push({
          type: 'category',
          id: category.id,
          text: category.name,
          slug: category.slug,
          count: parseInt(category.product_count)
        });
      });
      
      // Adicionar marcas
      brandSuggestions.forEach((brand: any) => {
        suggestions.push({
          type: 'brand',
          id: brand.id,
          text: brand.name,
          slug: brand.slug,
          count: parseInt(brand.product_count)
        });
      });
      
      // Contar total de produtos que correspondem à busca
      const totalProductsResult = await db.queryOne`
        SELECT COUNT(*)::text as total
        FROM products
        WHERE 
          name ILIKE ${`%${query}%`}
          AND is_active = true
          AND quantity > 0
      `;
      
      const totalProducts = parseInt(totalProductsResult?.total || '0');
      
      // Adicionar sugestão de busca geral se houver muitos resultados
      if (totalProducts > limit) {
        suggestions.unshift({
          type: 'query',
          id: query,
          text: `Buscar "${query}"`,
          count: totalProducts
        });
      }
      
      return {
        suggestions,
        totalProducts
      };
    });
    
    return json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar sugestões' }
    }, { status: 500 });
  }
}; 