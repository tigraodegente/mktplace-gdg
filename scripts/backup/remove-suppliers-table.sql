-- =====================================================
-- SCRIPT PARA REMOVER TABELA SUPPLIERS (OBSOLETA)
-- =====================================================
-- Este script remove com segurança:
-- 1. Foreign keys que referenciam suppliers
-- 2. Colunas supplier_id em outras tabelas
-- 3. A tabela suppliers
-- =====================================================

BEGIN;

-- 1. Verificar dados antes de remover
SELECT 
    'Produtos com supplier_id' as info,
    COUNT(*) as total,
    COUNT(DISTINCT supplier_id) as suppliers_distintos
FROM products
WHERE supplier_id IS NOT NULL;

SELECT 
    'Sellers com supplier_id' as info,
    COUNT(*) as total,
    COUNT(DISTINCT supplier_id) as suppliers_distintos
FROM sellers
WHERE supplier_id IS NOT NULL;

-- 2. Remover foreign keys
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_supplier_id_fkey;

ALTER TABLE sellers 
DROP CONSTRAINT IF EXISTS sellers_supplier_id_fkey;

-- 3. Remover colunas supplier_id (já migrado para seller_id)
ALTER TABLE products 
DROP COLUMN IF EXISTS supplier_id;

ALTER TABLE sellers 
DROP COLUMN IF EXISTS supplier_id;

-- 4. Remover a tabela suppliers
DROP TABLE IF EXISTS suppliers CASCADE;

-- 5. Verificar que foi removida
SELECT 
    'Tabela suppliers removida' as status,
    NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'suppliers'
    ) as sucesso;

-- 6. Verificar que colunas foram removidas
SELECT 
    'Colunas supplier_id removidas' as status,
    NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE column_name = 'supplier_id' 
        AND table_name IN ('products', 'sellers')
    ) as sucesso;

COMMIT;

-- Relatório final
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename; 