-- Script para popular categorias e subcategorias

-- Inserir categorias principais
INSERT INTO categories (id, name, slug, description, parent_id, is_active, created_at, updated_at)
VALUES 
  ('cat_roupas', 'Roupas', 'roupas', 'Roupas em geral', NULL, true, NOW(), NOW()),
  ('cat_calcados', 'Calçados', 'calcados', 'Calçados diversos', NULL, true, NOW(), NOW()),
  ('cat_acessorios', 'Acessórios', 'acessorios', 'Acessórios em geral', NULL, true, NOW(), NOW());

-- Registrar categorias na tabela de rastreamento
INSERT INTO migration_tracking (id, type)
SELECT id, 'Categoria' 
FROM categories 
WHERE parent_id IS NULL;

-- Inserir subcategorias
INSERT INTO categories (id, name, slug, description, parent_id, is_active, created_at, updated_at)
VALUES 
  -- Subcategorias de Roupas
  ('subcat_camisetas', 'Camisetas', 'camisetas', 'Camisetas diversas', 'cat_roupas', true, NOW(), NOW()),
  ('subcat_calcas', 'Calças', 'calcas', 'Calças e bermudas', 'cat_roupas', true, NOW(), NOW()),
  ('subcat_blusas', 'Blusas', 'blusas', 'Blusas e camisas', 'cat_roupas', true, NOW(), NOW()),
  
  -- Subcategorias de Calçados
  ('subcat_tenis', 'Tênis', 'tenis', 'Tênis esportivos e casuais', 'cat_calcados', true, NOW(), NOW()),
  ('subcat_sapatos', 'Sapatos', 'sapatos', 'Sapatos sociais e casuais', 'cat_calcados', true, NOW(), NOW()),
  ('subcat_sandalias', 'Sandálias', 'sandalias', 'Sandálias e chinelos', 'cat_calcados', true, NOW(), NOW()),
  
  -- Subcategorias de Acessórios
  ('subcat_bolsas', 'Bolsas', 'bolsas', 'Bolsas e mochilas', 'cat_acessorios', true, NOW(), NOW()),
  ('subcat_joias', 'Jóias', 'joias', 'Jóias em prata e ouro', 'cat_acessorios', true, NOW(), NOW()),
  ('subcat_chapeus', 'Chapéus', 'chapeus', 'Chapéus e bonés', 'cat_acessorios', true, NOW(), NOW());

-- Registrar subcategorias na tabela de rastreamento
INSERT INTO migration_tracking (id, type)
SELECT id, 'Subcategoria' 
FROM categories 
WHERE parent_id IS NOT NULL;

-- Mensagem de sucesso
SELECT '✅ Categorias e subcategorias inseridas com sucesso' as message;
