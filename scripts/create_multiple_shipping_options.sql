-- ============================================================================
-- CRIAR MÚLTIPLAS OPÇÕES DE ENTREGA PARA SP CAPITAL
-- ============================================================================

-- 1. OPÇÃO EXPRESSA (MAIS CARA, MAIS RÁPIDA)
INSERT INTO shipping_zones (id, carrier_id, name, uf, cities, postal_code_ranges, zone_type, delivery_days_min, delivery_days_max)
VALUES (
    'sp-capital-expressa',
    'frenet-carrier',
    'SP - São Paulo Capital (Expressa)',
    'SP',
    ARRAY['São Paulo'],
    '[{"from": "01000000", "to": "05999999"}, {"from": "08000000", "to": "08499999"}]'::jsonb,
    'capital',
    0,  -- Entrega no mesmo dia
    0
);

INSERT INTO shipping_rates (zone_id, weight_rules, additional_fees)
VALUES (
    'sp-capital-expressa',
    '[
        {"from": 0, "to": 300, "price": 12.99},
        {"from": 301, "to": 500, "price": 14.50},
        {"from": 501, "to": 750, "price": 16.00},
        {"from": 751, "to": 1000, "price": 17.50},
        {"from": 1001, "to": 1500, "price": 19.00},
        {"from": 1501, "to": 2000, "price": 19.00},
        {"from": 2001, "to": 3000, "price": 20.50},
        {"from": 3001, "to": 5000, "price": 25.00},
        {"from": 5001, "to": 10000, "price": 29.00},
        {"from": 10001, "to": 30000, "price": 45.00},
        {"from": 30001, "to": 999999, "price": 70.00}
    ]'::jsonb,
    '{"gris_percent": 0.30, "gris_min": 0, "adv_percent": 0.30, "adv_min": 0}'::jsonb
);

-- 2. OPÇÃO PADRÃO (PREÇO NORMAL DA FRENET)
-- (Já existe como 'sp-capital-zone')

-- 3. OPÇÃO ECONÔMICA (MAIS BARATA, MAIS LENTA)
INSERT INTO shipping_zones (id, carrier_id, name, uf, cities, postal_code_ranges, zone_type, delivery_days_min, delivery_days_max)
VALUES (
    'sp-capital-economica',
    'frenet-carrier',
    'SP - São Paulo Capital (Econômica)',
    'SP',
    ARRAY['São Paulo'],
    '[{"from": "01000000", "to": "05999999"}, {"from": "08000000", "to": "08499999"}]'::jsonb,
    'capital',
    2,  -- 2-3 dias
    3
);

INSERT INTO shipping_rates (zone_id, weight_rules, additional_fees)
VALUES (
    'sp-capital-economica',
    '[
        {"from": 0, "to": 300, "price": 6.99},
        {"from": 301, "to": 500, "price": 7.50},
        {"from": 501, "to": 750, "price": 8.20},
        {"from": 751, "to": 1000, "price": 8.80},
        {"from": 1001, "to": 1500, "price": 9.30},
        {"from": 1501, "to": 2000, "price": 9.30},
        {"from": 2001, "to": 3000, "price": 9.80},
        {"from": 3001, "to": 5000, "price": 14.50},
        {"from": 5001, "to": 10000, "price": 16.80},
        {"from": 10001, "to": 30000, "price": 26.50},
        {"from": 30001, "to": 999999, "price": 45.00}
    ]'::jsonb,
    '{"gris_percent": 0.30, "gris_min": 0, "adv_percent": 0.30, "adv_min": 0}'::jsonb
);

-- 4. CONFIGURAR PARA TODOS OS SELLERS
INSERT INTO seller_shipping_configs (
    id, seller_id, carrier_id, zone_id, 
    free_shipping_threshold, max_weight_kg, priority
) VALUES 
    ('frenet-expressa-sp', NULL, 'frenet-carrier', 'sp-capital-expressa', 299.00, 30.0, 1),
    ('frenet-economica-sp', NULL, 'frenet-carrier', 'sp-capital-economica', 150.00, 30.0, 3);

-- ============================================================================
-- VERIFICAR RESULTADO
-- ============================================================================

-- Agora SP Capital terá 3 opções:
SELECT 
    sz.name,
    sz.delivery_days_min || '-' || sz.delivery_days_max as prazo,
    (sr.weight_rules->0->>'price')::decimal as preco_300g,
    CASE 
        WHEN sz.delivery_days_min = 0 THEN 'Entrega Hoje'
        WHEN sz.delivery_days_min = 1 THEN 'Entrega Amanhã'
        WHEN sz.delivery_days_min <= 2 THEN 'Expresso'
        WHEN sz.delivery_days_min <= 5 THEN 'Padrão'
        ELSE 'Econômico'
    END as tipo_gerado
FROM shipping_zones sz
JOIN shipping_rates sr ON sz.id = sr.zone_id
WHERE sz.uf = 'SP' 
  AND sz.cities @> ARRAY['São Paulo']
  AND sz.carrier_id = 'frenet-carrier'
ORDER BY sz.delivery_days_min, (sr.weight_rules->0->>'price')::decimal; 