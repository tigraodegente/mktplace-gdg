-- Função corrigida para importação simplificada
CREATE OR REPLACE FUNCTION importar_frenet_simples() 
RETURNS TABLE(etapa TEXT, quantidade INTEGER, detalhes TEXT) AS $$
DECLARE
    zonas_criadas INTEGER := 0;
    tabelas_base INTEGER := 0;
BEGIN
    -- ETAPA 1: Criar zonas simples
    INSERT INTO shipping_zones (name, description, states, region, is_active)
    SELECT DISTINCT
        f.uf || ' - ' || f.cidade,
        'Zona Frenet: ' || f.uf || ' - ' || f.cidade,
        ARRAY[f.uf],
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
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS zonas_criadas = ROW_COUNT;
    
    RETURN QUERY SELECT 'Zonas Criadas'::TEXT, zonas_criadas, 'Simples por UF+Cidade'::TEXT;

    -- ETAPA 2: Criar tabelas base básicas com dados reais
    INSERT INTO shipping_base_rates (zone_id, weight_rules, base_delivery_days, source, is_active)
    SELECT 
        z.id as zone_id,
        jsonb_build_array(
            jsonb_build_object('from', 0, 'to', 300, 'price', 
                COALESCE(clean_frenet_price((
                    SELECT f.ate_300g FROM frenet_import_definitiva f 
                    WHERE f.uf = SPLIT_PART(z.name, ' - ', 1) 
                      AND f.cidade = SPLIT_PART(z.name, ' - ', 2)
                    LIMIT 1
                )), 15.90)
            ),
            jsonb_build_object('from', 301, 'to', 1000, 'price', 
                COALESCE(clean_frenet_price((
                    SELECT f.ate_1kg FROM frenet_import_definitiva f 
                    WHERE f.uf = SPLIT_PART(z.name, ' - ', 1) 
                      AND f.cidade = SPLIT_PART(z.name, ' - ', 2)
                    LIMIT 1
                )), 25.90)
            ),
            jsonb_build_object('from', 1001, 'to', 5000, 'price', 
                COALESCE(clean_frenet_price((
                    SELECT f.ate_5kg FROM frenet_import_definitiva f 
                    WHERE f.uf = SPLIT_PART(z.name, ' - ', 1) 
                      AND f.cidade = SPLIT_PART(z.name, ' - ', 2)
                    LIMIT 1
                )), 35.90)
            )
        ) as weight_rules,
        COALESCE((
            SELECT AVG(f.prazo)::INTEGER FROM frenet_import_definitiva f 
            WHERE f.uf = SPLIT_PART(z.name, ' - ', 1) 
              AND f.cidade = SPLIT_PART(z.name, ' - ', 2)
        ), 3) as base_delivery_days,
        'frenet' as source,
        true as is_active
    FROM shipping_zones z
    WHERE z.name LIKE '%-%' 
      AND z.is_active = true
      AND NOT EXISTS (SELECT 1 FROM shipping_base_rates WHERE zone_id = z.id AND source = 'frenet');
    
    GET DIAGNOSTICS tabelas_base = ROW_COUNT;
    
    RETURN QUERY SELECT 'Tabelas Base'::TEXT, tabelas_base, 'Com dados reais Frenet'::TEXT;

    -- Estatísticas finais
    RETURN QUERY 
    SELECT 'SISTEMA BÁSICO'::TEXT, 
           (zonas_criadas + tabelas_base), 
           'Frenet básico funcional'::TEXT;

END;
$$ LANGUAGE plpgsql; 