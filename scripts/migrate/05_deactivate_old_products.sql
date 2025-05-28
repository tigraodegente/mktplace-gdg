-- Script para desativar produtos antigos que não estão na nova importação

-- 1. Atualizar produtos antigos que não estão na nova importação
WITH produtos_para_desativar AS (
    SELECT p.id 
    FROM products p
    LEFT JOIN migration_tracking m ON p.id = m.id AND m.type = 'Produto'
    WHERE p.is_active = true
    AND m.id IS NULL
    LIMIT 1000 -- Limitar para evitar sobrecarga
)
UPDATE products p
SET 
    is_active = false,
    updated_at = NOW()
FROM produtos_para_desativar pd
WHERE p.id = pd.id
RETURNING p.id, p.name, 'Desativado' as status;

-- 2. Contar quantos produtos permanecem ativos
SELECT 
    COUNT(*) AS total_produtos_ativos,
    'Produtos ativos após migração' AS status
FROM products 
WHERE is_active = true;

-- 3. Contar produtos desativados
SELECT 
    COUNT(*) AS total_produtos_desativados,
    'Produtos desativados na migração' AS status
FROM products 
WHERE is_active = false;

-- 4. Mensagem de conclusão
SELECT '✅ Processo de desativação de produtos antigos concluído' as mensagem;

-- Atualizar contagem de produtos nas categorias após desativação
UPDATE categories c
SET product_count = (
  SELECT COUNT(*) 
  FROM product_categories pc 
  JOIN products p ON pc.product_id = p.id
  WHERE pc.category_id = c.id AND p.is_active = true
  GROUP BY pc.category_id
)
WHERE id IN (
  SELECT DISTINCT category_id 
  FROM product_categories
);

-- Mensagem de resumo
DO $$
DECLARE
  active_count integer;
  deactivated_count integer;
  total_products integer;
  total_variants integer;
  deactivated_products integer;
BEGIN
  -- Contar produtos ativos
  SELECT COUNT(*) INTO active_count 
  FROM products 
  WHERE is_active = true;
  
  -- Contar produtos desativados
  SELECT COUNT(*) INTO deactivated_count 
  FROM products 
  WHERE is_active = false;
  
  -- Obter totais da migração
  SELECT id::integer INTO total_products 
  FROM temp_migration_ids 
  WHERE type = 'Total de Produtos' 
  LIMIT 1;
  
  SELECT id::integer INTO total_variants 
  FROM temp_migration_ids 
  WHERE type = 'Total de Variações' 
  LIMIT 1;
  
  SELECT id::integer INTO deactivated_products 
  FROM temp_migration_ids 
  WHERE type = 'Produtos Desativados' 
  LIMIT 1;
  
  -- Exibir resumo
  RAISE NOTICE '✅ Migração de produtos concluída com sucesso!';
  RAISE NOTICE '📊 Resumo:';
  RAISE NOTICE '   - Produtos ativos: %', active_count;
  RAISE NOTICE '   - Produtos desativados: %', deactivated_products;
  RAISE NOTICE '   - Novos produtos inseridos: %', total_products;
  RAISE NOTICE '   - Variações inseridas: %', total_variants;
  RAISE NOTICE '   - Categorias atualizadas: %', (SELECT COUNT(*) FROM categories WHERE product_count > 0);
END $$;

-- Limpar a tabela de migração (opcional, descomente se necessário)
-- DROP TABLE IF EXISTS temp_migration_ids;
