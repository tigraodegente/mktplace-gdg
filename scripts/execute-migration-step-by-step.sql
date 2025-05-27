-- =====================================================
-- SCRIPT DE MIGRAÇÃO - EXECUTAR PASSO A PASSO
-- =====================================================

-- PASSO 1: Criar tabela users
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_role CHECK (role IN ('customer', 'seller', 'admin'))
);

-- PASSO 2: Criar índices para users
-- =====================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- PASSO 3: Criar tabela sellers
-- =====================================================
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  store_name TEXT NOT NULL,
  store_slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  cnpj TEXT,
  company_name TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  rating NUMERIC(3,2),
  total_sales INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('pending', 'active', 'suspended', 'banned'))
);

-- PASSO 4: Criar índices para sellers
-- =====================================================
CREATE INDEX idx_sellers_user_id ON sellers(user_id);
CREATE INDEX idx_sellers_status ON sellers(status);
CREATE INDEX idx_sellers_store_slug ON sellers(store_slug);

-- PASSO 5: Criar tabela orders
-- =====================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_order_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))
);

-- PASSO 6: Criar índices para orders
-- =====================================================
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- PASSO 7: Criar tabela order_items
-- =====================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2),
  seller_amount NUMERIC(10,2),
  fulfillment_status TEXT DEFAULT 'pending',
  tracking_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PASSO 8: Criar índices para order_items
-- =====================================================
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_seller_id ON order_items(seller_id);

-- PASSO 9: Criar tabela addresses
-- =====================================================
CREATE TABLE addresses (
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

-- PASSO 10: Criar tabela cart_items
-- =====================================================
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- PASSO 11: Adicionar colunas nas tabelas existentes
-- =====================================================
ALTER TABLE products ADD COLUMN seller_id UUID REFERENCES sellers(id);
ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN barcode TEXT;
ALTER TABLE categories ADD COLUMN position INTEGER;
ALTER TABLE product_images ADD COLUMN alt TEXT;

-- PASSO 12: Copiar dados para novos campos
-- =====================================================
UPDATE categories SET position = display_order WHERE position IS NULL;
UPDATE product_images SET alt = alt_text WHERE alt IS NULL;
UPDATE products SET featured = is_visible WHERE featured IS NULL;

-- PASSO 13: Criar usuário admin
-- =====================================================
INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
VALUES ('admin@marketplace.com', 'CHANGE_THIS_PASSWORD', 'Administrador', 'admin', true, true);

-- PASSO 14: Verificar migração
-- =====================================================
SELECT 
    tablename as table_name,
    'created' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'sellers', 'orders', 'order_items', 'addresses', 'cart_items')
ORDER BY tablename; 