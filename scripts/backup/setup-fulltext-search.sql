-- Script para configurar Full-Text Search no PostgreSQL para o Marketplace GDG
-- Este script deve ser executado no banco de dados Xata

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS unaccent; -- Para remover acentos
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Para busca fuzzy

-- 2. Criar configuração de busca em português
-- Verifica se a configuração já existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_ts_config WHERE cfgname = 'portuguese_unaccent'
    ) THEN
        -- Criar configuração customizada baseada em português
        CREATE TEXT SEARCH CONFIGURATION portuguese_unaccent (COPY = portuguese);
        
        -- Adicionar dicionário unaccent
        ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
        ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part
        WITH unaccent, portuguese_stem;
    END IF;
END $$;

-- 3. Adicionar coluna search_vector se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE products ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- 4. Criar função para gerar search vector
CREATE OR REPLACE FUNCTION products_search_vector_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('portuguese_unaccent', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('portuguese_unaccent', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('portuguese_unaccent', COALESCE(NEW.sku, '')), 'B') ||
        setweight(to_tsvector('portuguese_unaccent', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para atualizar search_vector automaticamente
DROP TRIGGER IF EXISTS products_search_vector_update ON products;
CREATE TRIGGER products_search_vector_update
    BEFORE INSERT OR UPDATE OF name, description, sku, tags
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION products_search_vector_trigger();

-- 6. Atualizar search_vector para produtos existentes
UPDATE products 
SET search_vector = 
    setweight(to_tsvector('portuguese_unaccent', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('portuguese_unaccent', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('portuguese_unaccent', COALESCE(sku, '')), 'B') ||
    setweight(to_tsvector('portuguese_unaccent', COALESCE(array_to_string(tags, ' '), '')), 'C');

-- 7. Criar índices para performance
-- Índice GIN para Full-Text Search
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN (search_vector);

-- Índice GiST para busca fuzzy (trigram)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIST (name gist_trgm_ops);

-- Índice para busca por categoria com produtos ativos
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id) WHERE is_active = true;

-- Índice para busca por marca com produtos ativos
CREATE INDEX IF NOT EXISTS idx_products_brand_active ON products(brand_id) WHERE is_active = true;

-- Índice composto para ordenação por relevância
CREATE INDEX IF NOT EXISTS idx_products_featured_sales ON products(featured DESC, sales_count DESC) WHERE is_active = true;

-- 8. Criar função helper para websearch_to_tsquery com fallback
CREATE OR REPLACE FUNCTION safe_websearch_to_tsquery(config regconfig, query_text text)
RETURNS tsquery AS $$
BEGIN
    -- Tentar websearch_to_tsquery primeiro
    RETURN websearch_to_tsquery(config, query_text);
EXCEPTION
    WHEN OTHERS THEN
        -- Se falhar, tentar plainto_tsquery
        BEGIN
            RETURN plainto_tsquery(config, query_text);
        EXCEPTION
            WHEN OTHERS THEN
                -- Se ainda falhar, retornar query vazia
                RETURN to_tsquery(config, '');
        END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Criar view materializada para estatísticas de categorias (opcional, para performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS category_product_counts AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    COUNT(DISTINCT p.id) as product_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p.quantity > 0) as in_stock_count,
    AVG(p.price) as avg_price,
    MIN(p.price) as min_price,
    MAX(p.price) as max_price
FROM categories c
LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
GROUP BY c.id, c.name;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_product_counts_id ON category_product_counts(category_id);

-- 10. Criar view materializada para estatísticas de marcas (opcional, para performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS brand_product_counts AS
SELECT 
    b.id as brand_id,
    b.name as brand_name,
    COUNT(DISTINCT p.id) as product_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p.quantity > 0) as in_stock_count,
    AVG(p.price) as avg_price,
    MIN(p.price) as min_price,
    MAX(p.price) as max_price
FROM brands b
LEFT JOIN products p ON p.brand_id = b.id AND p.is_active = true
GROUP BY b.id, b.name;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_product_counts_id ON brand_product_counts(brand_id);

-- 11. Função para refresh das views materializadas (executar periodicamente)
CREATE OR REPLACE FUNCTION refresh_product_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_product_counts;
    REFRESH MATERIALIZED VIEW CONCURRENTLY brand_product_counts;
END;
$$ LANGUAGE plpgsql;

-- 12. Adicionar comentários para documentação
COMMENT ON COLUMN products.search_vector IS 'Vetor de busca Full-Text Search com pesos: A=nome, B=descrição/sku, C=tags';
COMMENT ON INDEX idx_products_search_vector IS 'Índice GIN para busca Full-Text Search em português';
COMMENT ON INDEX idx_products_name_trgm IS 'Índice GiST para busca fuzzy (correção de erros de digitação)';
COMMENT ON FUNCTION safe_websearch_to_tsquery IS 'Wrapper seguro para websearch_to_tsquery com fallback para queries inválidas';

-- Exemplo de uso:
-- SELECT id, name, ts_rank(search_vector, query) as rank
-- FROM products, safe_websearch_to_tsquery('portuguese_unaccent', 'kit berço') query
-- WHERE search_vector @@ query
-- ORDER BY rank DESC;

-- Para busca fuzzy:
-- SELECT id, name, similarity(name, 'berso') as sim
-- FROM products
-- WHERE name % 'berso'
-- ORDER BY sim DESC; 