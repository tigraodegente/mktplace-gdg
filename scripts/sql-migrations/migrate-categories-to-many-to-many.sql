-- =====================================================
-- MIGRAÇÃO: CATEGORIAS 1:N PARA N:N
-- =====================================================
-- Script para migrar o sistema de categorias de relacionamento
-- 1:N (campo category_id) para N:N (tabela product_categories)

BEGIN;

-- 1. Verificar se a tabela product_categories já existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        RAISE EXCEPTION 'Tabela product_categories não existe. Execute o script de criação primeiro.';
    END IF;
END $$;

-- 2. Migrar dados existentes para a nova tabela
INSERT INTO product_categories (product_id, category_id, is_primary)
SELECT 
    p.id as product_id,
    p.category_id,
    true as is_primary -- A categoria atual será a primária
FROM products p
WHERE p.category_id IS NOT NULL
  AND NOT EXISTS (
    -- Evitar duplicatas se já migrado
    SELECT 1 
    FROM product_categories pc 
    WHERE pc.product_id = p.id 
      AND pc.category_id = p.category_id
  );

-- 3. Contar registros migrados
SELECT 
    'Migração concluída!' as status,
    COUNT(*) as produtos_migrados 
FROM product_categories
WHERE is_primary = true;

-- 4. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_primary ON product_categories(product_id) WHERE is_primary = true;

-- 5. Adicionar função para obter categorias de um produto
CREATE OR REPLACE FUNCTION get_product_categories(p_product_id UUID)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    category_slug TEXT,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        pc.is_primary
    FROM product_categories pc
    JOIN categories c ON c.id = pc.category_id
    WHERE pc.product_id = p_product_id
    ORDER BY pc.is_primary DESC, c.name;
END;
$$ LANGUAGE plpgsql;

-- 6. Adicionar função para definir categoria primária
CREATE OR REPLACE FUNCTION set_primary_category(p_product_id UUID, p_category_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remover flag primária de todas as categorias do produto
    UPDATE product_categories 
    SET is_primary = false 
    WHERE product_id = p_product_id;
    
    -- Definir nova categoria primária
    UPDATE product_categories 
    SET is_primary = true 
    WHERE product_id = p_product_id 
      AND category_id = p_category_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar view para compatibilidade com código antigo
CREATE OR REPLACE VIEW products_with_primary_category AS
SELECT 
    p.*,
    pc.category_id as primary_category_id
FROM products p
LEFT JOIN product_categories pc ON pc.product_id = p.id AND pc.is_primary = true;

-- 8. Estatísticas da migração
SELECT 
    'Estatísticas da Migração' as titulo,
    (SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL) as produtos_com_categoria_antiga,
    (SELECT COUNT(DISTINCT product_id) FROM product_categories) as produtos_migrados,
    (SELECT COUNT(*) FROM product_categories) as total_relacoes_categoria,
    (SELECT COUNT(*) FROM product_categories WHERE is_primary = true) as categorias_primarias;

COMMIT;

-- NOTA: O campo category_id na tabela products pode ser removido após
-- confirmar que toda a aplicação foi atualizada para usar product_categories
-- ALTER TABLE products DROP COLUMN category_id; 