-- =====================================================
-- DADOS DE EXEMPLO PARA SISTEMA DE CHAT
-- =====================================================

-- Inserir configurações de chat para usuários existentes (se não existir)
INSERT INTO chat_settings (user_id, notifications_enabled, sound_enabled, online_status)
SELECT id, true, true, 'online'
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Inserir conversas de exemplo
INSERT INTO chat_conversations (id, type, title, participants, order_id, status, created_by, created_at, last_message_at) VALUES

-- Conversa de Suporte
('550e8400-e29b-41d4-a716-446655440001', 'support', 'Suporte - Dúvida sobre produto', 
 ARRAY[(SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
       (SELECT id FROM users WHERE email = 'vendedor@marketplace.com' LIMIT 1)],
 NULL, 'active', 
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '10 minutes'),

-- Conversa sobre Pedido
('550e8400-e29b-41d4-a716-446655440002', 'order', 'Pedido MP1748645252590OLW', 
 ARRAY[(SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
       (SELECT id FROM users WHERE email = 'graodegente@marketplace.com' LIMIT 1)],
 (SELECT id FROM orders LIMIT 1), 'active',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes'),

-- Conversa com Vendedor
('550e8400-e29b-41d4-a716-446655440003', 'seller', 'Chat com Vendedor - Grão de Gente', 
 ARRAY[(SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
       (SELECT id FROM users WHERE email = 'graodegente@marketplace.com' LIMIT 1)],
 NULL, 'active',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour')

ON CONFLICT (id) DO NOTHING;

-- Inserir mensagens de exemplo
INSERT INTO chat_messages (id, conversation_id, sender_id, message_type, content, metadata, created_at) VALUES

-- Mensagens da conversa de suporte
('550e8400-e29b-41d4-a716-446655441001', 
 '550e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM users WHERE email = 'vendedor@marketplace.com' LIMIT 1),
 'text', 'Olá! Como posso ajudar você hoje? 👋', '{}',
 NOW() - INTERVAL '2 hours'),

('550e8400-e29b-41d4-a716-446655441002', 
 '550e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 'text', 'Oi! Tenho uma dúvida sobre um produto que comprei.', '{}',
 NOW() - INTERVAL '1 hour 50 minutes'),

('550e8400-e29b-41d4-a716-446655441003', 
 '550e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM users WHERE email = 'vendedor@marketplace.com' LIMIT 1),
 'text', 'Claro! Pode me passar o número do seu pedido?', '{}',
 NOW() - INTERVAL '1 hour 45 minutes'),

('550e8400-e29b-41d4-a716-446655441004', 
 '550e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 'text', 'É o pedido MP1748645252590OLW', '{}',
 NOW() - INTERVAL '1 hour 40 minutes'),

('550e8400-e29b-41d4-a716-446655441005', 
 '550e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM users WHERE email = 'vendedor@marketplace.com' LIMIT 1),
 'order', 'Encontrei seu pedido! Vejo que está com status "enviado". Qual é sua dúvida específica?', 
 '{"order_id": "MP1748645252590OLW", "order_status": "shipped"}',
 NOW() - INTERVAL '1 hour 35 minutes'),

('550e8400-e29b-41d4-a716-446655441006', 
 '550e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 'text', 'Quando devo receber o produto?', '{}',
 NOW() - INTERVAL '1 hour 30 minutes'),

('550e8400-e29b-41d4-a716-446655441007', 
 '550e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM users WHERE email = 'vendedor@marketplace.com' LIMIT 1),
 'text', 'Segundo o sistema, a previsão de entrega é para amanhã! Você pode acompanhar pelo código BR123456789SP nos Correios.', '{}',
 NOW() - INTERVAL '1 hour 25 minutes'),

('550e8400-e29b-41d4-a716-446655441008', 
 '550e8400-e29b-41d4-a716-446655440001',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 'text', 'Perfeito! Muito obrigado pela ajuda! 😊', '{}',
 NOW() - INTERVAL '10 minutes'),

-- Mensagens da conversa sobre pedido
('550e8400-e29b-41d4-a716-446655441009', 
 '550e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM users WHERE email = 'graodegente@marketplace.com' LIMIT 1),
 'text', 'Olá! Sobre seu pedido MP1748645252590OLW.', '{}',
 NOW() - INTERVAL '1 day'),

('550e8400-e29b-41d4-a716-446655441010', 
 '550e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 'text', 'Oi! Gostaria de saber sobre o status do envio.', '{}',
 NOW() - INTERVAL '23 hours'),

('550e8400-e29b-41d4-a716-446655441011', 
 '550e8400-e29b-41d4-a716-446655440002',
 (SELECT id FROM users WHERE email = 'graodegente@marketplace.com' LIMIT 1),
 'text', 'Seu produto foi enviado! Código de rastreamento: BR123456789SP', '{}',
 NOW() - INTERVAL '30 minutes'),

-- Mensagens da conversa com vendedor
('550e8400-e29b-41d4-a716-446655441012', 
 '550e8400-e29b-41d4-a716-446655440003',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 'text', 'Olá! Vocês têm esse produto em estoque?', '{}',
 NOW() - INTERVAL '3 days'),

('550e8400-e29b-41d4-a716-446655441013', 
 '550e8400-e29b-41d4-a716-446655440003',
 (SELECT id FROM users WHERE email = 'graodegente@marketplace.com' LIMIT 1),
 'text', 'Sim! Temos em estoque. Quando você precisa?', '{}',
 NOW() - INTERVAL '2 days 23 hours'),

('550e8400-e29b-41d4-a716-446655441014', 
 '550e8400-e29b-41d4-a716-446655440003',
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1),
 'text', 'Para a próxima semana seria ideal.', '{}',
 NOW() - INTERVAL '2 days 22 hours'),

('550e8400-e29b-41d4-a716-446655441015', 
 '550e8400-e29b-41d4-a716-446655440003',
 (SELECT id FROM users WHERE email = 'graodegente@marketplace.com' LIMIT 1),
 'text', 'Perfeito! Vou separar para você. Confirma a compra?', '{}',
 NOW() - INTERVAL '1 hour')

ON CONFLICT (id) DO NOTHING;

-- Inserir algumas leituras de mensagem (marcar algumas como lidas)
INSERT INTO chat_message_reads (message_id, user_id, read_at) VALUES

-- Usuário admin leu algumas mensagens
('550e8400-e29b-41d4-a716-446655441001', 
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
 NOW() - INTERVAL '1 hour 55 minutes'),

('550e8400-e29b-41d4-a716-446655441003', 
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
 NOW() - INTERVAL '1 hour 45 minutes'),

('550e8400-e29b-41d4-a716-446655441005', 
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
 NOW() - INTERVAL '1 hour 35 minutes'),

('550e8400-e29b-41d4-a716-446655441009', 
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
 NOW() - INTERVAL '23 hours'),

('550e8400-e29b-41d4-a716-446655441013', 
 (SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
 NOW() - INTERVAL '2 days 23 hours')

ON CONFLICT (message_id, user_id) DO NOTHING;

-- Inserir presença online para usuários
INSERT INTO chat_presence (user_id, status, last_activity, session_id) VALUES

((SELECT id FROM users WHERE email = 'admin@marketplace.com' LIMIT 1), 
 'online', NOW(), 'session_' || extract(epoch from now())),

((SELECT id FROM users WHERE email = 'vendedor@marketplace.com' LIMIT 1), 
 'online', NOW() - INTERVAL '5 minutes', 'session_support_' || extract(epoch from now())),

((SELECT id FROM users WHERE email = 'graodegente@marketplace.com' LIMIT 1), 
 'away', NOW() - INTERVAL '15 minutes', 'session_seller_' || extract(epoch from now()))

ON CONFLICT DO NOTHING;

-- Verificação final
SELECT 'Dados de exemplo do chat inseridos com sucesso!' as status;

SELECT 
    'Conversas criadas: ' || COUNT(*) as info
FROM chat_conversations;

SELECT 
    'Mensagens criadas: ' || COUNT(*) as info  
FROM chat_messages;

SELECT 
    'Configurações de usuários: ' || COUNT(*) as info
FROM chat_settings; 