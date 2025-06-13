-- Script para executar Migration 005: Checkout de Convidado
-- Execute este script no seu banco de dados Neon

\i schema/migrations/005_add_guest_checkout.sql

-- Verificar se as colunas foram criadas
\d orders

-- Verificar se os índices foram criados
\di idx_orders_guest_email
\di idx_orders_guest_session

-- Testar constraint (deve falhar - isso é esperado)
-- INSERT INTO orders (order_number, status, payment_status) VALUES ('TEST001', 'pending', 'pending');

SELECT 'Migration 005 executada com sucesso!' as status; 