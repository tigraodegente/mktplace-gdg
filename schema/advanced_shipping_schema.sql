-- ============================================================================
-- ADVANCED SHIPPING SYSTEM - MODALIDADES DE FRETE
-- ============================================================================

-- Limpar estrutura antiga
DROP VIEW IF EXISTS shipping_complete CASCADE;
DROP TABLE IF EXISTS shipping_calculated_options CASCADE;
DROP TABLE IF EXISTS shipping_modality_configs CASCADE;
DROP TABLE IF EXISTS shipping_modalities CASCADE;
DROP TABLE IF EXISTS shipping_quotes CASCADE;
DROP TABLE IF EXISTS shipping_exceptions CASCADE; 
DROP TABLE IF EXISTS seller_shipping_configs CASCADE;
DROP TABLE IF EXISTS shipping_rates CASCADE;
DROP TABLE IF EXISTS shipping_zones CASCADE;
DROP TABLE IF EXISTS shipping_methods CASCADE;
DROP TABLE IF EXISTS shipping_carriers CASCADE;

-- ============================================================================
-- 1. CARRIERS (Transportadoras)
-- ============================================================================
CREATE TABLE shipping_carriers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,               -- 'api', 'table', 'manual'
    api_endpoint VARCHAR(500),
    api_credentials JSONB,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. SHIPPING ZONES (Zonas Base - Uma por região)
-- ============================================================================
CREATE TABLE shipping_zones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    carrier_id TEXT REFERENCES shipping_carriers(id),
    name VARCHAR(255) NOT NULL,
    uf VARCHAR(2),
    cities TEXT[],
    postal_code_ranges JSONB,
    zone_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. SHIPPING BASE RATES (Dados Originais/Template - NUNCA mostrar ao cliente)
-- ============================================================================
CREATE TABLE shipping_base_rates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zone_id TEXT REFERENCES shipping_zones(id),
    
    -- Dados originais da transportadora (Frenet)
    weight_rules JSONB DEFAULT '[]',         -- Tabela de preços original
    base_delivery_days INTEGER NOT NULL,    -- Prazo original 
    additional_fees JSONB DEFAULT '{}',     -- Taxas originais
    
    -- Metadados
    source VARCHAR(50) DEFAULT 'frenet',    -- Origem dos dados
    import_date TIMESTAMP DEFAULT NOW(),
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- IMPORTANTE: Estes dados são TEMPLATE, nunca mostrar ao cliente
    is_template BOOLEAN DEFAULT true
);

-- ============================================================================
-- 4. SHIPPING MODALITIES (Tipos de Frete - Configurável)
-- ============================================================================
CREATE TABLE shipping_modalities (
    id TEXT PRIMARY KEY,                    -- 'original', 'expressa', 'agrupada'
    name VARCHAR(255) NOT NULL,             -- 'Entrega Expressa', 'Entrega Agrupada'
    description TEXT,
    
    -- Multiplicadores (configurável pelo admin)
    price_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.000,    -- 1.30 = 30% mais caro
    days_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.000,     -- 1.30 = 30% mais prazo
    
    -- Tipo de cobrança
    pricing_type VARCHAR(20) NOT NULL DEFAULT 'per_shipment', -- 'per_item' | 'per_shipment'
    
    -- Controles
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1,            -- Ordem de exibição
    
    -- Configurações especiais
    min_price DECIMAL(10,2),               -- Preço mínimo
    max_price DECIMAL(10,2),               -- Preço máximo
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. SHIPPING MODALITY CONFIGS (Configurações por Seller/Global)
-- ============================================================================
CREATE TABLE shipping_modality_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    seller_id TEXT,                        -- NULL = configuração global
    zone_id TEXT REFERENCES shipping_zones(id),
    modality_id TEXT REFERENCES shipping_modalities(id),
    
    -- Override de multiplicadores (opcional)
    custom_price_multiplier DECIMAL(5,3),
    custom_days_multiplier DECIMAL(5,3),
    custom_pricing_type VARCHAR(20),
    
    -- Frete grátis
    free_shipping_threshold DECIMAL(10,2),
    free_shipping_products TEXT[],
    free_shipping_categories TEXT[],
    
    -- Limites
    max_weight_kg DECIMAL(8,2),
    max_dimensions JSONB,
    
    -- Controles
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. SHIPPING CALCULATED OPTIONS (Cache das Opções Geradas)
-- ============================================================================
CREATE TABLE shipping_calculated_options (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Referências
    base_rate_id TEXT REFERENCES shipping_base_rates(id),
    modality_id TEXT REFERENCES shipping_modalities(id),
    zone_id TEXT REFERENCES shipping_zones(id),
    
    -- Valores calculados (cache)
    calculated_weight_rules JSONB,         -- Preços finais calculados
    calculated_delivery_days INTEGER,      -- Prazo final calculado  
    calculated_fees JSONB,                 -- Taxas finais
    
    -- Metadados do cálculo
    calculation_date TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,                  -- Cache expira
    
    -- Controles
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. SHIPPING QUOTES (Cache de Cotações do Cliente)
-- ============================================================================
CREATE TABLE shipping_quotes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    cache_key VARCHAR(255) UNIQUE,
    seller_id TEXT,
    postal_code VARCHAR(8),
    items_data JSONB,
    shipping_options JSONB,               -- Opções finais para o cliente
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES OTIMIZADOS
-- ============================================================================

-- shipping_zones
CREATE INDEX idx_shipping_zones_carrier ON shipping_zones(carrier_id);
CREATE INDEX idx_shipping_zones_uf ON shipping_zones(uf);
CREATE INDEX idx_shipping_zones_postal ON shipping_zones USING GIN(postal_code_ranges);

-- shipping_base_rates  
CREATE INDEX idx_base_rates_zone ON shipping_base_rates(zone_id);
CREATE INDEX idx_base_rates_active ON shipping_base_rates(is_active);
CREATE INDEX idx_base_rates_template ON shipping_base_rates(is_template);

-- shipping_modalities
CREATE INDEX idx_modalities_active ON shipping_modalities(is_active);
CREATE INDEX idx_modalities_priority ON shipping_modalities(priority);

-- shipping_modality_configs
CREATE INDEX idx_modality_configs_seller ON shipping_modality_configs(seller_id);
CREATE INDEX idx_modality_configs_zone ON shipping_modality_configs(zone_id);
CREATE INDEX idx_modality_configs_modality ON shipping_modality_configs(modality_id);

-- shipping_calculated_options
CREATE INDEX idx_calculated_options_base ON shipping_calculated_options(base_rate_id);
CREATE INDEX idx_calculated_options_modality ON shipping_calculated_options(modality_id);
CREATE INDEX idx_calculated_options_expires ON shipping_calculated_options(expires_at);

-- shipping_quotes
CREATE INDEX idx_shipping_quotes_cache ON shipping_quotes(cache_key);
CREATE INDEX idx_shipping_quotes_expires ON shipping_quotes(expires_at);

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para buscar zona por CEP
CREATE OR REPLACE FUNCTION find_shipping_zone_advanced(
    p_postal_code VARCHAR(8),
    p_carrier_id TEXT DEFAULT NULL
) RETURNS TABLE (
    zone_id TEXT,
    zone_name VARCHAR(255),
    carrier_id TEXT,
    uf VARCHAR(2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.id,
        z.name,
        z.carrier_id,
        z.uf
    FROM shipping_zones z
    JOIN shipping_carriers c ON z.carrier_id = c.id
    WHERE z.is_active = true 
      AND c.is_active = true
      AND (p_carrier_id IS NULL OR z.carrier_id = p_carrier_id)
      AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(z.postal_code_ranges) as range
          WHERE p_postal_code BETWEEN (range->>'from') AND (range->>'to')
      );
END;
$$ LANGUAGE plpgsql;

-- Função para gerar opções calculadas automaticamente
CREATE OR REPLACE FUNCTION generate_calculated_options(
    p_base_rate_id TEXT
) RETURNS INTEGER AS $$
DECLARE
    base_rate RECORD;
    modality RECORD;
    new_weight_rules JSONB;
    new_delivery_days INTEGER;
    rule RECORD;
    calculated_id TEXT;
    options_count INTEGER := 0;
BEGIN
    -- Buscar dados base
    SELECT * INTO base_rate FROM shipping_base_rates WHERE id = p_base_rate_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Limpar opções antigas
    DELETE FROM shipping_calculated_options WHERE base_rate_id = p_base_rate_id;
    
    -- Gerar para cada modalidade ativa
    FOR modality IN 
        SELECT * FROM shipping_modalities 
        WHERE is_active = true 
        ORDER BY priority ASC
    LOOP
        -- Calcular nova tabela de preços
        new_weight_rules := '[]'::jsonb;
        
        FOR rule IN 
            SELECT * FROM jsonb_array_elements(base_rate.weight_rules) as r
        LOOP
            new_weight_rules := new_weight_rules || jsonb_build_array(
                jsonb_build_object(
                    'from', (rule.r->>'from')::integer,
                    'to', (rule.r->>'to')::integer,
                    'price', ROUND(((rule.r->>'price')::decimal * modality.price_multiplier)::numeric, 2)
                )
            );
        END LOOP;
        
        -- Calcular novo prazo
        new_delivery_days := CEIL(base_rate.base_delivery_days * modality.days_multiplier);
        
        -- Inserir opção calculada
        INSERT INTO shipping_calculated_options (
            base_rate_id,
            modality_id, 
            zone_id,
            calculated_weight_rules,
            calculated_delivery_days,
            calculated_fees,
            expires_at
        ) VALUES (
            p_base_rate_id,
            modality.id,
            base_rate.zone_id,
            new_weight_rules,
            new_delivery_days,
            base_rate.additional_fees,
            NOW() + INTERVAL '24 hours'
        );
        
        options_count := options_count + 1;
    END LOOP;
    
    RETURN options_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Transportadoras
INSERT INTO shipping_carriers (id, name, type) VALUES 
('frenet-carrier', 'Frenet', 'table'),
('global-carrier', 'Global Shipping', 'table');

-- Modalidades padrão
INSERT INTO shipping_modalities (id, name, description, price_multiplier, days_multiplier, pricing_type, is_active, priority) VALUES
('original', 'Entrega Original', 'Dados originais da transportadora (não mostrar)', 1.000, 1.000, 'per_shipment', false, 999),
('expressa', 'Entrega Expressa', 'Entrega rápida com cobrança por item', 1.300, 1.000, 'per_item', true, 1),
('agrupada', 'Entrega Agrupada', 'Entrega econômica com prazo estendido', 1.100, 1.300, 'per_shipment', true, 2);

-- Configurações globais padrão
INSERT INTO shipping_modality_configs (seller_id, zone_id, modality_id, free_shipping_threshold, max_weight_kg, is_enabled, priority)
SELECT 
    NULL,           -- Global
    NULL,           -- Todas as zonas  
    m.id,
    CASE 
        WHEN m.id = 'expressa' THEN 299.00
        WHEN m.id = 'agrupada' THEN 199.00
        ELSE 399.00
    END,
    30.0,
    true,
    m.priority
FROM shipping_modalities m
WHERE m.is_active = true; 