-- Script para popular marcas

-- Inserir marcas
INSERT INTO brands (id, name, slug, description, logo_url, website_url, is_active, created_at, updated_at)
VALUES 
  ('brand_nike', 'Nike', 'nike', 'Just Do It', 'https://example.com/logos/nike.jpg', 'https://nike.com', true, NOW(), NOW()),
  ('brand_adidas', 'Adidas', 'adidas', 'Impossible is Nothing', 'https://example.com/logos/adidas.jpg', 'https://adidas.com', true, NOW(), NOW()),
  ('brand_oakley', 'Oakley', 'oakley', 'Beyond Reason', 'https://example.com/logos/oakley.jpg', 'https://oakley.com', true, NOW(), NOW()),
  ('brand_rayban', 'Ray-Ban', 'rayban', 'Never Hide', 'https://example.com/logos/rayban.jpg', 'https://ray-ban.com', true, NOW(), NOW()),
  ('brand_puma', 'Puma', 'puma', 'Forever Faster', 'https://example.com/logos/puma.jpg', 'https://puma.com', true, NOW(), NOW()),
  ('brand_vans', 'Vans', 'vans', 'Off The Wall', 'https://example.com/logos/vans.jpg', 'https://vans.com', true, NOW(), NOW()),
  ('brand_tommy', 'Tommy Hilfiger', 'tommy-hilfiger', 'Classic American Cool', 'https://example.com/logos/tommy.jpg', 'https://tommy.com', true, NOW(), NOW()),
  ('brand_levis', 'Levi''s', 'levis', 'Quality Never Goes Out of Style', 'https://example.com/logos/levis.jpg', 'https://levi.com', true, NOW(), NOW()),
  ('brand_diesel', 'Diesel', 'diesel', 'For Successful Living', 'https://example.com/logos/diesel.jpg', 'https://diesel.com', true, NOW(), NOW()),
  ('brand_armani', 'Armani', 'armani', 'Elegance is an attitude', 'https://example.com/logos/armani.jpg', 'https://armani.com', true, NOW(), NOW());

-- Registrar marcas na tabela de rastreamento
INSERT INTO migration_tracking (id, type)
SELECT id, 'Marca' 
FROM brands;

-- Mensagem de sucesso
SELECT '✅ Marcas inseridas com sucesso' as message;
