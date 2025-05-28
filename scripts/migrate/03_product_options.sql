-- Script para popular opções de produtos

-- Inserir opções de produtos
INSERT INTO product_options (id, name, slug, type, is_required, created_at, updated_at)
VALUES 
  ('opt_tamanho', 'Tamanho', 'tamanho', 'select', true, NOW(), NOW()),
  ('opt_cor', 'Cor', 'cor', 'color', true, NOW(), NOW()),
  ('opt_estilo', 'Estilo', 'estilo', 'select', false, NOW(), NOW()),
  ('opt_material', 'Material', 'material', 'select', false, NOW(), NOW());

-- Registrar opções na tabela de rastreamento
INSERT INTO migration_tracking (id, type)
SELECT id, 'Opção de Produto' 
FROM product_options;

-- Inserir valores para as opções
INSERT INTO product_option_values (id, option_id, value, label, color, position, created_at, updated_at)
VALUES 
  -- Tamanhos
  ('optval_pp', 'opt_tamanho', 'pp', 'PP', NULL, 1, NOW(), NOW()),
  ('optval_p', 'opt_tamanho', 'p', 'P', NULL, 2, NOW(), NOW()),
  ('optval_m', 'opt_tamanho', 'm', 'M', NULL, 3, NOW(), NOW()),
  ('optval_g', 'opt_tamanho', 'g', 'G', NULL, 4, NOW(), NOW()),
  ('optval_gg', 'opt_tamanho', 'gg', 'GG', NULL, 5, NOW(), NOW()),
  ('optval_xgg', 'opt_tamanho', 'xgg', 'XGG', NULL, 6, NOW(), NOW()),
  
  -- Cores
  ('optval_preto', 'opt_cor', 'preto', 'Preto', '#000000', 1, NOW(), NOW()),
  ('optval_branco', 'opt_cor', 'branco', 'Branco', '#FFFFFF', 2, NOW(), NOW()),
  ('optval_azul', 'opt_cor', 'azul', 'Azul', '#0000FF', 3, NOW(), NOW()),
  ('optval_vermelho', 'opt_cor', 'vermelho', 'Vermelho', '#FF0000', 4, NOW(), NOW()),
  ('optval_verde', 'opt_cor', 'verde', 'Verde', '#008000', 5, NOW(), NOW()),
  ('optval_amarelo', 'opt_cor', 'amarelo', 'Amarelo', '#FFFF00', 6, NOW(), NOW()),
  
  -- Estilos
  ('optval_casual', 'opt_estilo', 'casual', 'Casual', NULL, 1, NOW(), NOW()),
  ('optval_esportivo', 'opt_estilo', 'esportivo', 'Esportivo', NULL, 2, NOW(), NOW()),
  ('optval_social', 'opt_estilo', 'social', 'Social', NULL, 3, NOW(), NOW()),
  
  -- Materiais
  ('optval_algodao', 'opt_material', 'algodao', 'Algodão', NULL, 1, NOW(), NOW()),
  ('optval_poliester', 'opt_material', 'poliester', 'Poliéster', NULL, 2, NOW(), NOW()),
  ('optval_jeans', 'opt_material', 'jeans', 'Jeans', NULL, 3, NOW(), NOW()),
  ('optval_couro', 'opt_material', 'couro', 'Couro', NULL, 4, NOW(), NOW());
    ('optval_algodao', 'opt_material', 'Algodão', 1, NOW(), NOW()),
    ('optval_poliester', 'opt_material', 'Poliéster', 2, NOW(), NOW()),
    ('optval_jeans', 'opt_material', 'Jeans', 3, NOW(), NOW()),
    ('optval_couro', 'opt_material', 'Couro', 4, NOW(), NOW()),
    ('optval_malha', 'opt_material', 'Malha', 5, NOW(), NOW()),
    
    -- Estilos
    ('optval_casual', 'opt_estilo', 'Casual', 1, NOW(), NOW()),
    ('optval_esportivo', 'opt_estilo', 'Esportivo', 2, NOW(), NOW()),
    ('optval_social', 'opt_estilo', 'Social', 3, NOW(), NOW()),
    ('optval_praia', 'opt_estilo', 'Praia', 4, NOW(), NOW()),
    ('optval_fitness', 'opt_estilo', 'Fitness', 5, NOW(), NOW())
  RETURNING id, option_id, value
)
INSERT INTO temp_migration_ids (id, type)
SELECT id, 'Valor de Opção' FROM option_values;

\echo '✅ Opções de produtos e valores inseridos com sucesso'
