-- =====================================================
-- INSERIR DADOS DE EXEMPLO PARA TESTES
-- =====================================================

-- Primeiro, vamos verificar se há um usuário de teste
DO $$
DECLARE
    test_user_id UUID;
    test_order_id UUID;
    notification_template_id UUID;
    support_category_id UUID;
    return_reason_id UUID;
BEGIN
    -- Criar usuário de teste se não existir
    SELECT id INTO test_user_id FROM users WHERE email = 'teste@graodigente.com.br' LIMIT 1;
    
    IF test_user_id IS NULL THEN
        INSERT INTO users (name, email, password, role, created_at)
        VALUES ('Usuário Teste', 'teste@graodigente.com.br', '$2b$10$teste123', 'customer', NOW())
        RETURNING id INTO test_user_id;
    END IF;

    -- Criar sessão de teste
    INSERT INTO sessions (user_id, token, expires_at, created_at)
    VALUES (test_user_id, 'test-session-token', NOW() + INTERVAL '7 days', NOW())
    ON CONFLICT (token) DO UPDATE SET expires_at = NOW() + INTERVAL '7 days';

    -- Criar pedido de teste se não existir
    SELECT id INTO test_order_id FROM orders WHERE order_number = 'MP1748645252590OLW' LIMIT 1;
    
    IF test_order_id IS NULL THEN
        INSERT INTO orders (
            id, order_number, user_id, status, payment_status, payment_method,
            subtotal, shipping, discount, total, tracking_code, carrier,
            estimated_delivery, created_at
        ) VALUES (
            gen_random_uuid(), 'MP1748645252590OLW', test_user_id, 'shipped', 'paid', 'pix',
            499.70, 15.00, 0, 514.70, 'BR123456789SP', 'Correios',
            NOW() + INTERVAL '2 days', NOW() - INTERVAL '3 days'
        ) RETURNING id INTO test_order_id;
    END IF;

    -- Inserir itens do pedido
    INSERT INTO order_items (order_id, product_id, price, quantity, total, created_at)
    SELECT test_order_id, p.id, 199.90, 2, 399.80, NOW()
    FROM products p WHERE p.name ILIKE '%camiseta%' OR p.name ILIKE '%polo%' LIMIT 1
    ON CONFLICT DO NOTHING;

    INSERT INTO order_items (order_id, product_id, price, quantity, total, created_at)
    SELECT test_order_id, p.id, 99.90, 1, 99.90, NOW()
    FROM products p WHERE p.name ILIKE '%bermuda%' OR p.name ILIKE '%short%' LIMIT 1
    ON CONFLICT DO NOTHING;

    -- Inserir rastreamento
    INSERT INTO order_tracking (order_id, status, description, location, created_at) VALUES
    (test_order_id, 'confirmado', 'Pedido confirmado e pagamento aprovado', 'São Paulo, SP', NOW() - INTERVAL '3 days'),
    (test_order_id, 'preparando', 'Produto em separação no estoque', 'Centro de Distribuição - São Paulo, SP', NOW() - INTERVAL '2 days'),
    (test_order_id, 'enviado', 'Produto despachado para transportadora', 'Centro de Distribuição - São Paulo, SP', NOW() - INTERVAL '1 day'),
    (test_order_id, 'em_transito', 'Produto em trânsito para o destino', 'Centro de Triagem - Rio de Janeiro, RJ', NOW() - INTERVAL '12 hours')
    ON CONFLICT DO NOTHING;

    -- Inserir notificações
    SELECT id INTO notification_template_id FROM notification_templates WHERE name = 'order_confirmed' LIMIT 1;
    
    INSERT INTO notifications (user_id, type, title, content, data, is_read, sent_at, template_id) VALUES
    (test_user_id, 'order_status', 'Pedido Confirmado', 'Seu pedido MP1748645252590OLW foi confirmado! Total: R$ 514,70', 
     '{"order_id": "MP1748645252590OLW", "total_amount": 514.70}', false, NOW(), notification_template_id),
     
    (test_user_id, 'promotion', 'Promoção Especial!', 'Desconto de 20% em toda a loja até domingo! Use o cupom: SAVE20',
     '{"coupon_code": "SAVE20", "discount": 0.20}', false, NOW() - INTERVAL '1 hour', NULL),
     
    (test_user_id, 'order_status', 'Produto Enviado', 'Seu pedido MP1748645252590OLW foi enviado! Código: BR123456789SP',
     '{"order_id": "MP1748645252590OLW", "tracking_code": "BR123456789SP"}', true, NOW() - INTERVAL '2 hours', NULL),
     
    (test_user_id, 'support', 'Resposta do Suporte', 'Sua solicitação SP001 foi respondida. Clique para ver a resposta.',
     '{"ticket_id": "SP001"}', false, NOW() - INTERVAL '3 hours', NULL),
     
    (test_user_id, 'price_drop', 'Preço Reduzido!', 'O produto "Camiseta Polo Azul" da sua lista de desejos está com 30% de desconto!',
     '{"product_id": "prod-123", "old_price": 199.90, "new_price": 139.93}', false, NOW() - INTERVAL '4 hours', NULL)
    ON CONFLICT DO NOTHING;

    -- Inserir tickets de suporte
    SELECT id INTO support_category_id FROM support_categories WHERE name = 'Produtos' LIMIT 1;
    
    INSERT INTO support_tickets (ticket_number, user_id, category_id, subject, status, priority, order_id, created_at) VALUES
    ('SP001', test_user_id, support_category_id, 'Produto chegou com defeito', 'open', 3, test_order_id, NOW()),
    ('SP002', test_user_id, support_category_id, 'Dúvida sobre prazo de entrega', 'resolved', 2, NULL, NOW() - INTERVAL '1 day'),
    ('SP003', test_user_id, support_category_id, 'Problema com pagamento PIX', 'in_progress', 4, test_order_id, NOW() - INTERVAL '2 days'),
    ('SP004', test_user_id, support_category_id, 'Como alterar meu endereço?', 'waiting_customer', 1, NULL, NOW() - INTERVAL '3 days')
    ON CONFLICT (ticket_number) DO NOTHING;

    -- Inserir mensagens dos tickets
    INSERT INTO support_messages (ticket_id, user_id, message, is_internal, created_at)
    SELECT st.id, test_user_id, 'O produto chegou com um defeito na costura. Gostaria de solicitar a troca.', false, NOW()
    FROM support_tickets st WHERE st.ticket_number = 'SP001'
    ON CONFLICT DO NOTHING;

    INSERT INTO support_messages (ticket_id, user_id, message, is_internal, created_at)
    SELECT st.id, test_user_id, 'Gostaria de saber quando meu pedido será entregue.', false, NOW() - INTERVAL '1 day'
    FROM support_tickets st WHERE st.ticket_number = 'SP002'
    ON CONFLICT DO NOTHING;

    -- Inserir devoluções
    SELECT id INTO return_reason_id FROM return_reasons WHERE name = 'Produto diferente do anunciado' LIMIT 1;
    
    INSERT INTO returns (
        return_number, order_id, user_id, type, status, reason_id, 
        total_amount, refund_amount, created_at
    ) VALUES
    ('DV001', test_order_id, test_user_id, 'return', 'requested', return_reason_id, 199.90, 199.90, NOW()),
    ('DV002', test_order_id, test_user_id, 'exchange', 'approved', return_reason_id, 299.90, 0, NOW() - INTERVAL '2 days'),
    ('DV003', test_order_id, test_user_id, 'return', 'processed', return_reason_id, 149.90, 149.90, NOW() - INTERVAL '4 days'),
    ('DV004', test_order_id, test_user_id, 'return', 'completed', return_reason_id, 89.90, 89.90, NOW() - INTERVAL '6 days')
    ON CONFLICT (return_number) DO NOTHING;

    -- Inserir itens das devoluções
    INSERT INTO return_items (return_id, order_item_id, product_id, quantity, unit_price, condition, created_at)
    SELECT r.id, oi.id, oi.product_id, 1, oi.price, 'new', NOW()
    FROM returns r 
    JOIN order_items oi ON r.order_id = oi.order_id
    WHERE r.return_number = 'DV001'
    LIMIT 1
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Dados de exemplo inseridos com sucesso!';
    RAISE NOTICE 'Token de sessão de teste: test-session-token';
    RAISE NOTICE 'Email do usuário: teste@graodigente.com.br';
    RAISE NOTICE 'Pedido de exemplo: MP1748645252590OLW';
END $$; 