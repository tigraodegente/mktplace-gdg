-- Script para criar índices de performance no banco de dados do marketplace
-- Execute este script após a migração e otimização dos dados

-- ========================================
-- ÍNDICES PARA TABELA PRODUCTS
-- ========================================

-- Índice para busca por slug (URLs amigáveis)
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Índice para busca por SKU
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Índice para produtos ativos e visíveis
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- Índice para ordenação por preço
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Índice para busca por marca
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);

-- Índice para busca por vendedor
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);

-- Índice composto para listagem de produtos (categoria + ativo + preço)
CREATE INDEX IF NOT EXISTS idx_products_listing ON products(category_id, is_active, price) 
WHERE is_active = true;

-- Índice para produtos em destaque
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, position) 
WHERE is_featured = true;

-- Índice para busca textual (nome e descrição)
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(description, '')));

-- Índice para código de barras
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- ========================================
-- ÍNDICES PARA TABELA CATEGORIES
-- ========================================

-- Índice para busca por slug de categoria
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Índice para categorias ativas
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;

-- Índice para hierarquia de categorias
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ========================================
-- ÍNDICES PARA TABELA BRANDS
-- ========================================

-- Índice para busca por slug de marca
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);

-- Índice para marcas ativas
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(is_active) WHERE is_active = true;

-- ========================================
-- ÍNDICES PARA TABELA USERS
-- ========================================

-- Índice único para email (já deve existir como constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índice para busca por tipo de usuário
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Índice para usuários ativos
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- ========================================
-- ÍNDICES PARA TABELA SELLERS
-- ========================================

-- Índice para busca por slug de vendedor
CREATE INDEX IF NOT EXISTS idx_sellers_slug ON sellers(slug);

-- Índice para vendedores ativos
CREATE INDEX IF NOT EXISTS idx_sellers_active ON sellers(is_active) WHERE is_active = true;

-- Índice para busca por CNPJ
CREATE UNIQUE INDEX IF NOT EXISTS idx_sellers_cnpj ON sellers(cnpj) WHERE cnpj IS NOT NULL;

-- ========================================
-- ÍNDICES PARA TABELA ORDERS
-- ========================================

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- Índice para busca por vendedor
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Índice composto para listagem de pedidos (usuário + status + data)
CREATE INDEX IF NOT EXISTS idx_orders_user_listing ON orders(user_id, status, created_at DESC);

-- Índice para busca por número do pedido
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- ========================================
-- ÍNDICES PARA TABELA ORDER_ITEMS
-- ========================================

-- Índice para busca por pedido
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Índice para busca por produto
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ========================================
-- ÍNDICES PARA TABELA CART_ITEMS
-- ========================================

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

-- Índice composto para evitar duplicatas (usuário + produto)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product ON cart_items(user_id, product_id);

-- ========================================
-- ÍNDICES PARA TABELA ADDRESSES
-- ========================================

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- Índice para endereço padrão
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default) 
WHERE is_default = true;

-- Índice para busca por CEP
CREATE INDEX IF NOT EXISTS idx_addresses_postal_code ON addresses(postal_code);

-- ========================================
-- ÍNDICES PARA TABELA PRODUCT_IMAGES
-- ========================================

-- Índice para busca por produto
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- Índice para imagem principal
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary) 
WHERE is_primary = true;

-- ========================================
-- ESTATÍSTICAS E ANÁLISE
-- ========================================

-- Atualizar estatísticas das tabelas para o otimizador de queries
ANALYZE products;
ANALYZE categories;
ANALYZE brands;
ANALYZE users;
ANALYZE sellers;
ANALYZE orders;
ANALYZE order_items;
ANALYZE cart_items;
ANALYZE addresses;
ANALYZE product_images;

-- ========================================
-- VERIFICAR ÍNDICES CRIADOS
-- ========================================

-- Query para listar todos os índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname; 