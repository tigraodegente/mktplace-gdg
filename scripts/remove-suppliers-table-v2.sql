-- =====================================================
-- SCRIPT PARA REMOVER TABELA SUPPLIERS (OBSOLETA) - V2
-- =====================================================
-- Este script remove com segurança:
-- 1. Views dependentes
-- 2. Foreign keys que referenciam suppliers
-- 3. Colunas supplier_id em outras tabelas
-- 4. A tabela suppliers
-- =====================================================

BEGIN;

-- 1. Remover views dependentes
DROP VIEW IF EXISTS products_legacy CASCADE;

-- 2. Verificar dados antes de remover
SELECT 
    'Produtos com supplier_id não nulo' as info,
    COUNT(*) as total
FROM products
WHERE supplier_id IS NOT NULL;

-- 3. Remover foreign keys
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_supplier_id_fkey;

ALTER TABLE sellers 
DROP CONSTRAINT IF EXISTS sellers_supplier_id_fkey;

-- 4. Remover colunas supplier_id
ALTER TABLE products 
DROP COLUMN IF EXISTS supplier_id CASCADE;

ALTER TABLE sellers 
DROP COLUMN IF EXISTS supplier_id CASCADE;

-- 5. Remover a tabela suppliers
DROP TABLE IF EXISTS suppliers CASCADE;

-- 6. Verificações finais
SELECT 
    'Verificação Final' as status,
    NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') as tabela_removida,
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE column_name = 'supplier_id') as colunas_removidas,
    NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'products_legacy') as view_removida;

COMMIT;

-- 7. Listar tabelas restantes
SELECT 
    tablename as tabela,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as tamanho
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
ORDER BY pg_total_relation_size('public.'||tablename) DESC; 