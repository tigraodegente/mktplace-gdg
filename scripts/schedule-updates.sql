-- =====================================================
-- SCRIPT PARA AGENDAR ATUALIZAÇÕES AUTOMÁTICAS
-- =====================================================

-- Função para refresh completo (executar a cada hora)
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  -- Refresh das views de contagem
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_counts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY category_product_counts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY brand_product_counts;
  
  -- Limpar caches expirados
  PERFORM cleanup_expired_caches();
  
  -- Log de execução
  INSERT INTO maintenance_log (task_name, status, execution_time)
  VALUES ('refresh_materialized_views', 'success', NOW());
  
  RAISE NOTICE 'Materialized views atualizadas com sucesso em %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar rankings (executar a cada 6 horas)
CREATE OR REPLACE FUNCTION update_all_rankings()
RETURNS void AS $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  products_updated integer;
BEGIN
  start_time := clock_timestamp();
  
  -- Calcular rankings
  PERFORM calculate_product_rankings();
  
  -- Contar produtos atualizados
  SELECT COUNT(*) INTO products_updated
  FROM product_rankings
  WHERE last_calculated >= start_time;
  
  end_time := clock_timestamp();
  
  -- Log de execução
  INSERT INTO maintenance_log (
    task_name, 
    status, 
    execution_time,
    details
  )
  VALUES (
    'update_rankings', 
    'success', 
    NOW(),
    jsonb_build_object(
      'products_updated', products_updated,
      'duration_ms', EXTRACT(MILLISECONDS FROM (end_time - start_time))
    )
  );
  
  RAISE NOTICE 'Rankings atualizados: % produtos em %ms', 
    products_updated, 
    EXTRACT(MILLISECONDS FROM (end_time - start_time));
END;
$$ LANGUAGE plpgsql;

-- Tabela para logs de manutenção
CREATE TABLE IF NOT EXISTS maintenance_log (
  id SERIAL PRIMARY KEY,
  task_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  execution_time TIMESTAMP DEFAULT NOW(),
  details JSONB,
  error_message TEXT
);

CREATE INDEX idx_maintenance_log_task ON maintenance_log(task_name);
CREATE INDEX idx_maintenance_log_time ON maintenance_log(execution_time DESC);

-- Função para monitorar performance
CREATE OR REPLACE FUNCTION monitor_search_performance()
RETURNS TABLE(
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT
) AS $$
BEGIN
  RETURN QUERY
  
  -- Taxa de cache hit
  SELECT 
    'cache_hit_rate'::TEXT,
    CASE 
      WHEN SUM(hit_count) > 0 
      THEN (SUM(hit_count)::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END,
    'percent'::TEXT
  FROM facet_cache
  WHERE created_at > NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  -- Queries mais lentas
  SELECT 
    'slow_queries_count'::TEXT,
    COUNT(*)::NUMERIC,
    'queries'::TEXT
  FROM query_cache
  WHERE execution_time_ms > 1000
    AND created_at > NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  -- Produtos sem ranking
  SELECT 
    'products_without_ranking'::TEXT,
    COUNT(*)::NUMERIC,
    'products'::TEXT
  FROM products p
  LEFT JOIN product_rankings pr ON pr.product_id = p.id
  WHERE p.is_active = true
    AND pr.product_id IS NULL
  
  UNION ALL
  
  -- Idade média do cache
  SELECT 
    'avg_cache_age_minutes'::TEXT,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)::NUMERIC,
    'minutes'::TEXT
  FROM facet_cache
  WHERE expires_at > NOW();
  
END;
$$ LANGUAGE plpgsql;

-- Função para otimizar tabelas (executar semanalmente)
CREATE OR REPLACE FUNCTION optimize_tables()
RETURNS void AS $$
BEGIN
  -- Vacuum e analyze nas tabelas principais
  VACUUM ANALYZE products;
  VACUUM ANALYZE product_rankings;
  VACUUM ANALYZE search_index;
  VACUUM ANALYZE facet_cache;
  VACUUM ANALYZE query_cache;
  
  -- Reindexar se necessário
  REINDEX TABLE CONCURRENTLY products;
  REINDEX TABLE CONCURRENTLY search_index;
  
  -- Log
  INSERT INTO maintenance_log (task_name, status, execution_time)
  VALUES ('optimize_tables', 'success', NOW());
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SIMULAÇÃO DE CRON JOBS COM pg_cron
-- =====================================================
-- Se pg_cron estiver disponível, descomente as linhas abaixo:

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- A cada hora: refresh das views
-- SELECT cron.schedule(
--   'refresh-views-hourly',
--   '0 * * * *',
--   'SELECT refresh_all_materialized_views()'
-- );

-- A cada 6 horas: atualizar rankings
-- SELECT cron.schedule(
--   'update-rankings-6h',
--   '0 */6 * * *',
--   'SELECT update_all_rankings()'
-- );

-- A cada 30 minutos: limpar caches
-- SELECT cron.schedule(
--   'cleanup-caches-30min',
--   '*/30 * * * *',
--   'SELECT cleanup_expired_caches()'
-- );

-- Diariamente às 3AM: otimizar tabelas
-- SELECT cron.schedule(
--   'optimize-tables-daily',
--   '0 3 * * *',
--   'SELECT optimize_tables()'
-- );

-- A cada hora: monitorar performance
-- SELECT cron.schedule(
--   'monitor-performance-hourly',
--   '30 * * * *',
--   'INSERT INTO maintenance_log (task_name, status, details) 
--    SELECT ''performance_monitor'', ''success'', 
--           jsonb_object_agg(metric_name, metric_value) 
--    FROM monitor_search_performance()'
-- );

-- =====================================================
-- ALTERNATIVA: USAR TRIGGERS PARA ATUALIZAÇÃO
-- =====================================================

-- Trigger para atualizar contadores quando produto muda
CREATE OR REPLACE FUNCTION trigger_update_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Marcar views para refresh
  INSERT INTO pending_refreshes (view_name, requested_at)
  VALUES 
    ('product_counts', NOW()),
    ('category_product_counts', NOW()),
    ('brand_product_counts', NOW())
  ON CONFLICT (view_name) DO UPDATE
  SET requested_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela para controlar refreshes pendentes
CREATE TABLE IF NOT EXISTS pending_refreshes (
  view_name VARCHAR(100) PRIMARY KEY,
  requested_at TIMESTAMP NOT NULL,
  processed_at TIMESTAMP
);

-- Função para processar refreshes pendentes (chamar periodicamente)
CREATE OR REPLACE FUNCTION process_pending_refreshes()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT view_name 
    FROM pending_refreshes 
    WHERE processed_at IS NULL
      OR processed_at < requested_at
  LOOP
    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', r.view_name);
    
    UPDATE pending_refreshes 
    SET processed_at = NOW()
    WHERE view_name = r.view_name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DASHBOARD DE MONITORAMENTO
-- =====================================================

-- View para dashboard de performance
CREATE OR REPLACE VIEW performance_dashboard AS
SELECT 
  -- Estatísticas gerais
  (SELECT total_active FROM product_counts) as total_products,
  (SELECT COUNT(*) FROM product_rankings WHERE last_calculated > NOW() - INTERVAL '24 hours') as recently_ranked,
  (SELECT COUNT(*) FROM search_index) as indexed_products,
  
  -- Cache stats
  (SELECT COUNT(*) FROM facet_cache WHERE expires_at > NOW()) as active_cache_entries,
  (SELECT AVG(hit_count) FROM facet_cache WHERE created_at > NOW() - INTERVAL '24 hours') as avg_cache_hits,
  
  -- Performance
  (SELECT AVG(execution_time_ms) FROM query_cache WHERE created_at > NOW() - INTERVAL '1 hour') as avg_query_time_ms,
  (SELECT MAX(execution_time_ms) FROM query_cache WHERE created_at > NOW() - INTERVAL '1 hour') as max_query_time_ms,
  
  -- Últimas atualizações
  (SELECT MAX(execution_time) FROM maintenance_log WHERE task_name = 'refresh_materialized_views') as last_view_refresh,
  (SELECT MAX(execution_time) FROM maintenance_log WHERE task_name = 'update_rankings') as last_ranking_update;

-- Executar monitoramento inicial
SELECT * FROM monitor_search_performance(); 