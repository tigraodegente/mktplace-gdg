-- =====================================================
-- VERIFICAÇÃO: MÚLTIPLAS CATEGORIAS
-- =====================================================

-- 1. Estatísticas gerais
SELECT 
    'Estatísticas Gerais' as secao,
    (SELECT COUNT(*) FROM products) as total_produtos,
    (SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL) as produtos_com_category_id_antigo,
    (SELECT COUNT(DISTINCT product_id) FROM product_categories) as produtos_com_categorias_novas,
    (SELECT COUNT(*) FROM product_categories) as total_relacoes_produto_categoria,
    (SELECT COUNT(*) FROM product_categories WHERE is_primary = true) as categorias_primarias;

-- 2. Produtos com múltiplas categorias
SELECT 
    'Top 10 produtos com mais categorias' as secao;

SELECT 
    p.name as produto,
    COUNT(pc.category_id) as num_categorias,
    STRING_AGG(c.name, ', ' ORDER BY pc.is_primary DESC, c.name) as categorias,
    STRING_AGG(CASE WHEN pc.is_primary THEN c.name || ' (PRIMÁRIA)' ELSE c.name END, ', ' ORDER BY pc.is_primary DESC, c.name) as categorias_detalhadas
FROM products p
JOIN product_categories pc ON pc.product_id = p.id
JOIN categories c ON c.id = pc.category_id
GROUP BY p.id, p.name
HAVING COUNT(pc.category_id) > 1
ORDER BY COUNT(pc.category_id) DESC
LIMIT 10;

-- 3. Verificar produtos sem categoria
SELECT 
    'Produtos sem categoria' as secao,
    COUNT(*) as quantidade
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id
);

-- 4. Verificar integridade das categorias primárias
SELECT 
    'Produtos com problemas de categoria primária' as secao,
    COUNT(*) as quantidade
FROM (
    SELECT product_id, COUNT(*) as primary_count
    FROM product_categories
    WHERE is_primary = true
    GROUP BY product_id
    HAVING COUNT(*) > 1
) problemas;

-- 5. Distribuição de produtos por número de categorias
SELECT 
    'Distribuição de produtos por número de categorias' as secao;

SELECT 
    num_categorias,
    COUNT(*) as quantidade_produtos,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM (
    SELECT p.id, COUNT(pc.category_id) as num_categorias
    FROM products p
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    GROUP BY p.id
) contagens
GROUP BY num_categorias
ORDER BY num_categorias;

-- 6. Exemplo de produto com múltiplas categorias
SELECT 
    'Exemplo de produto com múltiplas categorias' as secao;

SELECT 
    p.id,
    p.name as produto,
    p.sku,
    json_agg(
        json_build_object(
            'categoria', c.name,
            'slug', c.slug,
            'primaria', pc.is_primary
        ) ORDER BY pc.is_primary DESC, c.name
    ) as categorias
FROM products p
JOIN product_categories pc ON pc.product_id = p.id
JOIN categories c ON c.id = pc.category_id
GROUP BY p.id, p.name, p.sku
HAVING COUNT(pc.category_id) > 1
LIMIT 1; 