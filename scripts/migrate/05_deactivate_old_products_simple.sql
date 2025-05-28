-- Script para desativar produtos antigos que não estão na nova importação

-- 1. Criar índice temporário para melhorar performance
CREATE INDEX IF NOT EXISTS idx_migration_tracking_id_type ON migration_tracking(id, type);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- 2. Contar produtos ativos antes da desativação
SELECT 
    COUNT(*) AS total_antes,
    'Produtos ativos antes da desativação' AS status
FROM products 
WHERE is_active = true;

-- 3. Desativar produtos que não estão na tabela de migração
-- Usando um CTE para melhorar a legibilidade e evitar subconsultas aninhadas
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

-- 4. Contar quantos produtos permanecem ativos
SELECT 
    COUNT(*) AS total_ativos_depois,
    'Produtos ativos após migração' AS status
FROM products 
WHERE is_active = true;

-- 5. Contar produtos desativados
SELECT 
    COUNT(*) AS total_desativados,
    'Produtos desativados na migração' AS status
FROM products 
WHERE is_active = false;

-- 6. Nota: As colunas product_count foram removidas pois não existem nas tabelas
--    Para obter a contagem de produtos por categoria ou marca, use consultas agregadas
--    Exemplo:
--    SELECT c.name, COUNT(pc.product_id) as product_count
--    FROM categories c
--    LEFT JOIN product_categories pc ON pc.category_id = c.id
--    LEFT JOIN products p ON p.id = pc.product_id AND p.is_active = true
--    GROUP BY c.id, c.name;
--
--    SELECT b.name, COUNT(p.id) as product_count
--    FROM brands b
--    LEFT JOIN products p ON p.brand_id = b.id AND p.is_active = true
--    GROUP BY b.id, b.name;

-- 8. Mensagem de conclusão
SELECT '✅ Processo de desativação de produtos antigos concluído' as mensagem;
