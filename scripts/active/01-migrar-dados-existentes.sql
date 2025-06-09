-- =========================================================
-- MIGRAÇÃO: Dados existentes para múltiplas categorias
-- =========================================================
-- Migra os 340 produtos já enriquecidos para nova estrutura

BEGIN;

-- 1. Verificar situação atual
SELECT 
    'ANTES DA MIGRAÇÃO' as etapa,
    (SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL AND is_active = true) as produtos_com_category_id,
    (SELECT COUNT(DISTINCT product_id) FROM product_categories) as produtos_na_tabela_nova;

-- 2. Migrar produtos com category_id válido
INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
SELECT 
    p.id as product_id,
    p.category_id,
    true as is_primary, -- A categoria atual será a primária
    NOW() as created_at
FROM products p
WHERE p.category_id IS NOT NULL
    AND p.is_active = true
  AND NOT EXISTS (
    -- Evitar duplicatas se já migrado
    SELECT 1 
    FROM product_categories pc 
    WHERE pc.product_id = p.id 
      AND pc.category_id = p.category_id
  );

-- 3. Verificar resultado
SELECT 
    'APÓS MIGRAÇÃO' as etapa,
    (SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL AND is_active = true) as produtos_com_category_id,
    (SELECT COUNT(DISTINCT product_id) FROM product_categories) as produtos_migrados,
    (SELECT COUNT(*) FROM product_categories) as total_relacoes,
    (SELECT COUNT(*) FROM product_categories WHERE is_primary = true) as categorias_primarias;

-- 4. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_primary ON product_categories(product_id) WHERE is_primary = true;

-- 5. Criar view para compatibilidade (opcional)
CREATE OR REPLACE VIEW products_with_primary_category AS
SELECT 
    p.*,
    pc.category_id as primary_category_id
FROM products p
LEFT JOIN product_categories pc ON pc.product_id = p.id AND pc.is_primary = true;

-- 6. Função para obter categoria primária (para scripts)
CREATE OR REPLACE FUNCTION get_primary_category(p_product_id UUID)
RETURNS UUID AS $$
DECLARE
    category_uuid UUID;
BEGIN
    SELECT category_id INTO category_uuid
    FROM product_categories 
    WHERE product_id = p_product_id AND is_primary = true
    LIMIT 1;
    
    RETURN category_uuid;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Estatísticas finais
SELECT 
    '🎉 MIGRAÇÃO CONCLUÍDA!' as resultado,
    (SELECT COUNT(DISTINCT product_id) FROM product_categories) as produtos_migrados,
    (SELECT COUNT(*) FROM product_categories WHERE is_primary = true) as categorias_primarias; 