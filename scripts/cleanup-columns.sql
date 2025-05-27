-- =====================================================
-- SCRIPT DE LIMPEZA E PADRONIZAÇÃO DE COLUNAS
-- =====================================================

-- 1. REMOVER COLUNAS DUPLICADAS
-- =====================================================

-- Remover display_order de categories (já temos position)
ALTER TABLE categories DROP COLUMN IF EXISTS display_order;

-- Remover alt_text de product_images (já temos alt)
ALTER TABLE product_images DROP COLUMN IF EXISTS alt_text;

-- 2. RENOMEAR COLUNAS PARA CONSISTÊNCIA
-- =====================================================

-- Renomear colunas em products para match com os models
ALTER TABLE products RENAME COLUMN stock_quantity TO quantity;
ALTER TABLE products RENAME COLUMN cost_price TO cost;
ALTER TABLE products RENAME COLUMN is_visible TO is_active;

-- 3. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

-- Documentar o propósito de colunas que podem causar confusão
COMMENT ON COLUMN products.supplier_id IS 'DEPRECATED: Use seller_id instead. Kept for migration purposes.';
COMMENT ON COLUMN products.featured IS 'Se o produto está em destaque na home/vitrines';
COMMENT ON COLUMN products.is_active IS 'Se o produto está ativo e visível na loja';
COMMENT ON COLUMN products.published_at IS 'Data de publicação do produto (para agendamento)';
COMMENT ON COLUMN products.stock_location IS 'Localização física do estoque (opcional)';
COMMENT ON COLUMN products.allow_backorder IS 'Permite venda sem estoque (sob encomenda)';

-- 4. CRIAR VIEW PARA COMPATIBILIDADE TEMPORÁRIA
-- =====================================================

-- View para manter compatibilidade durante a transição
CREATE OR REPLACE VIEW products_legacy AS
SELECT 
    *,
    quantity as stock_quantity,
    cost as cost_price,
    is_active as is_visible
FROM products;

COMMENT ON VIEW products_legacy IS 'View de compatibilidade - usar apenas durante migração';

-- 5. VERIFICAR RESULTADO
-- =====================================================

-- Mostrar estrutura final de products
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('quantity', 'cost', 'is_active', 'featured', 'seller_id', 'supplier_id')
ORDER BY ordinal_position;

-- Contar produtos que precisam migração de supplier_id para seller_id
SELECT 
    COUNT(*) as total_products,
    COUNT(supplier_id) as with_supplier,
    COUNT(seller_id) as with_seller,
    COUNT(*) FILTER (WHERE supplier_id IS NOT NULL AND seller_id IS NULL) as need_migration
FROM products; 