-- ✅ MIGRATION: Full-text search com tsvector + tsquery
-- Adicionar colunas de busca full-text

-- 1. Adicionar coluna search_vector para full-text search
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Adicionar coluna search_terms se não existir
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS search_terms TEXT;

-- 3. Função para atualizar search_vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.search_terms, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.brand, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para atualizar automaticamente
DROP TRIGGER IF EXISTS trigger_update_product_search_vector ON products;
CREATE TRIGGER trigger_update_product_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- 5. Atualizar dados existentes
UPDATE products SET search_vector = 
  setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('portuguese', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('portuguese', coalesce(search_terms, '')), 'C') ||
  setweight(to_tsvector('portuguese', coalesce(brand, '')), 'D');

-- 6. Índices GIN para performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_vector 
ON products USING GIN(search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_gin 
ON products USING GIN(to_tsvector('portuguese', name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_description_gin 
ON products USING GIN(to_tsvector('portuguese', description));

-- 7. Índices compostos para filtros
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_price 
ON products (is_active, price) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_attributes 
ON products USING GIN (attributes) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_quantity 
ON products (is_active, quantity) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_brand 
ON products (is_active, brand) WHERE is_active = true;

-- 8. Índice para ordenação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_desc 
ON products (created_at DESC) WHERE is_active = true; 