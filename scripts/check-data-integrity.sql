-- =====================================================
-- VERIFICAÇÃO DE INTEGRIDADE DOS DADOS
-- =====================================================

-- 1. VERIFICAR RELAÇÕES QUEBRADAS
-- =====================================================

-- Produtos com category_id inválido
SELECT 'Produtos com categoria inválida' as check_type, COUNT(*) as count
FROM products p
WHERE p.category_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id);

-- Produtos com brand_id inválido
SELECT 'Produtos com marca inválida' as check_type, COUNT(*) as count
FROM products p
WHERE p.brand_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = p.brand_id);

-- Produtos com supplier_id inválido
SELECT 'Produtos com fornecedor inválido' as check_type, COUNT(*) as count
FROM products p
WHERE p.supplier_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.id = p.supplier_id);

-- Produtos com seller_id inválido
SELECT 'Produtos com vendedor inválido' as check_type, COUNT(*) as count
FROM products p
WHERE p.seller_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM sellers s WHERE s.id = p.seller_id);

-- Product images com product_id inválido
SELECT 'Imagens com produto inválido' as check_type, COUNT(*) as count
FROM product_images pi
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = pi.product_id);

-- Sellers com user_id inválido
SELECT 'Vendedores com usuário inválido' as check_type, COUNT(*) as count
FROM sellers s
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);

-- Sellers com supplier_id inválido
SELECT 'Vendedores com fornecedor inválido' as check_type, COUNT(*) as count
FROM sellers s
WHERE s.supplier_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM suppliers sup WHERE sup.id = s.supplier_id);

-- 2. VERIFICAR DADOS DUPLICADOS
-- =====================================================

-- Emails duplicados em users
SELECT 'Usuários com email duplicado' as check_type, 
       COUNT(*) - COUNT(DISTINCT email) as duplicates
FROM users;

-- SKUs duplicados em products
SELECT 'SKUs duplicados' as check_type, 
       COUNT(*) as total_duplicates
FROM (
    SELECT sku, COUNT(*) as cnt
    FROM products
    WHERE sku IS NOT NULL
    GROUP BY sku
    HAVING COUNT(*) > 1
) dup;

-- Store slugs duplicados
SELECT 'Store slugs duplicados' as check_type,
       COUNT(*) - COUNT(DISTINCT store_slug) as duplicates
FROM sellers;

-- 3. VERIFICAR DADOS ÓRFÃOS
-- =====================================================

-- Categorias sem produtos
SELECT 'Categorias sem produtos' as check_type, COUNT(*) as count
FROM categories c
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id);

-- Marcas sem produtos
SELECT 'Marcas sem produtos' as check_type, COUNT(*) as count
FROM brands b
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.id);

-- Fornecedores sem produtos
SELECT 'Fornecedores sem produtos' as check_type, COUNT(*) as count
FROM suppliers s
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.supplier_id = s.id);

-- Vendedores sem produtos
SELECT 'Vendedores sem produtos' as check_type, COUNT(*) as count
FROM sellers s
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.seller_id = s.id);

-- Usuários sem seller (exceto admin e customers)
SELECT 'Usuários seller sem perfil de vendedor' as check_type, COUNT(*) as count
FROM users u
WHERE u.role = 'seller'
AND NOT EXISTS (SELECT 1 FROM sellers s WHERE s.user_id = u.id);

-- 4. VERIFICAR DADOS INCONSISTENTES
-- =====================================================

-- Produtos ativos sem estoque
SELECT 'Produtos ativos sem estoque' as check_type, COUNT(*) as count
FROM products
WHERE is_active = true
AND quantity = 0
AND track_inventory = true;

-- Produtos com preços inválidos
SELECT 'Produtos com preço zero ou negativo' as check_type, COUNT(*) as count
FROM products
WHERE price <= 0;

-- Sellers ativos sem comissão definida
SELECT 'Vendedores sem taxa de comissão' as check_type, COUNT(*) as count
FROM sellers
WHERE commission_rate IS NULL OR commission_rate = 0;

-- 5. RESUMO DETALHADO DE PROBLEMAS
-- =====================================================

-- Listar produtos com múltiplos problemas
SELECT 
    p.id,
    p.name,
    p.sku,
    CASE WHEN p.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = p.category_id) 
         THEN 'Categoria inválida' ELSE NULL END as categoria_problema,
    CASE WHEN p.brand_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brands WHERE id = p.brand_id) 
         THEN 'Marca inválida' ELSE NULL END as marca_problema,
    CASE WHEN p.supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM suppliers WHERE id = p.supplier_id) 
         THEN 'Fornecedor inválido' ELSE NULL END as fornecedor_problema,
    CASE WHEN p.seller_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sellers WHERE id = p.seller_id) 
         THEN 'Vendedor inválido' ELSE NULL END as vendedor_problema,
    CASE WHEN p.price <= 0 THEN 'Preço inválido' ELSE NULL END as preco_problema,
    CASE WHEN p.is_active = true AND p.quantity = 0 AND p.track_inventory = true 
         THEN 'Ativo sem estoque' ELSE NULL END as estoque_problema
FROM products p
WHERE 
    (p.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = p.category_id))
    OR (p.brand_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brands WHERE id = p.brand_id))
    OR (p.supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM suppliers WHERE id = p.supplier_id))
    OR (p.seller_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sellers WHERE id = p.seller_id))
    OR p.price <= 0
    OR (p.is_active = true AND p.quantity = 0 AND p.track_inventory = true)
LIMIT 20;

-- 6. ESTATÍSTICAS GERAIS
-- =====================================================

SELECT 
    'RESUMO DE INTEGRIDADE' as info,
    (SELECT COUNT(*) FROM products) as total_produtos,
    (SELECT COUNT(*) FROM products WHERE category_id IS NULL) as produtos_sem_categoria,
    (SELECT COUNT(*) FROM products WHERE brand_id IS NULL) as produtos_sem_marca,
    (SELECT COUNT(*) FROM products WHERE seller_id IS NULL) as produtos_sem_vendedor,
    (SELECT COUNT(*) FROM products WHERE price <= 0) as produtos_preco_invalido,
    (SELECT COUNT(DISTINCT sku) FROM products WHERE sku IN (
        SELECT sku FROM products GROUP BY sku HAVING COUNT(*) > 1
    )) as skus_duplicados; 