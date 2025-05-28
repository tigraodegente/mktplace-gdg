import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';

export const GET: RequestHandler = async () => {
  try {
    const xata = getXataClient();
    
    // Buscar produtos em destaque
    const featuredProducts = await xata.db.products
      .filter({
        is_active: true,
        featured: true,
        quantity: { $gt: 0 }
      })
      .sort('sales_count', 'desc')
      .getPaginated({
        pagination: { size: 12 }
      });
    
    // Buscar imagens dos produtos
    const productIds = featuredProducts.records.map(p => p.id);
    const images = await xata.db.product_images
      .filter({
        product_id: { $any: productIds }
      })
      .sort('display_order', 'asc')
      .getAll();
    
    // Agrupar imagens por produto
    const imagesByProduct = images.reduce((acc, img) => {
      if (!acc[img.product_id]) acc[img.product_id] = [];
      acc[img.product_id].push(img.image_url);
      return acc;
    }, {} as Record<string, string[]>);
    
    // Formatar produtos
    const products = featuredProducts.records.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      original_price: product.original_price ? Number(product.original_price) : undefined,
      discount: product.original_price && product.price < product.original_price
        ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
        : undefined,
      images: imagesByProduct[product.id] || [],
      category_id: product.category_id,
      seller_id: product.seller_id,
      is_active: product.is_active,
      stock: product.quantity,
      rating: product.rating_average ? Number(product.rating_average) : undefined,
      reviews_count: product.rating_count,
      sold_count: product.sales_count,
      tags: product.tags || [],
      created_at: product.created_at,
      updated_at: product.updated_at,
      is_featured: true
    }));
    
    return json({
      success: true,
      data: {
        products,
        total: products.length
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar produtos em destaque' }
    }, { status: 500 });
  }
}; 