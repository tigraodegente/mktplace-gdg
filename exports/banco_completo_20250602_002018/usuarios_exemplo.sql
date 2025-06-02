-- Usuários de exemplo para desenvolvimento
-- Senha padrão para todos: 123456

INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES
('usr_admin_001', 'admin@marketplace.com', '$2a$10$YourHashHere', 'Admin Dev', 'admin', NOW(), NOW()),
('usr_seller_001', 'vendedor@marketplace.com', '$2a$10$YourHashHere', 'Vendedor Teste', 'seller', NOW(), NOW()),
('usr_customer_001', 'cliente@marketplace.com', '$2a$10$YourHashHere', 'Cliente Teste', 'customer', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Criar seller para o vendedor
INSERT INTO sellers (id, user_id, store_name, slug, status, created_at, updated_at) VALUES
('sel_001', 'usr_seller_001', 'Loja Teste', 'loja-teste', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
