-- ============================================================================
-- SCRIPT DE LIMPEZA DE DUPLICATAS - SISTEMA DE VARIAÇÕES INTELIGENTES
-- ============================================================================
-- Este script remove as duplicatas criadas pelo bug do sistema de IA de variações
-- Execute este script no painel do seu banco de dados (Xata/Neon)

-- 1. VERIFICAR PRODUTOS COM MAIS IMAGENS DUPLICADAS
SELECT 
    product_id,
    COUNT(*) as total_images,
    COUNT(DISTINCT url) as unique_images,
    (COUNT(*) - COUNT(DISTINCT url)) as duplicates
FROM product_images 
GROUP BY product_id 
HAVING COUNT(*) > COUNT(DISTINCT url)
ORDER BY duplicates DESC 
LIMIT 10;

-- 2. MOSTRAR DETALHES DAS DUPLICATAS MAIS PROBLEMÁTICAS
SELECT 
    pi.product_id,
    p.name as product_name,
    pi.url,
    COUNT(*) as duplicate_count
FROM product_images pi
LEFT JOIN products p ON p.id = pi.product_id
GROUP BY pi.product_id, p.name, pi.url
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- 3. REMOVER DUPLICATAS - MANTER APENAS A PRIMEIRA IMAGEM DE CADA URL
WITH duplicates_to_remove AS (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY product_id, url 
                ORDER BY created_at ASC
            ) as rn
        FROM product_images
    ) ranked
    WHERE rn > 1
)
DELETE FROM product_images 
WHERE id IN (SELECT id FROM duplicates_to_remove);

-- 4. VERIFICAR RESULTADOS APÓS LIMPEZA
SELECT 
    product_id,
    COUNT(*) as remaining_images,
    COUNT(DISTINCT url) as unique_images
FROM product_images 
GROUP BY product_id 
HAVING COUNT(*) > COUNT(DISTINCT url)
ORDER BY COUNT(*) DESC;

-- 5. ESTATÍSTICAS FINAIS
SELECT 
    'Total de produtos com imagens' as metric,
    COUNT(DISTINCT product_id) as value
FROM product_images
UNION ALL
SELECT 
    'Total de imagens após limpeza' as metric,
    COUNT(*) as value
FROM product_images
UNION ALL
SELECT 
    'Produtos com duplicatas restantes' as metric,
    COUNT(DISTINCT product_id) as value
FROM product_images
GROUP BY product_id
HAVING COUNT(*) > COUNT(DISTINCT url);

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute cada seção separadamente para monitorar o progresso
-- 2. A seção 3 é a que faz a limpeza real - execute apenas uma vez
-- 3. Verifique os resultados com as seções 4 e 5
-- ============================================================================ 