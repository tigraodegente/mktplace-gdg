-- Script simplificado para popular produtos e variações

-- 0. Inserir marcas necessárias para os produtos
INSERT INTO brands (xata_id, id, name, slug, is_active)
VALUES
  ('brand_nike', 'brand_nike', 'Nike', 'nike', true),
  ('brand_levis', 'brand_levis', 'Levis', 'levis', true),
  ('brand_adidas', 'brand_adidas', 'Adidas', 'adidas', true),
  ('brand_rayban', 'brand_rayban', 'Ray-Ban', 'ray-ban', true)
ON CONFLICT (id) DO NOTHING;

-- 1. Inserir produtos básicos
INSERT INTO products (
  xata_id, id, name, slug, description, brand_id, price, original_price, sku, barcode, track_inventory, is_active, status, currency, quantity
)
VALUES 
  ('prod_1', 'prod_1', 'Camiseta Básica', 'camiseta-basica', 'Camiseta básica de algodão 100%', 'brand_nike', 59.90, 71.88, 'PROD-0001', 'BC001', true, true, 'active', 'BRL', 100),
  ('prod_2', 'prod_2', 'Calça Jeans', 'calca-jeans', 'Calça jeans masculina', 'brand_levis', 199.90, 239.88, 'PROD-0002', 'BC002', true, true, 'active', 'BRL', 50),
  ('prod_3', 'prod_3', 'Tênis Esportivo', 'tenis-esportivo', 'Tênis para corrida', 'brand_adidas', 399.90, 479.88, 'PROD-0003', 'BC003', true, true, 'active', 'BRL', 30),
  ('prod_4', 'prod_4', 'Óculos de Sol', 'oculos-sol', 'Óculos de sol com proteção UV', 'brand_rayban', 599.90, 719.88, 'PROD-0004', 'BC004', true, true, 'active', 'BRL', 20)
ON CONFLICT (id) DO NOTHING;

-- 2. Registrar produtos na tabela de migração
INSERT INTO migration_tracking (id, type)
SELECT id, 'Produto' 
FROM products 
WHERE id LIKE 'prod_%'
ON CONFLICT (id) DO NOTHING;

-- 3. Associar categorias aos produtos usando os IDs corretos e preenchendo xata_id e id
INSERT INTO product_categories (xata_id, id, product_id, category_id, is_primary)
SELECT 
  concat('prod_1_', id), concat('prod_1_', id), 'prod_1', id, true FROM categories WHERE name = 'Produtos' LIMIT 1
ON CONFLICT (xata_id) DO NOTHING;
INSERT INTO product_categories (xata_id, id, product_id, category_id, is_primary)
SELECT 
  concat('prod_2_', id), concat('prod_2_', id), 'prod_2', id, true FROM categories WHERE name = 'Brinquedos' LIMIT 1
ON CONFLICT (xata_id) DO NOTHING;
INSERT INTO product_categories (xata_id, id, product_id, category_id, is_primary)
SELECT 
  concat('prod_3_', id), concat('prod_3_', id), 'prod_3', id, true FROM categories WHERE name = 'Cestos Organizadores' LIMIT 1
ON CONFLICT (xata_id) DO NOTHING;
INSERT INTO product_categories (xata_id, id, product_id, category_id, is_primary)
SELECT 
  concat('prod_4_', id), concat('prod_4_', id), 'prod_4', id, true FROM categories WHERE name = 'Produtos' LIMIT 1
ON CONFLICT (xata_id) DO NOTHING;

-- 4. Inserir imagens para os produtos
INSERT INTO product_images (
  xata_id, id, product_id, image_url, alt_text, is_primary
)
SELECT 
  concat('img_', p.id, '_', i),
  concat('img_', p.id, '_', i),
  p.id,
  'https://example.com/products/' || lower(regexp_replace(p.name, '[^\w\s-]', '', 'g')) || '-' || i || '.jpg',
  p.name || ' - Imagem ' || i,
  (i = 1)
FROM products p
CROSS JOIN generate_series(1, 3) i
WHERE p.id LIKE 'prod_%'
ON CONFLICT (id) DO NOTHING;

-- 5. Inserir variações para Camiseta Básica
INSERT INTO product_variants (
  xata_id, id, product_id, name, sku, price, original_price, quantity, is_active
)
SELECT 
  concat('var_1_', i, '_', j),
  concat('var_1_', i, '_', j),
  'prod_1',
  'Camiseta Básica ' ||
    CASE 
      WHEN i = 1 THEN 'P' 
      WHEN i = 2 THEN 'M' 
      WHEN i = 3 THEN 'G' 
      ELSE 'GG' 
    END ||
    CASE 
      WHEN j = 1 THEN ' Preta' 
      WHEN j = 2 THEN ' Branca' 
      ELSE ' Azul' 
    END,
  'PROD-0001-' ||
    CASE 
      WHEN i = 1 THEN 'P' 
      WHEN i = 2 THEN 'M' 
      WHEN i = 3 THEN 'G' 
      ELSE 'GG' 
    END ||
    CASE 
      WHEN j = 1 THEN '-BLK' 
      WHEN j = 2 THEN '-WHT' 
      ELSE '-BLU' 
    END,
  CASE 
    WHEN i = 1 THEN 59.90
    WHEN i = 2 THEN 64.90
    WHEN i = 3 THEN 69.90
    ELSE 74.90
  END,
  CASE 
    WHEN i = 1 THEN 71.88
    WHEN i = 2 THEN 77.88
    WHEN i = 3 THEN 83.88
    ELSE 89.88
  END,
  (10 + (i * 5) + j) * 2,
  true
FROM generate_series(1, 4) i, generate_series(1, 3) j
ON CONFLICT (id) DO NOTHING;

-- 6. Registrar variações na tabela de migração
INSERT INTO migration_tracking (id, type)
SELECT id, 'Variação' 
FROM product_variants
WHERE product_id = 'prod_1'
ON CONFLICT (id) DO NOTHING;

-- 7. Mensagem de sucesso
SELECT '✅ Produtos, categorias, imagens e variações inseridos com sucesso' as message;
INSERT INTO product_categories (xata_id, id, product_id, category_id, is_primary)
SELECT 
  concat('prod_2_', id), concat('prod_2_', id), 'prod_2', id, true FROM categories WHERE name = 'Brinquedos' LIMIT 1;

INSERT INTO product_categories (xata_id, id, product_id, category_id, is_primary)
SELECT 
  concat('prod_3_', id), concat('prod_3_', id), 'prod_3', id, true FROM categories WHERE name = 'Cestos Organizadores' LIMIT 1;

-- O quarto produto também será associado a uma categoria existente
INSERT INTO product_categories (xata_id, id, product_id, category_id, is_primary)
SELECT 
  concat('prod_4_', id), concat('prod_4_', id), 'prod_4', id, true FROM categories WHERE name = 'Produtos' LIMIT 1;

-- 4. Inserir imagens para os produtos
INSERT INTO product_images (
  id, product_id, url, alt_text, position, is_primary, created_at, updated_at
)
SELECT 
  'img_' || p.id || '_' || i,
  p.id,
  'https://example.com/products/' || 
  lower(regexp_replace(p.name, '[^\w\s-]', '', 'g')) || 
  '-' || i || '.jpg',
  p.name || ' - Imagem ' || i,
  i,
  (i = 1), -- Primeira imagem é a principal
  NOW(),
  NOW()
FROM products p
CROSS JOIN generate_series(1, 3) i; -- 3 imagens por produto

-- 5. Inserir variações para produtos que as possuem
-- Variações para a Camiseta Básica (tamanho e cor)
INSERT INTO product_variants (
  id, product_id, sku, price, compare_at_price, 
  quantity, is_active, created_at, updated_at
)
SELECT 
  'var_1_' || row_number() OVER (), 
  'prod_1',
  'PROD-0001-' || 
    CASE 
      WHEN i = 1 THEN 'P' 
      WHEN i = 2 THEN 'M' 
      WHEN i = 3 THEN 'G' 
      ELSE 'GG' 
    END ||
    CASE 
      WHEN j = 1 THEN '-BLK' 
      WHEN j = 2 THEN '-WHT' 
      ELSE '-BLU' 
    END,
  CASE 
    WHEN i = 1 THEN 59.90
    WHEN i = 2 THEN 64.90
    WHEN i = 3 THEN 69.90
    ELSE 74.90
  END,
  CASE 
    WHEN i = 1 THEN 71.88
    WHEN i = 2 THEN 77.88
    WHEN i = 3 THEN 83.88
    ELSE 89.88
  END,
  (10 + (i * 5) + j) * 2, -- Quantidade variável
  true, NOW(), NOW()
FROM generate_series(1, 4) i, generate_series(1, 3) j; -- 4 tamanhos x 3 cores

-- 6. Associar opções às variações da Camiseta
INSERT INTO product_variant_options (variant_id, option_id, option_value_id, created_at, updated_at)
SELECT 
  'var_1_' || row_number() OVER (ORDER BY i, j),
  CASE 
    WHEN i = 1 THEN 'opt_tamanho' 
    ELSE 'opt_cor' 
  END,
  CASE 
    WHEN i = 1 AND j = 1 THEN 'optval_p'
    WHEN i = 1 AND j = 2 THEN 'optval_m'
    WHEN i = 1 AND j = 3 THEN 'optval_g'
    WHEN i = 1 AND j = 4 THEN 'optval_gg'
    WHEN i = 2 AND j = 1 THEN 'optval_preto'
    WHEN i = 2 AND j = 2 THEN 'optval_branco'
    WHEN i = 2 AND j = 3 THEN 'optval_azul'
  END,
  NOW(), NOW()
FROM generate_series(1, 2) i, generate_series(1, 4) j
WHERE NOT (i = 2 AND j = 4); -- Evitar combinação inválida

-- 7. Registrar variações na tabela de migração
INSERT INTO migration_tracking (id, type)
SELECT id, 'Variação' 
FROM product_variants;

-- 8. Mensagem de sucesso
SELECT '✅ Produtos, variações e imagens inseridos com sucesso' as message;
