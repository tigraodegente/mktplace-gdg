-- ============================================================================
-- IMPORTAÇÃO COMPLETA DOS DADOS FRENET - ESTRUTURA AVANÇADA
-- ============================================================================

-- 1. Criar tabela temporária para importação do CSV completo
CREATE TEMP TABLE frenet_import_full (
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

-- 2. Funções auxiliares para conversão
CREATE OR REPLACE FUNCTION parse_frenet_price(price_str TEXT) 
RETURNS DECIMAL(10,2) AS $$
BEGIN
    IF price_str IS NULL OR price_str = '' OR price_str = 'R$0' THEN
        RETURN 0;
    END IF;
    
    -- Remove "R$" e converte vírgula para ponto
    RETURN CAST(
        REPLACE(REPLACE(REPLACE(price_str, 'R$', ''), ',', '.'), ' ', '') 
        AS DECIMAL(10,2)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION parse_frenet_percent(percent_str TEXT) 
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
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. IMPORTAR DADOS DO CSV (Execute este comando externamente)
-- ============================================================================
-- \COPY frenet_import_full FROM 'Planilha Frenet - Grão de Gente - Atualizada.xlsx - Grão de Gente.csv' WITH (FORMAT CSV, HEADER true, DELIMITER ',');

-- ============================================================================
-- 4. PROCESSAR E INSERIR DADOS NA NOVA ESTRUTURA
-- ============================================================================

-- 4.1. Criar zonas de frete (agrupando por UF + Cidade)
INSERT INTO shipping_zones (
    id,
    carrier_id, 
    name, 
    uf, 
    cities,
    postal_code_ranges,
    zone_type,
    is_active
)
SELECT DISTINCT
    gen_random_uuid()::text,
    'frenet-carrier',
    f.uf || ' - ' || f.cidade,
    f.uf,
    ARRAY[f.cidade],
    jsonb_agg(DISTINCT 
        jsonb_build_object(
            'from', f.cep_de,
            'to', f.cep_ate
        )
    ),
    CASE 
        WHEN f.cidade_uf ILIKE '%capital%' THEN 'capital'
        WHEN f.cidade_uf ILIKE '%interior%' THEN 'interior'
        ELSE 'mixed'
    END,
    true
FROM frenet_import_full f
WHERE f.uf IS NOT NULL 
  AND f.cidade IS NOT NULL
  AND f.cep_de IS NOT NULL 
  AND f.cep_ate IS NOT NULL
  AND LENGTH(f.cep_de) = 8
  AND LENGTH(f.cep_ate) = 8
GROUP BY f.uf, f.cidade, f.cidade_uf;

-- 4.2. Criar dados base (templates) - um registro por zona com dados originais
INSERT INTO shipping_base_rates (
    zone_id,
    weight_rules,
    base_delivery_days,
    additional_fees,
    source,
    is_template
)
SELECT 
    z.id,
    jsonb_build_array(
        jsonb_build_object('from', 0, 'to', 300, 'price', parse_frenet_price(f.ate_300g)),
        jsonb_build_object('from', 301, 'to', 500, 'price', parse_frenet_price(f.ate_500g)),
        jsonb_build_object('from', 501, 'to', 750, 'price', parse_frenet_price(f.ate_750g)),
        jsonb_build_object('from', 751, 'to', 1000, 'price', parse_frenet_price(f.ate_1kg)),
        jsonb_build_object('from', 1001, 'to', 1250, 'price', parse_frenet_price(f.ate_1250g)),
        jsonb_build_object('from', 1251, 'to', 1500, 'price', parse_frenet_price(f.ate_1500g)),
        jsonb_build_object('from', 1501, 'to', 2000, 'price', parse_frenet_price(f.ate_2kg)),
        jsonb_build_object('from', 2001, 'to', 2500, 'price', parse_frenet_price(f.ate_2500g)),
        jsonb_build_object('from', 2501, 'to', 3000, 'price', parse_frenet_price(f.ate_3kg)),
        jsonb_build_object('from', 3001, 'to', 3500, 'price', parse_frenet_price(f.ate_3500g)),
        jsonb_build_object('from', 3501, 'to', 4000, 'price', parse_frenet_price(f.ate_4kg)),
        jsonb_build_object('from', 4001, 'to', 5000, 'price', parse_frenet_price(f.ate_5kg)),
        jsonb_build_object('from', 5001, 'to', 7500, 'price', parse_frenet_price(f.ate_7500g)),
        jsonb_build_object('from', 7501, 'to', 10000, 'price', parse_frenet_price(f.ate_10kg)),
        jsonb_build_object('from', 10001, 'to', 11000, 'price', parse_frenet_price(f.ate_11kg)),
        jsonb_build_object('from', 11001, 'to', 12000, 'price', parse_frenet_price(f.ate_12kg)),
        jsonb_build_object('from', 12001, 'to', 13000, 'price', parse_frenet_price(f.ate_13kg)),
        jsonb_build_object('from', 13001, 'to', 14000, 'price', parse_frenet_price(f.ate_14kg)),
        jsonb_build_object('from', 14001, 'to', 15000, 'price', parse_frenet_price(f.ate_15kg)),
        jsonb_build_object('from', 15001, 'to', 16000, 'price', parse_frenet_price(f.ate_16kg)),
        jsonb_build_object('from', 16001, 'to', 17000, 'price', parse_frenet_price(f.ate_17kg)),
        jsonb_build_object('from', 17001, 'to', 18000, 'price', parse_frenet_price(f.ate_18kg)),
        jsonb_build_object('from', 18001, 'to', 19000, 'price', parse_frenet_price(f.ate_19kg)),
        jsonb_build_object('from', 19001, 'to', 20000, 'price', parse_frenet_price(f.ate_20kg)),
        jsonb_build_object('from', 20001, 'to', 21000, 'price', parse_frenet_price(f.ate_21kg)),
        jsonb_build_object('from', 21001, 'to', 22000, 'price', parse_frenet_price(f.ate_22kg)),
        jsonb_build_object('from', 22001, 'to', 23000, 'price', parse_frenet_price(f.ate_23kg)),
        jsonb_build_object('from', 23001, 'to', 24000, 'price', parse_frenet_price(f.ate_24kg)),
        jsonb_build_object('from', 24001, 'to', 25000, 'price', parse_frenet_price(f.ate_25kg)),
        jsonb_build_object('from', 25001, 'to', 26000, 'price', parse_frenet_price(f.ate_26kg)),
        jsonb_build_object('from', 26001, 'to', 27000, 'price', parse_frenet_price(f.ate_27kg)),
        jsonb_build_object('from', 27001, 'to', 28000, 'price', parse_frenet_price(f.ate_28kg)),
        jsonb_build_object('from', 28001, 'to', 29000, 'price', parse_frenet_price(f.ate_29kg)),
        jsonb_build_object('from', 29001, 'to', 30000, 'price', parse_frenet_price(f.ate_30kg)),
        jsonb_build_object('from', 30001, 'to', 999999, 'price', parse_frenet_price(f.acima_de_30kg))
    ),
    f.prazo,
    jsonb_build_object(
        'gris_percent', parse_frenet_percent(f.gris_percent),
        'gris_min', parse_frenet_price(f.gris_min),
        'adv_percent', parse_frenet_percent(f.adv_percent),
        'adv_min', parse_frenet_price(f.adv_min),
        'pedagio', parse_frenet_price(f.pedagio),
        'trt_percent', parse_frenet_percent(f.trt_percent),
        'trt_min', parse_frenet_price(f.trt_minimo),
        'emex_percent', parse_frenet_percent(f.emex_percent),
        'emex_min', parse_frenet_price(f.emex_min),
        'despacho', parse_frenet_price(f.despacho),
        'suframa', parse_frenet_price(f.suframa),
        'tas', parse_frenet_price(f.tas),
        'icms', parse_frenet_percent(f.icms)
    ),
    'frenet',
    true
FROM shipping_zones z
JOIN frenet_import_full f ON (
    z.uf = f.uf 
    AND z.cities @> ARRAY[f.cidade]
    AND z.carrier_id = 'frenet-carrier'
)
WHERE f.prazo IS NOT NULL
GROUP BY z.id, f.uf, f.cidade, f.prazo, f.ate_300g, f.ate_500g, f.ate_750g, 
         f.ate_1kg, f.ate_1250g, f.ate_1500g, f.ate_2kg, f.ate_2500g, f.ate_3kg, 
         f.ate_3500g, f.ate_4kg, f.ate_5kg, f.ate_7500g, f.ate_10kg, f.ate_11kg, 
         f.ate_12kg, f.ate_13kg, f.ate_14kg, f.ate_15kg, f.ate_16kg, f.ate_17kg, 
         f.ate_18kg, f.ate_19kg, f.ate_20kg, f.ate_21kg, f.ate_22kg, f.ate_23kg, 
         f.ate_24kg, f.ate_25kg, f.ate_26kg, f.ate_27kg, f.ate_28kg, f.ate_29kg, 
         f.ate_30kg, f.acima_de_30kg, f.gris_percent, f.gris_min, f.adv_percent, 
         f.adv_min, f.pedagio, f.trt_percent, f.trt_minimo, f.emex_percent, 
         f.emex_min, f.despacho, f.suframa, f.tas, f.icms;

-- ============================================================================
-- 5. GERAR AUTOMATICAMENTE TODAS AS OPÇÕES CALCULADAS
-- ============================================================================

-- Gerar opções calculadas para todos os base_rates importados
DO $$
DECLARE
    base_rate_record RECORD;
    total_generated INTEGER := 0;
    generated_count INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando geração automática das modalidades...';
    
    FOR base_rate_record IN 
        SELECT id FROM shipping_base_rates WHERE source = 'frenet' AND is_active = true
    LOOP
        SELECT generate_calculated_options(base_rate_record.id) INTO generated_count;
        total_generated := total_generated + generated_count;
    END LOOP;
    
    RAISE NOTICE 'Geração concluída! Total de opções geradas: %', total_generated;
END $$;

-- ============================================================================
-- 6. RELATÓRIO DE IMPORTAÇÃO
-- ============================================================================

-- Verificar dados importados
DO $$
DECLARE
    zones_count INTEGER;
    base_rates_count INTEGER;
    calculated_options_count INTEGER;
    modalities_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO zones_count FROM shipping_zones WHERE carrier_id = 'frenet-carrier';
    SELECT COUNT(*) INTO base_rates_count FROM shipping_base_rates WHERE source = 'frenet';
    SELECT COUNT(*) INTO calculated_options_count FROM shipping_calculated_options;
    SELECT COUNT(*) INTO modalities_count FROM shipping_modalities WHERE is_active = true;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RELATÓRIO DE IMPORTAÇÃO FRENET COMPLETA';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Zonas de frete importadas: %', zones_count;
    RAISE NOTICE 'Tabelas base (templates): %', base_rates_count;
    RAISE NOTICE 'Modalidades ativas: %', modalities_count;
    RAISE NOTICE 'Opções calculadas geradas: %', calculated_options_count;
    RAISE NOTICE 'Cobertura média: % opções por zona', ROUND(calculated_options_count::decimal / NULLIF(zones_count, 0), 1);
    RAISE NOTICE '============================================';
END $$;

-- Mostrar algumas estatísticas
SELECT 
    'Resumo por UF' as categoria,
    sz.uf,
    COUNT(DISTINCT sz.id) as zonas,
    COUNT(DISTINCT sbr.id) as tabelas_base,
    COUNT(sco.id) as opcoes_calculadas
FROM shipping_zones sz
LEFT JOIN shipping_base_rates sbr ON sz.id = sbr.zone_id
LEFT JOIN shipping_calculated_options sco ON sbr.id = sco.base_rate_id
WHERE sz.carrier_id = 'frenet-carrier'
GROUP BY sz.uf
ORDER BY zonas DESC
LIMIT 10;

-- Limpar funções temporárias
DROP FUNCTION IF EXISTS parse_frenet_price(TEXT);
DROP FUNCTION IF EXISTS parse_frenet_percent(TEXT);
DROP TABLE IF EXISTS frenet_import_full; 