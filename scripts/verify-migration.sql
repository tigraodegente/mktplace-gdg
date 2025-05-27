-- =====================================================
-- SCRIPT DE VERIFICAÇÃO DA MIGRAÇÃO
-- =====================================================

-- 1. Verificar se as novas tabelas foram criadas
-- =====================================================
SELECT 
    'Tabelas Criadas' as check_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = t.table_name
    )) as created
FROM (
    VALUES 
        ('users'),
        ('sellers'),
        ('orders'),
        ('order_items'),
        ('addresses'),
        ('cart_items')
) t(table_name);

-- 2. Verificar se as colunas foram adicionadas
-- =====================================================
SELECT 
    'Colunas Adicionadas' as check_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = c.table_name 
        AND column_name = c.column_name
    )) as added
FROM (
    VALUES 
        ('products', 'seller_id'),
        ('products', 'featured'),
        ('products', 'barcode'),
        ('categories', 'position'),
        ('product_images', 'alt')
) c(table_name, column_name);

-- 3. Verificar contagem de registros (não deve ter perdido dados)
-- =====================================================
SELECT 
    table_name,
    count
FROM (
    SELECT 'brands' as table_name, COUNT(*) as count FROM brands
    UNION ALL
    SELECT 'categories', COUNT(*) FROM categories
    UNION ALL
    SELECT 'products', COUNT(*) FROM products
    UNION ALL
    SELECT 'product_images', COUNT(*) FROM product_images
    UNION ALL
    SELECT 'suppliers', COUNT(*) FROM suppliers
) counts
ORDER BY table_name;

-- 4. Verificar se há usuários criados
-- =====================================================
SELECT 
    'users' as table_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE role = 'admin') as admins,
    COUNT(*) FILTER (WHERE role = 'seller') as sellers,
    COUNT(*) FILTER (WHERE role = 'customer') as customers
FROM users;

-- 5. Verificar se há sellers criados
-- =====================================================
SELECT 
    'sellers' as table_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE supplier_id IS NOT NULL) as linked_to_supplier,
    COUNT(*) FILTER (WHERE status = 'active') as active
FROM sellers;

-- 6. Verificar produtos com seller_id
-- =====================================================
SELECT 
    'products_migration' as check_type,
    COUNT(*) as total_products,
    COUNT(supplier_id) as with_supplier_id,
    COUNT(seller_id) as with_seller_id,
    COUNT(*) FILTER (WHERE supplier_id IS NOT NULL AND seller_id IS NULL) as pending_migration
FROM products; 