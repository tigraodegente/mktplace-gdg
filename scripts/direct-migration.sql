-- =====================================================
-- MIGRAÇÃO DIRETA DE FORNECEDORES PARA VENDEDORES
-- =====================================================

-- 1. CRIAR USUÁRIOS TEMPORÁRIOS PARA FORNECEDORES
-- =====================================================

-- Inserir usuários com emails temporários baseados no código/nome do fornecedor
INSERT INTO users (email, password_hash, name, phone, role, is_active, email_verified)
SELECT 
    CASE 
        WHEN code IS NOT NULL AND code != '' THEN
            LOWER(REGEXP_REPLACE(code, '[^a-zA-Z0-9]', '', 'g')) || '@temp.marketplace.com'
        ELSE
            LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || '@temp.marketplace.com'
    END as email,
    'temp_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8) as password_hash,
    name,
    COALESCE(contact_phone, 'Não informado') as phone,
    'seller' as role,
    is_active,
    false as email_verified
FROM suppliers
WHERE is_active = true
ON CONFLICT (email) DO NOTHING;

-- Verificar quantos usuários foram criados
SELECT COUNT(*) as users_created FROM users WHERE email LIKE '%@temp.marketplace.com';

-- 2. CRIAR SELLERS BASEADOS NOS SUPPLIERS
-- =====================================================

-- Inserir sellers vinculando com os usuários criados
INSERT INTO sellers (
    user_id,
    supplier_id,
    store_name,
    store_slug,
    phone,
    email,
    status,
    commission_rate,
    cnpj,
    company_name
)
SELECT 
    u.id as user_id,
    s.id as supplier_id,
    s.name as store_name,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(s.name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) || 
        CASE 
            WHEN ROW_NUMBER() OVER (PARTITION BY LOWER(REGEXP_REPLACE(REGEXP_REPLACE(s.name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) ORDER BY s.id) > 1 
            THEN '-' || (ROW_NUMBER() OVER (PARTITION BY LOWER(REGEXP_REPLACE(REGEXP_REPLACE(s.name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) ORDER BY s.id) - 1)::TEXT
            ELSE ''
        END as store_slug,
    COALESCE(s.contact_phone, 'Não informado') as phone,
    u.email,
    'active' as status,
    10.00 as commission_rate,
    CASE 
        WHEN s.code ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$' THEN s.code
        ELSE NULL
    END as cnpj,
    s.name as company_name
FROM suppliers s
JOIN users u ON u.email = CASE 
    WHEN s.code IS NOT NULL AND s.code != '' THEN
        LOWER(REGEXP_REPLACE(s.code, '[^a-zA-Z0-9]', '', 'g')) || '@temp.marketplace.com'
    ELSE
        LOWER(REGEXP_REPLACE(s.name, '[^a-zA-Z0-9]', '', 'g')) || '@temp.marketplace.com'
END
WHERE s.is_active = true
AND NOT EXISTS (SELECT 1 FROM sellers WHERE supplier_id = s.id);

-- Verificar quantos sellers foram criados
SELECT COUNT(*) as sellers_created FROM sellers WHERE supplier_id IS NOT NULL;

-- 3. ATUALIZAR PRODUTOS COM SELLER_ID
-- =====================================================

-- Atualizar produtos vinculando ao seller correto
UPDATE products p
SET seller_id = s.id
FROM sellers s
WHERE p.supplier_id = s.supplier_id
AND p.seller_id IS NULL;

-- Verificar quantos produtos foram atualizados
SELECT 
    COUNT(*) as total_products,
    COUNT(seller_id) as products_with_seller,
    COUNT(*) - COUNT(seller_id) as products_without_seller
FROM products;

-- 4. VERIFICAR RESULTADOS DA MIGRAÇÃO
-- =====================================================

-- Top 20 vendedores por quantidade de produtos
SELECT 
    s.store_name,
    s.store_slug,
    u.email,
    s.status,
    COUNT(p.id) as product_count,
    s.commission_rate || '%' as commission,
    s.cnpj
FROM sellers s
JOIN users u ON s.user_id = u.id
LEFT JOIN products p ON p.seller_id = s.id
WHERE s.supplier_id IS NOT NULL
GROUP BY s.id, s.store_name, s.store_slug, u.email, s.status, s.commission_rate, s.cnpj
ORDER BY product_count DESC
LIMIT 20;

-- Resumo final
SELECT 
    'RESUMO DA MIGRAÇÃO' as info,
    (SELECT COUNT(*) FROM users WHERE email LIKE '%@temp.marketplace.com') as users_created,
    (SELECT COUNT(*) FROM sellers WHERE supplier_id IS NOT NULL) as sellers_created,
    (SELECT COUNT(*) FROM products WHERE seller_id IS NOT NULL) as products_migrated,
    (SELECT COUNT(DISTINCT supplier_id) FROM products WHERE seller_id IS NULL AND supplier_id IS NOT NULL) as suppliers_without_migration;

-- 5. LISTAR CREDENCIAIS TEMPORÁRIAS
-- =====================================================

-- Mostrar credenciais dos principais vendedores
SELECT 
    '=== CREDENCIAIS TEMPORÁRIAS ===' as info
UNION ALL
SELECT 
    s.store_name || ' | Email: ' || u.email || ' | Senha: temp_password | Produtos: ' || COUNT(p.id)::TEXT
FROM sellers s
JOIN users u ON s.user_id = u.id
LEFT JOIN products p ON p.seller_id = s.id
WHERE s.supplier_id IS NOT NULL
GROUP BY s.id, s.store_name, u.email
HAVING COUNT(p.id) > 0
ORDER BY 1
LIMIT 30; 