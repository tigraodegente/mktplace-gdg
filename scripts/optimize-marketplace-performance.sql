-- =====================================================
-- OTIMIZAÇÕES DE PERFORMANCE PARA MARKETPLACE
-- =====================================================

-- 1. MATERIALIZED VIEWS PARA CONTAGENS RÁPIDAS
-- =====================================================

-- View para contagens gerais de produtos
CREATE MATERIALIZED VIEW IF NOT EXISTS product_counts AS
SELECT 
  COUNT(*) FILTER (WHERE is_active = true) as total_active,
  COUNT(*) FILTER (WHERE is_active = true AND quantity > 0) as in_stock,
  COUNT(*) FILTER (WHERE is_active = true AND quantity = 0) as out_of_stock,
  COUNT(*) FILTER (WHERE featured = true AND is_active = true) as featured,
  COUNT(*) FILTER (WHERE condition = 'new' AND is_active = true) as new_products,
  COUNT(*) FILTER (WHERE condition = 'used' AND is_active = true) as used_products,
  COUNT(*) FILTER (WHERE condition = 'refurbished' AND is_active = true) as refurbished_products,
  COUNT(*) FILTER (WHERE has_free_shipping = true AND is_active = true) as free_shipping,
  COUNT(*) FILTER (WHERE original_price > price AND is_active = true) as with_discount,
  COUNT(*) FILTER (WHERE rating_average >= 4 AND is_active = true) as highly_rated,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days' AND is_active = true) as new_arrivals,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND is_active = true) as recent_products
FROM products;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_counts_unique ON product_counts((1));

-- View para contagens por categoria
CREATE MATERIALIZED VIEW IF NOT EXISTS category_product_counts AS
SELECT 
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug,
  c.parent_id,
  COUNT(DISTINCT p.id) as product_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.quantity > 0) as in_stock_count,
  AVG(p.price)::DECIMAL(10,2) as avg_price,
  MIN(p.price) as min_price,
  MAX(p.price) as max_price
FROM categories c
LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug, c.parent_id;

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_category_counts_id ON category_product_counts(category_id);
CREATE INDEX IF NOT EXISTS idx_category_counts_slug ON category_product_counts(category_slug);

-- View para contagens por marca
CREATE MATERIALIZED VIEW IF NOT EXISTS brand_product_counts AS
SELECT 
  b.id as brand_id,
  b.name as brand_name,
  b.slug as brand_slug,
  COUNT(DISTINCT p.id) as product_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.quantity > 0) as in_stock_count,
  AVG(p.price)::DECIMAL(10,2) as avg_price,
  AVG(p.rating_average)::DECIMAL(3,2) as avg_rating
FROM brands b
LEFT JOIN products p ON p.brand_id = b.id AND p.is_active = true
WHERE b.is_active = true
GROUP BY b.id, b.name, b.slug
HAVING COUNT(DISTINCT p.id) > 0;

-- Índices
CREATE INDEX IF NOT EXISTS idx_brand_counts_id ON brand_product_counts(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_counts_slug ON brand_product_counts(brand_slug);

-- 2. TABELA DE CACHE PARA FACETAS
-- =====================================================

CREATE TABLE IF NOT EXISTS facet_cache (
  cache_key VARCHAR(500) PRIMARY KEY,
  facet_type VARCHAR(50) NOT NULL, -- 'category', 'brand', 'price', etc
  facet_data JSONB NOT NULL,
  query_params JSONB, -- Parâmetros usados para gerar o cache
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_facet_cache_expires ON facet_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_facet_cache_type ON facet_cache(facet_type);
CREATE INDEX IF NOT EXISTS idx_facet_cache_created ON facet_cache(created_at DESC);

-- 3. TABELA DE RANKINGS PRÉ-CALCULADOS
-- =====================================================

CREATE TABLE IF NOT EXISTS product_rankings (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  popularity_score DECIMAL(10,4) DEFAULT 0,
  relevance_score DECIMAL(10,4) DEFAULT 0,
  conversion_score DECIMAL(10,4) DEFAULT 0,
  trending_score DECIMAL(10,4) DEFAULT 0,
  quality_score DECIMAL(10,4) DEFAULT 0,
  overall_score DECIMAL(10,4) DEFAULT 0,
  last_calculated TIMESTAMP DEFAULT NOW()
);

-- Índices para ordenação rápida
CREATE INDEX IF NOT EXISTS idx_rankings_popularity ON product_rankings(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_relevance ON product_rankings(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_overall ON product_rankings(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_trending ON product_rankings(trending_score DESC);

-- 4. TABELA DE BUSCA PRÉ-PROCESSADA
-- =====================================================

CREATE TABLE IF NOT EXISTS search_index (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  search_vector tsvector,
  name_metaphone TEXT,
  tags_array TEXT[],
  category_path TEXT[],
  brand_name TEXT,
  price_range VARCHAR(20),
  attributes JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para busca ultra-rápida
CREATE INDEX IF NOT EXISTS idx_search_vector_gin ON search_index USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_metaphone ON search_index(name_metaphone);
CREATE INDEX IF NOT EXISTS idx_search_tags_gin ON search_index USING gin(tags_array);
CREATE INDEX IF NOT EXISTS idx_search_price_range ON search_index(price_range);

-- 5. TABELA DE CACHE DE QUERIES
-- =====================================================

CREATE TABLE IF NOT EXISTS query_cache (
  query_hash VARCHAR(64) PRIMARY KEY,
  query_text TEXT,
  result_data JSONB,
  result_count INTEGER,
  execution_time_ms INTEGER,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 minutes'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_hits ON query_cache(hit_count DESC);

-- 6. FUNÇÕES PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para atualizar rankings
CREATE OR REPLACE FUNCTION calculate_product_rankings()
RETURNS void AS $$
BEGIN
  INSERT INTO product_rankings (product_id, popularity_score, relevance_score, conversion_score, trending_score, quality_score, overall_score)
  SELECT 
    p.id,
    -- Popularity: vendas + visualizações
    COALESCE((p.sales_count * 2.0 + p.view_count * 0.1) / NULLIF(GREATEST(p.sales_count, p.view_count), 0), 0) as popularity_score,
    
    -- Relevance: avaliações + featured
    COALESCE((p.rating_average * p.rating_count + CASE WHEN p.featured THEN 50 ELSE 0 END) / 100.0, 0) as relevance_score,
    
    -- Conversion: taxa de conversão estimada
    COALESCE(p.sales_count::DECIMAL / NULLIF(p.view_count, 0) * 100, 0) as conversion_score,
    
    -- Trending: vendas recentes
    COALESCE(
      (SELECT COUNT(*) FROM orders o 
       JOIN order_items oi ON oi.order_id = o.id 
       WHERE oi.product_id = p.id 
       AND o.created_at > NOW() - INTERVAL '7 days') * 10.0, 0
    ) as trending_score,
    
    -- Quality: rating + estoque + preço competitivo
    COALESCE(
      (p.rating_average * 20 + 
       CASE WHEN p.quantity > 0 THEN 20 ELSE 0 END +
       CASE WHEN p.price < (SELECT AVG(price) FROM products WHERE category_id = p.category_id) THEN 10 ELSE 0 END
      ) / 50.0, 0
    ) as quality_score,
    
    -- Overall: média ponderada
    COALESCE(
      (
        (p.sales_count * 2.0 + p.view_count * 0.1) / NULLIF(GREATEST(p.sales_count, p.view_count), 0) * 0.3 + -- popularity 30%
        (p.rating_average * p.rating_count + CASE WHEN p.featured THEN 50 ELSE 0 END) / 100.0 * 0.2 + -- relevance 20%
        p.sales_count::DECIMAL / NULLIF(p.view_count, 0) * 100 * 0.2 + -- conversion 20%
        (p.rating_average * 20 + CASE WHEN p.quantity > 0 THEN 20 ELSE 0 END) / 40.0 * 0.3 -- quality 30%
      ), 0
    ) as overall_score
  FROM products p
  WHERE p.is_active = true
  ON CONFLICT (product_id) 
  DO UPDATE SET
    popularity_score = EXCLUDED.popularity_score,
    relevance_score = EXCLUDED.relevance_score,
    conversion_score = EXCLUDED.conversion_score,
    trending_score = EXCLUDED.trending_score,
    quality_score = EXCLUDED.quality_score,
    overall_score = EXCLUDED.overall_score,
    last_calculated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar search index
CREATE OR REPLACE FUNCTION update_search_index()
RETURNS void AS $$
BEGIN
  INSERT INTO search_index (
    product_id, 
    search_vector, 
    name_metaphone,
    tags_array,
    category_path,
    brand_name,
    price_range,
    attributes
  )
  SELECT 
    p.id,
    to_tsvector('portuguese', 
      COALESCE(p.name, '') || ' ' || 
      COALESCE(p.description, '') || ' ' || 
      COALESCE(b.name, '') || ' ' ||
      COALESCE(c.name, '') || ' ' ||
      COALESCE(array_to_string(p.tags, ' '), '')
    ),
    metaphone(p.name, 10),
    p.tags,
    ARRAY[c.name, pc.name],
    b.name,
    CASE 
      WHEN p.price < 50 THEN 'budget'
      WHEN p.price < 200 THEN 'medium'
      WHEN p.price < 1000 THEN 'premium'
      ELSE 'luxury'
    END,
    jsonb_build_object(
      'color', p.specifications->>'color',
      'size', p.specifications->>'size',
      'material', p.specifications->>'material'
    )
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories pc ON pc.id = c.parent_id
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE p.is_active = true
  ON CONFLICT (product_id)
  DO UPDATE SET
    search_vector = EXCLUDED.search_vector,
    name_metaphone = EXCLUDED.name_metaphone,
    tags_array = EXCLUDED.tags_array,
    category_path = EXCLUDED.category_path,
    brand_name = EXCLUDED.brand_name,
    price_range = EXCLUDED.price_range,
    attributes = EXCLUDED.attributes,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para limpar caches expirados
CREATE OR REPLACE FUNCTION cleanup_expired_caches()
RETURNS void AS $$
BEGIN
  DELETE FROM facet_cache WHERE expires_at < NOW();
  DELETE FROM query_cache WHERE expires_at < NOW();
  
  -- Atualizar estatísticas
  ANALYZE facet_cache;
  ANALYZE query_cache;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar search index quando produto muda
CREATE OR REPLACE FUNCTION trigger_update_search_index()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO search_index (
    product_id, 
    search_vector, 
    name_metaphone,
    tags_array,
    category_path,
    brand_name,
    price_range
  )
  SELECT 
    NEW.id,
    to_tsvector('portuguese', 
      COALESCE(NEW.name, '') || ' ' || 
      COALESCE(NEW.description, '') || ' ' || 
      COALESCE(b.name, '') || ' ' ||
      COALESCE(c.name, '') || ' ' ||
      COALESCE(array_to_string(NEW.tags, ' '), '')
    ),
    metaphone(NEW.name, 10),
    NEW.tags,
    ARRAY[c.name, pc.name],
    b.name,
    CASE 
      WHEN NEW.price < 50 THEN 'budget'
      WHEN NEW.price < 200 THEN 'medium'
      WHEN NEW.price < 1000 THEN 'premium'
      ELSE 'luxury'
    END
  FROM categories c
  LEFT JOIN categories pc ON pc.id = c.parent_id
  LEFT JOIN brands b ON b.id = NEW.brand_id
  WHERE c.id = NEW.category_id
  ON CONFLICT (product_id)
  DO UPDATE SET
    search_vector = EXCLUDED.search_vector,
    name_metaphone = EXCLUDED.name_metaphone,
    tags_array = EXCLUDED.tags_array,
    category_path = EXCLUDED.category_path,
    brand_name = EXCLUDED.brand_name,
    price_range = EXCLUDED.price_range,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_search_index ON products;
CREATE TRIGGER update_product_search_index
AFTER INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_update_search_index();

-- 8. JOBS AGENDADOS (CRON)
-- =====================================================

-- Criar extensão pg_cron se disponível
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar refresh das materialized views (a cada hora)
-- SELECT cron.schedule('refresh-product-counts', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY product_counts');
-- SELECT cron.schedule('refresh-category-counts', '5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY category_product_counts');
-- SELECT cron.schedule('refresh-brand-counts', '10 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY brand_product_counts');

-- Agendar cálculo de rankings (a cada 6 horas)
-- SELECT cron.schedule('calculate-rankings', '0 */6 * * *', 'SELECT calculate_product_rankings()');

-- Agendar limpeza de cache (a cada 30 minutos)
-- SELECT cron.schedule('cleanup-caches', '*/30 * * * *', 'SELECT cleanup_expired_caches()');

-- 9. EXECUTAR INICIALIZAÇÃO
-- =====================================================

-- Popular dados iniciais
REFRESH MATERIALIZED VIEW product_counts;
REFRESH MATERIALIZED VIEW category_product_counts;
REFRESH MATERIALIZED VIEW brand_product_counts;

-- Calcular rankings iniciais
SELECT calculate_product_rankings();

-- Criar search index inicial
SELECT update_search_index();

-- Analisar tabelas para otimizar planner
ANALYZE products;
ANALYZE categories;
ANALYZE brands;
ANALYZE product_rankings;
ANALYZE search_index;

-- Mostrar estatísticas
SELECT 
  'Otimizações aplicadas com sucesso!' as status,
  (SELECT total_active FROM product_counts) as produtos_ativos,
  (SELECT COUNT(*) FROM product_rankings) as rankings_calculados,
  (SELECT COUNT(*) FROM search_index) as produtos_indexados; 