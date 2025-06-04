-- =====================================================
-- CRIAR TABELAS FALTANTES - Aba Avançada
-- =====================================================
-- Script para criar tabelas que os componentes da aba Avançada precisam

BEGIN;

-- 1. TABELA WAREHOUSES (Armazéns)
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    postal_code VARCHAR(10),
    country VARCHAR(2) DEFAULT 'BR',
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA PRODUCT_SUPPLIERS (Fornecedores de Produtos)
CREATE TABLE IF NOT EXISTS product_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(100),
    cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'BRL',
    lead_time_days INTEGER DEFAULT 7,
    minimum_order_quantity INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, supplier_id)
);

-- 3. TABELA PRODUCT_STOCKS (Estoques por Armazém)
CREATE TABLE IF NOT EXISTS product_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - COALESCE(reserved_quantity, 0)) STORED,
    location VARCHAR(100),
    low_stock_alert INTEGER DEFAULT 10,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- 4. TABELA COLLECTIONS (Coleções de Produtos)
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'collection' CHECK (type IN ('collection', 'kit', 'bundle')),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA COLLECTION_PRODUCTS (Produtos em Coleções)
CREATE TABLE IF NOT EXISTS collection_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, product_id)
);

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_primary ON product_suppliers(is_primary);

CREATE INDEX IF NOT EXISTS idx_product_stocks_product_id ON product_stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_warehouse_id ON product_stocks(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_quantity ON product_stocks(quantity);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_type ON collections(type);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active);

CREATE INDEX IF NOT EXISTS idx_collection_products_collection_id ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON collection_products(product_id);

-- 7. INSERIR DADOS INICIAIS

-- Armazém principal
INSERT INTO warehouses (name, code, description, city, state, is_default)
VALUES ('Armazém Principal', 'ARM001', 'Armazém principal da empresa', 'São Paulo', 'SP', true)
ON CONFLICT (code) DO NOTHING;

-- 8. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON TABLE warehouses IS 'Armazéns/centros de distribuição para controle de estoque';
COMMENT ON TABLE product_suppliers IS 'Fornecedores de produtos com preços e prazos';
COMMENT ON TABLE product_stocks IS 'Controle de estoque por produto e armazém';
COMMENT ON TABLE collections IS 'Coleções de produtos (coleções, kits, bundles)';
COMMENT ON TABLE collection_products IS 'Relacionamento produtos-coleções';

COMMIT;

-- =====================================================
-- VERIFICAÇÃO: Consultar tabelas criadas
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('warehouses', 'product_suppliers', 'product_stocks', 'collections', 'collection_products')
  AND table_schema = 'public'
ORDER BY table_name; 