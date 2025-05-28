-- Insert sample users
INSERT INTO users (email, name, password_hash, role, phone, cpf_cnpj) VALUES
('admin@marketplace.com', 'Admin User', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'admin', '11999999999', '12345678901'),
('seller1@example.com', 'João Silva', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'seller', '11988888888', '12345678000195'),
('seller2@example.com', 'Maria Santos', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'seller', '11977777777', '98765432000196'),
('customer1@example.com', 'Pedro Oliveira', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'customer', '11966666666', '98765432109'),
('customer2@example.com', 'Ana Costa', '$2a$10$XQq2o2l6YJ6rR8VZG5BXKu3JjQWJ6xr6cKtHq6Zz8X9nI5qF8qZ9m', 'customer', '11955555555', '11122233344');

-- Insert categories
INSERT INTO categories (name, slug, description, display_order) VALUES
('Eletrônicos', 'eletronicos', 'Produtos eletrônicos e gadgets', 1),
('Informática', 'informatica', 'Computadores, notebooks e acessórios', 2),
('Casa e Decoração', 'casa-decoracao', 'Móveis e itens de decoração', 3),
('Moda', 'moda', 'Roupas, calçados e acessórios', 4),
('Esportes', 'esportes', 'Equipamentos e roupas esportivas', 5);

-- Insert subcategories
INSERT INTO categories (name, slug, description, parent_id, display_order) VALUES
('Smartphones', 'smartphones', 'Celulares e smartphones', (SELECT id FROM categories WHERE slug = 'eletronicos'), 1),
('Notebooks', 'notebooks', 'Notebooks e laptops', (SELECT id FROM categories WHERE slug = 'informatica'), 1),
('Periféricos', 'perifericos', 'Mouse, teclado e outros', (SELECT id FROM categories WHERE slug = 'informatica'), 2);

-- Insert sellers
INSERT INTO sellers (user_id, company_name, company_document, description, is_verified, rating) VALUES
((SELECT id FROM users WHERE email = 'seller1@example.com'), 'Tech Store', '12345678000195', 'Loja especializada em produtos de tecnologia', true, 4.5),
((SELECT id FROM users WHERE email = 'seller2@example.com'), 'Fashion House', '98765432000196', 'Moda feminina e masculina com estilo', true, 4.8);

-- Insert products
INSERT INTO products (seller_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, sku, images, is_featured) VALUES
-- Tech Store products
((SELECT id FROM sellers WHERE company_name = 'Tech Store'), 
 (SELECT id FROM categories WHERE slug = 'smartphones'),
 'iPhone 15 Pro Max 256GB', 'iphone-15-pro-max-256gb',
 'O iPhone 15 Pro Max com 256GB de armazenamento, câmera profissional e chip A17 Pro.',
 8999.00, 9999.00, 10, 'IPH15PM256',
 '["https://images.unsplash.com/photo-1695048133142-1a20484d2569"]'::jsonb, true),

((SELECT id FROM sellers WHERE company_name = 'Tech Store'), 
 (SELECT id FROM categories WHERE slug = 'notebooks'),
 'MacBook Pro 14" M3', 'macbook-pro-14-m3',
 'MacBook Pro 14 polegadas com chip M3, 16GB RAM e 512GB SSD.',
 14999.00, 16999.00, 5, 'MBP14M3512',
 '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8"]'::jsonb, true),

((SELECT id FROM sellers WHERE company_name = 'Tech Store'), 
 (SELECT id FROM categories WHERE slug = 'perifericos'),
 'Mouse Gamer RGB', 'mouse-gamer-rgb',
 'Mouse gamer com 16000 DPI, iluminação RGB e 7 botões programáveis.',
 299.90, 399.90, 25, 'MGRGB001',
 '["https://images.unsplash.com/photo-1527814050087-3793815479db"]'::jsonb, false),

-- Fashion House products
((SELECT id FROM sellers WHERE company_name = 'Fashion House'), 
 (SELECT id FROM categories WHERE slug = 'moda'),
 'Vestido Floral Verão', 'vestido-floral-verao',
 'Vestido longo floral perfeito para o verão, tecido leve e confortável.',
 189.90, 249.90, 15, 'VFV2024001',
 '["https://images.unsplash.com/photo-1595777457583-95e059d581b8"]'::jsonb, false),

((SELECT id FROM sellers WHERE company_name = 'Fashion House'), 
 (SELECT id FROM categories WHERE slug = 'moda'),
 'Blazer Feminino Elegante', 'blazer-feminino-elegante',
 'Blazer feminino corte moderno, ideal para ocasiões formais.',
 349.90, 449.90, 8, 'BFE2024001',
 '["https://images.unsplash.com/photo-1594938298603-c8148c4dae35"]'::jsonb, true);

-- Insert sample orders
INSERT INTO orders (user_id, order_number, status, subtotal, shipping_cost, total, payment_method, payment_status, shipping_address) VALUES
((SELECT id FROM users WHERE email = 'customer1@example.com'), 
 'ORD-2024-0001', 'delivered', 9298.90, 0, 9298.90, 'credit_card', 'paid',
 '{"street": "Rua das Flores, 123", "city": "São Paulo", "state": "SP", "zip": "01234-567"}'::jsonb),

((SELECT id FROM users WHERE email = 'customer2@example.com'), 
 'ORD-2024-0002', 'processing', 539.80, 15.00, 554.80, 'pix', 'paid',
 '{"street": "Av. Principal, 456", "city": "Rio de Janeiro", "state": "RJ", "zip": "20000-000"}'::jsonb);

-- Insert order items
INSERT INTO order_items (order_id, product_id, seller_id, quantity, price, total, status) VALUES
-- Order 1 items
((SELECT id FROM orders WHERE order_number = 'ORD-2024-0001'),
 (SELECT id FROM products WHERE slug = 'iphone-15-pro-max-256gb'),
 (SELECT seller_id FROM products WHERE slug = 'iphone-15-pro-max-256gb'),
 1, 8999.00, 8999.00, 'delivered'),

((SELECT id FROM orders WHERE order_number = 'ORD-2024-0001'),
 (SELECT id FROM products WHERE slug = 'mouse-gamer-rgb'),
 (SELECT seller_id FROM products WHERE slug = 'mouse-gamer-rgb'),
 1, 299.90, 299.90, 'delivered'),

-- Order 2 items
((SELECT id FROM orders WHERE order_number = 'ORD-2024-0002'),
 (SELECT id FROM products WHERE slug = 'vestido-floral-verao'),
 (SELECT seller_id FROM products WHERE slug = 'vestido-floral-verao'),
 1, 189.90, 189.90, 'confirmed'),

((SELECT id FROM orders WHERE order_number = 'ORD-2024-0002'),
 (SELECT id FROM products WHERE slug = 'blazer-feminino-elegante'),
 (SELECT seller_id FROM products WHERE slug = 'blazer-feminino-elegante'),
 1, 349.90, 349.90, 'confirmed'); 