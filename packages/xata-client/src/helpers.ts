// Funções auxiliares para o cliente Xata

import { xata } from './index';

/**
 * Busca produtos com paginação e filtros
 */
export async function searchProducts(params: {
  query?: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  perPage?: number;
  sortBy?: 'price' | 'name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}) {
  const {
    query,
    categoryId,
    brandId,
    minPrice,
    maxPrice,
    page = 1,
    perPage = 20,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = params;

  const client = xata();
  let queryBuilder = client.db.products.filter({ is_active: true });

  // Aplicar filtros
  if (query) {
    queryBuilder = queryBuilder.filter({
      $any: [
        { name: { $contains: query } },
        { description: { $contains: query } }
      ]
    });
  }

  if (categoryId) {
    queryBuilder = queryBuilder.filter({ category_id: categoryId });
  }

  // TODO: Adicionar suporte para brand_id quando a tabela brands for reconhecida
  // if (brandId) {
  //   queryBuilder = queryBuilder.filter({ brand_id: brandId });
  // }

  // TODO: Adicionar suporte para filtros de preço quando os operadores forem suportados
  // if (minPrice !== undefined) {
  //   queryBuilder = queryBuilder.filter({ price: { $gte: minPrice } });
  // }

  // if (maxPrice !== undefined) {
  //   queryBuilder = queryBuilder.filter({ price: { $lte: maxPrice } });
  // }

  // Ordenação
  // const sortConfig = sortOrder === 'asc' ? sortBy : `-${sortBy}`;
  
  // Paginação
  const offset = (page - 1) * perPage;

  const results = await queryBuilder
    // .sort(sortConfig)
    .getPaginated({
      pagination: {
        size: perPage,
        offset
      }
    });

  return {
    products: results.records,
    meta: {
      page,
      perPage,
      total: results.meta.page.more ? offset + perPage + 1 : offset + results.records.length,
      hasMore: results.meta.page.more
    }
  };
}

/**
 * Busca produto por slug
 */
export async function getProductBySlug(slug: string) {
  const client = xata();
  const product = await client.db.products
    .filter({ slug, is_active: true })
    .getFirst();
    
  if (!product) {
    return null;
  }

  // TODO: Buscar imagens quando a tabela product_images for reconhecida
  // const images = await client.db.product_images
  //   .filter({ product_id: product.id })
  //   .sort('position')
  //   .getAll();

  return {
    ...product,
    images: [] // Temporariamente vazio
  };
}

/**
 * Busca categorias ativas
 */
export async function getActiveCategories() {
  const client = xata();
  return client.db.categories
    .filter({ is_active: true })
    // .sort('position')
    .getAll();
}

/**
 * Busca marcas ativas
 */
export async function getActiveBrands() {
  // TODO: Implementar quando a tabela brands for reconhecida
  // const client = xata();
  // return client.db.brands
  //   .filter({ is_active: true })
  //   .sort('name')
  //   .getAll();
  return [];
}

/**
 * Busca produtos em destaque
 */
export async function getFeaturedProducts(limit = 10) {
  const client = xata();
  return client.db.products
    .filter({ featured: true, is_active: true })
    // .sort('position')
    .getMany({ pagination: { size: limit } });
}

/**
 * Busca vendedor por ID
 */
export async function getSellerById(sellerId: string) {
  const client = xata();
  return client.db.sellers.read(sellerId);
}

/**
 * Busca pedidos do usuário
 */
export async function getUserOrders(userId: string, page = 1, perPage = 10) {
  const client = xata();
  const offset = (page - 1) * perPage;
  
  const results = await client.db.orders
    .filter({ user_id: userId })
    // .sort('-created_at')
    .getPaginated({
      pagination: {
        size: perPage,
        offset
      }
    });

  return {
    orders: results.records,
    meta: {
      page,
      perPage,
      total: results.meta.page.more ? offset + perPage + 1 : offset + results.records.length,
      hasMore: results.meta.page.more
    }
  };
}

// TODO: Implementar funções de carrinho quando a tabela cart_items for reconhecida
/**
 * Busca itens do carrinho do usuário
 */
export async function getUserCart(userId: string) {
  // const client = xata();
  // const cartItems = await client.db.cart_items
  //   .filter({ user_id: userId })
  //   .getAll();

  // // Buscar detalhes dos produtos
  // const productIds = cartItems.map(item => item.product_id).filter(Boolean);
  // const products = await client.db.products
  //   .filter({ id: { $any: productIds } })
  //   .getAll();

  // // Mapear produtos para os itens do carrinho
  // const productsMap = new Map(products.map(p => [p.id, p]));

  // return cartItems.map(item => ({
  //   ...item,
  //   product: productsMap.get(item.product_id!)
  // })).filter(item => item.product);
  
  return []; // Temporariamente vazio
}

/**
 * Adiciona item ao carrinho
 */
export async function addToCart(userId: string, productId: string, quantity: number) {
  // TODO: Implementar quando a tabela cart_items for reconhecida
  // const client = xata();
  
  // // Verificar se o item já existe no carrinho
  // const existingItem = await client.db.cart_items
  //   .filter({ user_id: userId, product_id: productId })
  //   .getFirst();

  // if (existingItem) {
  //   // Atualizar quantidade
  //   return client.db.cart_items.update(existingItem.id, {
  //     quantity: existingItem.quantity + quantity
  //   });
  // } else {
  //   // Criar novo item
  //   return client.db.cart_items.create({
  //     user_id: userId,
  //     product_id: productId,
  //     quantity
  //   });
  // }
  
  return null; // Temporariamente
}

/**
 * Remove item do carrinho
 */
export async function removeFromCart(userId: string, productId: string) {
  // TODO: Implementar quando a tabela cart_items for reconhecida
  // const client = xata();
  // const item = await client.db.cart_items
  //   .filter({ user_id: userId, product_id: productId })
  //   .getFirst();

  // if (item) {
  //   return client.db.cart_items.delete(item.id);
  // }
  
  return null; // Temporariamente
}

/**
 * Limpa o carrinho do usuário
 */
export async function clearCart(userId: string) {
  // TODO: Implementar quando a tabela cart_items for reconhecida
  // const client = xata();
  // const items = await client.db.cart_items
  //   .filter({ user_id: userId })
  //   .getAll();

  // const deletePromises = items.map(item => client.db.cart_items.delete(item.id));
  // return Promise.all(deletePromises);
  
  return []; // Temporariamente
}
