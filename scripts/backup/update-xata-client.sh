#!/bin/bash

# Script para atualizar o cliente Xata com o novo schema
# Execute este script após fazer alterações no banco de dados

echo "🔄 Atualizando cliente Xata..."

# Navegar para o diretório do cliente Xata
cd packages/xata-client

# Fazer pull do schema mais recente
echo "📥 Baixando schema atualizado..."
npx xata pull main

# Gerar código TypeScript
echo "🏗️ Gerando código TypeScript..."
npx xata codegen --output src/xata.ts

# Atualizar o index.ts para exportar o cliente corretamente
echo "📝 Atualizando exports..."
cat > src/index.ts << 'EOF'
// Cliente Xata gerado automaticamente
import { XataClient } from './xata';

// Criar instância do cliente
export const getXataClient = () => {
  if (!process.env.XATA_API_KEY) {
    throw new Error('XATA_API_KEY não está definida');
  }
  
  return new XataClient({
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH || 'main',
  });
};

// Exportar tipos
export * from './xata';
export * from './types';
export * from './helpers';

// Cliente singleton para uso direto
let xataClientInstance: XataClient | null = null;

export const xata = () => {
  if (!xataClientInstance) {
    xataClientInstance = getXataClient();
  }
  return xataClientInstance;
};
EOF

# Atualizar types.ts com tipos customizados
cat > src/types.ts << 'EOF'
// Tipos customizados para o marketplace

export type UserRole = 'customer' | 'seller' | 'admin';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto';

// Tipos para respostas da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    total?: number;
    perPage?: number;
  };
}

// Tipos para autenticação
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

// Tipos para carrinho
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

// Tipos para checkout
export interface CheckoutData {
  items: CartItem[];
  addressId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}
EOF

# Atualizar helpers.ts com funções utilitárias
cat > src/helpers.ts << 'EOF'
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

  if (brandId) {
    queryBuilder = queryBuilder.filter({ brand_id: brandId });
  }

  if (minPrice !== undefined) {
    queryBuilder = queryBuilder.filter({ price: { $gte: minPrice } });
  }

  if (maxPrice !== undefined) {
    queryBuilder = queryBuilder.filter({ price: { $lte: maxPrice } });
  }

  // Ordenação
  const sortConfig = sortOrder === 'asc' ? sortBy : `-${sortBy}`;
  
  // Paginação
  const offset = (page - 1) * perPage;

  const results = await queryBuilder
    .sort(sortConfig)
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

  // Buscar imagens do produto
  const images = await client.db.product_images
    .filter({ product_id: product.id })
    .sort('position')
    .getAll();

  return {
    ...product,
    images
  };
}

/**
 * Busca categorias ativas
 */
export async function getActiveCategories() {
  const client = xata();
  return client.db.categories
    .filter({ is_active: true })
    .sort('position')
    .getAll();
}

/**
 * Busca marcas ativas
 */
export async function getActiveBrands() {
  const client = xata();
  return client.db.brands
    .filter({ is_active: true })
    .sort('name')
    .getAll();
}

/**
 * Busca produtos em destaque
 */
export async function getFeaturedProducts(limit = 10) {
  const client = xata();
  return client.db.products
    .filter({ is_featured: true, is_active: true })
    .sort('position')
    .getMany(limit);
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
    .sort('-created_at')
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

/**
 * Busca itens do carrinho do usuário
 */
export async function getUserCart(userId: string) {
  const client = xata();
  const cartItems = await client.db.cart_items
    .filter({ user_id: userId })
    .getAll();

  // Buscar detalhes dos produtos
  const productIds = cartItems.map(item => item.product_id).filter(Boolean);
  const products = await client.db.products
    .filter({ id: { $any: productIds } })
    .getAll();

  // Mapear produtos para os itens do carrinho
  const productsMap = new Map(products.map(p => [p.id, p]));

  return cartItems.map(item => ({
    ...item,
    product: productsMap.get(item.product_id!)
  })).filter(item => item.product);
}

/**
 * Adiciona item ao carrinho
 */
export async function addToCart(userId: string, productId: string, quantity: number) {
  const client = xata();
  
  // Verificar se o item já existe no carrinho
  const existingItem = await client.db.cart_items
    .filter({ user_id: userId, product_id: productId })
    .getFirst();

  if (existingItem) {
    // Atualizar quantidade
    return client.db.cart_items.update(existingItem.id, {
      quantity: existingItem.quantity + quantity
    });
  } else {
    // Criar novo item
    return client.db.cart_items.create({
      user_id: userId,
      product_id: productId,
      quantity
    });
  }
}

/**
 * Remove item do carrinho
 */
export async function removeFromCart(userId: string, productId: string) {
  const client = xata();
  const item = await client.db.cart_items
    .filter({ user_id: userId, product_id: productId })
    .getFirst();

  if (item) {
    return client.db.cart_items.delete(item.id);
  }
}

/**
 * Limpa o carrinho do usuário
 */
export async function clearCart(userId: string) {
  const client = xata();
  const items = await client.db.cart_items
    .filter({ user_id: userId })
    .getAll();

  const deletePromises = items.map(item => client.db.cart_items.delete(item.id));
  return Promise.all(deletePromises);
}
EOF

echo "✅ Cliente Xata atualizado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Revise os arquivos gerados em packages/xata-client/src/"
echo "2. Execute 'pnpm build' no diretório packages/xata-client"
echo "3. Atualize as importações nas aplicações para usar o novo cliente" 