import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

const LOG_PREFIX = '[api_menu_featured_products]';

export interface MenuFeaturedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  discount?: number;
  image: string;
  category_name: string;
  rating?: number;
  reviews_count?: number;
  sold_count?: number;
}

// Cache por categoria em memória (10 minutos)
const categoryCache = new Map<string, {
  data: MenuFeaturedProduct[];
  timestamp: number;
}>();

const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

export const GET: RequestHandler = async ({ platform, url }) => {
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Menu Featured Products API iniciada`);
  
  const limit = Number(url.searchParams.get('limit')) || 4;
  const categorySlug = url.searchParams.get('categoria');
  const cacheKey = categorySlug || 'global';
  
  // Verificar cache por categoria
  const cached = categoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ Cache hit para '${cacheKey}': ${cached.data.length} produtos`);
    
    return json({
      success: true,
      data: cached.data.slice(0, limit),
      cached: true,
      category: categorySlug
    }, {
      headers: {
        'Cache-Control': 'public, max-age=600', // 10 minutos
        'Vary': 'Accept-Encoding'
      }
    });
  }

  try {
    console.log(`🔌 Dev: NEON`);
    const db = getDatabase(platform);

    // Buscar produtos em destaque com filtro de categoria se especificado
    let result;
    
    if (categorySlug) {
      // Query para categoria específica (busca direta por slug)
      result = await db.query`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.price,
          p.original_price,
          p.rating_average,
          p.rating_count,
          p.sales_count,
          COALESCE(c.name, 'Categoria') as category_name,
          c.slug as category_slug,
          (
            SELECT pi.url 
            FROM product_images pi 
            WHERE pi.product_id = p.id 
            ORDER BY pi.position ASC 
            LIMIT 1
          ) as image_url
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        WHERE 
          p.is_active = true 
          AND p.quantity > 0
          AND c.slug = ${categorySlug}
        ORDER BY 
          p.featured DESC NULLS LAST,
          p.sales_count DESC NULLS LAST,
          p.rating_average DESC NULLS LAST,
          p.created_at DESC
        LIMIT 12
      `;
      
      // Se não encontrou produtos da categoria, buscar produtos globais como fallback
      if (result.length === 0) {
        console.log(`[SERVER] [INFO]${LOG_PREFIX} Nenhum produto encontrado para categoria '${categorySlug}', usando fallback global`);
        result = await db.query`
          SELECT 
            p.id,
            p.name,
            p.slug,
            p.price,
            p.original_price,
            p.rating_average,
            p.rating_count,
            p.sales_count,
            COALESCE(c.name, 'Categoria') as category_name,
            c.slug as category_slug,
            (
              SELECT pi.url 
              FROM product_images pi 
              WHERE pi.product_id = p.id 
              ORDER BY pi.position ASC 
              LIMIT 1
            ) as image_url
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE 
            p.featured = true 
            AND p.is_active = true 
            AND p.quantity > 0
          ORDER BY 
            p.sales_count DESC NULLS LAST,
            p.rating_average DESC NULLS LAST,
            p.created_at DESC
          LIMIT 12
        `;
      }
    } else {
      // Query global para todos os produtos em destaque
      result = await db.query`
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.price,
          p.original_price,
          p.rating_average,
          p.rating_count,
          p.sales_count,
          COALESCE(c.name, 'Categoria') as category_name,
          c.slug as category_slug,
          (
            SELECT pi.url 
            FROM product_images pi 
            WHERE pi.product_id = p.id 
            ORDER BY pi.position ASC 
            LIMIT 1
          ) as image_url
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE 
          p.featured = true 
          AND p.is_active = true 
          AND p.quantity > 0
        ORDER BY 
          p.sales_count DESC NULLS LAST,
          p.rating_average DESC NULLS LAST,
          p.created_at DESC
        LIMIT 12
      `;
    }

    const featuredProducts: MenuFeaturedProduct[] = result.map((product: any) => {
      const discount = product.original_price && product.price < product.original_price
        ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
        : undefined;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        original_price: product.original_price ? Number(product.original_price) : undefined,
        discount,
        image: product.image_url || `/api/placeholder/200/200?text=${encodeURIComponent(product.name.substring(0, 15))}&bg=f8f9fa&color=495057`,
        category_name: product.category_name || 'Categoria',
        rating: product.rating_average ? Number(product.rating_average) : undefined,
        reviews_count: product.rating_count || 0,
        sold_count: product.sales_count || 0
      };
    });

    // Atualizar cache por categoria
    categoryCache.set(cacheKey, {
      data: featuredProducts,
      timestamp: Date.now()
    });

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ ${featuredProducts.length} produtos carregados para categoria '${cacheKey}'`);

    return json({
      success: true,
      data: featuredProducts.slice(0, limit),
      category: categorySlug
    }, {
      headers: {
        'Cache-Control': 'public, max-age=600', // 10 minutos
        'Vary': 'Accept-Encoding'
      }
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao buscar produtos em destaque:`, error);
    
    // Fallback data
    const fallbackProducts: MenuFeaturedProduct[] = [
      {
        id: 'fallback-1',
        name: 'Produto em Destaque',
        slug: 'produto-destaque-1',
        price: 99.90,
        image: '/api/placeholder/200/200?text=Produto+Destaque&bg=f8f9fa&color=495057',
        category_name: 'Categoria Popular'
      },
      {
        id: 'fallback-2',
        name: 'Oferta Especial',
        slug: 'oferta-especial-1',
        price: 149.90,
        original_price: 199.90,
        discount: 25,
        image: '/api/placeholder/200/200?text=Oferta+Especial&bg=f8f9fa&color=495057',
        category_name: 'Promoções'
      }
    ];

    return json({
      success: false,
      error: 'Erro interno do servidor',
      data: fallbackProducts.slice(0, limit), // Fallback para não quebrar o frontend
      fallback: true,
      category: categorySlug
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache menor para fallback
      }
    });
  }
}; 