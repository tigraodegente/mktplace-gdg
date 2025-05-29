-- ============================================================================
-- SCHEMA FRENET SHIPPING - MIGRAÇÃO PLANILHA FRENET
-- ============================================================================

-- Tabela principal de zonas de frete Frenet
CREATE TABLE frenet_shipping_zones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    uf VARCHAR(2) NOT NULL,
    city VARCHAR(255) NOT NULL,
    city_type VARCHAR(20) NOT NULL, -- Capital, Interior, Cap e Int
    postal_code_from VARCHAR(8) NOT NULL,
    postal_code_to VARCHAR(8) NOT NULL,
    delivery_days INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices para performance
    INDEX idx_frenet_postal_code (postal_code_from, postal_code_to),
    INDEX idx_frenet_uf_city (uf, city),
    INDEX idx_frenet_delivery_days (delivery_days)
);

-- Tabela de preços por peso
CREATE TABLE frenet_shipping_rates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT NOT NULL REFERENCES frenet_shipping_zones(id) ON DELETE CASCADE,
    
    -- Faixas de peso (em gramas)
    weight_300g DECIMAL(10,2),
    weight_500g DECIMAL(10,2),
    weight_750g DECIMAL(10,2),
    weight_1kg DECIMAL(10,2),
    weight_1250g DECIMAL(10,2),
    weight_1500g DECIMAL(10,2),
    weight_2kg DECIMAL(10,2),
    weight_2500g DECIMAL(10,2),
    weight_3kg DECIMAL(10,2),
    weight_3500g DECIMAL(10,2),
    weight_4kg DECIMAL(10,2),
    weight_5kg DECIMAL(10,2),
    weight_7500g DECIMAL(10,2),
    weight_10kg DECIMAL(10,2),
    weight_11kg DECIMAL(10,2),
    weight_12kg DECIMAL(10,2),
    weight_13kg DECIMAL(10,2),
    weight_14kg DECIMAL(10,2),
    weight_15kg DECIMAL(10,2),
    weight_16kg DECIMAL(10,2),
    weight_17kg DECIMAL(10,2),
    weight_18kg DECIMAL(10,2),
    weight_19kg DECIMAL(10,2),
    weight_20kg DECIMAL(10,2),
    weight_21kg DECIMAL(10,2),
    weight_22kg DECIMAL(10,2),
    weight_23kg DECIMAL(10,2),
    weight_24kg DECIMAL(10,2),
    weight_25kg DECIMAL(10,2),
    weight_26kg DECIMAL(10,2),
    weight_27kg DECIMAL(10,2),
    weight_28kg DECIMAL(10,2),
    weight_29kg DECIMAL(10,2),
    weight_30kg DECIMAL(10,2),
    weight_above_30kg DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_frenet_rates_zone (zone_id)
);

-- Tabela de taxas adicionais
CREATE TABLE frenet_shipping_fees (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT NOT NULL REFERENCES frenet_shipping_zones(id) ON DELETE CASCADE,
    
    -- Taxas (percentuais e mínimos)
    gris_percentage DECIMAL(5,2), -- Taxa GRIS %
    gris_minimum DECIMAL(10,2),   -- GRIS mínimo
    adv_percentage DECIMAL(5,2),  -- Taxa ADV %
    adv_minimum DECIMAL(10,2),    -- ADV mínimo
    pedagio DECIMAL(10,2),        -- Taxa pedágio
    trt_percentage DECIMAL(5,2),  -- Taxa TRT %
    trt_minimum DECIMAL(10,2),    -- TRT mínimo
    emex_percentage DECIMAL(5,2), -- Taxa EMEX %
    emex_minimum DECIMAL(10,2),   -- EMEX mínimo
    despacho DECIMAL(10,2),       -- Taxa despacho
    suframa DECIMAL(10,2),        -- Taxa SUFRAMA
    tas DECIMAL(10,2),            -- Taxa TAS
    icms_percentage DECIMAL(5,2), -- ICMS %
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_frenet_fees_zone (zone_id)
);

-- View para consulta completa de frete
CREATE VIEW frenet_shipping_complete AS
SELECT 
    z.id,
    z.uf,
    z.city,
    z.city_type,
    z.postal_code_from,
    z.postal_code_to,
    z.delivery_days,
    r.*,
    f.gris_percentage,
    f.gris_minimum,
    f.adv_percentage,
    f.adv_minimum,
    f.pedagio,
    f.trt_percentage,
    f.trt_minimum,
    f.emex_percentage,
    f.emex_minimum,
    f.despacho,
    f.suframa,
    f.tas,
    f.icms_percentage
FROM frenet_shipping_zones z
LEFT JOIN frenet_shipping_rates r ON z.id = r.zone_id
LEFT JOIN frenet_shipping_fees f ON z.id = f.zone_id;

-- Função para calcular frete baseado no peso e CEP
CREATE OR REPLACE FUNCTION calculate_frenet_shipping(
    target_postal_code VARCHAR(8),
    weight_grams INTEGER
) RETURNS TABLE (
    delivery_days INTEGER,
    base_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    city VARCHAR(255),
    uf VARCHAR(2)
) AS $$
DECLARE
    zone_record RECORD;
    price DECIMAL(10,2);
    fees_record RECORD;
BEGIN
    -- Buscar zona correspondente ao CEP
    SELECT * INTO zone_record
    FROM frenet_shipping_zones
    WHERE target_postal_code BETWEEN postal_code_from AND postal_code_to
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Buscar preço baseado no peso
    SELECT * INTO price
    FROM frenet_shipping_rates r
    WHERE r.zone_id = zone_record.id;
    
    -- Lógica de seleção de preço por peso seria implementada aqui
    -- Por exemplo: CASE WHEN weight_grams <= 300 THEN weight_300g...
    
    -- Buscar taxas
    SELECT * INTO fees_record
    FROM frenet_shipping_fees f
    WHERE f.zone_id = zone_record.id;
    
    -- Retornar resultado (simplificado)
    RETURN QUERY SELECT 
        zone_record.delivery_days,
        price::DECIMAL(10,2) as base_price,
        price::DECIMAL(10,2) as total_price, -- Aplicaria cálculos de taxas aqui
        zone_record.city,
        zone_record.uf;
END;
$$ LANGUAGE plpgsql; 