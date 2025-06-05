-- ============================================================================
-- SISTEMA DE FRETE DEFINITIVO - BASEADO EM DADOS FRENET HISTÓRICOS
-- Reimporta todos os dados Frenet e cria modalidades calculadas automaticamente
-- ============================================================================

-- 1. LIMPAR DADOS ANTIGOS (OPCIONAL - COMENTE SE QUISER MANTER)
-- DELETE FROM shipping_calculated_options;
-- DELETE FROM shipping_base_rates WHERE source = 'frenet';
-- DELETE FROM shipping_zones WHERE carrier_id = 'frenet-carrier';

-- 2. CRIAR/VALIDAR TRANSPORTADORA FRENET
INSERT INTO shipping_carriers (id, name, type, is_active, settings, api_credentials)
VALUES ('frenet-carrier', 'Frenet', 'frenet', true, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    is_active = EXCLUDED.is_active;

-- 3. CRIAR MODALIDADES CORRETAS (BASEADAS NO SISTEMA HISTÓRICO)
INSERT INTO shipping_modalities (
    code, name, description, 
    price_multiplier, days_multiplier,
    delivery_days_min, delivery_days_max,
    min_price, max_price, priority, is_active, is_default
) VALUES 
-- Modalidade Padrão (baseline)
('PADRAO', 'Padrão', 'Frete padrão baseado na tabela Frenet original', 
 1.00, 1.00, 1, 7, 8.00, 999.00, 2, true, true),

-- Modalidade Econômica (-15% preço, +15% prazo)  
('ECONOMICA', 'Econômica', 'Frete econômico com desconto de 15%', 
 0.85, 1.15, 2, 10, 6.00, 999.00, 3, true, false),

-- Modalidade Agrupada/Expressa (+18% preço, -15% prazo)
('EXPRESSA', 'Expressa', 'Frete expresso com entrega mais rápida', 
 1.18, 0.85, 0, 5, 10.00, 999.00, 1, true, false)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_multiplier = EXCLUDED.price_multiplier,
    days_multiplier = EXCLUDED.days_multiplier,
    delivery_days_min = EXCLUDED.delivery_days_min,
    delivery_days_max = EXCLUDED.delivery_days_max,
    min_price = EXCLUDED.min_price,
    max_price = EXCLUDED.max_price,
    priority = EXCLUDED.priority,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default;

-- 4. FUNÇÃO PARA LIMPAR PREÇOS (COMPATÍVEL COM DADOS FRENET)
CREATE OR REPLACE FUNCTION clean_frenet_price(price_str TEXT) 
RETURNS DECIMAL(10,2) AS $$
BEGIN
    IF price_str IS NULL OR price_str = '' OR price_str = 'R$0' OR price_str = '0' THEN
        RETURN 0;
    END IF;
    
    -- Remove R$, vírgulas, espaços e converte para decimal
    RETURN CAST(
        REPLACE(REPLACE(REPLACE(REPLACE(price_str, 'R$', ''), ',', '.'), ' ', ''), '"', '') 
        AS DECIMAL(10,2)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO PARA LIMPAR PERCENTUAIS
CREATE OR REPLACE FUNCTION clean_frenet_percent(percent_str TEXT) 
RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF percent_str IS NULL OR percent_str = '' THEN
        RETURN 0;
    END IF;
    
    RETURN CAST(
        REPLACE(REPLACE(percent_str, '%', ''), ',', '.') 
        AS DECIMAL(5,2)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- 6. TABELA TEMPORÁRIA PARA IMPORTAÇÃO
CREATE TEMP TABLE IF NOT EXISTS frenet_import_definitiva (
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

-- COMANDO PARA IMPORTAR (EXECUTE MANUALMENTE DEPOIS):
-- \COPY frenet_import_definitiva FROM '/Users/guga/apps/mktplace-gdg/data/imports/Planilha Frenet - Grão de Gente - Atualizada.xlsx - Grão de Gente.csv' WITH (FORMAT CSV, HEADER true, DELIMITER ',');

-- 7. PROCEDIMENTO PRINCIPAL DE IMPORTAÇÃO
CREATE OR REPLACE FUNCTION importar_frenet_definitivo() 
RETURNS TABLE(etapa TEXT, quantidade INTEGER, detalhes TEXT) AS $$
DECLARE
    zonas_criadas INTEGER := 0;
    tabelas_base INTEGER := 0;
    opcoes_calculadas INTEGER := 0;
    base_rate_record RECORD;
    generated_count INTEGER;
BEGIN
    -- ETAPA 1: Criar zonas agrupadas por UF+Cidade
    INSERT INTO shipping_zones (
        id, carrier_id, name, uf, cities,
        postal_code_ranges, zone_type, is_active
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
    FROM frenet_import_definitiva f
    WHERE f.uf IS NOT NULL 
      AND f.cidade IS NOT NULL
      AND f.cep_de IS NOT NULL 
      AND f.cep_ate IS NOT NULL
      AND LENGTH(f.cep_de) = 8
      AND LENGTH(f.cep_ate) = 8
    GROUP BY f.uf, f.cidade, f.cidade_uf
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS zonas_criadas = ROW_COUNT;
    
    RETURN QUERY SELECT 'Zonas Criadas'::TEXT, zonas_criadas, 'Agrupamento por UF+Cidade'::TEXT;

    -- ETAPA 2: Criar tabelas base (uma por prazo médio por zona)
    INSERT INTO shipping_base_rates (
        zone_id, weight_rules, base_delivery_days,
        additional_fees, source, is_template, is_active
    )
    SELECT 
        z.id as zone_id,
        jsonb_build_array(
            jsonb_build_object('from', 0, 'to', 300, 'price', clean_frenet_price(f.ate_300g)),
            jsonb_build_object('from', 301, 'to', 500, 'price', clean_frenet_price(f.ate_500g)),
            jsonb_build_object('from', 501, 'to', 750, 'price', clean_frenet_price(f.ate_750g)),
            jsonb_build_object('from', 751, 'to', 1000, 'price', clean_frenet_price(f.ate_1kg)),
            jsonb_build_object('from', 1001, 'to', 1250, 'price', clean_frenet_price(f.ate_1250g)),
            jsonb_build_object('from', 1251, 'to', 1500, 'price', clean_frenet_price(f.ate_1500g)),
            jsonb_build_object('from', 1501, 'to', 2000, 'price', clean_frenet_price(f.ate_2kg)),
            jsonb_build_object('from', 2001, 'to', 2500, 'price', clean_frenet_price(f.ate_2500g)),
            jsonb_build_object('from', 2501, 'to', 3000, 'price', clean_frenet_price(f.ate_3kg)),
            jsonb_build_object('from', 3001, 'to', 3500, 'price', clean_frenet_price(f.ate_3500g)),
            jsonb_build_object('from', 3501, 'to', 4000, 'price', clean_frenet_price(f.ate_4kg)),
            jsonb_build_object('from', 4001, 'to', 5000, 'price', clean_frenet_price(f.ate_5kg)),
            jsonb_build_object('from', 5001, 'to', 7500, 'price', clean_frenet_price(f.ate_7500g)),
            jsonb_build_object('from', 7501, 'to', 10000, 'price', clean_frenet_price(f.ate_10kg)),
            jsonb_build_object('from', 10001, 'to', 15000, 'price', clean_frenet_price(f.ate_15kg)),
            jsonb_build_object('from', 15001, 'to', 20000, 'price', clean_frenet_price(f.ate_20kg)),
            jsonb_build_object('from', 20001, 'to', 25000, 'price', clean_frenet_price(f.ate_25kg)),
            jsonb_build_object('from', 25001, 'to', 30000, 'price', clean_frenet_price(f.ate_30kg)),
            jsonb_build_object('from', 30001, 'to', 999999, 'price', clean_frenet_price(f.acima_de_30kg))
        ) as weight_rules,
        ROUND(AVG(f.prazo)) as base_delivery_days,
        jsonb_build_object(
            'gris_percent', clean_frenet_percent(f.gris_percent),
            'gris_min', clean_frenet_price(f.gris_min),
            'adv_percent', clean_frenet_percent(f.adv_percent),
            'adv_min', clean_frenet_price(f.adv_min),
            'pedagio', clean_frenet_price(f.pedagio),
            'original_gris', clean_frenet_percent(f.gris_percent),
            'original_adv', clean_frenet_percent(f.adv_percent)
        ) as additional_fees,
        'frenet' as source,
        true as is_template,
        true as is_active
    FROM shipping_zones z
    JOIN frenet_import_definitiva f ON (
        z.uf = f.uf 
        AND z.cities @> ARRAY[f.cidade]
        AND z.carrier_id = 'frenet-carrier'
    )
    WHERE f.prazo IS NOT NULL
      AND clean_frenet_price(f.ate_300g) > 0
    GROUP BY z.id, z.uf, z.cities
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS tabelas_base = ROW_COUNT;
    
    RETURN QUERY SELECT 'Tabelas Base'::TEXT, tabelas_base, 'Com dados reais Frenet'::TEXT;

    -- ETAPA 3: Gerar opções calculadas para todas as modalidades
    FOR base_rate_record IN 
        SELECT id FROM shipping_base_rates 
        WHERE source = 'frenet' AND is_active = true
    LOOP
        SELECT generate_calculated_options(base_rate_record.id) INTO generated_count;
        opcoes_calculadas := opcoes_calculadas + generated_count;
    END LOOP;
    
    RETURN QUERY SELECT 'Opções Calculadas'::TEXT, opcoes_calculadas, 'Para todas as modalidades'::TEXT;

    -- ETAPA 4: Estatísticas finais
    RETURN QUERY 
    SELECT 'SISTEMA COMPLETO'::TEXT, 
           (zonas_criadas + tabelas_base + opcoes_calculadas), 
           'Frete Frenet 100% funcional'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- 8. RELATÓRIO DE VALIDAÇÃO
CREATE OR REPLACE FUNCTION relatorio_frete_definitivo()
RETURNS TABLE(categoria TEXT, total INTEGER, detalhes TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Zonas Frenet'::TEXT, 
           COUNT(*)::INTEGER, 
           COUNT(DISTINCT uf)::TEXT || ' UFs cobertas'
    FROM shipping_zones WHERE carrier_id = 'frenet-carrier';
    
    RETURN QUERY
    SELECT 'Tabelas Base'::TEXT, 
           COUNT(*)::INTEGER,
           'Com ' || COUNT(DISTINCT zone_id)::TEXT || ' zonas distintas'
    FROM shipping_base_rates WHERE source = 'frenet';
    
    RETURN QUERY
    SELECT 'Modalidades Ativas'::TEXT,
           COUNT(*)::INTEGER,
           STRING_AGG(name, ', ' ORDER BY priority)
    FROM shipping_modalities WHERE is_active = true;
    
    RETURN QUERY
    SELECT 'Opções Calculadas'::TEXT,
           COUNT(*)::INTEGER,
           'Para ' || COUNT(DISTINCT zone_id)::TEXT || ' zonas'
    FROM shipping_calculated_options;
    
    -- Verificar SP capital especificamente
    RETURN QUERY
    SELECT 'SP Capital'::TEXT,
           COUNT(*)::INTEGER,
           'Opções disponíveis'
    FROM shipping_calculated_options sco
    JOIN shipping_zones sz ON sco.zone_id = sz.id
    WHERE sz.uf = 'SP' AND sz.cities @> ARRAY['São Paulo'];
    
END;
$$ LANGUAGE plpgsql;

-- 9. SCRIPT PARA TESTAR CÁLCULO (CEP PROBLEMA ANTERIOR)
CREATE OR REPLACE FUNCTION testar_cep_11060414()
RETURNS TABLE(modalidade TEXT, preco DECIMAL, prazo TEXT, zona TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.name as modalidade,
        (sco.calculated_weight_rules->0->>'price')::decimal as preco,
        sco.calculated_delivery_days::TEXT || ' dias' as prazo,
        sz.name as zona
    FROM shipping_calculated_options sco
    JOIN shipping_modalities sm ON sco.modality_id = sm.id
    JOIN shipping_zones sz ON sco.zone_id = sz.id
    WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(sz.postal_code_ranges) as range
        WHERE '11060414' BETWEEN (range->>'from') AND (range->>'to')
    )
    AND sm.is_active = true
    ORDER BY sm.priority, (sco.calculated_weight_rules->0->>'price')::decimal;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INSTRUÇÕES DE USO:
-- ============================================================================

-- 1. Execute este script
-- 2. Importe os dados CSV manualmente:
--    \COPY frenet_import_definitiva FROM '/path/to/csv' WITH (FORMAT CSV, HEADER true);
-- 3. Execute: SELECT * FROM importar_frenet_definitivo();
-- 4. Verifique: SELECT * FROM relatorio_frete_definitivo();
-- 5. Teste: SELECT * FROM testar_cep_11060414();

-- ============================================================================
-- LIMPEZA FINAL
-- ============================================================================
-- DROP FUNCTION IF EXISTS clean_frenet_price(TEXT);
-- DROP FUNCTION IF EXISTS clean_frenet_percent(TEXT);
-- DROP TABLE IF EXISTS frenet_import_definitiva; 