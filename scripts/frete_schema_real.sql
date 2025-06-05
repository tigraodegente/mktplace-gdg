-- ============================================================================
-- IMPLEMENTAÇÃO FRETE PARA SCHEMA REAL DO BANCO
-- Adaptado para as estruturas existentes
-- ============================================================================

-- 1. Verificar se carrier existe
INSERT INTO shipping_carriers (name, description, is_active)
VALUES ('Frenet', 'Transportadora Frenet integrada', true)
ON CONFLICT DO NOTHING;

-- 2. Função para popular dados Frenet no schema real
CREATE OR REPLACE FUNCTION popular_frenet_schema_real() 
RETURNS TABLE(etapa TEXT, quantidade INTEGER, detalhes TEXT) AS $$
DECLARE
    carrier_uuid UUID;
    zonas_criadas INTEGER := 0;
    rates_criadas INTEGER := 0;
    zone_record RECORD;
BEGIN
    -- Buscar carrier ID
    SELECT id INTO carrier_uuid FROM shipping_carriers WHERE name = 'Frenet' LIMIT 1;
    
    -- ETAPA 1: Criar zonas usando campos corretos
    INSERT INTO shipping_zones (name, description, states, region, is_active)
    SELECT DISTINCT
        f.uf || ' - ' || f.cidade as name,
        'Zona Frenet para ' || f.uf || ' - ' || f.cidade as description,
        ARRAY[f.uf] as states,
        CASE 
            WHEN f.cidade_uf ILIKE '%capital%' THEN 'capital'
            WHEN f.cidade_uf ILIKE '%interior%' THEN 'interior'
            ELSE 'mixed'
        END as region,
        true as is_active
    FROM frenet_import_definitiva f
    WHERE f.uf IS NOT NULL 
      AND f.cidade IS NOT NULL
      AND f.cep_de IS NOT NULL 
      AND f.cep_ate IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS zonas_criadas = ROW_COUNT;
    RETURN QUERY SELECT 'Zonas Criadas'::TEXT, zonas_criadas, 'Por UF+Cidade'::TEXT;

    -- ETAPA 2: Criar rates básicas para cada zona
    FOR zone_record IN 
        SELECT z.id, z.name 
        FROM shipping_zones z 
        WHERE z.name LIKE '%-%' AND z.is_active = true
    LOOP
        -- Rate Econômica (até 1kg)
        INSERT INTO shipping_base_rates (
            zone_id, carrier_id, min_weight, max_weight, 
            base_price, min_delivery_days, max_delivery_days, 
            priority, is_active
        ) VALUES (
            zone_record.id, carrier_uuid, 0, 1,
            COALESCE((
                SELECT clean_frenet_price(f.ate_1kg) FROM frenet_import_definitiva f 
                WHERE f.uf = SPLIT_PART(zone_record.name, ' - ', 1) 
                  AND f.cidade = SPLIT_PART(zone_record.name, ' - ', 2)
                LIMIT 1
            ) * 0.85, 12.90), -- -15% econômica
            3, 7, 3, true
        );
        
        -- Rate Padrão (até 1kg)
        INSERT INTO shipping_base_rates (
            zone_id, carrier_id, min_weight, max_weight, 
            base_price, min_delivery_days, max_delivery_days, 
            priority, is_active
        ) VALUES (
            zone_record.id, carrier_uuid, 0, 1,
            COALESCE((
                SELECT clean_frenet_price(f.ate_1kg) FROM frenet_import_definitiva f 
                WHERE f.uf = SPLIT_PART(zone_record.name, ' - ', 1) 
                  AND f.cidade = SPLIT_PART(zone_record.name, ' - ', 2)
                LIMIT 1
            ), 15.90),
            1, 5, 2, true
        );
        
        -- Rate Expressa (até 1kg)
        INSERT INTO shipping_base_rates (
            zone_id, carrier_id, min_weight, max_weight, 
            base_price, min_delivery_days, max_delivery_days, 
            priority, is_active
        ) VALUES (
            zone_record.id, carrier_uuid, 0, 1,
            COALESCE((
                SELECT clean_frenet_price(f.ate_1kg) FROM frenet_import_definitiva f 
                WHERE f.uf = SPLIT_PART(zone_record.name, ' - ', 1) 
                  AND f.cidade = SPLIT_PART(zone_record.name, ' - ', 2)
                LIMIT 1
            ) * 1.18, 18.90), -- +18% expressa
            0, 2, 1, true
        );
        
        rates_criadas := rates_criadas + 3;
    END LOOP;
    
    RETURN QUERY SELECT 'Rates Criadas'::TEXT, rates_criadas, '3 modalidades por zona'::TEXT;
    
    RETURN QUERY SELECT 'SISTEMA FUNCIONAL'::TEXT, 
                        (zonas_criadas + rates_criadas), 
                        'Frenet com schema real'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- 3. Função de relatório adaptada
CREATE OR REPLACE FUNCTION relatorio_frenet_real()
RETURNS TABLE(categoria TEXT, total INTEGER, detalhes TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Zonas Frenet'::TEXT, 
           COUNT(*)::INTEGER, 
           COUNT(DISTINCT region)::TEXT || ' regiões'
    FROM shipping_zones WHERE name LIKE '%-%';
    
    RETURN QUERY
    SELECT 'Rates Frenet'::TEXT, 
           COUNT(*)::INTEGER,
           'Para ' || COUNT(DISTINCT zone_id)::TEXT || ' zonas'
    FROM shipping_base_rates sbr
    JOIN shipping_carriers sc ON sbr.carrier_id = sc.id
    WHERE sc.name = 'Frenet';
    
    RETURN QUERY
    SELECT 'Modalidades Ativas'::TEXT,
           COUNT(*)::INTEGER,
           STRING_AGG(name, ', ')
    FROM shipping_modalities WHERE is_active = true;
    
END;
$$ LANGUAGE plpgsql;

-- 4. Teste para CEP específico
CREATE OR REPLACE FUNCTION testar_frete_cep_11060414()
RETURNS TABLE(zona TEXT, preco_economico DECIMAL, preco_padrao DECIMAL, preco_expresso DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sz.name as zona,
        MIN(CASE WHEN sbr.priority = 3 THEN sbr.base_price END) as preco_economico,
        MIN(CASE WHEN sbr.priority = 2 THEN sbr.base_price END) as preco_padrao,
        MIN(CASE WHEN sbr.priority = 1 THEN sbr.base_price END) as preco_expresso
    FROM shipping_zones sz
    JOIN shipping_base_rates sbr ON sz.id = sbr.zone_id
    JOIN shipping_carriers sc ON sbr.carrier_id = sc.id
    WHERE sc.name = 'Frenet'
      AND sz.states @> ARRAY['SP']  -- SP para CEP 11060-414
      AND sz.is_active = true
    GROUP BY sz.id, sz.name
    LIMIT 5;
END;
$$ LANGUAGE plpgsql; 