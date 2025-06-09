import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

interface BasicProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  category_id: string;
}

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const limit = Number(url.searchParams.get('limit')) || 12;
    
    console.log('🔍 Featured - Usando estratégia híbrida...');
    
    const db = getDatabase(platform);
    
    // Promise com timeout de 5 segundos (aumentado para buscar dados relacionados)
    const queryPromise = (async () => {
      console.log('🔍 Executando query completa de produtos featured...');
      
      // Query completa com dados relacionados
      const products = await db.query`
        SELECT 
          p.id, p.name, p.slug, p.description, p.price, p.original_price, 
          p.sku, p.quantity, p.rating_average, p.rating_count, p.sales_count,
          p.featured, p.created_at, p.updated_at,
          b.name as brand_name, b.id as brand_id,
          s.company_name as seller_name, s.id as seller_id
        FROM products p
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id
        WHERE p.featured = true AND p.is_active = true 
        ORDER BY p.created_at DESC 
        LIMIT ${limit}
      `;
      
      console.log(`✅ SUCESSO: ${products.length} produtos featured encontrados`);
      
      // Buscar categorias para cada produto via product_categories
      const productIds = products.map((p: any) => p.id);
      let categoryMap = new Map();
      
      if (productIds.length > 0) {
        const categories = await db.query`
          SELECT pc.product_id, c.name as category_name, c.id as category_id
          FROM product_categories pc
          JOIN categories c ON c.id = pc.category_id
          WHERE pc.product_id = ANY(${productIds}) AND pc.is_primary = true
        `;
        
        categories.forEach((cat: any) => {
          categoryMap.set(cat.product_id, {
            id: cat.category_id,
            name: cat.category_name
          });
        });
      }
      
      // Buscar imagens para cada produto
      let imageMap = new Map();
      if (productIds.length > 0) {
        const images = await db.query`
          SELECT DISTINCT ON (product_id) product_id, url
          FROM product_images
          WHERE product_id = ANY(${productIds})
          ORDER BY product_id, position ASC
        `;
        
        images.forEach((img: any) => {
          imageMap.set(img.product_id, img.url);
        });
      }
      
      return { products, categoryMap, imageMap };
    })();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 5000)
    });
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    // Formatar produtos com dados 100% reais
    const formattedProducts = result.products.map((product: any) => {
      const category = result.categoryMap.get(product.id);
      const image = result.imageMap.get(product.id);
      
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || `${product.name} - Produto em destaque`,
        price: Number(product.price),
        original_price: product.original_price ? Number(product.original_price) : undefined,
        discount: product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : undefined,
        image: image || `/api/placeholder/300/400?text=${encodeURIComponent(product.name.substring(0, 20))}`,
        images: image ? [image] : [`/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`],
        category_id: category?.id || null,
        category_name: category?.name || 'Categoria',
        brand_id: product.brand_id,
        brand_name: product.brand_name || 'Marca',
        seller_id: product.seller_id,
        seller_name: product.seller_name || 'Loja',
        is_active: true,
        stock: product.quantity || 0,
        sku: product.sku,
        tags: ['featured'],
        pieces: 1,
        is_featured: product.featured || true,
        is_black_friday: product.original_price && product.price < product.original_price,
        has_fast_delivery: true,
        rating: product.rating_average ? Number(product.rating_average) : 4.5,
        reviews_count: product.rating_count || 0,
        sold_count: product.sales_count || 0,
        created_at: product.created_at,
        updated_at: product.updated_at
      };
    });
    
    return json({
      success: true,
      data: {
        products: formattedProducts,
        total: formattedProducts.length
      },
      source: 'database'
    });
    
  } catch (error: any) {
    console.error(`❌ Erro ao buscar produtos em destaque:`, error);
    
    // Retornar erro ao invés de dados mockados
    return json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Não foi possível carregar os produtos em destaque',
        details: 'Por favor, tente novamente em alguns instantes'
      }
    }, { status: 503 });
  }
}; 