import type { PageServerLoad } from './$types';
import { getXataClient } from '@mktplace/xata-client';

export const load: PageServerLoad = async () => {
  const xata = getXataClient();
  
  // Buscar produtos em destaque
  const featuredProducts = await xata.db.products
    .select([
      '*',
      'category.*',
      'seller.*'
    ])
    .filter({
      is_active: true,
      is_featured: true
    })
    .getMany();

  // Buscar categorias principais
  const categories = await xata.db.categories
    .filter({
      is_active: true,
      parent_id: null
    })
    .sort('display_order', 'asc')
    .getMany();

  return {
    featuredProducts: featuredProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compare_at_price,
      images: product.images as string[],
      category: product.category ? {
        name: product.category.name,
        slug: product.category.slug
      } : null,
      seller: product.seller ? {
        name: product.seller.company_name,
        rating: product.seller.rating
      } : null
    })),
    categories: categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description
    }))
  };
}; 