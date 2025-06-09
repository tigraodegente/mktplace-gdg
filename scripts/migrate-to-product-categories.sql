-- ===============================================
-- MIGRAÇÃO: Padronizar categorização na tabela product_categories
-- Remove confusão entre category_id e product_categories
-- ===============================================

BEGIN;

-- 1. Primeiro, criar registros na product_categories para produtos que só têm category_id
INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
SELECT 
    p.id as product_id,
    p.category_id,
    true as is_primary,  -- Marcar como categoria primária
    NOW() as created_at
FROM products p
WHERE p.category_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM product_categories pc 
    WHERE pc.product_id = p.id
);

-- 2. Verificar quantos registros foram criados
SELECT 
    'Registros criados na product_categories' as action,
    COUNT(*) as count
FROM product_categories pc
WHERE pc.created_at >= NOW() - INTERVAL '1 minute';

-- 3. Verificar se todos os produtos agora têm categoria
SELECT 
    'Produtos com categoria após migração' as status,
    COUNT(DISTINCT pc.product_id) as produtos_categorizados,
    (SELECT COUNT(*) FROM products WHERE is_active = true) as total_produtos_ativos
FROM product_categories pc;

-- 4. Atualizar o frontend para usar product_categories
-- (Isso será feito no código da aplicação)

-- 5. IMPORTANTE: Aguardar confirmação antes de executar o DROP
-- Uncomment apenas após confirmar que tudo está funcionando:

-- DROP COLUMN será executado em script separado após testes
-- ALTER TABLE products DROP COLUMN category_id;

COMMIT;

-- ===============================================
-- VERIFICAÇÕES PÓS-MIGRAÇÃO
-- ===============================================

-- Verificar integridade
SELECT 
    'VERIFICAÇÃO FINAL' as check_type,
    COUNT(DISTINCT pc.product_id) as produtos_com_categoria,
    COUNT(DISTINCT p.id) as produtos_totais,
    ROUND(
        (COUNT(DISTINCT pc.product_id)::float / COUNT(DISTINCT p.id)) * 100, 2
    ) as percentual_categorizados
FROM products p
LEFT JOIN product_categories pc ON p.id = pc.product_id
WHERE p.is_active = true;

-- Verificar se há produtos órfãos
SELECT 
    'PRODUTOS SEM CATEGORIA' as issue,
    COUNT(*) as count,
    string_agg(p.name, ', ' ORDER BY p.name LIMIT 10) as exemplos
FROM products p
LEFT JOIN product_categories pc ON p.id = pc.product_id
WHERE p.is_active = true
AND pc.product_id IS NULL;

-- Mostrar distribuição por categoria
SELECT 
    c.name as categoria,
    COUNT(pc.product_id) as total_produtos,
    COUNT(CASE WHEN pc.is_primary THEN 1 END) as produtos_primarios
FROM categories c
LEFT JOIN product_categories pc ON c.id = pc.category_id
GROUP BY c.id, c.name
HAVING COUNT(pc.product_id) > 0
ORDER BY COUNT(pc.product_id) DESC
LIMIT 20; 