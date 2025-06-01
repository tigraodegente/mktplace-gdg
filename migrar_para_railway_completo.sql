-- =====================================================
-- MIGRAÇÃO COMPLETA PARA RAILWAY POSTGRESQL
-- =====================================================
-- Todas as tabelas + dados de seed para o marketplace
-- Data: 2024-12-01

BEGIN;

-- =====================================================
-- 1. TABELAS PRINCIPAIS DO SISTEMA
-- =====================================================

-- Tabela users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin')),
  phone TEXT,
  cpf_cnpj TEXT,
  email_verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela sellers
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_document TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  address JSONB,
  contact_info JSONB DEFAULT '{}',
  business_hours JSONB DEFAULT '{}',
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  commission_rate DECIMAL(5,2) DEFAULT 5.00,
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  sku TEXT,
  barcode TEXT,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  max_stock_level INTEGER,
  weight DECIMAL(8,3),
  dimensions JSONB, -- {width, height, depth}
  images JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '{}'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'out_of_stock')),
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMPTZ,
  tags TEXT[],
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_order_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))
);

-- Tabela order_items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID REFERENCES sellers(id),
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2),
  seller_amount NUMERIC(10,2),
  status TEXT DEFAULT 'pending',
  fulfillment_status TEXT DEFAULT 'pending',
  tracking_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela addresses
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('shipping', 'billing')),
  is_default BOOLEAN DEFAULT false,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  postal_code TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela cart_items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- =====================================================
-- 2. TABELAS AVANÇADAS (CHAT, GIFT LISTS, ETC)
-- =====================================================

-- Sistema de chat
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  subject TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id, product_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  attachment_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sistema de listas de presentes
CREATE TABLE IF NOT EXISTS gift_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  privacy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES gift_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_wanted INTEGER DEFAULT 1,
  quantity_purchased INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(list_id, product_id)
);

-- =====================================================
-- 3. CRIAR ÍNDICES
-- =====================================================

-- Índices users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Índices categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- Índices sellers
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_verified ON sellers(is_verified);

-- Índices products
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);

-- Índices sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Índices orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Índices order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Índices addresses
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_type ON addresses(type);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(is_default);

-- Índices cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Índices chat
CREATE INDEX IF NOT EXISTS idx_chat_conversations_buyer ON chat_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_seller ON chat_conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Índices gift lists
CREATE INDEX IF NOT EXISTS idx_gift_lists_user_id ON gift_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_lists_share_token ON gift_lists(share_token);
CREATE INDEX IF NOT EXISTS idx_gift_list_items_list_id ON gift_list_items(list_id);

-- =====================================================
-- 4. INSERIR DADOS DE SEED
-- =====================================================

-- Insert sample users
INSERT INTO users (email, name, password_hash, role, phone, cpf_cnpj) VALUES
('admin@marketplace.com', 'Admin User', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'admin', '11999999999', '12345678901'),
('seller1@example.com', 'João Silva', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'seller', '11988888888', '12345678000195'),
('seller2@example.com', 'Maria Santos', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'seller', '11977777777', '98765432000196'),
('customer1@example.com', 'Pedro Oliveira', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'customer', '11966666666', '98765432109'),
('customer2@example.com', 'Ana Costa', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'customer', '11955555555', '11122233344')
ON CONFLICT (email) DO NOTHING;

-- Insert categories
INSERT INTO categories (name, slug, description, display_order) VALUES
('Eletrônicos', 'eletronicos', 'Produtos eletrônicos e gadgets', 1),
('Informática', 'informatica', 'Computadores, notebooks e acessórios', 2),
('Casa e Decoração', 'casa-decoracao', 'Móveis e itens de decoração', 3),
('Moda', 'moda', 'Roupas, calçados e acessórios', 4),
('Esportes', 'esportes', 'Equipamentos e roupas esportivas', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories
INSERT INTO categories (name, slug, description, parent_id, display_order) VALUES
('Smartphones', 'smartphones', 'Celulares e smartphones', (SELECT id FROM categories WHERE slug = 'eletronicos'), 1),
('Notebooks', 'notebooks', 'Notebooks e laptops', (SELECT id FROM categories WHERE slug = 'informatica'), 1),
('Periféricos', 'perifericos', 'Mouse, teclado e outros', (SELECT id FROM categories WHERE slug = 'informatica'), 2)
ON CONFLICT (slug) DO NOTHING;

-- Insert sellers
INSERT INTO sellers (user_id, company_name, company_document, description, is_verified, rating) VALUES
((SELECT id FROM users WHERE email = 'seller1@example.com'), 'Tech Store', '12345678000195', 'Loja especializada em produtos de tecnologia', true, 4.5),
((SELECT id FROM users WHERE email = 'seller2@example.com'), 'Fashion House', '98765432000196', 'Moda feminina e masculina com estilo', true, 4.8)
ON CONFLICT DO NOTHING;

-- Insert products
INSERT INTO products (seller_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, sku, images, is_featured, status) VALUES
-- Tech Store products
((SELECT id FROM sellers WHERE company_name = 'Tech Store'), 
 (SELECT id FROM categories WHERE slug = 'smartphones'),
 'iPhone 15 Pro Max 256GB', 'iphone-15-pro-max-256gb',
 'O iPhone 15 Pro Max com 256GB de armazenamento, câmera profissional e chip A17 Pro.',
 8999.00, 9999.00, 10, 'IPH15PM256',
 '["https://images.unsplash.com/photo-1695048133142-1a20484d2569"]'::jsonb, true, 'active'),

((SELECT id FROM sellers WHERE company_name = 'Tech Store'), 
 (SELECT id FROM categories WHERE slug = 'notebooks'),
 'MacBook Pro 14" M3', 'macbook-pro-14-m3',
 'MacBook Pro 14 polegadas com chip M3, 16GB RAM e 512GB SSD.',
 14999.00, 16999.00, 5, 'MBP14M3512',
 '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8"]'::jsonb, true, 'active'),

((SELECT id FROM sellers WHERE company_name = 'Tech Store'), 
 (SELECT id FROM categories WHERE slug = 'perifericos'),
 'Mouse Gamer RGB', 'mouse-gamer-rgb',
 'Mouse gamer com 16000 DPI, iluminação RGB e 7 botões programáveis.',
 299.90, 399.90, 25, 'MGRGB001',
 '["https://images.unsplash.com/photo-1527814050087-3793815479db"]'::jsonb, false, 'active'),

-- Fashion House products
((SELECT id FROM sellers WHERE company_name = 'Fashion House'), 
 (SELECT id FROM categories WHERE slug = 'moda'),
 'Vestido Floral Verão', 'vestido-floral-verao',
 'Vestido longo floral perfeito para o verão, tecido leve e confortável.',
 189.90, 249.90, 15, 'VFV2024001',
 '["https://images.unsplash.com/photo-1595777457583-95e059d581b8"]'::jsonb, false, 'active'),

((SELECT id FROM sellers WHERE company_name = 'Fashion House'), 
 (SELECT id FROM categories WHERE slug = 'moda'),
 'Blazer Feminino Elegante', 'blazer-feminino-elegante',
 'Blazer feminino corte moderno, ideal para ocasiões formais.',
 349.90, 449.90, 8, 'BFE2024001',
 '["https://images.unsplash.com/photo-1594938298603-c8148c4dae35"]'::jsonb, true, 'active')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample orders
INSERT INTO orders (user_id, order_number, status, subtotal, shipping_cost, total, payment_method, payment_status, shipping_address) VALUES
((SELECT id FROM users WHERE email = 'customer1@example.com'), 
 'ORD-2024-0001', 'delivered', 9298.90, 0, 9298.90, 'credit_card', 'paid',
 '{"street": "Rua das Flores, 123", "city": "São Paulo", "state": "SP", "zip": "01234-567"}'::jsonb),

((SELECT id FROM users WHERE email = 'customer2@example.com'), 
 'ORD-2024-0002', 'processing', 539.80, 15.00, 554.80, 'pix', 'paid',
 '{"street": "Av. Principal, 456", "city": "Rio de Janeiro", "state": "RJ", "zip": "20000-000"}'::jsonb)
ON CONFLICT (order_number) DO NOTHING;

-- Insert order items
INSERT INTO order_items (order_id, product_id, seller_id, quantity, price, total, status) VALUES
-- Order 1 items
((SELECT id FROM orders WHERE order_number = 'ORD-2024-0001'),
 (SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'),
 (SELECT seller_id FROM products WHERE slug = 'iphone-15-pro-max-256gb'),
 1, 8999.00, 8999.00, 'delivered'),

((SELECT id FROM orders WHERE order_number = 'ORD-2024-0001'),
 (SELECT id FROM products WHERE slug = 'mouse-gamer-rgb'),
 (SELECT seller_id FROM products WHERE slug = 'mouse-gamer-rgb'),
 1, 299.90, 299.90, 'delivered'),

-- Order 2 items
((SELECT id FROM orders WHERE order_number = 'ORD-2024-0002'),
 (SELECT id FROM products WHERE slug = 'vestido-floral-verao'),
 (SELECT seller_id FROM products WHERE slug = 'vestido-floral-verao'),
 1, 189.90, 189.90, 'confirmed'),

((SELECT id FROM orders WHERE order_number = 'ORD-2024-0002'),
 (SELECT id FROM products WHERE slug = 'blazer-feminino-elegante'),
 (SELECT seller_id FROM products WHERE slug = 'blazer-feminino-elegante'),
 1, 349.90, 349.90, 'confirmed')
ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================
-- 5. VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'MIGRAÇÃO COMPLETA PARA RAILWAY FINALIZADA!' as status;

-- Verificar tabelas criadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar dados inseridos
SELECT 'users' as tabela, COUNT(*) as registros FROM users
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'sellers', COUNT(*) FROM sellers
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items;

SELECT 'Marketplace Railway está pronto para uso!' as resultado; 