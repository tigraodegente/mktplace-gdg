-- =====================================================
-- NOVAS FUNCIONALIDADES: RELACIONAMENTOS AVANÇADOS
-- =====================================================
-- Script para adicionar:
-- 1. Produtos Relacionados (já existe, vamos melhorar)
-- 2. Múltiplos Fornecedores
-- 3. Múltiplos Estoques
-- 4. Coleções e Kits

BEGIN;

-- =====================================================
-- 1. MELHORAR PRODUTOS RELACIONADOS
-- =====================================================
-- Adicionar mais tipos de relação e melhorar a estrutura existente
ALTER TABLE product_related 
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS auto_suggested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suggestion_reason TEXT;

COMMENT ON COLUMN product_related.confidence IS 'Nível de confiança da relação (0-1)';
COMMENT ON COLUMN product_related.auto_suggested IS 'Se foi sugerido automaticamente pela IA';
COMMENT ON COLUMN product_related.suggestion_reason IS 'Motivo da sugestão (ex: mesmo fabricante, categoria similar)';

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

CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_primary ON product_suppliers(product_id, is_primary) WHERE is_primary = true;

COMMENT ON TABLE product_suppliers IS 'Múltiplos fornecedores por produto';
COMMENT ON COLUMN product_suppliers.supplier_sku IS 'SKU do produto no fornecedor';
COMMENT ON COLUMN product_suppliers.lead_time_days IS 'Prazo de entrega em dias';
COMMENT ON COLUMN product_suppliers.minimum_order_quantity IS 'Quantidade mínima de pedido';

-- =====================================================
-- 3. MÚLTIPLOS ESTOQUES
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'physical', -- physical, virtual, consignment
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
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    location VARCHAR(100), -- Corredor A, Prateleira B, etc
    low_stock_alert INTEGER,
    last_count_date DATE,
    last_movement_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_product_stocks_product ON product_stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_warehouse ON product_stocks(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_available ON product_stocks(available_quantity);

COMMENT ON TABLE warehouses IS 'Armazéns/Locais de estoque';
COMMENT ON TABLE product_stocks IS 'Estoque por produto e armazém';
COMMENT ON COLUMN product_stocks.reserved_quantity IS 'Quantidade reservada para pedidos';
COMMENT ON COLUMN product_stocks.available_quantity IS 'Quantidade disponível (calculada automaticamente)';

-- =====================================================
-- 4. COLEÇÕES E KITS
-- =====================================================
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'collection', -- collection, kit, bundle
    image_url TEXT,
    banner_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    discount_type VARCHAR(20), -- percentage, fixed
    discount_value DECIMAL(10,2),
    min_items INTEGER DEFAULT 1,
    max_items INTEGER,
    rules JSONB DEFAULT '{}', -- Regras específicas da coleção
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
    is_required BOOLEAN DEFAULT false, -- Para kits: se o item é obrigatório
    quantity INTEGER DEFAULT 1, -- Para kits: quantidade do item
    discount_type VARCHAR(20), -- percentage, fixed (desconto específico do item)
    discount_value DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active);
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products(product_id);

COMMENT ON TABLE collections IS 'Coleções, kits e bundles de produtos';
COMMENT ON COLUMN collections.type IS 'collection: agrupamento temático, kit: conjunto fixo, bundle: pacote promocional';
COMMENT ON COLUMN collection_products.is_required IS 'Para kits: se o produto é obrigatório no kit';
COMMENT ON COLUMN collection_products.quantity IS 'Quantidade do produto no kit/bundle';

-- =====================================================
-- 5. TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_product_suppliers_updated_at BEFORE UPDATE ON product_suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_stocks_updated_at BEFORE UPDATE ON product_stocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. DADOS DE EXEMPLO
-- =====================================================
-- Inserir armazém padrão
INSERT INTO warehouses (name, code, type, city, state, is_default) 
VALUES ('Armazém Principal', 'MAIN', 'physical', 'São Paulo', 'SP', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 7. VIEWS ÚTEIS
-- =====================================================
-- View consolidada de estoque total por produto
CREATE OR REPLACE VIEW v_product_total_stock AS
SELECT 
    p.id,
    p.name,
    p.sku,
    COALESCE(SUM(ps.quantity), 0) as total_quantity,
    COALESCE(SUM(ps.reserved_quantity), 0) as total_reserved,
    COALESCE(SUM(ps.available_quantity), 0) as total_available,
    COUNT(DISTINCT ps.warehouse_id) as warehouse_count,
    STRING_AGG(DISTINCT w.name, ', ') as warehouses
FROM products p
LEFT JOIN product_stocks ps ON ps.product_id = p.id
LEFT JOIN warehouses w ON w.id = ps.warehouse_id AND w.is_active = true
GROUP BY p.id, p.name, p.sku;

-- View de produtos com múltiplos fornecedores
CREATE OR REPLACE VIEW v_product_suppliers_summary AS
SELECT 
    p.id,
    p.name,
    p.sku,
    COUNT(DISTINCT ps.supplier_id) as supplier_count,
    MIN(ps.cost) as min_cost,
    MAX(ps.cost) as max_cost,
    AVG(ps.cost) as avg_cost,
    STRING_AGG(ps.supplier_name || ' (' || COALESCE(ps.supplier_sku, 'N/A') || ')', ', ' ORDER BY ps.is_primary DESC, ps.cost ASC) as suppliers
FROM products p
LEFT JOIN product_suppliers ps ON ps.product_id = p.id AND ps.is_active = true
GROUP BY p.id, p.name, p.sku;

-- =====================================================
-- 8. REMOVER CAMPOS MONGODB DOS PRODUTOS
-- =====================================================
-- Remover campos relacionados ao MongoDB se existirem
ALTER TABLE products 
DROP COLUMN IF EXISTS import_date CASCADE,
DROP COLUMN IF EXISTS original_id CASCADE,
DROP COLUMN IF EXISTS imported_from CASCADE,
DROP COLUMN IF EXISTS mongo_data CASCADE;

-- Limpar tags relacionadas ao MongoDB
UPDATE products 
SET tags = array_remove(tags, 'mongodb')
WHERE 'mongodb' = ANY(tags);

COMMIT;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 
    'Tabelas criadas:' as info,
    COUNT(*) FILTER (WHERE table_name = 'product_suppliers') as product_suppliers,
    COUNT(*) FILTER (WHERE table_name = 'warehouses') as warehouses,
    COUNT(*) FILTER (WHERE table_name = 'product_stocks') as product_stocks,
    COUNT(*) FILTER (WHERE table_name = 'collections') as collections,
    COUNT(*) FILTER (WHERE table_name = 'collection_products') as collection_products
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('product_suppliers', 'warehouses', 'product_stocks', 'collections', 'collection_products'); 