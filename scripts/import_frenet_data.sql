-- ============================================================================
-- SCRIPT DE IMPORTAÇÃO FRENET PARA ESTRUTURA UNIVERSAL
-- ============================================================================

-- 1. Criar tabela temporária para importação do CSV
CREATE TEMP TABLE frenet_import (
    uf VARCHAR(2),
    cidade VARCHAR(255),
    cidade_uf VARCHAR(50),
    cep_de VARCHAR(8),
    cep_ate VARCHAR(8),
    prazo INTEGER,
    ate_300g VARCHAR(20),
    ate_500g VARCHAR(20),
    ate_750g VARCHAR(20),
    ate_1kg VARCHAR(20),
    ate_1250g VARCHAR(20),
    ate_1500g VARCHAR(20),
    ate_2kg VARCHAR(20),
    ate_2500g VARCHAR(20),
    ate_3kg VARCHAR(20),
    ate_3500g VARCHAR(20),
    ate_4kg VARCHAR(20),
    ate_5kg VARCHAR(20),
    ate_7500g VARCHAR(20),
    ate_10kg VARCHAR(20),
    ate_11kg VARCHAR(20),
    ate_12kg VARCHAR(20),
    ate_13kg VARCHAR(20),
    ate_14kg VARCHAR(20),
    ate_15kg VARCHAR(20),
    ate_16kg VARCHAR(20),
    ate_17kg VARCHAR(20),
    ate_18kg VARCHAR(20),
    ate_19kg VARCHAR(20),
    ate_20kg VARCHAR(20),
    ate_21kg VARCHAR(20),
    ate_22kg VARCHAR(20),
    ate_23kg VARCHAR(20),
    ate_24kg VARCHAR(20),
    ate_25kg VARCHAR(20),
    ate_26kg VARCHAR(20),
    ate_27kg VARCHAR(20),
    ate_28kg VARCHAR(20),
    ate_29kg VARCHAR(20),
    ate_30kg VARCHAR(20),
    acima_de_30kg VARCHAR(20),
    gris_percent VARCHAR(10),
    gris_min VARCHAR(10),
    adv_percent VARCHAR(10),
    adv_min VARCHAR(10),
    pedagio VARCHAR(10),
    trt_percent VARCHAR(10),
    trt_minimo VARCHAR(10),
    emex_percent VARCHAR(10),
    emex_min VARCHAR(10),
    despacho VARCHAR(10),
    suframa VARCHAR(10),
    tas VARCHAR(10),
    icms VARCHAR(10)
);

-- 2. Função para converter preço "R$8.49" para DECIMAL
CREATE OR REPLACE FUNCTION parse_price(price_str TEXT) 
RETURNS DECIMAL(10,2) AS $$
BEGIN
    IF price_str IS NULL OR price_str = '' THEN
        RETURN 0;
    END IF;
    
    -- Remove "R$" e converte vírgula para ponto
    RETURN CAST(
        REPLACE(REPLACE(price_str, 'R$', ''), ',', '.') 
        AS DECIMAL(10,2)
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Função para converter percentual "0.30%" para DECIMAL
CREATE OR REPLACE FUNCTION parse_percent(percent_str TEXT) 
RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF percent_str IS NULL OR percent_str = '' THEN
        RETURN 0;
    END IF;
    
    -- Remove "%" e converte vírgula para ponto
    RETURN CAST(
        REPLACE(REPLACE(percent_str, '%', ''), ',', '.') 
        AS DECIMAL(5,2)
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Importar dados da planilha (seria executado via COPY ou ferramenta ETL)
/*
COPY frenet_import FROM '/path/to/Planilha Frenet - Grão de Gente - Atualizada.xlsx - Grão de Gente.csv' 
WITH (FORMAT CSV, HEADER true, DELIMITER ',');
*/

-- 5. Migrar dados para estrutura universal

-- 5.1. Criar zonas de frete Frenet
INSERT INTO shipping_zones (
    id,
    carrier_id, 
    name, 
    uf, 
    cities,
    postal_code_ranges,
    zone_type,
    delivery_days_min,
    delivery_days_max
)
SELECT DISTINCT
    gen_random_uuid(),
    'frenet-carrier',
    uf || ' - ' || cidade,
    uf,
    ARRAY[cidade],
    jsonb_build_array(
        jsonb_build_object(
            'from', cep_de,
            'to', cep_ate
        )
    ),
    CASE 
        WHEN cidade_uf ILIKE '%capital%' THEN 'capital'
        WHEN cidade_uf ILIKE '%interior%' THEN 'interior'
        ELSE 'mixed'
    END,
    prazo,
    prazo + 1  -- Margem de 1 dia
FROM frenet_import
WHERE uf IS NOT NULL 
  AND cidade IS NOT NULL
  AND cep_de IS NOT NULL 
  AND cep_ate IS NOT NULL;

-- 5.2. Criar rates com faixas de peso
INSERT INTO shipping_rates (
    zone_id,
    weight_rules
)
SELECT 
    z.id,
    jsonb_build_array(
        jsonb_build_object('from', 0, 'to', 300, 'price', parse_price(f.ate_300g)),
        jsonb_build_object('from', 301, 'to', 500, 'price', parse_price(f.ate_500g)),
        jsonb_build_object('from', 501, 'to', 750, 'price', parse_price(f.ate_750g)),
        jsonb_build_object('from', 751, 'to', 1000, 'price', parse_price(f.ate_1kg)),
        jsonb_build_object('from', 1001, 'to', 1250, 'price', parse_price(f.ate_1250g)),
        jsonb_build_object('from', 1251, 'to', 1500, 'price', parse_price(f.ate_1500g)),
        jsonb_build_object('from', 1501, 'to', 2000, 'price', parse_price(f.ate_2kg)),
        jsonb_build_object('from', 2001, 'to', 2500, 'price', parse_price(f.ate_2500g)),
        jsonb_build_object('from', 2501, 'to', 3000, 'price', parse_price(f.ate_3kg)),
        jsonb_build_object('from', 3001, 'to', 3500, 'price', parse_price(f.ate_3500g)),
        jsonb_build_object('from', 3501, 'to', 4000, 'price', parse_price(f.ate_4kg)),
        jsonb_build_object('from', 4001, 'to', 5000, 'price', parse_price(f.ate_5kg)),
        jsonb_build_object('from', 5001, 'to', 7500, 'price', parse_price(f.ate_7500g)),
        jsonb_build_object('from', 7501, 'to', 10000, 'price', parse_price(f.ate_10kg)),
        jsonb_build_object('from', 10001, 'to', 11000, 'price', parse_price(f.ate_11kg)),
        jsonb_build_object('from', 11001, 'to', 12000, 'price', parse_price(f.ate_12kg)),
        jsonb_build_object('from', 12001, 'to', 13000, 'price', parse_price(f.ate_13kg)),
        jsonb_build_object('from', 13001, 'to', 14000, 'price', parse_price(f.ate_14kg)),
        jsonb_build_object('from', 14001, 'to', 15000, 'price', parse_price(f.ate_15kg)),
        jsonb_build_object('from', 15001, 'to', 16000, 'price', parse_price(f.ate_16kg)),
        jsonb_build_object('from', 16001, 'to', 17000, 'price', parse_price(f.ate_17kg)),
        jsonb_build_object('from', 17001, 'to', 18000, 'price', parse_price(f.ate_18kg)),
        jsonb_build_object('from', 18001, 'to', 19000, 'price', parse_price(f.ate_19kg)),
        jsonb_build_object('from', 19001, 'to', 20000, 'price', parse_price(f.ate_20kg)),
        jsonb_build_object('from', 20001, 'to', 21000, 'price', parse_price(f.ate_21kg)),
        jsonb_build_object('from', 21001, 'to', 22000, 'price', parse_price(f.ate_22kg)),
        jsonb_build_object('from', 22001, 'to', 23000, 'price', parse_price(f.ate_23kg)),
        jsonb_build_object('from', 23001, 'to', 24000, 'price', parse_price(f.ate_24kg)),
        jsonb_build_object('from', 24001, 'to', 25000, 'price', parse_price(f.ate_25kg)),
        jsonb_build_object('from', 25001, 'to', 26000, 'price', parse_price(f.ate_26kg)),
        jsonb_build_object('from', 26001, 'to', 27000, 'price', parse_price(f.ate_27kg)),
        jsonb_build_object('from', 27001, 'to', 28000, 'price', parse_price(f.ate_28kg)),
        jsonb_build_object('from', 28001, 'to', 29000, 'price', parse_price(f.ate_29kg)),
        jsonb_build_object('from', 29001, 'to', 30000, 'price', parse_price(f.ate_30kg)),
        jsonb_build_object('from', 30001, 'to', 999999, 'price', parse_price(f.acima_de_30kg))
    ),
    additional_fees = jsonb_build_object(
        'gris_percent', parse_percent(f.gris_percent),
        'gris_min', parse_price(f.gris_min),
        'adv_percent', parse_percent(f.adv_percent),
        'adv_min', parse_price(f.adv_min),
        'pedagio', parse_price(f.pedagio),
        'trt_percent', parse_percent(f.trt_percent),
        'trt_min', parse_price(f.trt_minimo),
        'emex_percent', parse_percent(f.emex_percent),
        'emex_min', parse_price(f.emex_min),
        'despacho', parse_price(f.despacho),
        'suframa', parse_price(f.suframa),
        'tas', parse_price(f.tas),
        'icms', parse_percent(f.icms)
    )
FROM shipping_zones z
JOIN frenet_import f ON (
    z.uf = f.uf 
    AND z.cities @> ARRAY[f.cidade]
    AND z.carrier_id = 'frenet-carrier'
);

-- 6. Criar configurações padrão para Frenet
INSERT INTO seller_shipping_configs (
    seller_id, 
    carrier_id, 
    zone_id,
    free_shipping_threshold,
    max_weight_kg,
    priority
)
SELECT 
    NULL,  -- Global (fallback)
    'frenet-carrier',
    z.id,
    199.00,  -- Frete grátis acima de R$ 199
    30.0,    -- Máximo 30kg
    1        -- Prioridade alta
FROM shipping_zones z
WHERE z.carrier_id = 'frenet-carrier';

-- 7. Limpar tabelas temporárias
DROP FUNCTION IF EXISTS parse_price(TEXT);
DROP FUNCTION IF EXISTS parse_percent(TEXT);
DROP TABLE IF EXISTS frenet_import; 