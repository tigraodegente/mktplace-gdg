-- ============================================================================
-- IMPORTAR DADOS DE AMOSTRA FRENET PARA TESTES
-- ============================================================================

-- Dados extraídos da planilha Frenet para principais regiões do Brasil

-- ============================================================================
-- 1. SÃO PAULO (CAPITAL) - ENTREGA IMEDIATA
-- ============================================================================
INSERT INTO shipping_zones (id, carrier_id, name, uf, cities, postal_code_ranges, zone_type, delivery_days_min, delivery_days_max)
VALUES (
    'sp-capital-zone',
    'frenet-carrier',
    'SP - São Paulo Capital',
    'SP',
    ARRAY['São Paulo'],
    '[{"from": "01000000", "to": "05999999"}, {"from": "08000000", "to": "08499999"}]'::jsonb,
    'capital',
    0,
    1
);

INSERT INTO shipping_rates (zone_id, weight_rules, additional_fees)
VALUES (
    'sp-capital-zone',
    '[
        {"from": 0, "to": 300, "price": 8.49},
        {"from": 301, "to": 500, "price": 9.12},
        {"from": 501, "to": 750, "price": 10.07},
        {"from": 751, "to": 1000, "price": 10.69},
        {"from": 1001, "to": 1500, "price": 11.32},
        {"from": 1501, "to": 2000, "price": 11.32},
        {"from": 2001, "to": 3000, "price": 11.95},
        {"from": 3001, "to": 5000, "price": 17.15},
        {"from": 5001, "to": 10000, "price": 19.28},
        {"from": 10001, "to": 30000, "price": 29.96},
        {"from": 30001, "to": 999999, "price": 51.30}
    ]'::jsonb,
    '{"gris_percent": 0.30, "gris_min": 0, "adv_percent": 0.30, "adv_min": 0}'::jsonb
);

-- ============================================================================
-- 2. RIO DE JANEIRO (CAPITAL) - 2 DIAS
-- ============================================================================
INSERT INTO shipping_zones (id, carrier_id, name, uf, cities, postal_code_ranges, zone_type, delivery_days_min, delivery_days_max)
VALUES (
    'rj-capital-zone',
    'frenet-carrier',
    'RJ - Rio de Janeiro Capital',
    'RJ',
    ARRAY['Rio de Janeiro'],
    '[{"from": "20000000", "to": "23799999"}]'::jsonb,
    'capital',
    2,
    3
);

INSERT INTO shipping_rates (zone_id, weight_rules, additional_fees)
VALUES (
    'rj-capital-zone',
    '[
        {"from": 0, "to": 300, "price": 11.41},
        {"from": 301, "to": 500, "price": 12.16},
        {"from": 501, "to": 750, "price": 13.26},
        {"from": 751, "to": 1000, "price": 14.00},
        {"from": 1001, "to": 1500, "price": 15.02},
        {"from": 1501, "to": 2000, "price": 15.02},
        {"from": 2001, "to": 3000, "price": 16.03},
        {"from": 3001, "to": 5000, "price": 19.98},
        {"from": 5001, "to": 10000, "price": 23.69},
        {"from": 10001, "to": 30000, "price": 37.52},
        {"from": 30001, "to": 999999, "price": 62.01}
    ]'::jsonb,
    '{"gris_percent": 0.30, "gris_min": 0, "adv_percent": 0.30, "adv_min": 0}'::jsonb
);

-- ============================================================================
-- 3. SALVADOR (CAPITAL) - 4 DIAS
-- ============================================================================
INSERT INTO shipping_zones (id, carrier_id, name, uf, cities, postal_code_ranges, zone_type, delivery_days_min, delivery_days_max)
VALUES (
    'ba-capital-zone',
    'frenet-carrier',
    'BA - Salvador Capital',
    'BA',
    ARRAY['Salvador'],
    '[{"from": "40000000", "to": "42599999"}]'::jsonb,
    'capital',
    4,
    5
);

INSERT INTO shipping_rates (zone_id, weight_rules, additional_fees)
VALUES (
    'ba-capital-zone',
    '[
        {"from": 0, "to": 300, "price": 14.03},
        {"from": 301, "to": 500, "price": 14.91},
        {"from": 501, "to": 750, "price": 16.25},
        {"from": 751, "to": 1000, "price": 17.14},
        {"from": 1001, "to": 1500, "price": 18.75},
        {"from": 1501, "to": 2000, "price": 18.75},
        {"from": 2001, "to": 3000, "price": 20.35},
        {"from": 3001, "to": 5000, "price": 23.28},
        {"from": 5001, "to": 10000, "price": 29.25},
        {"from": 10001, "to": 30000, "price": 48.02},
        {"from": 30001, "to": 999999, "price": 78.21}
    ]'::jsonb,
    '{"gris_percent": 0.30, "gris_min": 0, "adv_percent": 0.30, "adv_min": 0}'::jsonb
);

-- ============================================================================
-- 4. INTERIOR SP (OSASCO) - 1 DIA
-- ============================================================================
INSERT INTO shipping_zones (id, carrier_id, name, uf, cities, postal_code_ranges, zone_type, delivery_days_min, delivery_days_max)
VALUES (
    'sp-interior-zone',
    'frenet-carrier',
    'SP - Interior (Osasco)',
    'SP',
    ARRAY['Osasco'],
    '[{"from": "06000000", "to": "06999999"}]'::jsonb,
    'interior',
    1,
    2
);

INSERT INTO shipping_rates (zone_id, weight_rules, additional_fees)
VALUES (
    'sp-interior-zone',
    '[
        {"from": 0, "to": 300, "price": 10.71},
        {"from": 301, "to": 500, "price": 11.56},
        {"from": 501, "to": 750, "price": 12.83},
        {"from": 751, "to": 1000, "price": 13.66},
        {"from": 1001, "to": 1500, "price": 14.51},
        {"from": 1501, "to": 2000, "price": 14.51},
        {"from": 2001, "to": 3000, "price": 15.35},
        {"from": 3001, "to": 5000, "price": 18.69},
        {"from": 5001, "to": 10000, "price": 21.12},
        {"from": 10001, "to": 30000, "price": 33.30},
        {"from": 30001, "to": 999999, "price": 57.63}
    ]'::jsonb,
    '{"gris_percent": 0.30, "gris_min": 0, "adv_percent": 0.30, "adv_min": 0}'::jsonb
);

-- ============================================================================
-- 5. CONFIGURAÇÕES DE FRETE GRÁTIS PARA TESTE
-- ============================================================================

-- Configuração global: frete grátis acima de R$ 199
INSERT INTO seller_shipping_configs (
    id, seller_id, carrier_id, zone_id, 
    free_shipping_threshold, max_weight_kg, priority
) VALUES 
    ('frenet-global-sp-capital', NULL, 'frenet-carrier', 'sp-capital-zone', 199.00, 30.0, 1),
    ('frenet-global-rj-capital', NULL, 'frenet-carrier', 'rj-capital-zone', 199.00, 30.0, 1),
    ('frenet-global-ba-capital', NULL, 'frenet-carrier', 'ba-capital-zone', 199.00, 30.0, 1),
    ('frenet-global-sp-interior', NULL, 'frenet-carrier', 'sp-interior-zone', 199.00, 30.0, 1);

-- Exemplo: Seller específico com frete grátis mais baixo
INSERT INTO seller_shipping_configs (
    id, seller_id, carrier_id, zone_id,
    free_shipping_threshold, max_weight_kg, priority,
    free_shipping_products, free_shipping_categories
) VALUES 
    ('seller-premium-sp', 'seller-1', 'frenet-carrier', 'sp-capital-zone', 99.00, 30.0, 1, 
     ARRAY['iphone-15-pro', 'macbook-air'], ARRAY['eletronicos']);

-- ============================================================================
-- VERIFICAR DADOS INSERIDOS
-- ============================================================================

-- Contar registros criados
DO $$
DECLARE
    zones_count INTEGER;
    rates_count INTEGER;
    configs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO zones_count FROM shipping_zones WHERE carrier_id = 'frenet-carrier';
    SELECT COUNT(*) INTO rates_count FROM shipping_rates;
    SELECT COUNT(*) INTO configs_count FROM seller_shipping_configs WHERE carrier_id = 'frenet-carrier';
    
    RAISE NOTICE 'Dados Frenet importados com sucesso:';
    RAISE NOTICE '- Zonas de frete: %', zones_count;
    RAISE NOTICE '- Tabelas de preços: %', rates_count;
    RAISE NOTICE '- Configurações: %', configs_count;
END $$; 