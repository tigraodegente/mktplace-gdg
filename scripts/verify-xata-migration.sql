-- Script para verificar se a migração para Xata foi bem-sucedida
-- Execute este script após rodar o migrate-to-xata-complete.sql

-- ========================================
-- 1. VERIFICAR ESTRUTURA DAS TABELAS
-- ========================================

-- Verificar se todas as tabelas foram criadas com as colunas Xata
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('products', 'categories', 'brands', 'product_images', 'users', 'sellers')
    AND column_name IN ('xata_id', 'xata_version', 'xata_createdat', 'xata_updatedat', 'xata')
ORDER BY table_name, column_name;

-- ========================================
-- 2. VERIFICAR CONTAGEM DE REGISTROS
-- ========================================

-- Comparar contagem entre tabelas novas e antigas
WITH counts AS (
    SELECT 
        'products' as tabela,
        (SELECT COUNT(*) FROM products) as nova,
        (SELECT COUNT(*) FROM products_old) as antiga
    UNION ALL
    SELECT 
        'categories',
        (SELECT COUNT(*) FROM categories),
        (SELECT COUNT(*) FROM categories_old)
    UNION ALL
    SELECT 
        'brands',
        (SELECT COUNT(*) FROM brands),
        (SELECT COUNT(*) FROM brands_old)
    UNION ALL
    SELECT 
        'product_images',
        (SELECT COUNT(*) FROM product_images),
        (SELECT COUNT(*) FROM product_images_old)
    UNION ALL
    SELECT 
        'users',
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM users_old)
    UNION ALL
    SELECT 
        'sellers',
        (SELECT COUNT(*) FROM sellers),
        (SELECT COUNT(*) FROM sellers_old)
)
SELECT 
    tabela,
    nova,
    antiga,
    CASE 
        WHEN nova = antiga THEN '✅ OK'
        WHEN nova < antiga THEN '⚠️  Faltam registros'
        ELSE '❓ Mais registros que o esperado'
    END as status,
    antiga - nova as diferenca
FROM counts
ORDER BY tabela;

-- ========================================
-- 3. VERIFICAR INTEGRIDADE DOS DADOS
-- ========================================

-- Verificar se todos os xata_id foram gerados
SELECT 
    'products' as tabela,
    COUNT(*) as total,
    COUNT(xata_id) as com_xata_id,
    COUNT(*) - COUNT(xata_id) as sem_xata_id
FROM products
UNION ALL
SELECT 
    'categories',
    COUNT(*),
    COUNT(xata_id),
    COUNT(*) - COUNT(xata_id)
FROM categories
UNION ALL
SELECT 
    'brands',
    COUNT(*),
    COUNT(xata_id),
    COUNT(*) - COUNT(xata_id)
FROM brands
UNION ALL
SELECT 
    'product_images',
    COUNT(*),
    COUNT(xata_id),
    COUNT(*) - COUNT(xata_id)
FROM product_images
UNION ALL
SELECT 
    'users',
    COUNT(*),
    COUNT(xata_id),
    COUNT(*) - COUNT(xata_id)
FROM users
UNION ALL
SELECT 
    'sellers',
    COUNT(*),
    COUNT(xata_id),
    COUNT(*) - COUNT(xata_id)
FROM sellers;

-- ========================================
-- 4. VERIFICAR RELACIONAMENTOS
-- ========================================

-- Verificar integridade referencial
SELECT 
    'Products sem categoria válida' as verificacao,
    COUNT(*) as quantidade
FROM products p
WHERE p.category_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id)
UNION ALL
SELECT 
    'Products sem marca válida',
    COUNT(*)
FROM products p
WHERE p.brand_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = p.brand_id)
UNION ALL
SELECT 
    'Products sem vendedor válido',
    COUNT(*)
FROM products p
WHERE p.seller_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM sellers s WHERE s.id = p.seller_id)
UNION ALL
SELECT 
    'Product images sem produto válido',
    COUNT(*)
FROM product_images pi
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = pi.product_id)
UNION ALL
SELECT 
    'Sellers sem usuário válido',
    COUNT(*)
FROM sellers s
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);

-- ========================================
-- 5. VERIFICAR DADOS CRÍTICOS
-- ========================================

-- Verificar alguns produtos específicos
SELECT 
    p.xata_id,
    p.id,
    p.name,
    p.slug,
    p.price,
    c.name as categoria,
    b.name as marca,
    p.xata_version,
    p.xata_createdat,
    p.xata_updatedat
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LIMIT 10;

-- ========================================
-- 6. VERIFICAR TRIGGERS
-- ========================================

-- Listar triggers criados (se houver suporte)
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN ('products', 'categories', 'brands', 'product_images', 'users', 'sellers')
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 7. TESTAR ATUALIZAÇÃO DE REGISTRO
-- ========================================

-- Para testar se as colunas Xata são atualizadas corretamente,
-- execute estas queries separadamente:

-- 1. Primeiro, veja o estado atual de um produto
SELECT id, name, xata_version, xata_updatedat 
FROM products 
LIMIT 1;

-- 2. Atualize o produto (anote o ID do passo anterior)
-- UPDATE products 
-- SET view_count = view_count + 1 
-- WHERE id = 'ID_DO_PRODUTO_AQUI';

-- 3. Verifique se versão foi incrementada
-- SELECT id, name, xata_version, xata_updatedat 
-- FROM products 
-- WHERE id = 'ID_DO_PRODUTO_AQUI';

-- ========================================
-- 8. RESUMO FINAL
-- ========================================

SELECT 
    '=== RESUMO DA MIGRAÇÃO ===' as info
UNION ALL
SELECT 
    'Total de produtos migrados: ' || COUNT(*)::text
FROM products
UNION ALL
SELECT 
    'Total de categorias migradas: ' || COUNT(*)::text
FROM categories
UNION ALL
SELECT 
    'Total de marcas migradas: ' || COUNT(*)::text
FROM brands
UNION ALL
SELECT 
    'Total de imagens migradas: ' || COUNT(*)::text
FROM product_images
UNION ALL
SELECT 
    'Total de usuários migrados: ' || COUNT(*)::text
FROM users
UNION ALL
SELECT 
    'Total de vendedores migrados: ' || COUNT(*)::text
FROM sellers; 