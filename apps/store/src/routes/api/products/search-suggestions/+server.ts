import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const xata = getXataClient();
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
    
    // Buscar sugestões de produtos, categorias e marcas em paralelo
    const [productSuggestions, categorySuggestions, brandSuggestions] = await Promise.all([
      // Produtos - busca simples por nome usando ILIKE
      xata.db.products
        .filter({
          name: { $iContains: query },
          is_active: true,
          quantity: { $gt: 0 }
        })
        .select([
          'id',
          'name', 
          'slug',
          'price',
          'original_price',
          'rating_average',
          'sales_count'
        ])
        .sort('sales_count', 'desc')
        .getPaginated({ pagination: { size: limit } }),
      
      // Categorias - busca por nome
      xata.sql<{
        id: string;
        name: string;
        slug: string;
        product_count: number;
      }>`
        SELECT 
          c.id,
          c.name,
          c.slug,
          COUNT(DISTINCT p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true AND p.quantity > 0
        WHERE LOWER(c.name) LIKE LOWER(${'%' + query + '%'})
          AND c.is_active = true
        GROUP BY c.id, c.name, c.slug
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY 
          CASE WHEN LOWER(c.name) LIKE LOWER(${query + '%'}) THEN 0 ELSE 1 END,
          product_count DESC
        LIMIT 5
      `,
      
      // Marcas - busca por nome
      xata.sql<{
        id: string;
        name: string;
        slug: string;
        product_count: number;
      }>`
        SELECT 
          b.id,
          b.name,
          b.slug,
          COUNT(DISTINCT p.id) as product_count
        FROM brands b
        LEFT JOIN products p ON p.brand_id = b.id AND p.is_active = true AND p.quantity > 0
        WHERE LOWER(b.name) LIKE LOWER(${'%' + query + '%'})
          AND b.is_active = true
        GROUP BY b.id, b.name, b.slug
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY 
          CASE WHEN LOWER(b.name) LIKE LOWER(${query + '%'}) THEN 0 ELSE 1 END,
          product_count DESC
        LIMIT 5
      `
    ]);
    
    // Buscar imagens dos produtos encontrados
    const productIds = productSuggestions.records.map(p => p.id);
    let productImages: Record<string, string> = {};
    
    if (productIds.length > 0) {
      const images = await xata.db.product_images
        .filter({
          product_id: { $any: productIds },
          display_order: 1
        })
        .select(['product_id', 'image_url'])
        .getAll();
        
      productImages = images.reduce((acc, img) => {
        // Converter Link para string
        const productId = typeof img.product_id === 'string' ? img.product_id : img.product_id?.id || '';
        acc[productId] = img.image_url;
        return acc;
      }, {} as Record<string, string>);
    }
    
    // Formatar sugestões
    const suggestions = [];
    
    // Adicionar produtos
    productSuggestions.records.forEach((product) => {
      const discount = product.original_price && product.price < product.original_price
        ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
        : null;
        
      suggestions.push({
        type: 'product',
        id: product.id,
        text: product.name,
        slug: product.slug,
        image: productImages[product.id],
        price: Number(product.price),
        originalPrice: product.original_price ? Number(product.original_price) : undefined,
        discount,
        rating: product.rating_average ? Number(product.rating_average) : undefined,
        soldCount: product.sales_count
      });
    });
    
    // Adicionar categorias
    categorySuggestions.records.forEach((category) => {
      suggestions.push({
        type: 'category',
        id: category.id,
        text: category.name,
        slug: category.slug,
        count: Number(category.product_count)
      });
    });
    
    // Adicionar marcas
    brandSuggestions.records.forEach((brand) => {
      suggestions.push({
        type: 'brand',
        id: brand.id,
        text: brand.name,
        slug: brand.slug,
        count: Number(brand.product_count)
      });
    });
    
    // Adicionar sugestão de busca geral se houver muitos resultados
    // Usar SQL para contar
    const totalProductsResult = await xata.sql<{ total: number }>`
      SELECT COUNT(*) as total
      FROM products
      WHERE LOWER(name) LIKE LOWER(${'%' + query + '%'})
        AND is_active = true
        AND quantity > 0
    `;
    
    const totalProducts = Number(totalProductsResult.records[0]?.total || 0);
    
    if (totalProducts > limit) {
      suggestions.unshift({
        type: 'query',
        id: query,
        text: `Buscar "${query}"`,
        count: totalProducts
      });
    }
    
    return json({
      success: true,
      data: {
        suggestions,
        totalProducts
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar sugestões' }
    }, { status: 500 });
  }
}; 