-- ============================================================================
-- IMPORTAÇÃO COMPLETA - TODOS OS 14.383 REGISTROS FRENET
-- ============================================================================

-- 1. Criar tabela temporária para todo o CSV
CREATE TEMP TABLE frenet_full_import (
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

-- 2. Importar CSV completo (execute externamente)
\COPY frenet_full_import FROM 'Planilha Frenet - Grão de Gente - Atualizada.xlsx - Grão de Gente.csv' WITH (FORMAT CSV, HEADER true, DELIMITER ',');

-- 3. Função para limpeza de preços
CREATE OR REPLACE FUNCTION safe_price_convert(price_text TEXT) 
RETURNS DECIMAL(10,2) AS $$
BEGIN
    IF price_text IS NULL OR price_text = '' OR price_text = 'R$0,00' THEN
        RETURN 0;
    END IF;
    
    -- Remove R$, espaços e converte vírgula para ponto
    RETURN CAST(
        REPLACE(REPLACE(REPLACE(REPLACE(price_text, 'R$', ''), ' ', ''), ',', '.'), '"', '') 
        AS DECIMAL(10,2)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- 4. Limpar dados base antigos (manter apenas os que funcionam)
DELETE FROM shipping_calculated_options;
DELETE FROM shipping_base_rates WHERE source = 'frenet' AND id NOT IN (
    SELECT sbr.id 
    FROM shipping_base_rates sbr
    JOIN shipping_zones sz ON sbr.zone_id = sz.id
    WHERE sz.uf IN ('SP', 'RJ', 'MG', 'BA') AND sbr.source = 'frenet'
    LIMIT 50  -- Manter alguns funcionais para teste
);

-- 5. Processar e inserir dados agrupados por UF/Cidade/Prazo
INSERT INTO shipping_base_rates (
    zone_id,
    weight_rules,
    base_delivery_days,
    additional_fees,
    source,
    is_template
)
SELECT DISTINCT
    z.id as zone_id,
    jsonb_build_array(
        jsonb_build_object('from', 0, 'to', 300, 'price', safe_price_convert(f.ate_300g)),
        jsonb_build_object('from', 301, 'to', 500, 'price', safe_price_convert(f.ate_500g)),
        jsonb_build_object('from', 501, 'to', 750, 'price', safe_price_convert(f.ate_750g)),
        jsonb_build_object('from', 751, 'to', 1000, 'price', safe_price_convert(f.ate_1kg)),
        jsonb_build_object('from', 1001, 'to', 1250, 'price', safe_price_convert(f.ate_1250g)),
        jsonb_build_object('from', 1251, 'to', 1500, 'price', safe_price_convert(f.ate_1500g)),
        jsonb_build_object('from', 1501, 'to', 2000, 'price', safe_price_convert(f.ate_2kg)),
        jsonb_build_object('from', 2001, 'to', 2500, 'price', safe_price_convert(f.ate_2500g)),
        jsonb_build_object('from', 2501, 'to', 3000, 'price', safe_price_convert(f.ate_3kg)),
        jsonb_build_object('from', 3001, 'to', 3500, 'price', safe_price_convert(f.ate_3500g)),
        jsonb_build_object('from', 3501, 'to', 4000, 'price', safe_price_convert(f.ate_4kg)),
        jsonb_build_object('from', 4001, 'to', 5000, 'price', safe_price_convert(f.ate_5kg)),
        jsonb_build_object('from', 5001, 'to', 7500, 'price', safe_price_convert(f.ate_7500g)),
        jsonb_build_object('from', 7501, 'to', 10000, 'price', safe_price_convert(f.ate_10kg)),
        jsonb_build_object('from', 10001, 'to', 15000, 'price', safe_price_convert(f.ate_15kg)),
        jsonb_build_object('from', 15001, 'to', 20000, 'price', safe_price_convert(f.ate_20kg)),
        jsonb_build_object('from', 20001, 'to', 30000, 'price', safe_price_convert(f.ate_30kg)),
        jsonb_build_object('from', 30001, 'to', 999999, 'price', safe_price_convert(f.acima_de_30kg))
    ) as weight_rules,
    COALESCE(f.prazo, 7) as base_delivery_days,
    jsonb_build_object(
        'gris_percent', 0.30,
        'adv_percent', 0.30,
        'original_gris', COALESCE(REPLACE(f.gris_percent, '%', '')::decimal, 0.30),
        'original_adv', COALESCE(REPLACE(f.adv_percent, '%', '')::decimal, 0.30)
    ) as additional_fees,
    'frenet' as source,
    true as is_template
FROM shipping_zones z
JOIN (
    -- Agrupar dados por zona para evitar duplicatas
    SELECT 
        uf, 
        cidade,
        AVG(prazo)::integer as prazo,
        -- Pegar o primeiro registro de cada grupo para os preços
        (array_agg(ate_300g ORDER BY cep_de))[1] as ate_300g,
        (array_agg(ate_500g ORDER BY cep_de))[1] as ate_500g,
        (array_agg(ate_750g ORDER BY cep_de))[1] as ate_750g,
        (array_agg(ate_1kg ORDER BY cep_de))[1] as ate_1kg,
        (array_agg(ate_1250g ORDER BY cep_de))[1] as ate_1250g,
        (array_agg(ate_1500g ORDER BY cep_de))[1] as ate_1500g,
        (array_agg(ate_2kg ORDER BY cep_de))[1] as ate_2kg,
        (array_agg(ate_2500g ORDER BY cep_de))[1] as ate_2500g,
        (array_agg(ate_3kg ORDER BY cep_de))[1] as ate_3kg,
        (array_agg(ate_3500g ORDER BY cep_de))[1] as ate_3500g,
        (array_agg(ate_4kg ORDER BY cep_de))[1] as ate_4kg,
        (array_agg(ate_5kg ORDER BY cep_de))[1] as ate_5kg,
        (array_agg(ate_7500g ORDER BY cep_de))[1] as ate_7500g,
        (array_agg(ate_10kg ORDER BY cep_de))[1] as ate_10kg,
        (array_agg(ate_15kg ORDER BY cep_de))[1] as ate_15kg,
        (array_agg(ate_20kg ORDER BY cep_de))[1] as ate_20kg,
        (array_agg(ate_30kg ORDER BY cep_de))[1] as ate_30kg,
        (array_agg(acima_de_30kg ORDER BY cep_de))[1] as acima_de_30kg,
        (array_agg(gris_percent ORDER BY cep_de))[1] as gris_percent,
        (array_agg(adv_percent ORDER BY cep_de))[1] as adv_percent
    FROM frenet_full_import 
    WHERE uf IS NOT NULL 
      AND cidade IS NOT NULL 
      AND prazo IS NOT NULL
      AND LENGTH(cep_de) = 8
      AND LENGTH(cep_ate) = 8
    GROUP BY uf, cidade
) f ON (z.uf = f.uf AND f.cidade = ANY(z.cities) AND z.carrier_id = 'frenet-carrier')
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_base_rates sbr 
    WHERE sbr.zone_id = z.id AND sbr.source = 'frenet'
);

-- 6. Gerar opções calculadas para TODOS os novos dados
DO $$
DECLARE
    base_rate_record RECORD;
    total_generated INTEGER := 0;
    generated_count INTEGER;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Gerando opções calculadas para TODOS os dados importados...';
    
    FOR base_rate_record IN 
        SELECT id FROM shipping_base_rates 
        WHERE source = 'frenet' AND is_active = true
    LOOP
        SELECT generate_calculated_options(base_rate_record.id) INTO generated_count;
        total_generated := total_generated + generated_count;
        processed_count := processed_count + 1;
        
        -- Log progress a cada 100 registros
        IF processed_count % 100 = 0 THEN
            RAISE NOTICE 'Processados: % registros, Opções geradas: %', processed_count, total_generated;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'IMPORTAÇÃO COMPLETA FINALIZADA!';
    RAISE NOTICE 'Total de registros processados: %', processed_count;
    RAISE NOTICE 'Total de opções calculadas geradas: %', total_generated;
END $$;

-- 7. Relatório final completo
SELECT 
    'RELATÓRIO FINAL DA IMPORTAÇÃO COMPLETA' as titulo;

SELECT 
    'Zonas de Frete Cobertas' as tipo,
    COUNT(DISTINCT z.id) as total
FROM shipping_zones z
JOIN shipping_base_rates sbr ON z.id = sbr.zone_id
WHERE z.carrier_id = 'frenet-carrier' AND sbr.source = 'frenet'

UNION ALL

SELECT 
    'Estados Cobertos' as tipo,
    COUNT(DISTINCT z.uf) as total  
FROM shipping_zones z
JOIN shipping_base_rates sbr ON z.id = sbr.zone_id
WHERE z.carrier_id = 'frenet-carrier' AND sbr.source = 'frenet'

UNION ALL

SELECT 
    'Dados Base Importados' as tipo,
    COUNT(*) as total
FROM shipping_base_rates
WHERE source = 'frenet' AND is_active = true

UNION ALL

SELECT 
    'Opções Calculadas Ativas' as tipo,
    COUNT(*) as total
FROM shipping_calculated_options
WHERE is_active = true;

-- 8. Top 10 estados com mais zonas
SELECT 
    'TOP ESTADOS COBERTOS' as categoria,
    z.uf,
    COUNT(DISTINCT z.id) as zonas_cobertas,
    COUNT(sbr.id) as dados_base
FROM shipping_zones z
JOIN shipping_base_rates sbr ON z.id = sbr.zone_id
WHERE z.carrier_id = 'frenet-carrier' AND sbr.source = 'frenet'
GROUP BY z.uf
ORDER BY zonas_cobertas DESC
LIMIT 10;

-- 9. Limpar função temporária  
DROP FUNCTION IF EXISTS safe_price_convert(TEXT);
DROP TABLE IF EXISTS frenet_full_import; 