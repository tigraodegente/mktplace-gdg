-- ============================================================================
-- UNIVERSAL SHIPPING SYSTEM - SCHEMA COMPLETO
-- ============================================================================

-- 1. CARRIERS (Transportadoras)
CREATE TABLE shipping_carriers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,              -- 'Frenet', 'Correios', 'Custom'
    type VARCHAR(50) NOT NULL,               -- 'api', 'table', 'manual'
    api_endpoint VARCHAR(500),               -- URL da API se for tipo 'api'
    api_credentials JSONB,                   -- Credenciais seguras
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',             -- Configurações específicas
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. SHIPPING ZONES (Zonas Universais)
CREATE TABLE shipping_zones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id TEXT REFERENCES shipping_carriers(id),
    name VARCHAR(255) NOT NULL,              -- 'SP Capital', 'Interior RJ'
    uf VARCHAR(2),
    cities TEXT[],                          -- Array de cidades ou ['*'] para todas
    postal_code_ranges JSONB,               -- [{"from": "01000000", "to": "01999999"}]
    zone_type VARCHAR(50),                   -- 'capital', 'interior', 'remote'
    delivery_days_min INTEGER,
    delivery_days_max INTEGER,
    restrictions JSONB DEFAULT '{}',         -- Restrições especiais
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_shipping_zones_carrier (carrier_id),
    INDEX idx_shipping_zones_uf (uf),
    INDEX idx_shipping_zones_postal (postal_code_ranges)
);

-- 3. SHIPPING RATES (Preços Base por Zona)
CREATE TABLE shipping_rates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT REFERENCES shipping_zones(id),
    
    -- Regras de peso/dimensão (flexível para qualquer carrier)
    weight_rules JSONB DEFAULT '[]',         -- [{"from": 0, "to": 300, "price": 8.50}]
    dimension_rules JSONB DEFAULT '[]',      -- Regras por dimensão
    
    -- Preços base
    base_price DECIMAL(10,2) DEFAULT 0,
    price_per_kg DECIMAL(10,2) DEFAULT 0,
    price_per_km DECIMAL(10,2) DEFAULT 0,   -- Para distância
    
    -- Taxas adicionais (flexível)
    additional_fees JSONB DEFAULT '{}',      -- {"gris": 0.30, "adv": 0.30, "pedagio": 0}
    
    -- Condições especiais
    conditions JSONB DEFAULT '{}',           -- Condições de aplicação
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. SELLER SHIPPING CONFIGS (Configurações por Seller + Global)
CREATE TABLE seller_shipping_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id TEXT REFERENCES sellers(id),  -- NULL = configuração global
    carrier_id TEXT REFERENCES shipping_carriers(id),
    zone_id TEXT REFERENCES shipping_zones(id),
    
    -- Configurações do seller
    is_enabled BOOLEAN DEFAULT true,
    markup_percentage DECIMAL(5,2) DEFAULT 0,    -- Seller pode adicionar margem
    
    -- FRETE GRÁTIS (Múltiplos níveis)
    free_shipping_threshold DECIMAL(10,2),       -- Por seller/global
    free_shipping_products TEXT[],               -- IDs de produtos com frete grátis
    free_shipping_categories TEXT[],             -- IDs de categorias com frete grátis
    
    -- Limites físicos
    max_weight_kg DECIMAL(8,2),                  -- Peso máximo
    max_dimensions JSONB,                        -- {"length": 100, "width": 100, "height": 100}
    
    -- Exceções
    product_exceptions JSONB DEFAULT '{}',       -- Produtos que não usa esse carrier
    category_exceptions JSONB DEFAULT '{}',     -- Categorias com regras especiais
    
    priority INTEGER DEFAULT 1,                 -- Ordem de preferência
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_seller_shipping_seller (seller_id),
    INDEX idx_seller_shipping_carrier (carrier_id),
    INDEX idx_seller_shipping_priority (priority)
);

-- 5. SHIPPING EXCEPTIONS (Exceções Complexas)
CREATE TABLE shipping_exceptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id TEXT REFERENCES sellers(id),      -- NULL = global
    
    -- Tipo de exceção
    exception_type VARCHAR(50) NOT NULL,        -- 'product', 'category', 'region', 'weight'
    target_ids TEXT[],                         -- IDs dos produtos/categorias afetados
    
    -- Regra da exceção
    rule_type VARCHAR(50) NOT NULL,            -- 'block', 'custom_price', 'add_days', 'free_shipping'
    custom_settings JSONB DEFAULT '{}',        -- Configurações específicas
    
    message TEXT,                             -- Mensagem para o usuário
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. SHIPPING QUOTES (Cache de Cotações)
CREATE TABLE shipping_quotes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Chave do cache
    cache_key VARCHAR(255) UNIQUE,           -- MD5(seller_id + postal_code + items_hash)
    
    -- Dados da cotação
    seller_id TEXT,
    postal_code VARCHAR(8),
    items_data JSONB,                        -- Array de produtos com peso/dimensões
    
    -- Resultado
    shipping_options JSONB,                  -- Array de opções calculadas
    
    -- Controle de cache
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_shipping_quotes_cache (cache_key),
    INDEX idx_shipping_quotes_expires (expires_at)
);

-- ============================================================================
-- VIEWS E FUNÇÕES
-- ============================================================================

-- View para consulta completa
CREATE VIEW shipping_complete AS
SELECT 
    c.id as carrier_id,
    c.name as carrier_name,
    c.type as carrier_type,
    z.id as zone_id,
    z.name as zone_name,
    z.uf,
    z.postal_code_ranges,
    z.delivery_days_min,
    z.delivery_days_max,
    r.weight_rules,
    r.base_price,
    r.additional_fees,
    sc.seller_id,
    sc.markup_percentage,
    sc.free_shipping_threshold,
    sc.free_shipping_products,
    sc.free_shipping_categories,
    sc.priority
FROM shipping_carriers c
JOIN shipping_zones z ON c.id = z.carrier_id
JOIN shipping_rates r ON z.id = r.zone_id
LEFT JOIN seller_shipping_configs sc ON c.id = sc.carrier_id AND z.id = sc.zone_id
WHERE c.is_active = true 
  AND z.is_active = true 
  AND r.is_active = true
  AND (sc.is_enabled = true OR sc.is_enabled IS NULL);

-- Função para buscar zona por CEP
CREATE OR REPLACE FUNCTION find_shipping_zone(
    p_postal_code VARCHAR(8),
    p_carrier_id TEXT DEFAULT NULL
) RETURNS TABLE (
    zone_id TEXT,
    zone_name VARCHAR(255),
    carrier_id TEXT,
    delivery_days_min INTEGER,
    delivery_days_max INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.id,
        z.name,
        z.carrier_id,
        z.delivery_days_min,
        z.delivery_days_max
    FROM shipping_zones z
    JOIN shipping_carriers c ON z.carrier_id = c.id
    WHERE z.is_active = true 
      AND c.is_active = true
      AND (p_carrier_id IS NULL OR z.carrier_id = p_carrier_id)
      AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(z.postal_code_ranges) as range
          WHERE p_postal_code BETWEEN (range->>'from') AND (range->>'to')
      )
    ORDER BY z.delivery_days_min ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Carrier Frenet
INSERT INTO shipping_carriers (id, name, type, api_endpoint) VALUES 
('frenet-carrier', 'Frenet', 'table', NULL);

-- Carrier Global (fallback)
INSERT INTO shipping_carriers (id, name, type) VALUES 
('global-carrier', 'Global Shipping', 'table');

-- Configuração global padrão
INSERT INTO seller_shipping_configs (
    id, seller_id, carrier_id, zone_id, 
    free_shipping_threshold, max_weight_kg, priority
) VALUES (
    'global-config', NULL, 'global-carrier', NULL,
    299.00, 50.0, 999
); 