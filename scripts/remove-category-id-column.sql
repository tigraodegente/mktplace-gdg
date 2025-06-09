-- ===============================================
-- REMOÇÃO DA COLUNA category_id
-- Execute APENAS após confirmar que o frontend está funcionando
-- com product_categories
-- ===============================================

-- ATENÇÃO: Este script remove permanentemente a coluna category_id
-- Certifique-se de que:
-- 1. O frontend foi atualizado para usar product_categories
-- 2. Todos os testes passaram
-- 3. Backup foi feito

BEGIN;

-- 1. Verificação final antes da remoção
SELECT 
    'PRÉ-REMOÇÃO: Verificação de segurança' as check_type,
    COUNT(DISTINCT pc.product_id) as produtos_em_product_categories,
    COUNT(DISTINCT p.id) as produtos_com_category_id,
    COUNT(DISTINCT p.id) - COUNT(DISTINCT pc.product_id) as diferenca
FROM products p
LEFT JOIN product_categories pc ON p.id = pc.product_id
WHERE p.category_id IS NOT NULL;

-- 2. Se diferenca = 0, é seguro remover a coluna
-- Se diferenca > 0, há produtos que não foram migrados

-- 3. Remover a coluna (descomente apenas se verificação passou)
-- ALTER TABLE products DROP COLUMN category_id;

-- 4. Remover índices relacionados à coluna (se existirem)
-- DROP INDEX IF EXISTS idx_products_category_id;
-- DROP INDEX IF EXISTS idx_products_category_active;

-- Verificação pós-remoção
-- SELECT 
--     column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' 
-- AND column_name = 'category_id';
-- -- Deve retornar 0 registros

COMMIT;

-- ===============================================
-- COMANDOS PARA EXECUTAR MANUALMENTE
-- (após verificar que tudo está funcionando)
-- ===============================================

/*
-- Passo 1: Verificar se está tudo OK
SELECT COUNT(*) FROM product_categories; -- Deve ter ~2621 registros

-- Passo 2: Remover a coluna (execute manualmente)
ALTER TABLE products DROP COLUMN category_id;

-- Passo 3: Limpar índices órfãos (se existirem)
DROP INDEX IF EXISTS idx_products_category_id;
DROP INDEX IF EXISTS idx_products_category_active;

-- Passo 4: Verificar que foi removida
\d products  -- Verificar estrutura da tabela
*/ 