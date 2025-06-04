-- =====================================================
-- CORREÇÃO: MÚLTIPLAS CATEGORIAS PRIMÁRIAS
-- =====================================================
-- Corrige produtos que ficaram com mais de uma categoria primária

BEGIN;

-- 1. Identificar produtos com problema
WITH problematic_products AS (
    SELECT 
        product_id,
        COUNT(*) as primary_count
    FROM product_categories
    WHERE is_primary = true
    GROUP BY product_id
    HAVING COUNT(*) > 1
)
SELECT 
    'Produtos com múltiplas primárias' as status,
    COUNT(*) as quantidade 
FROM problematic_products;

-- 2. Corrigir mantendo apenas a primeira categoria criada como primária
UPDATE product_categories pc
SET is_primary = false
WHERE is_primary = true
AND (product_id, category_id) NOT IN (
    SELECT DISTINCT ON (product_id) 
        product_id, 
        category_id
    FROM product_categories
    WHERE is_primary = true
    ORDER BY product_id, created_at, category_id
);

-- 3. Verificar correção
SELECT 
    'Após correção - Produtos com múltiplas primárias' as status,
    COUNT(*) as quantidade
FROM (
    SELECT product_id, COUNT(*) as primary_count
    FROM product_categories
    WHERE is_primary = true
    GROUP BY product_id
    HAVING COUNT(*) > 1
) problemas;

-- 4. Garantir que todo produto com categoria tenha uma primária
UPDATE product_categories pc
SET is_primary = true
WHERE (product_id, category_id) IN (
    SELECT DISTINCT ON (product_id)
        product_id,
        category_id
    FROM product_categories pc2
    WHERE NOT EXISTS (
        SELECT 1 
        FROM product_categories pc3
        WHERE pc3.product_id = pc2.product_id 
        AND pc3.is_primary = true
    )
    ORDER BY product_id, created_at, category_id
);

-- 5. Estatística final
SELECT 
    'Estatística Final' as status,
    (SELECT COUNT(DISTINCT product_id) FROM product_categories) as produtos_com_categoria,
    (SELECT COUNT(*) FROM product_categories WHERE is_primary = true) as categorias_primarias,
    (SELECT COUNT(DISTINCT product_id) FROM product_categories WHERE is_primary = true) as produtos_com_primaria;

COMMIT; 