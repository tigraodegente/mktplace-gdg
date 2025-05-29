-- Corrigir função de geração de opções calculadas
CREATE OR REPLACE FUNCTION generate_calculated_options(
    p_base_rate_id TEXT
) RETURNS INTEGER AS $$
DECLARE
    base_rate RECORD;
    modality RECORD;
    new_weight_rules JSONB;
    new_delivery_days INTEGER;
    rule JSONB;
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
            SELECT value FROM jsonb_array_elements(base_rate.weight_rules)
        LOOP
            new_weight_rules := new_weight_rules || jsonb_build_array(
                jsonb_build_object(
                    'from', (rule->>'from')::integer,
                    'to', (rule->>'to')::integer,
                    'price', ROUND(((rule->>'price')::decimal * modality.price_multiplier)::numeric, 2)
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

-- Gerar opções calculadas para todos os dados base
DO $$
DECLARE
    base_rate_record RECORD;
    total_generated INTEGER := 0;
    generated_count INTEGER;
BEGIN
    RAISE NOTICE 'Gerando opções calculadas...';
    
    FOR base_rate_record IN 
        SELECT id FROM shipping_base_rates WHERE source = 'frenet' AND is_active = true
    LOOP
        SELECT generate_calculated_options(base_rate_record.id) INTO generated_count;
        total_generated := total_generated + generated_count;
    END LOOP;
    
    RAISE NOTICE 'Geração concluída! Total de opções geradas: %', total_generated;
END $$;

-- Relatório final
SELECT 
    'Zonas com dados' as tipo,
    COUNT(*) as total
FROM shipping_zones z
JOIN shipping_base_rates sbr ON z.id = sbr.zone_id
WHERE z.carrier_id = 'frenet-carrier'

UNION ALL

SELECT 
    'Opções calculadas' as tipo,
    COUNT(*) as total
FROM shipping_calculated_options

UNION ALL

SELECT 
    'Modalidades ativas' as tipo,
    COUNT(*) as total
FROM shipping_modalities
WHERE is_active = true; 