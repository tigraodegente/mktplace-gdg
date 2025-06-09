-- ============================================================================
-- CRIAÇÃO DAS TABELAS FALTANTES PARA O SISTEMA COMPLETO
-- ============================================================================

-- 1. Tabela de Coleções
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Produtos em Coleções
CREATE TABLE IF NOT EXISTS product_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, product_id)
);

-- 3. Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    document VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(10) DEFAULT 'BR',
    postal_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Fornecedores por Produto
CREATE TABLE IF NOT EXISTS product_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_sku VARCHAR(100),
    cost DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    lead_time_days INTEGER,
    minimum_order_quantity INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, supplier_id)
);

-- 5. Tabela de Armazéns
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'main',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(10) DEFAULT 'BR',
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Estoques por Armazém
CREATE TABLE IF NOT EXISTS product_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    location VARCHAR(100),
    low_stock_alert INTEGER DEFAULT 10,
    notes TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- 7. Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return', 'loss', 'found')),
    quantity_before INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL, -- Pode ser negativo
    quantity_after INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (ABS(quantity_change) * COALESCE(unit_cost, 0)) STORED,
    reference_type VARCHAR(50), -- 'order', 'purchase', 'manual', etc
    reference_id UUID, -- ID do pedido, compra, etc
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Alertas de Estoque
CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock')),
    threshold_value INTEGER,
    current_value INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id, alert_type)
);

-- 9. Tabela de Configurações de Notificação
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'push', 'sms')),
    is_enabled BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_type, channel)
);

-- 10. Tabela de Previsões de Reposição
CREATE TABLE IF NOT EXISTS stock_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL,
    daily_sales_avg DECIMAL(10,2) DEFAULT 0,
    lead_time_days INTEGER DEFAULT 7,
    safety_stock INTEGER DEFAULT 0,
    reorder_point INTEGER GENERATED ALWAYS AS (CEIL(daily_sales_avg * lead_time_days) + safety_stock) STORED,
    suggested_order_quantity INTEGER,
    next_stockout_date DATE,
    confidence_level DECIMAL(5,2) DEFAULT 0.8,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para Collections
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active);
CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);

-- Índices para Product Collections
CREATE INDEX IF NOT EXISTS idx_product_collections_collection_id ON product_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_product_id ON product_collections(product_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_position ON product_collections(position);

-- Índices para Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- Índices para Product Suppliers
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_primary ON product_suppliers(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_cost ON product_suppliers(cost);

-- Índices para Warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_default ON warehouses(is_default);

-- Índices para Product Stocks
CREATE INDEX IF NOT EXISTS idx_product_stocks_product_id ON product_stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_warehouse_id ON product_stocks(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_quantity ON product_stocks(quantity);
CREATE INDEX IF NOT EXISTS idx_product_stocks_available ON product_stocks(available_quantity);

-- Índices para stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- Índices para stock alerts
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_id ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_active ON stock_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_type ON stock_alerts(alert_type);

-- Índices para notification settings
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_forecasts_product_id ON stock_forecasts(product_id);

-- ============================================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ============================================================================

-- Trigger para atualizar updated_at em collections
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_collections_updated_at
    BEFORE UPDATE ON product_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_suppliers_updated_at
    BEFORE UPDATE ON product_suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar last_updated em product_stocks
CREATE OR REPLACE FUNCTION update_product_stocks_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_stocks_last_updated
    BEFORE UPDATE ON product_stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stocks_last_updated();

-- Trigger para atualizar stock_forecasts automaticamente
CREATE OR REPLACE FUNCTION update_stock_forecast()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar previsão quando houver movimentação de estoque
    INSERT INTO stock_forecasts (product_id, warehouse_id, current_stock)
    VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity_after)
    ON CONFLICT (product_id, warehouse_id) 
    DO UPDATE SET 
        current_stock = NEW.quantity_after,
        last_calculated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_forecast ON stock_movements;
CREATE TRIGGER trigger_update_stock_forecast
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_forecast();

-- Trigger para criar alertas automáticos
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
DECLARE
    low_stock_threshold INTEGER;
BEGIN
    -- Buscar o threshold do produto
    SELECT COALESCE(ps.low_stock_alert, p.stock_quantity * 0.1) 
    INTO low_stock_threshold
    FROM products p 
    LEFT JOIN product_stocks ps ON ps.product_id = p.id AND ps.warehouse_id = NEW.warehouse_id
    WHERE p.id = NEW.product_id;
    
    -- Criar alerta de estoque baixo
    IF NEW.quantity_after <= low_stock_threshold AND NEW.quantity_after > 0 THEN
        INSERT INTO stock_alerts (product_id, warehouse_id, alert_type, threshold_value, current_value)
        VALUES (NEW.product_id, NEW.warehouse_id, 'low_stock', low_stock_threshold, NEW.quantity_after)
        ON CONFLICT (product_id, warehouse_id, alert_type) 
        DO UPDATE SET 
            current_value = NEW.quantity_after,
            is_active = true,
            resolved_at = NULL;
    END IF;
    
    -- Criar alerta de sem estoque
    IF NEW.quantity_after <= 0 THEN
        INSERT INTO stock_alerts (product_id, warehouse_id, alert_type, threshold_value, current_value)
        VALUES (NEW.product_id, NEW.warehouse_id, 'out_of_stock', 0, NEW.quantity_after)
        ON CONFLICT (product_id, warehouse_id, alert_type) 
        DO UPDATE SET 
            current_value = NEW.quantity_after,
            is_active = true,
            resolved_at = NULL;
    END IF;
    
    -- Resolver alertas se estoque voltou ao normal
    IF NEW.quantity_after > low_stock_threshold THEN
        UPDATE stock_alerts 
        SET is_active = false, resolved_at = NOW()
        WHERE product_id = NEW.product_id 
        AND warehouse_id = NEW.warehouse_id 
        AND alert_type IN ('low_stock', 'out_of_stock')
        AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_stock_alerts ON stock_movements;
CREATE TRIGGER trigger_check_stock_alerts
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_alerts();

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Inserir armazém padrão se não existir
INSERT INTO warehouses (name, code, type, is_default, is_active)
SELECT 'Armazém Principal', 'MAIN', 'main', true, true
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code = 'MAIN');

-- Inserir coleção de exemplo se não existir  
INSERT INTO collections (name, slug, description, is_active)
SELECT 'Produtos em Destaque', 'produtos-em-destaque', 'Coleção de produtos em destaque da loja', true
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'produtos-em-destaque');

-- ============================================================================
-- NOTIFICAÇÕES DE CONCLUSÃO
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Tabelas de coleções criadas com sucesso!';
    RAISE NOTICE '✅ Tabelas de fornecedores criadas com sucesso!';
    RAISE NOTICE '✅ Tabelas de armazéns e estoques criadas com sucesso!';
    RAISE NOTICE '✅ Índices e triggers configurados!';
    RAISE NOTICE '✅ Dados iniciais inseridos!';
    RAISE NOTICE '🎉 Sistema de produtos 100% completo!';
END $$; 