-- Script para tornar as tabelas compatíveis com Xata ORM
-- Adiciona as colunas especiais que o Xata precisa

-- 1. Tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS xata_id TEXT GENERATED ALWAYS AS (id::text) STORED,
ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Atualizar xata_createdat e xata_updatedat com valores existentes
UPDATE products 
SET xata_createdat = created_at,
    xata_updatedat = updated_at
WHERE xata_createdat = NOW();

-- 2. Tabela categories
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS xata_id TEXT GENERATED ALWAYS AS (id::text) STORED,
ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Atualizar com valores existentes se houver
UPDATE categories 
SET xata_createdat = created_at,
    xata_updatedat = updated_at
WHERE xata_createdat = NOW() 
  AND created_at IS NOT NULL;

-- 3. Tabela brands
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS xata_id TEXT GENERATED ALWAYS AS (id::text) STORED,
ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- 4. Tabela product_images
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS xata_id TEXT GENERATED ALWAYS AS (id::text) STORED,
ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- 5. Tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS xata_id TEXT GENERATED ALWAYS AS (id::text) STORED,
ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Atualizar com valores existentes
UPDATE users 
SET xata_createdat = created_at,
    xata_updatedat = updated_at
WHERE xata_createdat = NOW()
  AND created_at IS NOT NULL;

-- 6. Tabela sellers
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS xata_id TEXT GENERATED ALWAYS AS (id::text) STORED,
ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- 7. Tabela orders (se existir)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS xata_id TEXT GENERATED ALWAYS AS (id::text) STORED,
ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- 8. Tabela order_items (se existir)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS xata_id TEXT GENERATED ALWAYS AS (id::text) STORED,
ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Criar triggers para atualizar xata_updatedat automaticamente
CREATE OR REPLACE FUNCTION update_xata_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.xata_updatedat = NOW();
    NEW.xata_version = OLD.xata_version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_products_xata_updatedat BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_xata_updatedat();

CREATE TRIGGER update_categories_xata_updatedat BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_xata_updatedat();

CREATE TRIGGER update_brands_xata_updatedat BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_xata_updatedat();

CREATE TRIGGER update_product_images_xata_updatedat BEFORE UPDATE ON product_images
    FOR EACH ROW EXECUTE FUNCTION update_xata_updatedat();

CREATE TRIGGER update_users_xata_updatedat BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_xata_updatedat();

CREATE TRIGGER update_sellers_xata_updatedat BEFORE UPDATE ON sellers
    FOR EACH ROW EXECUTE FUNCTION update_xata_updatedat();

CREATE TRIGGER update_orders_xata_updatedat BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_xata_updatedat();

CREATE TRIGGER update_order_items_xata_updatedat BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_xata_updatedat(); 