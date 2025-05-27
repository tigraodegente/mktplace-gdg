-- =====================================================
-- MIGRAÇÃO DE DADOS EXISTENTES PARA NOVAS TABELAS
-- =====================================================
-- Este script extrai dados das tabelas existentes e
-- popula as novas tabelas com informações relevantes
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRIAR CUPONS BASEADOS EM DADOS EXISTENTES
-- =====================================================

-- Cupom de boas-vindas geral
INSERT INTO coupons (code, description, discount_type, discount_value, minimum_value, usage_limit, valid_until)
VALUES 
    ('BEMVINDO10', 'Cupom de boas-vindas - 10% de desconto', 'percentage', 10, 50, 1000, NOW() + INTERVAL '90 days'),
    ('PRIMEIRACOMPRA', 'Desconto na primeira compra', 'fixed', 20, 100, 500, NOW() + INTERVAL '60 days');

-- Cupons por faixa de preço baseados na análise
INSERT INTO coupons (code, description, discount_type, discount_value, minimum_value, maximum_discount, usage_limit, valid_until)
VALUES 
    ('ECONOMIA15', 'Para produtos até R$ 100', 'percentage', 15, 50, 15, 300, NOW() + INTERVAL '30 days'),
    ('DESCONTO50', 'R$ 50 OFF em compras acima de R$ 300', 'fixed', 50, 300, NULL, 200, NOW() + INTERVAL '45 days'),
    ('PREMIUM20', 'Produtos premium com 20% OFF', 'percentage', 20, 500, 200, 100, NOW() + INTERVAL '30 days');

-- Cupons para categorias específicas baseados em tags populares
INSERT INTO coupons (code, description, discount_type, discount_value, minimum_value, category_id, usage_limit, valid_until)
SELECT 
    'BEBE' || EXTRACT(MONTH FROM NOW())::TEXT,
    'Mês do Bebê - 15% em produtos infantis',
    'percentage',
    15,
    100,
    c.id,
    500,
    NOW() + INTERVAL '30 days'
FROM categories c
WHERE c.slug = 'produtos'
LIMIT 1;

-- Cupons para os top 5 vendedores
INSERT INTO coupons (code, description, discount_type, discount_value, seller_id, minimum_value, usage_limit, valid_until)
SELECT 
    UPPER(LEFT(REGEXP_REPLACE(s.store_name, '[^a-zA-Z0-9]', '', 'g'), 8)) || '10',
    s.store_name || ' - 10% de desconto',
    'percentage',
    10,
    s.id,
    50,
    200,
    NOW() + INTERVAL '60 days'
FROM (
    SELECT DISTINCT s.id, s.store_name
    FROM sellers s
    JOIN products p ON p.seller_id = s.id
    GROUP BY s.id, s.store_name
    ORDER BY SUM(p.sales_count) DESC
    LIMIT 5
) s;

-- Cupom de frete grátis
INSERT INTO coupons (code, description, discount_type, discount_value, minimum_value, usage_limit, valid_until)
VALUES ('FRETEGRATIS', 'Frete grátis em compras acima de R$ 200', 'free_shipping', 1, 200, 300, NOW() + INTERVAL '30 days');

-- =====================================================
-- 2. POPULAR WISHLIST COM PRODUTOS EM DESTAQUE
-- =====================================================

-- Adicionar produtos em destaque à wishlist de usuários ativos
INSERT INTO wishlists (user_id, product_id, added_at)
SELECT DISTINCT
    u.id,
    p.id,
    NOW() - (RANDOM() * INTERVAL '30 days')
FROM users u
CROSS JOIN (
    SELECT id 
    FROM products 
    WHERE featuring->>'home_page' = 'true' 
    AND view_count > 50
    ORDER BY view_count DESC
    LIMIT 20
) p
WHERE u.type = 'customer'
AND RANDOM() < 0.3 -- 30% de chance de ter o produto na wishlist
ON CONFLICT (user_id, product_id, variant_id) DO NOTHING;

-- Adicionar produtos com desconto à wishlist
INSERT INTO wishlists (user_id, product_id, notified_price_drop)
SELECT DISTINCT
    u.id,
    p.id,
    true
FROM users u
CROSS JOIN (
    SELECT id 
    FROM products 
    WHERE original_price > price * 1.1 -- Produtos com mais de 10% de desconto
    ORDER BY (original_price - price) DESC
    LIMIT 30
) p
WHERE u.type = 'customer'
AND RANDOM() < 0.2 -- 20% de chance
ON CONFLICT (user_id, product_id, variant_id) DO NOTHING;

-- =====================================================
-- 3. CRIAR MÉTODOS DE ENVIO
-- =====================================================

-- Correios
INSERT INTO shipping_methods (name, code, carrier, description, estimated_days_min, estimated_days_max, base_cost, cost_per_kg, max_weight, priority)
VALUES 
    ('PAC - Encomenda Econômica', 'pac', 'correios', 'Entrega econômica pelos Correios', 5, 15, 15.00, 2.50, 30, 3),
    ('SEDEX - Entrega Expressa', 'sedex', 'correios', 'Entrega rápida pelos Correios', 1, 5, 25.00, 4.00, 30, 1),
    ('SEDEX 10', 'sedex10', 'correios', 'Entrega até as 10h do próximo dia útil', 1, 1, 45.00, 6.00, 10, 0);

-- Transportadora
INSERT INTO shipping_methods (name, code, carrier, description, estimated_days_min, estimated_days_max, base_cost, cost_per_kg, max_weight, priority)
VALUES 
    ('Transportadora Padrão', 'transportadora', 'transportadora', 'Entrega por transportadora parceira', 3, 10, 20.00, 1.50, 100, 2),
    ('Transportadora Expressa', 'transportadora_expressa', 'transportadora', 'Entrega expressa por transportadora', 1, 3, 35.00, 2.50, 50, 1);

-- Motoboy (para regiões metropolitanas)
INSERT INTO shipping_methods (name, code, carrier, description, estimated_days_min, estimated_days_max, base_cost, cost_per_km, max_weight, regions, priority)
VALUES 
    ('Motoboy - Entrega no Dia', 'motoboy', 'motoboy', 'Entrega no mesmo dia para região metropolitana', 0, 0, 15.00, 2.00, 5, 
    '{"estados": ["SP", "RJ"], "max_distance_km": 50}'::jsonb, 0);

-- Retirada na loja
INSERT INTO shipping_methods (name, code, carrier, description, estimated_days_min, estimated_days_max, base_cost, priority)
VALUES 
    ('Retirar na Loja', 'retirada', 'retirada', 'Retire seu pedido em uma de nossas lojas', 0, 0, 0.00, 4);

-- Zonas de envio especiais
INSERT INTO shipping_zones (name, shipping_method_id, state, additional_cost, additional_days)
SELECT 
    'Norte e Nordeste - ' || sm.name,
    sm.id,
    unnest(ARRAY['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']),
    10.00,
    3
FROM shipping_methods sm
WHERE sm.carrier = 'correios';

-- =====================================================
-- 4. CRIAR MÉTODOS DE PAGAMENTO
-- =====================================================

-- Cartão de Crédito
INSERT INTO payment_methods (name, code, type, gateway, icon_url, installments_config, fees, priority)
VALUES 
    ('Cartão de Crédito', 'credit_card', 'credit_card', 'mercadopago', 
    '/icons/credit-card.svg',
    '{
        "max_installments": 12,
        "min_installment_value": 50,
        "interest_free_installments": 3,
        "interest_rate": 2.99
    }'::jsonb,
    '{
        "percentage": 4.99,
        "fixed": 0.30,
        "installment_fee": 2.99
    }'::jsonb,
    1);

-- Cartão de Débito
INSERT INTO payment_methods (name, code, type, gateway, icon_url, fees, priority)
VALUES 
    ('Cartão de Débito', 'debit_card', 'debit_card', 'mercadopago',
    '/icons/debit-card.svg',
    '{
        "percentage": 2.99,
        "fixed": 0.30
    }'::jsonb,
    2);

-- PIX
INSERT INTO payment_methods (name, code, type, gateway, icon_url, fees, priority)
VALUES 
    ('PIX - Pagamento Instantâneo', 'pix', 'pix', 'mercadopago',
    '/icons/pix.svg',
    '{
        "percentage": 0.99,
        "fixed": 0
    }'::jsonb,
    0);

-- Boleto
INSERT INTO payment_methods (name, code, type, gateway, icon_url, min_amount, fees, priority)
VALUES 
    ('Boleto Bancário', 'boleto', 'boleto', 'mercadopago',
    '/icons/boleto.svg',
    30.00,
    '{
        "percentage": 0,
        "fixed": 3.49
    }'::jsonb,
    3);

-- Carteira Digital
INSERT INTO payment_methods (name, code, type, gateway, icon_url, fees, priority)
VALUES 
    ('Mercado Pago', 'mercadopago_wallet', 'wallet', 'mercadopago',
    '/icons/mercadopago.svg',
    '{
        "percentage": 3.99,
        "fixed": 0
    }'::jsonb,
    4);

-- =====================================================
-- 5. CONFIGURAÇÕES DO SISTEMA
-- =====================================================

INSERT INTO system_settings (key, value, description, is_public)
VALUES 
    ('store_name', '"Marketplace GDG"', 'Nome da loja', true),
    ('store_email', '"contato@marketplacegdg.com"', 'Email principal da loja', true),
    ('store_phone', '"(11) 9999-9999"', 'Telefone de contato', true),
    ('store_address', '{
        "street": "Rua Example",
        "number": "123",
        "city": "São Paulo",
        "state": "SP",
        "zip": "01234-567"
    }'::jsonb, 'Endereço da loja', true),
    ('business_hours', '{
        "monday_friday": "9:00 - 18:00",
        "saturday": "9:00 - 13:00",
        "sunday": "Fechado"
    }'::jsonb, 'Horário de funcionamento', true),
    ('minimum_order_value', '50.00', 'Valor mínimo do pedido', false),
    ('free_shipping_threshold', '200.00', 'Valor para frete grátis', true),
    ('max_cart_items', '50', 'Máximo de itens no carrinho', false),
    ('abandoned_cart_reminder_hours', '[24, 72]', 'Horas para lembrete de carrinho abandonado', false),
    ('order_cancellation_hours', '24', 'Horas permitidas para cancelamento', false);

-- =====================================================
-- 6. NOTIFICAÇÕES PADRÃO PARA ADMIN
-- =====================================================

-- Notificar admin sobre novos vendedores
INSERT INTO notifications (user_id, type, title, message, data)
SELECT 
    u.id,
    'seller_message',
    'Novos vendedores cadastrados',
    'Existem ' || COUNT(s.id) || ' vendedores ativos no marketplace',
    jsonb_build_object('seller_count', COUNT(s.id))
FROM users u
CROSS JOIN sellers s
WHERE u.email = 'admin@marketplace.com'
GROUP BY u.id;

-- =====================================================
-- 7. CRIAR CARRINHO ABANDONADO DE EXEMPLO
-- =====================================================

-- Simular alguns carrinhos abandonados baseados em produtos populares
INSERT INTO abandoned_carts (user_id, cart_data, total_value, created_at)
SELECT 
    u.id,
    jsonb_build_object(
        'items', jsonb_agg(
            jsonb_build_object(
                'product_id', p.id,
                'product_name', p.name,
                'quantity', 1,
                'price', p.price
            )
        )
    ),
    SUM(p.price),
    NOW() - INTERVAL '2 days'
FROM users u
CROSS JOIN (
    SELECT * FROM products 
    WHERE sales_count > 0 
    ORDER BY sales_count DESC 
    LIMIT 5
) p
WHERE u.type = 'customer'
AND RANDOM() < 0.1 -- 10% dos clientes têm carrinho abandonado
GROUP BY u.id
LIMIT 20;

-- =====================================================
-- RELATÓRIO FINAL
-- =====================================================
SELECT 
    'MIGRAÇÃO DE DADOS CONCLUÍDA' as status,
    (SELECT COUNT(*) FROM coupons) as cupons_criados,
    (SELECT COUNT(*) FROM wishlists) as wishlists_criadas,
    (SELECT COUNT(*) FROM shipping_methods) as metodos_envio,
    (SELECT COUNT(*) FROM shipping_zones) as zonas_envio,
    (SELECT COUNT(*) FROM payment_methods) as metodos_pagamento,
    (SELECT COUNT(*) FROM system_settings) as configuracoes,
    (SELECT COUNT(*) FROM notifications) as notificacoes,
    (SELECT COUNT(*) FROM abandoned_carts) as carrinhos_abandonados;

COMMIT; 