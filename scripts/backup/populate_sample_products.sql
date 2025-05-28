-- Script para popular o banco de dados com produtos de exemplo
-- Data: 28/05/2025
-- Autor: Cascade AI Assistant

-- 1. Inserir Categorias de Exemplo
INSERT INTO categories (id, name, slug, description, is_active, position, created_at, updated_at)
VALUES 
  ('cat_roupas', 'Roupas', 'roupas', 'Roupas em geral', true, 1, NOW(), NOW()),
  ('cat_calcados', 'Calçados', 'calcados', 'Calçados diversos', true, 2, NOW(), NOW()),
  ('cat_acessorios', 'Acessórios', 'acessorios', 'Acessórios diversos', true, 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Inserir Subcategorias
WITH subcategories AS (
  SELECT * FROM (VALUES 
    ('cat_camisetas', 'Camisetas', 'camisetas', 'Camisetas diversas', 'cat_roupas', 1),
    ('cat_bermudas', 'Bermudas', 'bermudas', 'Bermudas e shorts', 'cat_roupas', 2),
    ('cat_tenis', 'Tênis', 'tenis', 'Tênis esportivos', 'cat_calcados', 1),
    ('cat_sapatos', 'Sapatos', 'sapatos', 'Sapatos sociais', 'cat_calcados', 2),
    ('cat_relogios', 'Relógios', 'relogios', 'Relógios de pulso', 'cat_acessorios', 1),
    ('cat_oculos', 'Óculos', 'oculos', 'Óculos de sol e grau', 'cat_acessorios', 2)
  ) AS t(id, name, slug, description, parent_id, position)
)
INSERT INTO categories (id, name, slug, description, parent_id, is_active, position, created_at, updated_at)
SELECT id, name, slug, description, parent_id, true, position, NOW(), NOW()
FROM subcategories
ON CONFLICT (id) DO NOTHING;

-- 3. Inserir Marcas de Exemplo
INSERT INTO brands (id, name, slug, description, is_active, created_at, updated_at)
VALUES 
  ('brand_nike', 'Nike', 'nike', 'Marca esportiva', true, NOW(), NOW()),
  ('brand_adidas', 'Adidas', 'adidas', 'Marca esportiva', true, NOW(), NOW()),
  ('brand_oakley', 'Oakley', 'oakley', 'Acessórios esportivos', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Opções de Produto
INSERT INTO product_options (id, name, type, display_order, is_required, created_at, updated_at)
VALUES 
  ('opt_cor', 'Cor', 'color', 1, true, NOW(), NOW()),
  ('opt_tamanho', 'Tamanho', 'size', 2, true, NOW(), NOW()),
  ('opt_tamanho_calcado', 'Tamanho do Calçado', 'size', 3, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Inserir Valores para as Opções
WITH option_values AS (
  SELECT * FROM (VALUES 
    -- Cores
    ('optval_azul', 'opt_cor', 'Azul', 1),
    ('optval_preto', 'opt_cor', 'Preto', 2),
    ('optval_branco', 'opt_cor', 'Branco', 3),
    -- Tamanhos de roupa
    ('optval_p', 'opt_tamanho', 'P', 1),
    ('optval_m', 'opt_tamanho', 'M', 2),
    ('optval_g', 'opt_tamanho', 'G', 3),
    -- Tamanhos de calçado
    ('optval_39', 'opt_tamanho_calcado', '39', 1),
    ('optval_40', 'opt_tamanho_calcado', '40', 2),
    ('optval_41', 'opt_tamanho_calcado', '41', 3),
    ('optval_42', 'opt_tamanho_calcado', '42', 4),
    ('optval_43', 'opt_tamanho_calcado', '43', 5)
  ) AS t(id, option_id, value, display_order)
)
INSERT INTO product_option_values (id, option_id, value, display_order, created_at, updated_at)
SELECT id, option_id, value, display_order, NOW(), NOW()
FROM option_values
ON CONFLICT (id) DO NOTHING;

-- 6. Função para gerar SKU aleatório
CREATE OR REPLACE FUNCTION generate_random_sku() 
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer := 0;
  rand_int integer;
  chars_length integer := length(chars);
BEGIN
  FOR i IN 1..8 LOOP
    rand_int := floor(random() * chars_length + 1)::integer;
    result := result || substr(chars, rand_int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Inserir Produtos de Exemplo

-- Produto 1: Camiseta Básica
WITH new_product AS (
  INSERT INTO products (
    id, sku, name, slug, description, brand_id, status, is_active, 
    price, original_price, cost, currency, quantity, 
    track_inventory, allow_backorder, weight, 
    meta_title, meta_description, created_at, updated_at, published_at
  ) VALUES (
    'prod_' || gen_random_uuid(),
    generate_random_sku(),
    'Camiseta Básica Algodão',
    'camiseta-basica-algodao',
    'Camiseta básica em algodão 100%, ótima para o dia a dia.',
    'brand_nike',
    'published',
    true,
    59.90,
    79.90,
    30.00,
    'BRL',
    100,
    true,
    true,
    0.2,
    'Camiseta Básica Algodão - Nike',
    'Camiseta básica em algodão 100%, disponível em várias cores e tamanhos.',
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id, name, sku
),
-- Associar categorias ao produto
product_category AS (
  INSERT INTO product_categories (product_id, category_id, created_at)
  SELECT id, 'cat_camisetas', NOW() FROM new_product
  RETURNING product_id, category_id
)
-- Inserir variações do produto
INSERT INTO product_variants (
  id, product_id, sku, name, price, original_price, cost, 
  quantity, weight, is_active, created_at, updated_at
)
SELECT 
  'var_' || gen_random_uuid(),
  p.id,
  p.sku || '-' || t.tamanho_sku || '-' || c.cor_sku,
  p.name || ' - ' || t.tamanho_nome || ' - ' || c.cor_nome,
  p.price,
  p.original_price,
  p.cost,
  25, -- quantidade por variação
  p.weight,
  true,
  NOW(),
  NOW()
FROM 
  new_product p,
  (VALUES ('P', 'P'), ('M', 'M'), ('G', 'G')) AS t(tamanho_sku, tamanho_nome),
  (VALUES ('BLK', 'Preto'), ('WHT', 'Branco'), ('BLU', 'Azul')) AS c(cor_sku, cor_nome)
RETURNING *;

-- Produto 2: Tênis Esportivo
WITH new_product AS (
  INSERT INTO products (
    id, sku, name, slug, description, brand_id, status, is_active, 
    price, original_price, cost, currency, quantity, 
    track_inventory, allow_backorder, weight, 
    meta_title, meta_description, created_at, updated_at, published_at
  ) VALUES (
    'prod_' || gen_random_uuid(),
    generate_random_sku(),
    'Tênis Esportivo Adidas',
    'tenis-esportivo-adidas',
    'Tênis esportivo para corrida e caminhada, com tecnologia de amortecimento.',
    'brand_adidas',
    'published',
    true,
    299.90,
    349.90,
    150.00,
    'BRL',
    50,
    true,
    true,
    0.5,
    'Tênis Esportivo Adidas - Conforto e Desempenho',
    'Tênis esportivo Adidas ideal para corrida e caminhada, com tecnologia de amortecimento.',
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id, name, sku
),
-- Associar categorias ao produto
product_category AS (
  INSERT INTO product_categories (product_id, category_id, created_at)
  SELECT id, 'cat_tenis', NOW() FROM new_product
  RETURNING product_id, category_id
)
-- Inserir variações do produto
INSERT INTO product_variants (
  id, product_id, sku, name, price, original_price, cost, 
  quantity, weight, is_active, created_at, updated_at
)
SELECT 
  'var_' || gen_random_uuid(),
  p.id,
  p.sku || '-' || t.tamanho_sku,
  p.name || ' - Tamanho ' || t.tamanho_nome,
  p.price,
  p.original_price,
  p.cost,
  10, -- quantidade por tamanho
  p.weight,
  true,
  NOW(),
  NOW()
FROM 
  new_product p,
  (VALUES ('39', '39'), ('40', '40'), ('41', '41'), ('42', '42'), ('43', '43')) AS t(tamanho_sku, tamanho_nome)
RETURNING *;

-- 8. Mensagem de conclusão
DO $$
BEGIN
  RAISE NOTICE 'Script de população de dados concluído com sucesso!';
  RAISE NOTICE 'Foram adicionados produtos de exemplo nas categorias de roupas, calçados e acessórios.';
  RAISE NOTICE 'Verifique as tabelas products, product_variants e relacionadas para ver os dados inseridos.';
END $$;
