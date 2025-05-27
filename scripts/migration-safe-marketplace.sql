-- =====================================================
-- MIGRAÇÃO SEGURA DO MARKETPLACE - PRESERVA DADOS
-- =====================================================

-- 1. CRIAR NOVAS TABELAS (100% SEGURO)
-- =====================================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Tabela de vendedores
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id), -- Link opcional com fornecedor existente
  store_name TEXT NOT NULL,
  store_slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  cnpj TEXT,
  company_name TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'banned')),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  rating NUMERIC(3,2),
  total_sales INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para sellers
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_store_slug ON sellers(store_slug);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Índices para order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);

-- Tabela de endereços
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Tabela de carrinho
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 2. ADICIONAR COLUNAS NAS TABELAS EXISTENTES (SEGURO)
-- =====================================================

-- Adicionar seller_id aos produtos (mantendo supplier_id)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id);

-- Adicionar campos faltantes em products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Adicionar position em categories (mantendo display_order)
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS position INTEGER;

-- Adicionar alt em product_images (mantendo alt_text)
ALTER TABLE product_images
ADD COLUMN IF NOT EXISTS alt TEXT;

-- 3. MIGRAÇÃO DE DADOS (PRESERVANDO EXISTENTES)
-- =====================================================

-- Copiar dados para novos campos
UPDATE categories SET position = display_order WHERE position IS NULL;
UPDATE product_images SET alt = alt_text WHERE alt IS NULL;
UPDATE products SET featured = is_visible WHERE featured IS NULL;

-- 4. CRIAR USUÁRIO ADMIN PADRÃO
-- =====================================================
INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
VALUES ('admin@marketplace.com', 'CHANGE_THIS_PASSWORD', 'Administrador', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- 5. VIEWS DE COMPATIBILIDADE
-- =====================================================

-- View para manter compatibilidade com nomes antigos
CREATE OR REPLACE VIEW products_compat AS
SELECT 
  p.*,
  p.stock_quantity as quantity,
  p.cost_price as cost,
  p.is_visible as featured_old,
  COALESCE(p.featured, p.is_visible) as featured_new
FROM products p;

-- View para relacionar suppliers com sellers
CREATE OR REPLACE VIEW suppliers_sellers AS
SELECT 
  sup.*,
  sel.id as seller_id,
  sel.user_id,
  sel.store_name,
  sel.store_slug,
  sel.commission_rate,
  sel.rating as seller_rating,
  sel.status as seller_status
FROM suppliers sup
LEFT JOIN sellers sel ON sel.supplier_id = sup.id;

-- 6. TRIGGERS PARA MANTER SINCRONIZAÇÃO
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. FUNÇÃO PARA MIGRAR FORNECEDORES PARA VENDEDORES
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_suppliers_to_sellers()
RETURNS void AS $$
DECLARE
    sup RECORD;
    user_id UUID;
    seller_id UUID;
BEGIN
    FOR sup IN SELECT * FROM suppliers WHERE is_active = true LOOP
        -- Criar usuário se email existir
        IF sup.contact_email IS NOT NULL THEN
            INSERT INTO users (email, password_hash, name, role, is_active)
            VALUES (
                sup.contact_email,
                'temporary_password_' || sup.id, -- Senha temporária
                sup.name,
                'seller',
                true
            )
            ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
            RETURNING id INTO user_id;
            
            -- Criar seller
            INSERT INTO sellers (
                user_id, supplier_id, store_name, store_slug,
                phone, email, status, commission_rate
            )
            VALUES (
                user_id,
                sup.id,
                sup.name,
                LOWER(REGEXP_REPLACE(sup.name, '[^a-zA-Z0-9]+', '-', 'g')),
                COALESCE(sup.contact_phone, 'Não informado'),
                sup.contact_email,
                'active',
                10.00 -- Taxa padrão de 10%
            )
            ON CONFLICT (store_slug) DO NOTHING
            RETURNING id INTO seller_id;
            
            -- Atualizar produtos
            IF seller_id IS NOT NULL THEN
                UPDATE products 
                SET seller_id = seller_id
                WHERE supplier_id = sup.id
                AND seller_id IS NULL;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. ESTATÍSTICAS DE MIGRAÇÃO
-- =====================================================

CREATE OR REPLACE VIEW migration_stats AS
SELECT 
    'suppliers' as entity,
    COUNT(*) as total,
    COUNT(CASE WHEN id IN (SELECT supplier_id FROM sellers) THEN 1 END) as migrated
FROM suppliers
UNION ALL
SELECT 
    'products_with_seller',
    COUNT(*),
    COUNT(seller_id)
FROM products
UNION ALL
SELECT 
    'users_total',
    COUNT(*),
    COUNT(CASE WHEN role = 'seller' THEN 1 END)
FROM users;

-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE users IS 'Tabela de usuários do sistema (clientes, vendedores, admins)';
COMMENT ON TABLE sellers IS 'Perfil completo dos vendedores do marketplace';
COMMENT ON TABLE orders IS 'Pedidos realizados no marketplace';
COMMENT ON TABLE order_items IS 'Itens individuais de cada pedido';
COMMENT ON COLUMN sellers.supplier_id IS 'Referência opcional ao fornecedor original (para migração)';
COMMENT ON COLUMN products.seller_id IS 'Novo campo para referenciar vendedor (substitui supplier_id)';

-- FIM DA MIGRAÇÃO
-- Para executar a migração de fornecedores: SELECT migrate_suppliers_to_sellers(); 