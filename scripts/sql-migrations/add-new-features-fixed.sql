-- =====================================================
-- NOVAS FUNCIONALIDADES: RELACIONAMENTOS AVANÇADOS (FIXO)
-- =====================================================
-- Script para adicionar funcionalidades em ordem correta

BEGIN;

-- =====================================================
-- 1. VERIFICAR E CRIAR FUNÇÃO UPDATE_UPDATED_AT SE NÃO EXISTIR
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 2. MÚLTIPLOS FORNECEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS product_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(100),
    cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'BRL',
    lead_time_days INTEGER,
    minimum_order_quantity INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, supplier_id)
);

-- =====================================================
-- 3. MÚLTIPLOS ESTOQUES
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'physical',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    location VARCHAR(100),
    low_stock_alert INTEGER,
    last_count_date DATE,
    last_movement_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- Adicionar coluna calculada após a tabela existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_stocks' 
        AND column_name = 'available_quantity'
    ) THEN
        ALTER TABLE product_stocks 
        ADD COLUMN available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED;
    END IF;
END $$;

-- =====================================================
-- 4. COLEÇÕES E KITS
-- =====================================================
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'collection',
    image_url TEXT,
    banner_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2),
    min_items INTEGER DEFAULT 1,
    max_items INTEGER,
    rules JSONB DEFAULT '{}',
    seo_title VARCHAR(255),
    seo_description TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    quantity INTEGER DEFAULT 1,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, product_id)
);

-- =====================================================
-- 5. MELHORAR PRODUTOS RELACIONADOS (SE EXISTIR)
-- =====================================================
DO $$
BEGIN
    -- Verificar se a tabela product_related existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_related') THEN
        -- Adicionar colunas se não existirem
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_related' AND column_name = 'confidence') THEN
            ALTER TABLE product_related ADD COLUMN confidence DECIMAL(3,2) DEFAULT 1.0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_related' AND column_name = 'auto_suggested') THEN
            ALTER TABLE product_related ADD COLUMN auto_suggested BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_related' AND column_name = 'suggestion_reason') THEN
            ALTER TABLE product_related ADD COLUMN suggestion_reason TEXT;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 6. CRIAR ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_primary ON product_suppliers(product_id, is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_product_stocks_product ON product_stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_warehouse ON product_stocks(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active);
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products(product_id);

-- =====================================================
-- 7. TRIGGERS PARA UPDATED_AT
-- =====================================================
DROP TRIGGER IF EXISTS update_product_suppliers_updated_at ON product_suppliers;
CREATE TRIGGER update_product_suppliers_updated_at BEFORE UPDATE ON product_suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_stocks_updated_at ON product_stocks;
CREATE TRIGGER update_product_stocks_updated_at BEFORE UPDATE ON product_stocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. DADOS DE EXEMPLO
-- =====================================================
INSERT INTO warehouses (name, code, type, city, state, is_default) 
VALUES ('Armazém Principal', 'MAIN', 'physical', 'São Paulo', 'SP', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 9. REMOVER CAMPOS MONGODB DOS PRODUTOS
-- =====================================================
-- Apenas se as colunas existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'import_date') THEN
        ALTER TABLE products DROP COLUMN import_date CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'original_id') THEN
        ALTER TABLE products DROP COLUMN original_id CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'imported_from') THEN
        ALTER TABLE products DROP COLUMN imported_from CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'mongo_data') THEN
        ALTER TABLE products DROP COLUMN mongo_data CASCADE;
    END IF;
END $$;

-- Limpar tags relacionadas ao MongoDB
UPDATE products 
SET tags = array_remove(tags, 'mongodb')
WHERE 'mongodb' = ANY(tags);

-- =====================================================
-- 10. COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE product_suppliers IS 'Múltiplos fornecedores por produto';
COMMENT ON TABLE warehouses IS 'Armazéns/Locais de estoque';
COMMENT ON TABLE product_stocks IS 'Estoque por produto e armazém';
COMMENT ON TABLE collections IS 'Coleções, kits e bundles de produtos';
COMMENT ON TABLE collection_products IS 'Produtos das coleções';

COMMIT;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 
    'Migração Completa!' as status,
    COUNT(*) FILTER (WHERE table_name = 'product_suppliers') as suppliers_table,
    COUNT(*) FILTER (WHERE table_name = 'warehouses') as warehouses_table,
    COUNT(*) FILTER (WHERE table_name = 'product_stocks') as stocks_table,
    COUNT(*) FILTER (WHERE table_name = 'collections') as collections_table,
    COUNT(*) FILTER (WHERE table_name = 'collection_products') as collection_products_table
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('product_suppliers', 'warehouses', 'product_stocks', 'collections', 'collection_products'); 