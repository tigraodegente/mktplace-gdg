-- Inserir dados base de amostra para testar o sistema
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
        jsonb_build_object('from', 0, 'to', 300, 'price', 8.49),
        jsonb_build_object('from', 301, 'to', 500, 'price', 9.49),
        jsonb_build_object('from', 501, 'to', 750, 'price', 10.49),
        jsonb_build_object('from', 751, 'to', 1000, 'price', 11.49),
        jsonb_build_object('from', 1001, 'to', 1500, 'price', 12.49),
        jsonb_build_object('from', 1501, 'to', 2000, 'price', 13.49),
        jsonb_build_object('from', 2001, 'to', 3000, 'price', 14.49),
        jsonb_build_object('from', 3001, 'to', 5000, 'price', 15.49),
        jsonb_build_object('from', 5001, 'to', 10000, 'price', 16.49),
        jsonb_build_object('from', 10001, 'to', 30000, 'price', 17.49)
    ) as weight_rules,
    CASE 
        WHEN z.uf = 'SP' THEN 1
        WHEN z.uf = 'RJ' THEN 2
        WHEN z.uf = 'MG' THEN 3
        WHEN z.uf = 'BA' THEN 5
        ELSE 7
    END as base_delivery_days,
    jsonb_build_object(
        'gris_percent', 0.30,
        'adv_percent', 0.30
    ) as additional_fees,
    'frenet' as source,
    true as is_template
FROM shipping_zones z
WHERE z.carrier_id = 'frenet-carrier'
  AND z.uf IN ('SP', 'RJ', 'MG', 'BA')
  AND NOT EXISTS (
      SELECT 1 FROM shipping_base_rates sbr WHERE sbr.zone_id = z.id
  )
LIMIT 100;

-- Gerar opções calculadas para os dados inseridos
DO $$
DECLARE
    base_rate_record RECORD;
    total_generated INTEGER := 0;
    generated_count INTEGER;
BEGIN
    RAISE NOTICE 'Gerando opções calculadas para dados de amostra...';
    
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
FROM shipping_calculated_options; 