-- =====================================================
-- CRIAR VENDEDOR GENÉRICO PARA PRODUTOS ÓRFÃOS
-- =====================================================

-- 1. CRIAR USUÁRIO PARA O VENDEDOR GENÉRICO
-- =====================================================

INSERT INTO users (email, password_hash, name, phone, role, is_active, email_verified)
VALUES (
    'vendedor.generico@marketplace.com',
    'temp_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    'Vendedor Genérico - Produtos Diversos',
    '(00) 0000-0000',
    'seller',
    true,
    true -- Marcado como verificado para evitar problemas
)
ON CONFLICT (email) DO NOTHING;

-- 2. CRIAR PERFIL DE VENDEDOR GENÉRICO
-- =====================================================

INSERT INTO sellers (
    user_id,
    store_name,
    store_slug,
    description,
    phone,
    email,
    status,
    commission_rate,
    company_name
)
SELECT 
    u.id,
    'Loja Marketplace - Produtos Diversos',
    'loja-marketplace',
    'Vendedor genérico para produtos sem fornecedor específico. Entre em contato para mais informações sobre o vendedor real.',
    '(00) 0000-0000',
    'vendedor.generico@marketplace.com',
    'active',
    15.00, -- Taxa um pouco maior por ser genérico
    'Marketplace Produtos Diversos'
FROM users u
WHERE u.email = 'vendedor.generico@marketplace.com'
AND NOT EXISTS (
    SELECT 1 FROM sellers s WHERE s.store_slug = 'loja-marketplace'
);

-- 3. VINCULAR PRODUTOS ÓRFÃOS AO VENDEDOR GENÉRICO
-- =====================================================

-- Atualizar produtos sem seller_id
UPDATE products p
SET seller_id = s.id
FROM sellers s
WHERE s.store_slug = 'loja-marketplace'
AND p.seller_id IS NULL;

-- 4. REATIVAR PRODUTOS QUE FORAM VINCULADOS
-- =====================================================

UPDATE products
SET is_active = true
WHERE seller_id = (SELECT id FROM sellers WHERE store_slug = 'loja-marketplace')
AND is_active = false;

-- 5. VERIFICAR RESULTADOS
-- =====================================================

-- Informações do vendedor genérico
SELECT 
    'VENDEDOR GENÉRICO CRIADO' as info,
    s.store_name,
    s.store_slug,
    u.email,
    s.commission_rate || '%' as commission,
    COUNT(p.id) as total_produtos
FROM sellers s
JOIN users u ON s.user_id = u.id
LEFT JOIN products p ON p.seller_id = s.id
WHERE s.store_slug = 'loja-marketplace'
GROUP BY s.id, s.store_name, s.store_slug, u.email, s.commission_rate;

-- Listar alguns produtos do vendedor genérico
SELECT 
    p.name,
    p.sku,
    p.price,
    p.quantity,
    p.is_active
FROM products p
JOIN sellers s ON p.seller_id = s.id
WHERE s.store_slug = 'loja-marketplace'
ORDER BY p.price DESC
LIMIT 10;

-- Estatísticas finais
SELECT 
    'ESTATÍSTICAS FINAIS' as info,
    (SELECT COUNT(*) FROM products WHERE is_active = true) as produtos_ativos,
    (SELECT COUNT(*) FROM products WHERE seller_id IS NULL) as produtos_sem_vendedor,
    (SELECT COUNT(*) FROM sellers) as total_vendedores,
    (SELECT COUNT(*) FROM products WHERE seller_id = (SELECT id FROM sellers WHERE store_slug = 'loja-marketplace')) as produtos_vendedor_generico; 