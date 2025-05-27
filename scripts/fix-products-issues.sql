-- =====================================================
-- CORREÇÃO DE PROBLEMAS NOS PRODUTOS
-- =====================================================

-- 1. ATUALIZAR PRODUTOS COM PREÇO ZERO
-- =====================================================

-- Listar produtos que serão atualizados
SELECT 
    'Produtos com preço zero que serão corrigidos' as info,
    COUNT(*) as total,
    AVG(cost * 2.5) as preco_medio_sugerido
FROM products
WHERE price = 0 AND cost > 0;

-- Atualizar preços baseado no custo (markup de 2.5x)
UPDATE products
SET price = ROUND(cost * 2.5, 2)
WHERE price = 0 AND cost > 0;

-- Para produtos sem custo, definir preço mínimo de R$ 10
UPDATE products
SET price = 10.00
WHERE price <= 0 AND (cost IS NULL OR cost <= 0);

-- 2. ATUALIZAR ESTOQUE DOS PRODUTOS
-- =====================================================

-- Opção 1: Definir estoque padrão para todos os produtos
-- Comentado por segurança - descomente se quiser executar
/*
UPDATE products
SET quantity = 100
WHERE quantity = 0 AND track_inventory = true;
*/

-- Opção 2: Definir estoque baseado no tipo de produto (mais realista)
-- Produtos mais caros = menos estoque
UPDATE products
SET quantity = CASE
    WHEN price > 500 THEN 10    -- Produtos caros: 10 unidades
    WHEN price > 200 THEN 25    -- Produtos médio-alto: 25 unidades
    WHEN price > 100 THEN 50    -- Produtos médios: 50 unidades
    WHEN price > 50 THEN 100    -- Produtos baratos: 100 unidades
    ELSE 200                    -- Produtos muito baratos: 200 unidades
END
WHERE quantity = 0 AND track_inventory = true;

-- 3. DESATIVAR PRODUTOS PROBLEMÁTICOS
-- =====================================================

-- Desativar produtos órfãos (sem vendedor)
UPDATE products
SET is_active = false
WHERE seller_id IS NULL;

-- 4. VERIFICAR RESULTADOS
-- =====================================================

-- Resumo das correções
SELECT 
    'RESUMO DAS CORREÇÕES' as info,
    (SELECT COUNT(*) FROM products WHERE price > 0) as produtos_com_preco_valido,
    (SELECT COUNT(*) FROM products WHERE quantity > 0) as produtos_com_estoque,
    (SELECT COUNT(*) FROM products WHERE is_active = true AND quantity > 0) as produtos_vendaveis,
    (SELECT AVG(price) FROM products WHERE price > 0) as preco_medio,
    (SELECT AVG(quantity) FROM products WHERE quantity > 0) as estoque_medio;

-- Top 10 produtos por estoque após correção
SELECT 
    name,
    sku,
    price,
    quantity,
    seller_id
FROM products
WHERE is_active = true
ORDER BY quantity DESC, price DESC
LIMIT 10;

-- Produtos que ainda precisam de atenção
SELECT 
    'Produtos ainda com problemas' as info,
    COUNT(*) FILTER (WHERE price <= 0) as sem_preco,
    COUNT(*) FILTER (WHERE quantity = 0 AND track_inventory = true) as sem_estoque,
    COUNT(*) FILTER (WHERE seller_id IS NULL) as sem_vendedor
FROM products; 