--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: assign_user_to_ab_test(uuid, uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_user_to_ab_test(p_test_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_session_id character varying DEFAULT NULL::character varying) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    assigned_variant_id UUID;
    random_value DECIMAL;
    cumulative_split DECIMAL := 0;
    variant_record RECORD;
    test_active BOOLEAN;
BEGIN
    -- Verificar se teste está ativo
    SELECT status = 'running' INTO test_active
    FROM ab_tests WHERE id = p_test_id;
    
    IF NOT test_active THEN
        RETURN NULL;
    END IF;
    
    -- Verificar se usuário já está atribuído
    IF p_user_id IS NOT NULL THEN
        SELECT variant_id INTO assigned_variant_id
        FROM ab_test_assignments
        WHERE test_id = p_test_id AND user_id = p_user_id;
    ELSE
        SELECT variant_id INTO assigned_variant_id
        FROM ab_test_assignments
        WHERE test_id = p_test_id AND session_id = p_session_id;
    END IF;
    
    IF assigned_variant_id IS NOT NULL THEN
        RETURN assigned_variant_id;
    END IF;
    
    -- Gerar número aleatório para atribuição
    random_value := RANDOM() * 100;
    
    -- Atribuir baseado no traffic_split
    FOR variant_record IN 
        SELECT id, traffic_split 
        FROM ab_test_variants 
        WHERE test_id = p_test_id 
        ORDER BY created_at
    LOOP
        cumulative_split := cumulative_split + variant_record.traffic_split;
        IF random_value <= cumulative_split THEN
            assigned_variant_id := variant_record.id;
            EXIT;
        END IF;
    END LOOP;
    
    -- Salvar atribuição
    INSERT INTO ab_test_assignments (test_id, variant_id, user_id, session_id)
    VALUES (p_test_id, assigned_variant_id, p_user_id, p_session_id);
    
    RETURN assigned_variant_id;
END;
$$;


--
-- Name: calculate_integration_metrics(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_integration_metrics(p_provider_id uuid DEFAULT NULL::uuid, p_period_type character varying DEFAULT 'hour'::character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    metrics_count INTEGER := 0;
    provider_record RECORD;
    period_start TIMESTAMP WITH TIME ZONE;
    period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Definir período baseado no tipo
    CASE p_period_type
        WHEN 'minute' THEN
            period_start := date_trunc('minute', NOW() - INTERVAL '1 minute');
            period_end := date_trunc('minute', NOW());
        WHEN 'hour' THEN
            period_start := date_trunc('hour', NOW() - INTERVAL '1 hour');
            period_end := date_trunc('hour', NOW());
        WHEN 'day' THEN
            period_start := date_trunc('day', NOW() - INTERVAL '1 day');
            period_end := date_trunc('day', NOW());
        ELSE
            period_start := date_trunc('hour', NOW() - INTERVAL '1 hour');
            period_end := date_trunc('hour', NOW());
    END CASE;
    
    -- Loop pelos providers
    FOR provider_record IN
        SELECT id, name FROM integration_providers 
        WHERE (p_provider_id IS NULL OR id = p_provider_id)
        AND is_active = true
    LOOP
        -- Calcular métricas da fila de retry
        INSERT INTO integration_metrics (
            provider_id,
            operation,
            period_start,
            period_end,
            period_type,
            total_requests,
            successful_requests,
            failed_requests,
            avg_response_time_ms,
            success_rate,
            error_rate
        )
        SELECT 
            provider_record.id,
            'all_operations',
            period_start,
            period_end,
            p_period_type,
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'success'),
            COUNT(*) FILTER (WHERE status = 'failed'),
            AVG(response_time_ms)::INTEGER,
            ROUND(
                COUNT(*) FILTER (WHERE status = 'success') * 100.0 / NULLIF(COUNT(*), 0),
                2
            ),
            ROUND(
                COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / NULLIF(COUNT(*), 0),
                2
            )
        FROM integration_retry_queue
        WHERE provider_id = provider_record.id
        AND created_at >= period_start
        AND created_at < period_end
        HAVING COUNT(*) > 0
        ON CONFLICT (provider_id, operation, period_start, period_type) 
        DO UPDATE SET
            total_requests = EXCLUDED.total_requests,
            successful_requests = EXCLUDED.successful_requests,
            failed_requests = EXCLUDED.failed_requests,
            avg_response_time_ms = EXCLUDED.avg_response_time_ms,
            success_rate = EXCLUDED.success_rate,
            error_rate = EXCLUDED.error_rate;
        
        GET DIAGNOSTICS metrics_count = ROW_COUNT;
    END LOOP;
    
    RETURN metrics_count;
END;
$$;


--
-- Name: calculate_product_rankings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_product_rankings() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: cleanup_expired_caches(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_caches() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM facet_cache WHERE expires_at < NOW();
  DELETE FROM query_cache WHERE expires_at < NOW();
  
  -- Atualizar estatísticas
  ANALYZE facet_cache;
  ANALYZE query_cache;
END;
$$;


--
-- Name: create_audit_log(uuid, character varying, character varying, character varying, jsonb, jsonb, inet, character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_audit_log(p_user_id uuid, p_table_name character varying, p_record_id character varying, p_action character varying, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_session_id character varying DEFAULT NULL::character varying, p_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    audit_id UUID;
    changed_fields TEXT[];
BEGIN
    -- Calcular campos alterados
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT ARRAY_AGG(key) INTO changed_fields
        FROM jsonb_each(p_old_values) old
        JOIN jsonb_each(p_new_values) new ON old.key = new.key
        WHERE old.value != new.value;
    END IF;
    
    INSERT INTO audit_logs (
        user_id, table_name, record_id, action,
        old_values, new_values, changed_fields,
        ip_address, session_id, reason
    ) VALUES (
        p_user_id, p_table_name, p_record_id, p_action,
        p_old_values, p_new_values, changed_fields,
        p_ip_address, p_session_id, p_reason
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$;


--
-- Name: find_shipping_zone(character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_shipping_zone(p_postal_code character varying, p_carrier_id text DEFAULT NULL::text) RETURNS TABLE(zone_id text, zone_name character varying, carrier_id text, delivery_days_min integer, delivery_days_max integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.id,
        z.name,
        z.carrier_id,
        z.delivery_days_min,
        z.delivery_days_max
    FROM shipping_zones z
    JOIN shipping_carriers c ON z.carrier_id = c.id
    WHERE z.is_active = true 
      AND c.is_active = true
      AND (p_carrier_id IS NULL OR z.carrier_id = p_carrier_id)
      AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(z.postal_code_ranges) as range
          WHERE p_postal_code BETWEEN (range->>'from') AND (range->>'to')
      )
    ORDER BY z.delivery_days_min ASC;
END;
$$;


--
-- Name: find_shipping_zone_advanced(character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_shipping_zone_advanced(p_postal_code character varying, p_carrier_id text DEFAULT NULL::text) RETURNS TABLE(zone_id text, zone_name character varying, carrier_id text, uf character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.id,
        z.name,
        z.carrier_id,
        z.uf
    FROM shipping_zones z
    JOIN shipping_carriers c ON z.carrier_id = c.id
    WHERE z.is_active = true 
      AND c.is_active = true
      AND (p_carrier_id IS NULL OR z.carrier_id = p_carrier_id)
      AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(z.postal_code_ranges) as range
          WHERE p_postal_code BETWEEN (range->>'from') AND (range->>'to')
      );
END;
$$;


--
-- Name: generate_calculated_options(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_calculated_options(p_base_rate_id text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    base_rate RECORD;
    modality RECORD;
    new_weight_rules JSONB;
    new_delivery_days INTEGER;
    rule JSONB;
    calculated_id TEXT;
    options_count INTEGER := 0;
BEGIN
    -- Buscar dados base
    SELECT * INTO base_rate FROM shipping_base_rates WHERE id = p_base_rate_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Limpar opções antigas
    DELETE FROM shipping_calculated_options WHERE base_rate_id = p_base_rate_id;
    
    -- Gerar para cada modalidade ativa
    FOR modality IN 
        SELECT * FROM shipping_modalities 
        WHERE is_active = true 
        ORDER BY priority ASC
    LOOP
        -- Calcular nova tabela de preços
        new_weight_rules := '[]'::jsonb;
        
        FOR rule IN 
            SELECT value FROM jsonb_array_elements(base_rate.weight_rules)
        LOOP
            new_weight_rules := new_weight_rules || jsonb_build_array(
                jsonb_build_object(
                    'from', (rule->>'from')::integer,
                    'to', (rule->>'to')::integer,
                    'price', ROUND(((rule->>'price')::decimal * modality.price_multiplier)::numeric, 2)
                )
            );
        END LOOP;
        
        -- Calcular novo prazo
        new_delivery_days := CEIL(base_rate.base_delivery_days * modality.days_multiplier);
        
        -- Inserir opção calculada
        INSERT INTO shipping_calculated_options (
            base_rate_id,
            modality_id, 
            zone_id,
            calculated_weight_rules,
            calculated_delivery_days,
            calculated_fees,
            expires_at
        ) VALUES (
            p_base_rate_id,
            modality.id,
            base_rate.zone_id,
            new_weight_rules,
            new_delivery_days,
            base_rate.additional_fees,
            NOW() + INTERVAL '24 hours'
        );
        
        options_count := options_count + 1;
    END LOOP;
    
    RETURN options_count;
END;
$$;


--
-- Name: generate_share_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_share_token() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'gift_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 20));
END;
$$;


--
-- Name: generate_share_token_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_share_token_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.share_token IS NULL THEN
        NEW.share_token := generate_share_token();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: get_available_apps(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_available_apps(user_roles text[]) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
    apps TEXT[] := '{}';
BEGIN
    IF 'customer' = ANY(user_roles) THEN
        apps := array_append(apps, 'store');
    END IF;
    
    IF 'vendor' = ANY(user_roles) THEN
        apps := array_append(apps, 'vendor');
    END IF;
    
    IF 'admin' = ANY(user_roles) THEN
        apps := array_append(apps, 'admin');
    END IF;
    
    RETURN apps;
END;
$$;


--
-- Name: log_gift_list_activity(uuid, uuid, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_gift_list_activity(p_list_id uuid, p_user_id uuid, p_action character varying, p_details jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, table_name, record_id, action, new_values, metadata
    ) VALUES (
        p_user_id, 'gift_lists', p_list_id::VARCHAR, p_action, p_details, 
        jsonb_build_object('category', 'gift_list', 'timestamp', NOW())
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


--
-- Name: monitor_search_performance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.monitor_search_performance() RETURNS TABLE(metric_name text, metric_value numeric, metric_unit text)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: optimize_tables(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.optimize_tables() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: process_integration_retry_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_integration_retry_queue() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    processed_count INTEGER := 0;
    retry_record RECORD;
    retry_delay INTEGER;
    next_retry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar itens elegíveis para retry
    FOR retry_record IN 
        SELECT 
            irq.*,
            ip.retry_config,
            ip.name as provider_name
        FROM integration_retry_queue irq
        JOIN integration_providers ip ON irq.provider_id = ip.id
        WHERE irq.status IN ('pending', 'retrying')
        AND (irq.next_retry_at IS NULL OR irq.next_retry_at <= NOW())
        AND irq.attempts < irq.max_attempts
        ORDER BY irq.priority ASC, irq.created_at ASC
        LIMIT 100
    LOOP
        -- Calcular próximo retry baseado na estratégia
        retry_delay := CASE 
            WHEN (retry_record.retry_config->>'backoffType')::TEXT = 'exponential' THEN
                (retry_record.retry_config->>'baseDelay')::INTEGER * POWER(2, retry_record.attempts)
            WHEN (retry_record.retry_config->>'backoffType')::TEXT = 'linear' THEN
                (retry_record.retry_config->>'baseDelay')::INTEGER * (retry_record.attempts + 1)
            ELSE
                (retry_record.retry_config->>'baseDelay')::INTEGER
        END;
        
        -- Limitar delay máximo
        retry_delay := LEAST(retry_delay, COALESCE((retry_record.retry_config->>'maxDelay')::INTEGER, 300000));
        
        next_retry := NOW() + (retry_delay || ' milliseconds')::INTERVAL;
        
        -- Atualizar status para processing
        UPDATE integration_retry_queue 
        SET 
            status = 'processing',
            attempts = attempts + 1,
            next_retry_at = next_retry,
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = retry_record.id;
        
        -- Log do retry
        INSERT INTO integration_logs (
            provider_id,
            retry_queue_id,
            event_type,
            level,
            message,
            operation,
            reference_id,
            reference_type,
            metadata
        ) VALUES (
            retry_record.provider_id,
            retry_record.id,
            'retry_scheduled',
            'info',
            format('Retry %s/%s agendado para %s', 
                retry_record.attempts + 1, 
                retry_record.max_attempts,
                next_retry
            ),
            retry_record.operation,
            retry_record.reference_id,
            retry_record.reference_type,
            jsonb_build_object(
                'attempt', retry_record.attempts + 1,
                'next_retry_at', next_retry,
                'delay_ms', retry_delay
            )
        );
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$;


--
-- Name: process_pending_refreshes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_pending_refreshes() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: process_webhook_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_webhook_queue() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    processed_count INTEGER := 0;
    webhook_record RECORD;
BEGIN
    FOR webhook_record IN 
        SELECT * FROM webhook_events 
        WHERE status = 'pending' 
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY priority ASC, created_at ASC
        LIMIT 50
    LOOP
        -- Atualizar status para 'retrying'
        UPDATE webhook_events 
        SET 
            status = 'retrying',
            attempts = attempts + 1,
            next_retry_at = NOW() + (INTERVAL '5 minutes' * POWER(2, attempts))
        WHERE id = webhook_record.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$;


--
-- Name: record_gift_list_metric(uuid, character varying, numeric, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_gift_list_metric(p_list_id uuid, p_metric_name character varying, p_metric_value numeric, p_source character varying DEFAULT NULL::character varying, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    analytics_id UUID;
BEGIN
    INSERT INTO gift_list_analytics (
        list_id, metric_name, metric_value, date_dimension, source, metadata
    ) VALUES (
        p_list_id, p_metric_name, p_metric_value, CURRENT_DATE, p_source, p_metadata
    ) RETURNING id INTO analytics_id;
    
    RETURN analytics_id;
END;
$$;


--
-- Name: refresh_all_materialized_views(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_all_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: select_payment_gateway(character varying, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.select_payment_gateway(p_payment_method character varying, p_order_total numeric) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_gateway_name VARCHAR;
BEGIN
  SELECT name INTO v_gateway_name
  FROM payment_gateways
  WHERE is_active = true
    AND supported_methods::jsonb ? p_payment_method
    AND (min_amount IS NULL OR p_order_total >= min_amount)
    AND (max_amount IS NULL OR p_order_total <= max_amount)
  ORDER BY priority DESC
  LIMIT 1;
  
  RETURN COALESCE(v_gateway_name, 'default');
END;
$$;


--
-- Name: trigger_update_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: trigger_update_search_index(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_search_index() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    LOWER(NEW.name), -- Usar lowercase ao invés de metaphone
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
$$;


--
-- Name: update_all_rankings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_all_rankings() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_gift_list_amounts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_gift_list_amounts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Atualizar valor coletado do item
    UPDATE gift_list_items 
    SET 
        collected_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM gift_contributions 
            WHERE item_id = NEW.item_id AND payment_status = 'paid'
        ),
        is_purchased = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM gift_contributions 
            WHERE item_id = NEW.item_id AND payment_status = 'paid'
        ) >= target_amount,
        updated_at = NOW()
    WHERE id = NEW.item_id;
    
    -- Atualizar valor total coletado da lista
    UPDATE gift_lists 
    SET 
        collected_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM gift_contributions 
            WHERE list_id = NEW.list_id AND payment_status = 'paid'
        ),
        contribution_count = (
            SELECT COUNT(*) 
            FROM gift_contributions 
            WHERE list_id = NEW.list_id AND payment_status = 'paid'
        ),
        updated_at = NOW()
    WHERE id = NEW.list_id;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_popular_searches(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_popular_searches() RETURNS void
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Inserir ou atualizar termos populares baseado no histórico dos últimos 30 dias
        INSERT INTO popular_searches (term, search_count, period_start, period_end)
        SELECT 
          LOWER(TRIM(query)) as term,
          COUNT(*) as search_count,
          CURRENT_DATE - INTERVAL '30 days' as period_start,
          CURRENT_DATE as period_end
        FROM search_history
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND query IS NOT NULL
          AND TRIM(query) != ''
        GROUP BY LOWER(TRIM(query))
        HAVING COUNT(*) >= 3  -- Mínimo de 3 buscas para ser considerado popular
        ON CONFLICT (term) DO UPDATE
        SET 
          search_count = EXCLUDED.search_count,
          last_searched_at = NOW(),
          period_end = EXCLUDED.period_end,
          updated_at = NOW();
      END;
      $$;


--
-- Name: update_search_index(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_search_index() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
    LOWER(p.name), -- Usar lowercase ao invés de metaphone
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: user_has_role(text[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_role(user_roles text[], check_role text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN check_role = ANY(user_roles);
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ab_test_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_test_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid,
    variant_id uuid,
    user_id uuid,
    session_id character varying(255),
    assigned_at timestamp with time zone DEFAULT now()
);


--
-- Name: ab_test_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_test_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid,
    variant_id uuid,
    user_id uuid,
    session_id character varying(255),
    event_type character varying(100) NOT NULL,
    event_value numeric(10,2),
    event_data jsonb DEFAULT '{}'::jsonb,
    page_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ab_test_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_test_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid,
    name character varying(100) NOT NULL,
    description text,
    traffic_split numeric(5,2) NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    is_control boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ab_test_variants_traffic_split_check CHECK (((traffic_split >= (0)::numeric) AND (traffic_split <= (100)::numeric)))
);


--
-- Name: ab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    hypothesis text,
    success_metric character varying(100),
    status character varying(20) DEFAULT 'draft'::character varying,
    traffic_allocation numeric(5,2) DEFAULT 100.00,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    min_sample_size integer DEFAULT 1000,
    confidence_level numeric(4,2) DEFAULT 95.00,
    statistical_significance numeric(5,4),
    winner_variant_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ab_tests_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'running'::character varying, 'paused'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT ab_tests_traffic_allocation_check CHECK (((traffic_allocation >= (0)::numeric) AND (traffic_allocation <= (100)::numeric)))
);


--
-- Name: TABLE ab_tests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ab_tests IS 'Sistema de testes A/B para otimização';


--
-- Name: abandoned_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abandoned_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    user_id uuid,
    email character varying(255),
    total_value numeric(10,2),
    reminder_sent_count integer DEFAULT 0,
    last_reminder_at timestamp without time zone,
    recovered boolean DEFAULT false,
    recovered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    street character varying(255) NOT NULL,
    number character varying(50) NOT NULL,
    complement character varying(255),
    neighborhood character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    state character varying(2) NOT NULL,
    zip_code character varying(10) NOT NULL,
    label character varying(50),
    type character varying(20) DEFAULT 'shipping'::character varying NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    table_name character varying(100) NOT NULL,
    record_id character varying(100) NOT NULL,
    action character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address inet,
    user_agent text,
    session_id character varying(255),
    reason text,
    risk_level character varying(20) DEFAULT 'low'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_action_check CHECK (((action)::text = ANY ((ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'LOGIN'::character varying, 'LOGOUT'::character varying])::text[]))),
    CONSTRAINT audit_logs_risk_level_check CHECK (((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_logs IS 'Sistema de auditoria completo para rastreamento de todas as ações';


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    subtitle text,
    image_url character varying(500) NOT NULL,
    link_url character varying(500),
    "position" character varying(50) DEFAULT 'home'::character varying NOT NULL,
    display_order integer DEFAULT 0,
    starts_at timestamp without time zone,
    ends_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    logo_url character varying(500),
    website character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku character varying(100) NOT NULL,
    name character varying(500) NOT NULL,
    slug character varying(500) NOT NULL,
    description text,
    brand_id uuid,
    category_id uuid,
    seller_id uuid,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    price numeric(10,2) NOT NULL,
    original_price numeric(10,2),
    cost numeric(10,2),
    currency character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    stock_location character varying(255),
    track_inventory boolean DEFAULT true NOT NULL,
    allow_backorder boolean DEFAULT false,
    weight numeric(10,3),
    height numeric(10,2),
    width numeric(10,2),
    length numeric(10,2),
    meta_title character varying(255),
    meta_description text,
    meta_keywords text[],
    tags text[],
    attributes jsonb,
    specifications jsonb,
    view_count integer DEFAULT 0 NOT NULL,
    sales_count integer DEFAULT 0 NOT NULL,
    rating_average numeric(3,2),
    rating_count integer DEFAULT 0 NOT NULL,
    featured boolean DEFAULT false,
    barcode character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    published_at timestamp without time zone,
    condition character varying(20) DEFAULT 'new'::character varying,
    delivery_days integer DEFAULT 3,
    has_free_shipping boolean DEFAULT false,
    seller_state character varying(2),
    seller_city character varying(100),
    model character varying(255),
    delivery_days_min integer DEFAULT 3,
    delivery_days_max integer DEFAULT 7,
    short_description text,
    CONSTRAINT products_condition_check CHECK (((condition)::text = ANY ((ARRAY['new'::character varying, 'used'::character varying, 'refurbished'::character varying])::text[]))),
    CONSTRAINT products_delivery_days_check CHECK ((delivery_days >= 0))
);


--
-- Name: brand_product_counts; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.brand_product_counts AS
 SELECT b.id AS brand_id,
    b.name AS brand_name,
    b.slug AS brand_slug,
    count(DISTINCT p.id) AS product_count,
    count(DISTINCT p.id) FILTER (WHERE (p.quantity > 0)) AS in_stock_count,
    (avg(p.price))::numeric(10,2) AS avg_price,
    (avg(p.rating_average))::numeric(3,2) AS avg_rating
   FROM (public.brands b
     LEFT JOIN public.products p ON (((p.brand_id = b.id) AND (p.is_active = true))))
  WHERE (b.is_active = true)
  GROUP BY b.id, b.name, b.slug
 HAVING (count(DISTINCT p.id) > 0)
  WITH NO DATA;


--
-- Name: campaign_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    metric_name character varying(100) NOT NULL,
    metric_value numeric(15,2) NOT NULL,
    metric_type character varying(20) DEFAULT 'count'::character varying,
    dimension_1 character varying(100),
    dimension_1_value character varying(100),
    dimension_2 character varying(100),
    dimension_2_value character varying(100),
    recorded_at timestamp with time zone DEFAULT now(),
    CONSTRAINT campaign_analytics_metric_type_check CHECK (((metric_type)::text = ANY ((ARRAY['count'::character varying, 'rate'::character varying, 'amount'::character varying, 'duration'::character varying])::text[])))
);


--
-- Name: campaign_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    user_id uuid,
    email character varying(255),
    phone character varying(20),
    status character varying(20) DEFAULT 'pending'::character varying,
    personalization_data jsonb DEFAULT '{}'::jsonb,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    first_click_at timestamp with time zone,
    last_click_at timestamp with time zone,
    converted_at timestamp with time zone,
    conversion_value numeric(10,2),
    unsubscribed_at timestamp with time zone,
    bounce_reason text,
    error_message text,
    retry_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT campaign_recipients_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'delivered'::character varying, 'opened'::character varying, 'clicked'::character varying, 'converted'::character varying, 'bounced'::character varying, 'unsubscribed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    parent_id uuid,
    image_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0,
    path text[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: category_product_counts; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.category_product_counts AS
 SELECT c.id AS category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    c.parent_id,
    count(DISTINCT p.id) AS product_count,
    count(DISTINCT p.id) FILTER (WHERE (p.quantity > 0)) AS in_stock_count,
    (avg(p.price))::numeric(10,2) AS avg_price,
    min(p.price) AS min_price,
    max(p.price) AS max_price
   FROM (public.categories c
     LEFT JOIN public.products p ON (((p.category_id = c.id) AND (p.is_active = true))))
  WHERE (c.is_active = true)
  GROUP BY c.id, c.name, c.slug, c.parent_id
  WITH NO DATA;


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    title text,
    participants uuid[] NOT NULL,
    order_id uuid,
    seller_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    last_message_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_conversations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text, 'archived'::text]))),
    CONSTRAINT chat_conversations_type_check CHECK ((type = ANY (ARRAY['support'::text, 'order'::text, 'seller'::text, 'group'::text])))
);


--
-- Name: chat_message_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_message_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    content text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read_by jsonb DEFAULT '{}'::jsonb,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_message_type_check CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'order'::text, 'product'::text])))
);


--
-- Name: chat_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text NOT NULL,
    last_activity timestamp with time zone DEFAULT now() NOT NULL,
    session_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_presence_status_check CHECK ((status = ANY (ARRAY['online'::text, 'away'::text, 'offline'::text])))
);


--
-- Name: chat_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notifications_enabled boolean DEFAULT true,
    sound_enabled boolean DEFAULT true,
    online_status text DEFAULT 'online'::text,
    last_seen timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_settings_online_status_check CHECK ((online_status = ANY (ARRAY['online'::text, 'away'::text, 'busy'::text, 'offline'::text])))
);


--
-- Name: consent_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    consent_type character varying(100) NOT NULL,
    consent_granted boolean NOT NULL,
    consent_method character varying(50),
    consent_text text,
    consent_version character varying(20),
    processing_activity_id uuid,
    ip_address inet,
    user_agent text,
    geolocation jsonb,
    proof_of_consent jsonb DEFAULT '{}'::jsonb,
    granularity jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp with time zone,
    withdrawn_at timestamp with time zone,
    withdrawal_reason text,
    renewed_at timestamp with time zone,
    parent_consent_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: coupon_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: coupon_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_conditions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    condition_type character varying(50) NOT NULL,
    condition_value jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: coupon_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: coupon_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    used_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    type character varying(50) DEFAULT 'percentage'::character varying NOT NULL,
    value numeric(10,2) NOT NULL,
    min_order_amount numeric(10,2),
    max_discount_amount numeric(10,2),
    max_uses integer,
    current_uses integer DEFAULT 0,
    starts_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    name character varying(200),
    scope character varying(20) DEFAULT 'global'::character varying,
    seller_id uuid,
    min_quantity integer DEFAULT 1,
    max_uses_per_customer integer DEFAULT 1,
    is_automatic boolean DEFAULT false,
    is_cumulative boolean DEFAULT false,
    is_first_purchase_only boolean DEFAULT false,
    allowed_regions text[],
    created_by uuid
);


--
-- Name: data_processing_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_processing_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_name character varying(255) NOT NULL,
    purpose text NOT NULL,
    legal_basis character varying(100) NOT NULL,
    data_categories text[],
    special_categories text[],
    data_subjects text[],
    retention_period interval,
    retention_criteria text,
    data_sources text[],
    data_recipients text[],
    international_transfers boolean DEFAULT false,
    transfer_countries text[],
    transfer_safeguards text[],
    security_measures text[],
    dpo_contact character varying(255),
    is_active boolean DEFAULT true,
    risk_assessment jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    to_email character varying(255) NOT NULL,
    to_name character varying(255),
    subject character varying(500) NOT NULL,
    template character varying(100) NOT NULL,
    template_data jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    scheduled_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_queue_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sending'::character varying, 'sent'::character varying, 'failed'::character varying, 'retrying'::character varying])::text[])))
);


--
-- Name: facet_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facet_cache (
    cache_key character varying(500) NOT NULL,
    facet_type character varying(50) NOT NULL,
    facet_data jsonb NOT NULL,
    query_params jsonb,
    hit_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone DEFAULT (now() + '01:00:00'::interval)
);


--
-- Name: faq; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faq (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question character varying(500) NOT NULL,
    answer text NOT NULL,
    category character varying(100),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faqs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    question character varying(500) NOT NULL,
    answer text NOT NULL,
    category character varying(100),
    order_index integer DEFAULT 0,
    is_featured boolean DEFAULT false,
    views_count integer DEFAULT 0,
    helpful_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: gdpr_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gdpr_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    request_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    requester_email character varying(255) NOT NULL,
    requester_name character varying(255),
    requester_phone character varying(20),
    requester_ip inet,
    verification_token character varying(255),
    verification_expires_at timestamp with time zone,
    verified_at timestamp with time zone,
    processed_by uuid,
    processing_notes text,
    completion_details jsonb DEFAULT '{}'::jsonb,
    exported_data jsonb,
    legal_basis character varying(100),
    retention_date timestamp with time zone,
    priority character varying(20) DEFAULT 'normal'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gdpr_requests_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT gdpr_requests_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['data_export'::character varying, 'data_deletion'::character varying, 'data_rectification'::character varying, 'consent_withdrawal'::character varying, 'data_portability'::character varying, 'processing_restriction'::character varying])::text[]))),
    CONSTRAINT gdpr_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE gdpr_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gdpr_requests IS 'Sistema de conformidade LGPD/GDPR';


--
-- Name: gift_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    list_id uuid NOT NULL,
    contributor_user_id uuid,
    contributor_name character varying(255),
    contributor_email character varying(255),
    contributor_phone character varying(20),
    amount numeric(10,2) NOT NULL,
    message text,
    is_anonymous boolean DEFAULT false,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    payment_id uuid,
    payment_method character varying(50),
    contribution_type character varying(20) DEFAULT 'money'::character varying,
    order_id uuid,
    gift_wrap_requested boolean DEFAULT false,
    gift_wrap_message text,
    delivery_preference character varying(50) DEFAULT 'event_address'::character varying,
    delivery_address jsonb,
    notification_sent boolean DEFAULT false,
    thank_you_sent boolean DEFAULT false,
    refund_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_contributions_contribution_type_check CHECK (((contribution_type)::text = ANY ((ARRAY['money'::character varying, 'product_purchase'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT gift_contributions_delivery_preference_check CHECK (((delivery_preference)::text = ANY ((ARRAY['event_address'::character varying, 'contributor_address'::character varying, 'pickup'::character varying])::text[]))),
    CONSTRAINT gift_contributions_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: gift_list_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_list_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    metric_name character varying(100) NOT NULL,
    metric_value numeric(15,2) NOT NULL,
    metric_type character varying(20) DEFAULT 'count'::character varying,
    date_dimension date NOT NULL,
    source character varying(100),
    user_agent text,
    ip_address inet,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_list_analytics_metric_type_check CHECK (((metric_type)::text = ANY ((ARRAY['count'::character varying, 'amount'::character varying, 'rate'::character varying, 'duration'::character varying])::text[])))
);


--
-- Name: gift_list_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_list_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    user_id uuid,
    author_name character varying(255) NOT NULL,
    author_email character varying(255),
    comment text NOT NULL,
    is_private boolean DEFAULT false,
    parent_id uuid,
    status character varying(20) DEFAULT 'approved'::character varying,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_list_comments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'spam'::character varying])::text[])))
);


--
-- Name: gift_list_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_list_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    list_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gift_list_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_list_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    invited_email character varying(255),
    invited_name character varying(255),
    invited_phone character varying(20),
    invitation_token character varying(255),
    invitation_type character varying(20) DEFAULT 'email'::character varying,
    message text,
    status character varying(20) DEFAULT 'sent'::character varying,
    sent_at timestamp with time zone,
    viewed_at timestamp with time zone,
    first_contribution_at timestamp with time zone,
    last_activity_at timestamp with time zone,
    contribution_count integer DEFAULT 0,
    total_contributed numeric(10,2) DEFAULT 0,
    reminder_count integer DEFAULT 0,
    last_reminder_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_list_invites_invitation_type_check CHECK (((invitation_type)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'whatsapp'::character varying, 'link'::character varying])::text[]))),
    CONSTRAINT gift_list_invites_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'viewed'::character varying, 'contributed'::character varying, 'declined'::character varying])::text[])))
);


--
-- Name: gift_list_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_list_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    product_id uuid,
    custom_item_name character varying(255),
    custom_item_description text,
    custom_item_image text,
    custom_item_price numeric(10,2),
    custom_item_url text,
    quantity integer DEFAULT 1,
    priority character varying(20) DEFAULT 'medium'::character varying,
    category character varying(100),
    size_preference character varying(100),
    color_preference character varying(100),
    brand_preference character varying(100),
    notes text,
    target_amount numeric(10,2) NOT NULL,
    collected_amount numeric(10,2) DEFAULT 0,
    is_purchased boolean DEFAULT false,
    purchased_by uuid,
    purchased_at timestamp with time zone,
    is_surprise boolean DEFAULT false,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_list_items_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'essential'::character varying])::text[])))
);


--
-- Name: gift_list_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_list_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    cover_image text,
    theme_color character varying(7),
    default_items jsonb DEFAULT '[]'::jsonb,
    suggested_categories text[],
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gift_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_date date,
    event_location character varying(500),
    couple_name_1 character varying(255),
    couple_name_2 character varying(255),
    baby_name character varying(255),
    baby_gender character varying(10),
    cover_image text,
    theme_color character varying(7) DEFAULT '#FF69B4'::character varying,
    privacy character varying(20) DEFAULT 'public'::character varying,
    share_token character varying(255),
    allow_partial_contributions boolean DEFAULT true,
    allow_anonymous_contributions boolean DEFAULT true,
    minimum_contribution numeric(10,2) DEFAULT 10.00,
    goal_amount numeric(12,2),
    collected_amount numeric(12,2) DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying,
    expires_at timestamp with time zone,
    thank_you_message text,
    delivery_address jsonb,
    registry_store character varying(255),
    social_media jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    view_count integer DEFAULT 0,
    contribution_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_lists_baby_gender_check CHECK (((baby_gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'surprise'::character varying])::text[]))),
    CONSTRAINT gift_lists_privacy_check CHECK (((privacy)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying, 'friends_only'::character varying])::text[]))),
    CONSTRAINT gift_lists_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'completed'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT gift_lists_type_check CHECK (((type)::text = ANY ((ARRAY['baby_shower'::character varying, 'wedding'::character varying, 'birthday'::character varying, 'anniversary'::character varying, 'graduation'::character varying, 'housewarming'::character varying, 'custom'::character varying])::text[])))
);


--
-- Name: integration_environments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_environments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT false,
    is_current boolean DEFAULT false,
    config jsonb DEFAULT '{}'::jsonb,
    default_timeout_ms integer DEFAULT 30000,
    default_retry_attempts integer DEFAULT 3,
    rate_limit_requests integer DEFAULT 1000,
    rate_limit_window_ms integer DEFAULT 60000,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: integration_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    retry_queue_id uuid,
    event_type character varying(50) NOT NULL,
    level character varying(10) DEFAULT 'info'::character varying NOT NULL,
    message text NOT NULL,
    request_method character varying(10),
    request_url text,
    request_headers jsonb,
    request_body jsonb,
    response_status integer,
    response_headers jsonb,
    response_body jsonb,
    response_time_ms integer,
    operation character varying(50),
    reference_id uuid,
    reference_type character varying(50),
    user_id uuid,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    tags character varying(255)[],
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT integration_logs_level_check CHECK (((level)::text = ANY ((ARRAY['debug'::character varying, 'info'::character varying, 'warn'::character varying, 'error'::character varying, 'critical'::character varying])::text[])))
);


--
-- Name: integration_logs_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.integration_logs_summary AS
 SELECT date_trunc('hour'::text, integration_logs.created_at) AS hour,
    integration_logs.provider_id,
    integration_logs.level,
    integration_logs.event_type,
    count(*) AS total_events,
    count(DISTINCT integration_logs.reference_id) AS unique_references
   FROM public.integration_logs
  WHERE (integration_logs.created_at >= (now() - '7 days'::interval))
  GROUP BY (date_trunc('hour'::text, integration_logs.created_at)), integration_logs.provider_id, integration_logs.level, integration_logs.event_type
  ORDER BY (date_trunc('hour'::text, integration_logs.created_at)) DESC;


--
-- Name: integration_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    operation character varying(50) NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    period_type character varying(20) NOT NULL,
    total_requests integer DEFAULT 0,
    successful_requests integer DEFAULT 0,
    failed_requests integer DEFAULT 0,
    timeout_requests integer DEFAULT 0,
    avg_response_time_ms integer DEFAULT 0,
    min_response_time_ms integer DEFAULT 0,
    max_response_time_ms integer DEFAULT 0,
    p50_response_time_ms integer DEFAULT 0,
    p95_response_time_ms integer DEFAULT 0,
    p99_response_time_ms integer DEFAULT 0,
    total_retries integer DEFAULT 0,
    successful_retries integer DEFAULT 0,
    failed_retries integer DEFAULT 0,
    success_rate numeric(5,2) DEFAULT 0.00,
    error_rate numeric(5,2) DEFAULT 0.00,
    retry_rate numeric(5,2) DEFAULT 0.00,
    top_errors jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT integration_metrics_period_type_check CHECK (((period_type)::text = ANY ((ARRAY['minute'::character varying, 'hour'::character varying, 'day'::character varying, 'week'::character varying, 'month'::character varying])::text[])))
);


--
-- Name: integration_provider_environments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_provider_environments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    environment_id uuid NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: integration_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    description text,
    is_active boolean DEFAULT false,
    is_sandbox boolean DEFAULT false,
    priority integer DEFAULT 1,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    retry_config jsonb DEFAULT '{"maxDelay": 30000, "baseDelay": 1000, "backoffType": "exponential", "maxAttempts": 3, "retryableErrors": ["timeout", "5xx", "network_error", "rate_limit"], "nonRetryableErrors": ["4xx", "invalid_credentials", "invalid_data"]}'::jsonb NOT NULL,
    webhook_url text,
    webhook_secret text,
    webhook_events jsonb DEFAULT '[]'::jsonb,
    success_rate numeric(5,2) DEFAULT 0.00,
    avg_response_time integer DEFAULT 0,
    last_success_at timestamp with time zone,
    last_failure_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT integration_providers_type_check CHECK (((type)::text = ANY ((ARRAY['payment'::character varying, 'shipping'::character varying, 'notification'::character varying, 'analytics'::character varying, 'webhook'::character varying])::text[])))
);


--
-- Name: integration_retry_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_retry_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    integration_type character varying(20) NOT NULL,
    operation character varying(50) NOT NULL,
    reference_id uuid NOT NULL,
    reference_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    request_data jsonb NOT NULL,
    response_data jsonb,
    external_id character varying(255),
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    retry_strategy jsonb,
    next_retry_at timestamp with time zone,
    last_error text,
    error_history jsonb DEFAULT '[]'::jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    response_time_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    priority integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT integration_retry_queue_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'retrying'::character varying, 'success'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: integration_providers_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.integration_providers_status AS
 SELECT ip.id,
    ip.name,
    ip.display_name,
    ip.type,
    ip.is_active,
    ip.priority,
    ip.success_rate,
    ip.avg_response_time,
    ip.last_success_at,
    ip.last_failure_at,
    COALESCE(recent_metrics.total_requests_24h, (0)::bigint) AS requests_24h,
    COALESCE(recent_metrics.success_rate_24h, (0)::numeric) AS success_rate_24h,
    COALESCE(recent_metrics.avg_response_time_24h, (0)::numeric) AS avg_response_time_24h,
    COALESCE(queue_status.pending_items, (0)::bigint) AS pending_retries,
    COALESCE(queue_status.processing_items, (0)::bigint) AS processing_items,
    COALESCE(queue_status.failed_items, (0)::bigint) AS failed_items
   FROM ((public.integration_providers ip
     LEFT JOIN ( SELECT integration_metrics.provider_id,
            sum(integration_metrics.total_requests) AS total_requests_24h,
            avg(integration_metrics.success_rate) AS success_rate_24h,
            avg(integration_metrics.avg_response_time_ms) AS avg_response_time_24h
           FROM public.integration_metrics
          WHERE (integration_metrics.period_start >= (now() - '24:00:00'::interval))
          GROUP BY integration_metrics.provider_id) recent_metrics ON ((ip.id = recent_metrics.provider_id)))
     LEFT JOIN ( SELECT integration_retry_queue.provider_id,
            count(*) FILTER (WHERE ((integration_retry_queue.status)::text = 'pending'::text)) AS pending_items,
            count(*) FILTER (WHERE ((integration_retry_queue.status)::text = 'processing'::text)) AS processing_items,
            count(*) FILTER (WHERE ((integration_retry_queue.status)::text = 'failed'::text)) AS failed_items
           FROM public.integration_retry_queue
          WHERE (integration_retry_queue.created_at >= (now() - '24:00:00'::interval))
          GROUP BY integration_retry_queue.provider_id) queue_status ON ((ip.id = queue_status.provider_id)));


--
-- Name: kb_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_articles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(100),
    tags character varying(50)[],
    views_count integer DEFAULT 0,
    helpful_count integer DEFAULT 0,
    not_helpful_count integer DEFAULT 0,
    is_published boolean DEFAULT false,
    featured boolean DEFAULT false,
    author_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: maintenance_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_log (
    id integer NOT NULL,
    task_name character varying(100) NOT NULL,
    status character varying(20) NOT NULL,
    execution_time timestamp without time zone DEFAULT now(),
    details jsonb,
    error_message text
);


--
-- Name: maintenance_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maintenance_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_log_id_seq OWNED BY public.maintenance_log.id;


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    template_id uuid,
    subject_line character varying(500),
    content text,
    target_audience jsonb DEFAULT '{}'::jsonb,
    scheduling jsonb DEFAULT '{}'::jsonb,
    tracking_config jsonb DEFAULT '{}'::jsonb,
    personalization_config jsonb DEFAULT '{}'::jsonb,
    budget_limit numeric(10,2),
    cost_per_recipient numeric(6,4),
    priority integer DEFAULT 5,
    ab_test_enabled boolean DEFAULT false,
    ab_test_config jsonb,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT marketing_campaigns_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'scheduled'::character varying, 'running'::character varying, 'paused'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT marketing_campaigns_type_check CHECK (((type)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'push'::character varying, 'banner'::character varying, 'popup'::character varying, 'social'::character varying])::text[])))
);


--
-- Name: TABLE marketing_campaigns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.marketing_campaigns IS 'Sistema de campanhas de marketing automatizadas';


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    order_status_email boolean DEFAULT true,
    order_status_push boolean DEFAULT true,
    abandoned_cart_email boolean DEFAULT true,
    abandoned_cart_push boolean DEFAULT false,
    price_drop_email boolean DEFAULT true,
    price_drop_push boolean DEFAULT true,
    promotions_email boolean DEFAULT true,
    promotions_push boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    type character varying(50) NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_templates_type_check CHECK (((type)::text = ANY ((ARRAY['email'::character varying, 'push'::character varying, 'sms'::character varying, 'internal'::character varying])::text[])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    seller_id uuid,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    previous_status character varying(20),
    new_status character varying(20) NOT NULL,
    created_by uuid,
    created_by_type character varying(20) DEFAULT 'system'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_status_history_created_by_type_check CHECK (((created_by_type)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'system'::character varying, 'webhook'::character varying])::text[])))
);


--
-- Name: order_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_tracking (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    status character varying(50) NOT NULL,
    description text,
    location character varying(255),
    tracking_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_number character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    payment_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    payment_method character varying(50),
    subtotal numeric(10,2) NOT NULL,
    shipping_cost numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    total numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    shipping_address jsonb,
    billing_address jsonb,
    notes text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    coupon_code character varying(50),
    shipping_tracking character varying(100),
    shipping_method character varying(50),
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    tracking_code character varying(100),
    carrier character varying(100),
    estimated_delivery timestamp with time zone,
    shipping_provider character varying(50),
    shipping_provider_id character varying(100),
    shipping_status character varying(50) DEFAULT 'pending'::character varying,
    shipping_response jsonb,
    shipping_attempts integer DEFAULT 0,
    last_shipping_attempt timestamp with time zone,
    shipping_error text,
    shipping_webhook_data jsonb,
    external_order_id character varying(255),
    paid_at timestamp without time zone,
    refunded_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    CONSTRAINT check_shipping_status CHECK (((shipping_status)::text = ANY ((ARRAY['pending'::character varying, 'sending'::character varying, 'sent'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: COLUMN orders.shipping_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.shipping_provider IS 'Nome do provedor de transporte (cubbo, correios, etc)';


--
-- Name: COLUMN orders.shipping_provider_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.shipping_provider_id IS 'ID do pedido no sistema da transportadora';


--
-- Name: COLUMN orders.shipping_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.shipping_status IS 'Status da integração com transportadora';


--
-- Name: COLUMN orders.shipping_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.shipping_response IS 'Resposta completa da API da transportadora';


--
-- Name: COLUMN orders.shipping_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.shipping_attempts IS 'Número de tentativas de envio';


--
-- Name: COLUMN orders.last_shipping_attempt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.last_shipping_attempt IS 'Timestamp da última tentativa';


--
-- Name: COLUMN orders.shipping_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.shipping_error IS 'Último erro da integração';


--
-- Name: COLUMN orders.shipping_webhook_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.shipping_webhook_data IS 'Dados recebidos via webhook da transportadora';


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    content text NOT NULL,
    meta_title character varying(255),
    meta_description text,
    is_published boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_resets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: payment_gateways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_gateways (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    api_key text,
    secret_key text,
    environment character varying(20) DEFAULT 'sandbox'::character varying,
    webhook_secret text,
    is_active boolean DEFAULT false,
    is_sandbox boolean DEFAULT true,
    supported_methods jsonb DEFAULT '[]'::jsonb,
    min_amount numeric(10,2),
    max_amount numeric(10,2),
    priority integer DEFAULT 0,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE payment_gateways; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_gateways IS 'Configurações dos gateways de pagamento disponíveis';


--
-- Name: COLUMN payment_gateways.supported_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_gateways.supported_methods IS 'Array JSON com métodos suportados: credit_card, debit_card, pix, boleto';


--
-- Name: COLUMN payment_gateways.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_gateways.priority IS 'Prioridade do gateway (maior = mais prioridade na seleção automática)';


--
-- Name: payment_gateways_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_gateways_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_gateways_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_gateways_id_seq OWNED BY public.payment_gateways.id;


--
-- Name: payment_gateways_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_gateways_metadata (
    id integer NOT NULL,
    user_id uuid,
    gateway character varying(50),
    external_customer_id character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE payment_gateways_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_gateways_metadata IS 'Metadados dos usuários em cada gateway (IDs externos, etc)';


--
-- Name: payment_gateways_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_gateways_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_gateways_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_gateways_metadata_id_seq OWNED BY public.payment_gateways_metadata.id;


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    configuration jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    scheduled_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_queue_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT payment_queue_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT payment_queue_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'retrying'::character varying])::text[])))
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    payment_method_id uuid NOT NULL,
    transaction_id character varying(255),
    status character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    gateway_response jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    gateway character varying(50)
);


--
-- Name: TABLE payment_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_transactions IS 'Histórico de todas as transações de pagamento';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    external_id character varying(255),
    gateway character varying(50) DEFAULT 'mock'::character varying NOT NULL,
    method character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'BRL'::character varying,
    payment_data jsonb,
    gateway_response jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_method_check CHECK (((method)::text = ANY ((ARRAY['pix'::character varying, 'credit_card'::character varying, 'debit_card'::character varying, 'boleto'::character varying, 'bank_transfer'::character varying])::text[]))),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying, 'timeout'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: pending_refreshes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_refreshes (
    view_name character varying(100) NOT NULL,
    requested_at timestamp without time zone NOT NULL,
    processed_at timestamp without time zone
);


--
-- Name: product_counts; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.product_counts AS
 SELECT count(*) FILTER (WHERE (products.is_active = true)) AS total_active,
    count(*) FILTER (WHERE ((products.is_active = true) AND (products.quantity > 0))) AS in_stock,
    count(*) FILTER (WHERE ((products.is_active = true) AND (products.quantity = 0))) AS out_of_stock,
    count(*) FILTER (WHERE ((products.featured = true) AND (products.is_active = true))) AS featured,
    count(*) FILTER (WHERE (((products.condition)::text = 'new'::text) AND (products.is_active = true))) AS new_products,
    count(*) FILTER (WHERE (((products.condition)::text = 'used'::text) AND (products.is_active = true))) AS used_products,
    count(*) FILTER (WHERE (((products.condition)::text = 'refurbished'::text) AND (products.is_active = true))) AS refurbished_products,
    count(*) FILTER (WHERE ((products.has_free_shipping = true) AND (products.is_active = true))) AS free_shipping,
    count(*) FILTER (WHERE ((products.original_price > products.price) AND (products.is_active = true))) AS with_discount,
    count(*) FILTER (WHERE ((products.rating_average >= (4)::numeric) AND (products.is_active = true))) AS highly_rated,
    count(*) FILTER (WHERE ((products.created_at > (now() - '7 days'::interval)) AND (products.is_active = true))) AS new_arrivals,
    count(*) FILTER (WHERE ((products.created_at > (now() - '30 days'::interval)) AND (products.is_active = true))) AS recent_products
   FROM public.products
  WITH NO DATA;


--
-- Name: product_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_rankings (
    product_id uuid NOT NULL,
    popularity_score numeric(10,4) DEFAULT 0,
    relevance_score numeric(10,4) DEFAULT 0,
    conversion_score numeric(10,4) DEFAULT 0,
    trending_score numeric(10,4) DEFAULT 0,
    quality_score numeric(10,4) DEFAULT 0,
    overall_score numeric(10,4) DEFAULT 0,
    last_calculated timestamp without time zone DEFAULT now()
);


--
-- Name: query_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_cache (
    query_hash character varying(64) NOT NULL,
    query_text text,
    result_data jsonb,
    result_count integer,
    execution_time_ms integer,
    hit_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone DEFAULT (now() + '00:30:00'::interval)
);


--
-- Name: search_index; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_index (
    product_id uuid NOT NULL,
    search_vector tsvector,
    name_metaphone text,
    tags_array text[],
    category_path text[],
    brand_name text,
    price_range character varying(20),
    attributes jsonb,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: performance_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.performance_dashboard AS
 SELECT ( SELECT product_counts.total_active
           FROM public.product_counts) AS total_products,
    ( SELECT count(*) AS count
           FROM public.product_rankings
          WHERE (product_rankings.last_calculated > (now() - '24:00:00'::interval))) AS recently_ranked,
    ( SELECT count(*) AS count
           FROM public.search_index) AS indexed_products,
    ( SELECT count(*) AS count
           FROM public.facet_cache
          WHERE (facet_cache.expires_at > now())) AS active_cache_entries,
    ( SELECT avg(facet_cache.hit_count) AS avg
           FROM public.facet_cache
          WHERE (facet_cache.created_at > (now() - '24:00:00'::interval))) AS avg_cache_hits,
    ( SELECT avg(query_cache.execution_time_ms) AS avg
           FROM public.query_cache
          WHERE (query_cache.created_at > (now() - '01:00:00'::interval))) AS avg_query_time_ms,
    ( SELECT max(query_cache.execution_time_ms) AS max
           FROM public.query_cache
          WHERE (query_cache.created_at > (now() - '01:00:00'::interval))) AS max_query_time_ms,
    ( SELECT max(maintenance_log.execution_time) AS max
           FROM public.maintenance_log
          WHERE ((maintenance_log.task_name)::text = 'refresh_materialized_views'::text)) AS last_view_refresh,
    ( SELECT max(maintenance_log.execution_time) AS max
           FROM public.maintenance_log
          WHERE ((maintenance_log.task_name)::text = 'update_rankings'::text)) AS last_ranking_update;


--
-- Name: popular_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.popular_searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term text NOT NULL,
    search_count integer DEFAULT 1,
    click_count integer DEFAULT 0,
    conversion_count integer DEFAULT 0,
    last_searched_at timestamp without time zone DEFAULT now() NOT NULL,
    period_start date DEFAULT CURRENT_DATE NOT NULL,
    period_end date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: product_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    date date NOT NULL,
    views integer DEFAULT 0,
    clicks integer DEFAULT 0,
    add_to_cart integer DEFAULT 0,
    purchases integer DEFAULT 0,
    revenue numeric(10,2) DEFAULT 0
);


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    category_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: product_coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    url character varying(500) NOT NULL,
    alt_text character varying(255),
    "position" integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: product_option_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_option_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    option_id uuid NOT NULL,
    value character varying(255) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    price numeric(10,2) NOT NULL,
    original_price numeric(10,2),
    changed_by uuid,
    reason character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    original_price numeric(10,2),
    cost numeric(10,2),
    quantity integer DEFAULT 0 NOT NULL,
    weight numeric(10,3),
    barcode character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: return_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.return_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    return_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    condition character varying(20),
    inspector_notes text,
    photos jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT return_items_condition_check CHECK (((condition)::text = ANY ((ARRAY['new'::character varying, 'used'::character varying, 'damaged'::character varying, 'defective'::character varying])::text[]))),
    CONSTRAINT return_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: return_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.return_reasons (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    requires_photos boolean DEFAULT false,
    auto_approve boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.returns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    return_number character varying(20) NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    status character varying(30) DEFAULT 'requested'::character varying,
    reason_id uuid,
    custom_reason text,
    total_amount numeric(10,2) NOT NULL,
    refund_amount numeric(10,2) DEFAULT 0,
    admin_notes text,
    customer_notes text,
    photos jsonb DEFAULT '[]'::jsonb,
    tracking_code character varying(100),
    return_shipping_cost numeric(10,2) DEFAULT 0,
    processing_fee numeric(10,2) DEFAULT 0,
    refund_method character varying(20),
    approved_by uuid,
    approved_at timestamp with time zone,
    shipped_at timestamp with time zone,
    received_at timestamp with time zone,
    processed_at timestamp with time zone,
    refunded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT returns_refund_method_check CHECK (((refund_method)::text = ANY ((ARRAY['original_payment'::character varying, 'store_credit'::character varying, 'bank_transfer'::character varying])::text[]))),
    CONSTRAINT returns_status_check CHECK (((status)::text = ANY ((ARRAY['requested'::character varying, 'approved'::character varying, 'rejected'::character varying, 'shipped_by_customer'::character varying, 'received'::character varying, 'inspecting'::character varying, 'processed'::character varying, 'refunded'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT returns_type_check CHECK (((type)::text = ANY ((ARRAY['return'::character varying, 'exchange'::character varying])::text[])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    rating integer NOT NULL,
    title character varying(255),
    comment text,
    is_verified boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: search_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query text NOT NULL,
    user_id uuid,
    session_id character varying(100),
    results_count integer DEFAULT 0,
    clicked_position integer,
    clicked_product_id uuid,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: search_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term text NOT NULL,
    suggestion_type character varying(50) DEFAULT 'autocomplete'::character varying NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: seller_shipping_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_shipping_configs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    seller_id text,
    carrier_id text,
    zone_id text,
    is_enabled boolean DEFAULT true,
    markup_percentage numeric(5,2) DEFAULT 0,
    free_shipping_threshold numeric(10,2),
    free_shipping_products text[],
    free_shipping_categories text[],
    max_weight_kg numeric(8,2),
    max_dimensions jsonb,
    product_exceptions jsonb DEFAULT '{}'::jsonb,
    category_exceptions jsonb DEFAULT '{}'::jsonb,
    priority integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: sellers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sellers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name character varying(255) NOT NULL,
    company_document character varying(20) NOT NULL,
    description text,
    logo_url character varying(500),
    banner_url character varying(500),
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    rating_average numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    total_sales integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    state character varying(2),
    city character varying(100),
    slug character varying(255)
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: shipping_base_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_base_rates (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    zone_id text,
    weight_rules jsonb DEFAULT '[]'::jsonb,
    base_delivery_days integer NOT NULL,
    additional_fees jsonb DEFAULT '{}'::jsonb,
    source character varying(50) DEFAULT 'frenet'::character varying,
    import_date timestamp without time zone DEFAULT now(),
    valid_from date DEFAULT CURRENT_DATE,
    valid_to date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    is_template boolean DEFAULT true
);


--
-- Name: shipping_calculated_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_calculated_options (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    base_rate_id text,
    modality_id text,
    zone_id text,
    calculated_weight_rules jsonb,
    calculated_delivery_days integer,
    calculated_fees jsonb,
    calculation_date timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: shipping_carriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_carriers (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    api_endpoint character varying(500),
    api_credentials jsonb,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: shipping_modalities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_modalities (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price_multiplier numeric(5,3) DEFAULT 1.000 NOT NULL,
    days_multiplier numeric(5,3) DEFAULT 1.000 NOT NULL,
    pricing_type character varying(20) DEFAULT 'per_shipment'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    priority integer DEFAULT 1,
    min_price numeric(10,2),
    max_price numeric(10,2),
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    delivery_days_min integer DEFAULT 3,
    delivery_days_max integer DEFAULT 7
);


--
-- Name: shipping_modality_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_modality_configs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    seller_id text,
    zone_id text,
    modality_id text,
    custom_price_multiplier numeric(5,3),
    custom_days_multiplier numeric(5,3),
    custom_pricing_type character varying(20),
    free_shipping_threshold numeric(10,2),
    free_shipping_products text[],
    free_shipping_categories text[],
    max_weight_kg numeric(8,2),
    max_dimensions jsonb,
    is_enabled boolean DEFAULT true,
    priority integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: shipping_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_quotes (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    cache_key character varying(255),
    seller_id text,
    postal_code character varying(8),
    items_data jsonb,
    shipping_options jsonb,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: shipping_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_rates (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    zone_id text,
    weight_rules jsonb DEFAULT '[]'::jsonb,
    dimension_rules jsonb DEFAULT '[]'::jsonb,
    base_price numeric(10,2) DEFAULT 0,
    price_per_kg numeric(10,2) DEFAULT 0,
    price_per_km numeric(10,2) DEFAULT 0,
    additional_fees jsonb DEFAULT '{}'::jsonb,
    conditions jsonb DEFAULT '{}'::jsonb,
    valid_from date DEFAULT CURRENT_DATE,
    valid_to date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: shipping_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_zones (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    carrier_id text,
    name character varying(255) NOT NULL,
    uf character varying(2),
    cities text[],
    postal_code_ranges jsonb,
    zone_type character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    delivery_days_min integer DEFAULT 3,
    delivery_days_max integer DEFAULT 7
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    type character varying(10) NOT NULL,
    quantity integer NOT NULL,
    reason character varying(100) NOT NULL,
    reference_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_movements_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT stock_movements_type_check CHECK (((type)::text = ANY ((ARRAY['in'::character varying, 'out'::character varying, 'adjustment'::character varying])::text[])))
);


--
-- Name: stock_reservation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_reservation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reservation_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_reservation_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_reservations_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'confirmed'::character varying, 'released'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: store_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_credits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    return_id uuid,
    amount numeric(10,2) NOT NULL,
    balance numeric(10,2) NOT NULL,
    reason character varying(255),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    priority_level integer DEFAULT 3,
    auto_assign_to uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT support_categories_priority_level_check CHECK (((priority_level >= 1) AND (priority_level <= 5)))
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_internal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ticket_number character varying(20) NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    order_id uuid,
    subject character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying,
    priority integer DEFAULT 3,
    assigned_to uuid,
    satisfaction_rating integer,
    satisfaction_comment text,
    tags character varying(50)[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    CONSTRAINT support_tickets_priority_check CHECK (((priority >= 1) AND (priority <= 5))),
    CONSTRAINT support_tickets_satisfaction_rating_check CHECK (((satisfaction_rating >= 1) AND (satisfaction_rating <= 5))),
    CONSTRAINT support_tickets_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'waiting_customer'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    type character varying(50) DEFAULT 'string'::character varying NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: tracking_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracking_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying(255),
    user_id uuid,
    cookie_category character varying(50) NOT NULL,
    consent_granted boolean NOT NULL,
    ip_address inet,
    user_agent text,
    consent_banner_version character varying(20),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_sessions_multi_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions_multi_role (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    active_role text NOT NULL,
    available_apps text[] NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'customer'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    phone character varying(20),
    avatar_url character varying(500),
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    roles text[] DEFAULT '{customer}'::text[],
    vendor_data jsonb,
    admin_data jsonb,
    customer_data jsonb DEFAULT '{"addresses": []}'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying
);


--
-- Name: users_backup_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_backup_roles (
    id uuid,
    email character varying(255),
    name character varying(255),
    password_hash character varying(255),
    role character varying(50),
    is_active boolean,
    email_verified boolean,
    phone character varying(20),
    avatar_url character varying(500),
    last_login_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: variant_option_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variant_option_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    option_value_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(100) NOT NULL,
    webhook_url text NOT NULL,
    payload jsonb NOT NULL,
    headers jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    response_status integer,
    response_body text,
    response_headers jsonb,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    next_retry_at timestamp with time zone,
    sent_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    priority integer DEFAULT 5,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webhook_events_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying, 'retrying'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE webhook_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_events IS 'Sistema de webhooks para integrações externas';


--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_logs (
    id integer NOT NULL,
    gateway character varying(50),
    event_id character varying(255),
    event_type character varying(100),
    payload jsonb,
    signature text,
    processed_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE webhook_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_logs IS 'Logs de todos os webhooks recebidos dos gateways';


--
-- Name: webhook_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhook_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhook_logs_id_seq OWNED BY public.webhook_logs.id;


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: maintenance_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_log ALTER COLUMN id SET DEFAULT nextval('public.maintenance_log_id_seq'::regclass);


--
-- Name: payment_gateways id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways ALTER COLUMN id SET DEFAULT nextval('public.payment_gateways_id_seq'::regclass);


--
-- Name: payment_gateways_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways_metadata ALTER COLUMN id SET DEFAULT nextval('public.payment_gateways_metadata_id_seq'::regclass);


--
-- Name: webhook_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs ALTER COLUMN id SET DEFAULT nextval('public.webhook_logs_id_seq'::regclass);


--
-- Name: ab_test_assignments ab_test_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_pkey PRIMARY KEY (id);


--
-- Name: ab_test_assignments ab_test_assignments_test_id_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_test_id_session_id_key UNIQUE (test_id, session_id);


--
-- Name: ab_test_assignments ab_test_assignments_test_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_test_id_user_id_key UNIQUE (test_id, user_id);


--
-- Name: ab_test_events ab_test_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_events
    ADD CONSTRAINT ab_test_events_pkey PRIMARY KEY (id);


--
-- Name: ab_test_variants ab_test_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_variants
    ADD CONSTRAINT ab_test_variants_pkey PRIMARY KEY (id);


--
-- Name: ab_tests ab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_tests
    ADD CONSTRAINT ab_tests_pkey PRIMARY KEY (id);


--
-- Name: abandoned_carts abandoned_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abandoned_carts
    ADD CONSTRAINT abandoned_carts_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- Name: campaign_analytics campaign_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_analytics
    ADD CONSTRAINT campaign_analytics_pkey PRIMARY KEY (id);


--
-- Name: campaign_recipients campaign_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_message_reads chat_message_reads_message_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- Name: chat_message_reads chat_message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_presence chat_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_presence
    ADD CONSTRAINT chat_presence_pkey PRIMARY KEY (id);


--
-- Name: chat_settings chat_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_settings
    ADD CONSTRAINT chat_settings_pkey PRIMARY KEY (id);


--
-- Name: chat_settings chat_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_settings
    ADD CONSTRAINT chat_settings_user_id_key UNIQUE (user_id);


--
-- Name: consent_records consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);


--
-- Name: coupon_categories coupon_categories_coupon_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_categories
    ADD CONSTRAINT coupon_categories_coupon_id_category_id_key UNIQUE (coupon_id, category_id);


--
-- Name: coupon_categories coupon_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_categories
    ADD CONSTRAINT coupon_categories_pkey PRIMARY KEY (id);


--
-- Name: coupon_conditions coupon_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_conditions
    ADD CONSTRAINT coupon_conditions_pkey PRIMARY KEY (id);


--
-- Name: coupon_products coupon_products_coupon_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_coupon_id_product_id_key UNIQUE (coupon_id, product_id);


--
-- Name: coupon_products coupon_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_pkey PRIMARY KEY (id);


--
-- Name: coupon_usage coupon_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: data_processing_activities data_processing_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_processing_activities
    ADD CONSTRAINT data_processing_activities_pkey PRIMARY KEY (id);


--
-- Name: email_queue email_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);


--
-- Name: facet_cache facet_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_cache
    ADD CONSTRAINT facet_cache_pkey PRIMARY KEY (cache_key);


--
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: gdpr_requests gdpr_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_pkey PRIMARY KEY (id);


--
-- Name: gift_contributions gift_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_contributions
    ADD CONSTRAINT gift_contributions_pkey PRIMARY KEY (id);


--
-- Name: gift_list_analytics gift_list_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_analytics
    ADD CONSTRAINT gift_list_analytics_pkey PRIMARY KEY (id);


--
-- Name: gift_list_comments gift_list_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_comments
    ADD CONSTRAINT gift_list_comments_pkey PRIMARY KEY (id);


--
-- Name: gift_list_favorites gift_list_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_favorites
    ADD CONSTRAINT gift_list_favorites_pkey PRIMARY KEY (id);


--
-- Name: gift_list_favorites gift_list_favorites_user_id_list_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_favorites
    ADD CONSTRAINT gift_list_favorites_user_id_list_id_key UNIQUE (user_id, list_id);


--
-- Name: gift_list_invites gift_list_invites_invitation_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_invites
    ADD CONSTRAINT gift_list_invites_invitation_token_key UNIQUE (invitation_token);


--
-- Name: gift_list_invites gift_list_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_invites
    ADD CONSTRAINT gift_list_invites_pkey PRIMARY KEY (id);


--
-- Name: gift_list_items gift_list_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_items
    ADD CONSTRAINT gift_list_items_pkey PRIMARY KEY (id);


--
-- Name: gift_list_templates gift_list_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_templates
    ADD CONSTRAINT gift_list_templates_pkey PRIMARY KEY (id);


--
-- Name: gift_lists gift_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_lists
    ADD CONSTRAINT gift_lists_pkey PRIMARY KEY (id);


--
-- Name: gift_lists gift_lists_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_lists
    ADD CONSTRAINT gift_lists_share_token_key UNIQUE (share_token);


--
-- Name: integration_environments integration_environments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_environments
    ADD CONSTRAINT integration_environments_name_key UNIQUE (name);


--
-- Name: integration_environments integration_environments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_environments
    ADD CONSTRAINT integration_environments_pkey PRIMARY KEY (id);


--
-- Name: integration_logs integration_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_pkey PRIMARY KEY (id);


--
-- Name: integration_metrics integration_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_metrics
    ADD CONSTRAINT integration_metrics_pkey PRIMARY KEY (id);


--
-- Name: integration_metrics integration_metrics_provider_id_operation_period_start_peri_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_metrics
    ADD CONSTRAINT integration_metrics_provider_id_operation_period_start_peri_key UNIQUE (provider_id, operation, period_start, period_type);


--
-- Name: integration_provider_environments integration_provider_environment_provider_id_environment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_provider_environments
    ADD CONSTRAINT integration_provider_environment_provider_id_environment_id_key UNIQUE (provider_id, environment_id);


--
-- Name: integration_provider_environments integration_provider_environments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_provider_environments
    ADD CONSTRAINT integration_provider_environments_pkey PRIMARY KEY (id);


--
-- Name: integration_providers integration_providers_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_providers
    ADD CONSTRAINT integration_providers_name_key UNIQUE (name);


--
-- Name: integration_providers integration_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_providers
    ADD CONSTRAINT integration_providers_pkey PRIMARY KEY (id);


--
-- Name: integration_retry_queue integration_retry_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_retry_queue
    ADD CONSTRAINT integration_retry_queue_pkey PRIMARY KEY (id);


--
-- Name: kb_articles kb_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_pkey PRIMARY KEY (id);


--
-- Name: kb_articles kb_articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_slug_key UNIQUE (slug);


--
-- Name: maintenance_log maintenance_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_log
    ADD CONSTRAINT maintenance_log_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: notification_templates notification_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_name_key UNIQUE (name);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: order_tracking order_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tracking
    ADD CONSTRAINT order_tracking_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: pages pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_token_key UNIQUE (token);


--
-- Name: payment_gateways_metadata payment_gateways_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways_metadata
    ADD CONSTRAINT payment_gateways_metadata_pkey PRIMARY KEY (id);


--
-- Name: payment_gateways_metadata payment_gateways_metadata_user_id_gateway_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways_metadata
    ADD CONSTRAINT payment_gateways_metadata_user_id_gateway_key UNIQUE (user_id, gateway);


--
-- Name: payment_gateways payment_gateways_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_name_key UNIQUE (name);


--
-- Name: payment_gateways payment_gateways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payment_queue payment_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_queue
    ADD CONSTRAINT payment_queue_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_transaction_id_key UNIQUE (transaction_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pending_refreshes pending_refreshes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_refreshes
    ADD CONSTRAINT pending_refreshes_pkey PRIMARY KEY (view_name);


--
-- Name: popular_searches popular_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.popular_searches
    ADD CONSTRAINT popular_searches_pkey PRIMARY KEY (id);


--
-- Name: popular_searches popular_searches_term_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.popular_searches
    ADD CONSTRAINT popular_searches_term_key UNIQUE (term);


--
-- Name: product_analytics product_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_pkey PRIMARY KEY (id);


--
-- Name: product_analytics product_analytics_product_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_product_id_date_key UNIQUE (product_id, date);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_product_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_category_id_key UNIQUE (product_id, category_id);


--
-- Name: product_coupons product_coupons_coupon_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_coupons
    ADD CONSTRAINT product_coupons_coupon_id_product_id_key UNIQUE (coupon_id, product_id);


--
-- Name: product_coupons product_coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_coupons
    ADD CONSTRAINT product_coupons_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_option_values product_option_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_values
    ADD CONSTRAINT product_option_values_pkey PRIMARY KEY (id);


--
-- Name: product_options product_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT product_options_pkey PRIMARY KEY (id);


--
-- Name: product_price_history product_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_pkey PRIMARY KEY (id);


--
-- Name: product_rankings product_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rankings
    ADD CONSTRAINT product_rankings_pkey PRIMARY KEY (product_id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: query_cache query_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_cache
    ADD CONSTRAINT query_cache_pkey PRIMARY KEY (query_hash);


--
-- Name: return_items return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_pkey PRIMARY KEY (id);


--
-- Name: return_reasons return_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_reasons
    ADD CONSTRAINT return_reasons_pkey PRIMARY KEY (id);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- Name: returns returns_return_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_return_number_key UNIQUE (return_number);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- Name: search_index search_index_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_index
    ADD CONSTRAINT search_index_pkey PRIMARY KEY (product_id);


--
-- Name: search_suggestions search_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_suggestions
    ADD CONSTRAINT search_suggestions_pkey PRIMARY KEY (id);


--
-- Name: seller_shipping_configs seller_shipping_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_shipping_configs
    ADD CONSTRAINT seller_shipping_configs_pkey PRIMARY KEY (id);


--
-- Name: sellers sellers_company_document_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_company_document_key UNIQUE (company_document);


--
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- Name: sellers sellers_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_slug_key UNIQUE (slug);


--
-- Name: sellers sellers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_user_id_key UNIQUE (user_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: shipping_base_rates shipping_base_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_base_rates
    ADD CONSTRAINT shipping_base_rates_pkey PRIMARY KEY (id);


--
-- Name: shipping_calculated_options shipping_calculated_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_calculated_options
    ADD CONSTRAINT shipping_calculated_options_pkey PRIMARY KEY (id);


--
-- Name: shipping_carriers shipping_carriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_carriers
    ADD CONSTRAINT shipping_carriers_pkey PRIMARY KEY (id);


--
-- Name: shipping_modalities shipping_modalities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_modalities
    ADD CONSTRAINT shipping_modalities_pkey PRIMARY KEY (id);


--
-- Name: shipping_modality_configs shipping_modality_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_modality_configs
    ADD CONSTRAINT shipping_modality_configs_pkey PRIMARY KEY (id);


--
-- Name: shipping_quotes shipping_quotes_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_quotes
    ADD CONSTRAINT shipping_quotes_cache_key_key UNIQUE (cache_key);


--
-- Name: shipping_quotes shipping_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_quotes
    ADD CONSTRAINT shipping_quotes_pkey PRIMARY KEY (id);


--
-- Name: shipping_rates shipping_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_pkey PRIMARY KEY (id);


--
-- Name: shipping_zones shipping_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_reservation_items stock_reservation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservation_items
    ADD CONSTRAINT stock_reservation_items_pkey PRIMARY KEY (id);


--
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


--
-- Name: store_credits store_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_credits
    ADD CONSTRAINT store_credits_pkey PRIMARY KEY (id);


--
-- Name: support_categories support_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_categories
    ADD CONSTRAINT support_categories_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: tracking_consents tracking_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_consents
    ADD CONSTRAINT tracking_consents_pkey PRIMARY KEY (id);


--
-- Name: tracking_consents tracking_consents_session_id_cookie_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_consents
    ADD CONSTRAINT tracking_consents_session_id_cookie_category_key UNIQUE (session_id, cookie_category);


--
-- Name: product_option_values unique_option_value; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_values
    ADD CONSTRAINT unique_option_value UNIQUE (option_id, value);


--
-- Name: product_options unique_product_option_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT unique_product_option_name UNIQUE (product_id, name);


--
-- Name: variant_option_values unique_variant_option_value; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT unique_variant_option_value UNIQUE (variant_id, option_value_id);


--
-- Name: product_variants unique_variant_sku; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT unique_variant_sku UNIQUE (sku);


--
-- Name: user_sessions_multi_role user_sessions_multi_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions_multi_role
    ADD CONSTRAINT user_sessions_multi_role_pkey PRIMARY KEY (id);


--
-- Name: user_sessions_multi_role user_sessions_multi_role_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions_multi_role
    ADD CONSTRAINT user_sessions_multi_role_token_key UNIQUE (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: variant_option_values variant_option_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_pkey PRIMARY KEY (id);


--
-- Name: variant_option_values variant_option_values_variant_id_option_value_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_variant_id_option_value_id_key UNIQUE (variant_id, option_value_id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: idx_ab_test_assignments_test_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_test_assignments_test_session ON public.ab_test_assignments USING btree (test_id, session_id);


--
-- Name: idx_ab_test_assignments_test_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_test_assignments_test_user ON public.ab_test_assignments USING btree (test_id, user_id);


--
-- Name: idx_ab_test_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_test_events_created_at ON public.ab_test_events USING btree (created_at);


--
-- Name: idx_ab_test_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_test_events_event_type ON public.ab_test_events USING btree (event_type);


--
-- Name: idx_ab_test_events_test_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_test_events_test_variant ON public.ab_test_events USING btree (test_id, variant_id);


--
-- Name: idx_ab_test_variants_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_test_variants_test_id ON public.ab_test_variants USING btree (test_id);


--
-- Name: idx_ab_tests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_tests_status ON public.ab_tests USING btree (status);


--
-- Name: idx_addresses_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_is_default ON public.addresses USING btree (is_default);


--
-- Name: idx_addresses_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_type ON public.addresses USING btree (type);


--
-- Name: idx_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_user_id ON public.addresses USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_risk_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_risk_level ON public.audit_logs USING btree (risk_level);


--
-- Name: idx_audit_logs_table_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_table_record ON public.audit_logs USING btree (table_name, record_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_base_rates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_rates_active ON public.shipping_base_rates USING btree (is_active);


--
-- Name: idx_base_rates_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_rates_template ON public.shipping_base_rates USING btree (is_template);


--
-- Name: idx_base_rates_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_rates_zone ON public.shipping_base_rates USING btree (zone_id);


--
-- Name: idx_brand_counts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_counts_id ON public.brand_product_counts USING btree (brand_id);


--
-- Name: idx_brand_counts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_counts_slug ON public.brand_product_counts USING btree (brand_slug);


--
-- Name: idx_calculated_options_base; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculated_options_base ON public.shipping_calculated_options USING btree (base_rate_id);


--
-- Name: idx_calculated_options_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculated_options_expires ON public.shipping_calculated_options USING btree (expires_at);


--
-- Name: idx_calculated_options_modality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculated_options_modality ON public.shipping_calculated_options USING btree (modality_id);


--
-- Name: idx_campaign_analytics_campaign_metric; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_analytics_campaign_metric ON public.campaign_analytics USING btree (campaign_id, metric_name);


--
-- Name: idx_campaign_analytics_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_analytics_recorded_at ON public.campaign_analytics USING btree (recorded_at);


--
-- Name: idx_campaign_recipients_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_recipients_campaign_id ON public.campaign_recipients USING btree (campaign_id);


--
-- Name: idx_campaign_recipients_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients USING btree (status);


--
-- Name: idx_campaign_recipients_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_recipients_user_id ON public.campaign_recipients USING btree (user_id);


--
-- Name: idx_cart_items_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart ON public.cart_items USING btree (cart_id);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_category_counts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_counts_id ON public.category_product_counts USING btree (category_id);


--
-- Name: idx_category_counts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_counts_slug ON public.category_product_counts USING btree (category_slug);


--
-- Name: idx_chat_conversations_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations USING btree (last_message_at DESC);


--
-- Name: idx_chat_conversations_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_order_id ON public.chat_conversations USING btree (order_id);


--
-- Name: idx_chat_conversations_participants; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_participants ON public.chat_conversations USING gin (participants);


--
-- Name: idx_chat_conversations_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_seller_id ON public.chat_conversations USING btree (seller_id);


--
-- Name: idx_chat_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_status ON public.chat_conversations USING btree (status);


--
-- Name: idx_chat_conversations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_type ON public.chat_conversations USING btree (type);


--
-- Name: idx_chat_message_reads_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_message_reads_message_id ON public.chat_message_reads USING btree (message_id);


--
-- Name: idx_chat_message_reads_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_message_reads_user_id ON public.chat_message_reads USING btree (user_id);


--
-- Name: idx_chat_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_chat_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages USING btree (sender_id);


--
-- Name: idx_chat_messages_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_type ON public.chat_messages USING btree (message_type);


--
-- Name: idx_chat_presence_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_presence_last_activity ON public.chat_presence USING btree (last_activity DESC);


--
-- Name: idx_chat_presence_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_presence_status ON public.chat_presence USING btree (status);


--
-- Name: idx_chat_presence_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_presence_user_id ON public.chat_presence USING btree (user_id);


--
-- Name: idx_consent_records_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_records_created_at ON public.consent_records USING btree (created_at);


--
-- Name: idx_consent_records_granted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_records_granted ON public.consent_records USING btree (consent_granted);


--
-- Name: idx_consent_records_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_records_type ON public.consent_records USING btree (consent_type);


--
-- Name: idx_consent_records_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consent_records_user_id ON public.consent_records USING btree (user_id);


--
-- Name: idx_coupons_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);


--
-- Name: idx_email_queue_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_scheduled_at ON public.email_queue USING btree (scheduled_at);


--
-- Name: idx_email_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_status ON public.email_queue USING btree (status);


--
-- Name: idx_facet_cache_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facet_cache_created ON public.facet_cache USING btree (created_at DESC);


--
-- Name: idx_facet_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facet_cache_expires ON public.facet_cache USING btree (expires_at);


--
-- Name: idx_facet_cache_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facet_cache_type ON public.facet_cache USING btree (facet_type);


--
-- Name: idx_gdpr_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_requests_created_at ON public.gdpr_requests USING btree (created_at);


--
-- Name: idx_gdpr_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_requests_status ON public.gdpr_requests USING btree (status);


--
-- Name: idx_gdpr_requests_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_requests_type ON public.gdpr_requests USING btree (request_type);


--
-- Name: idx_gdpr_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gdpr_requests_user_id ON public.gdpr_requests USING btree (user_id);


--
-- Name: idx_gift_contributions_contributor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_contributions_contributor ON public.gift_contributions USING btree (contributor_user_id);


--
-- Name: idx_gift_contributions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_contributions_created_at ON public.gift_contributions USING btree (created_at);


--
-- Name: idx_gift_contributions_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_contributions_item_id ON public.gift_contributions USING btree (item_id);


--
-- Name: idx_gift_contributions_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_contributions_list_id ON public.gift_contributions USING btree (list_id);


--
-- Name: idx_gift_contributions_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_contributions_payment_status ON public.gift_contributions USING btree (payment_status);


--
-- Name: idx_gift_list_analytics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_analytics_date ON public.gift_list_analytics USING btree (date_dimension);


--
-- Name: idx_gift_list_analytics_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_analytics_list_id ON public.gift_list_analytics USING btree (list_id);


--
-- Name: idx_gift_list_analytics_metric; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_analytics_metric ON public.gift_list_analytics USING btree (metric_name, date_dimension);


--
-- Name: idx_gift_list_invites_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_invites_email ON public.gift_list_invites USING btree (invited_email);


--
-- Name: idx_gift_list_invites_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_invites_list_id ON public.gift_list_invites USING btree (list_id);


--
-- Name: idx_gift_list_invites_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_invites_status ON public.gift_list_invites USING btree (status);


--
-- Name: idx_gift_list_invites_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_invites_token ON public.gift_list_invites USING btree (invitation_token);


--
-- Name: idx_gift_list_items_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_items_display_order ON public.gift_list_items USING btree (list_id, display_order);


--
-- Name: idx_gift_list_items_is_purchased; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_items_is_purchased ON public.gift_list_items USING btree (is_purchased);


--
-- Name: idx_gift_list_items_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_items_list_id ON public.gift_list_items USING btree (list_id);


--
-- Name: idx_gift_list_items_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_items_priority ON public.gift_list_items USING btree (priority);


--
-- Name: idx_gift_list_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_list_items_product_id ON public.gift_list_items USING btree (product_id);


--
-- Name: idx_gift_lists_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_lists_created_at ON public.gift_lists USING btree (created_at);


--
-- Name: idx_gift_lists_event_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_lists_event_date ON public.gift_lists USING btree (event_date);


--
-- Name: idx_gift_lists_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_lists_share_token ON public.gift_lists USING btree (share_token);


--
-- Name: idx_gift_lists_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_lists_status ON public.gift_lists USING btree (status);


--
-- Name: idx_gift_lists_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_lists_type ON public.gift_lists USING btree (type);


--
-- Name: idx_gift_lists_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_lists_user_id ON public.gift_lists USING btree (user_id);


--
-- Name: idx_integration_environments_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_integration_environments_current ON public.integration_environments USING btree (is_current) WHERE (is_current = true);


--
-- Name: idx_integration_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_created_at ON public.integration_logs USING btree (created_at DESC);


--
-- Name: idx_integration_logs_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_event_type ON public.integration_logs USING btree (event_type, created_at DESC);


--
-- Name: idx_integration_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_level ON public.integration_logs USING btree (level, created_at DESC);


--
-- Name: idx_integration_logs_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_provider ON public.integration_logs USING btree (provider_id, created_at DESC);


--
-- Name: idx_integration_logs_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_logs_reference ON public.integration_logs USING btree (reference_id, reference_type);


--
-- Name: idx_integration_metrics_operation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_metrics_operation ON public.integration_metrics USING btree (operation, period_start DESC);


--
-- Name: idx_integration_metrics_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_metrics_period ON public.integration_metrics USING btree (period_type, period_start DESC);


--
-- Name: idx_integration_metrics_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_metrics_provider ON public.integration_metrics USING btree (provider_id, period_start DESC);


--
-- Name: idx_integration_providers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_providers_active ON public.integration_providers USING btree (is_active, priority);


--
-- Name: idx_integration_providers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_providers_name ON public.integration_providers USING btree (name);


--
-- Name: idx_integration_providers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_providers_type ON public.integration_providers USING btree (type);


--
-- Name: idx_maintenance_log_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_log_task ON public.maintenance_log USING btree (task_name);


--
-- Name: idx_maintenance_log_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_log_time ON public.maintenance_log USING btree (execution_time DESC);


--
-- Name: idx_marketing_campaigns_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_campaigns_start_date ON public.marketing_campaigns USING btree (start_date);


--
-- Name: idx_marketing_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns USING btree (status);


--
-- Name: idx_marketing_campaigns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_campaigns_type ON public.marketing_campaigns USING btree (type);


--
-- Name: idx_modalities_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modalities_active ON public.shipping_modalities USING btree (is_active);


--
-- Name: idx_modalities_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modalities_priority ON public.shipping_modalities USING btree (priority);


--
-- Name: idx_modality_configs_modality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modality_configs_modality ON public.shipping_modality_configs USING btree (modality_id);


--
-- Name: idx_modality_configs_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modality_configs_seller ON public.shipping_modality_configs USING btree (seller_id);


--
-- Name: idx_modality_configs_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modality_configs_zone ON public.shipping_modality_configs USING btree (zone_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_order_items_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_seller_id ON public.order_items USING btree (seller_id);


--
-- Name: idx_order_status_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- Name: idx_order_tracking_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_tracking_created_at ON public.order_tracking USING btree (created_at);


--
-- Name: idx_order_tracking_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_tracking_order_id ON public.order_tracking USING btree (order_id);


--
-- Name: idx_order_tracking_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_tracking_status ON public.order_tracking USING btree (status);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_shipping_attempts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_shipping_attempts ON public.orders USING btree (shipping_attempts);


--
-- Name: idx_orders_shipping_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_shipping_provider ON public.orders USING btree (shipping_provider);


--
-- Name: idx_orders_shipping_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_shipping_status ON public.orders USING btree (shipping_status);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_payment_gateway; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_gateway ON public.payment_transactions USING btree (gateway);


--
-- Name: idx_payment_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_order ON public.payment_transactions USING btree (order_id);


--
-- Name: idx_payment_queue_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_queue_payment_id ON public.payment_queue USING btree (payment_id);


--
-- Name: idx_payment_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_queue_status ON public.payment_queue USING btree (status);


--
-- Name: idx_payments_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_method ON public.payments USING btree (method);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_popular_searches_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_popular_searches_count ON public.popular_searches USING btree (search_count DESC);


--
-- Name: idx_popular_searches_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_popular_searches_period ON public.popular_searches USING btree (period_end DESC, search_count DESC);


--
-- Name: idx_popular_searches_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_popular_searches_term ON public.popular_searches USING btree (term);


--
-- Name: idx_product_counts_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_counts_unique ON public.product_counts USING btree ((1));


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_condition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_condition ON public.products USING btree (condition);


--
-- Name: idx_products_delivery_days; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_delivery_days ON public.products USING btree (delivery_days);


--
-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_featured ON public.products USING btree (featured) WHERE (featured = true);


--
-- Name: idx_products_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_filters ON public.products USING btree (is_active, quantity, category_id, brand_id, price) WHERE ((is_active = true) AND (quantity > 0));


--
-- Name: idx_products_has_free_shipping; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_has_free_shipping ON public.products USING btree (has_free_shipping);


--
-- Name: idx_products_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name_trgm ON public.products USING gin (name public.gin_trgm_ops);


--
-- Name: idx_products_rating_average; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_rating_average ON public.products USING btree (rating_average);


--
-- Name: idx_products_sales; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sales ON public.products USING btree (sales_count DESC, created_at DESC) WHERE (is_active = true);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('portuguese'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_products_search_text; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search_text ON public.products USING gin (to_tsvector('portuguese'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_products_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller ON public.products USING btree (seller_id);


--
-- Name: idx_products_seller_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller_city ON public.products USING btree (seller_city) WHERE ((is_active = true) AND (seller_city IS NOT NULL));


--
-- Name: idx_products_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller_id ON public.products USING btree (seller_id) WHERE (is_active = true);


--
-- Name: idx_products_seller_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller_location ON public.products USING btree (seller_state, seller_city);


--
-- Name: idx_products_seller_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller_state ON public.products USING btree (seller_state) WHERE ((is_active = true) AND (seller_state IS NOT NULL));


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_tags ON public.products USING gin (tags);


--
-- Name: idx_query_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_cache_expires ON public.query_cache USING btree (expires_at);


--
-- Name: idx_query_cache_hits; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_cache_hits ON public.query_cache USING btree (hit_count DESC);


--
-- Name: idx_rankings_overall; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_overall ON public.product_rankings USING btree (overall_score DESC);


--
-- Name: idx_rankings_popularity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_popularity ON public.product_rankings USING btree (popularity_score DESC);


--
-- Name: idx_rankings_relevance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_relevance ON public.product_rankings USING btree (relevance_score DESC);


--
-- Name: idx_rankings_trending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_trending ON public.product_rankings USING btree (trending_score DESC);


--
-- Name: idx_retry_queue_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retry_queue_created_at ON public.integration_retry_queue USING btree (created_at);


--
-- Name: idx_retry_queue_next_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retry_queue_next_retry ON public.integration_retry_queue USING btree (next_retry_at) WHERE ((status)::text = 'retrying'::text);


--
-- Name: idx_retry_queue_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retry_queue_priority ON public.integration_retry_queue USING btree (priority, status, next_retry_at);


--
-- Name: idx_retry_queue_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retry_queue_provider ON public.integration_retry_queue USING btree (provider_id, status);


--
-- Name: idx_retry_queue_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retry_queue_reference ON public.integration_retry_queue USING btree (reference_id, reference_type);


--
-- Name: idx_retry_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retry_queue_status ON public.integration_retry_queue USING btree (status);


--
-- Name: idx_return_items_return_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_items_return_id ON public.return_items USING btree (return_id);


--
-- Name: idx_returns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_created_at ON public.returns USING btree (created_at);


--
-- Name: idx_returns_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_order_id ON public.returns USING btree (order_id);


--
-- Name: idx_returns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_status ON public.returns USING btree (status);


--
-- Name: idx_returns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_user_id ON public.returns USING btree (user_id);


--
-- Name: idx_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user ON public.reviews USING btree (user_id);


--
-- Name: idx_search_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_created_at ON public.search_history USING btree (created_at);


--
-- Name: idx_search_history_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_query ON public.search_history USING btree (query);


--
-- Name: idx_search_history_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_session ON public.search_history USING btree (session_id, created_at DESC) WHERE (session_id IS NOT NULL);


--
-- Name: idx_search_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_user_id ON public.search_history USING btree (user_id);


--
-- Name: idx_search_metaphone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_metaphone ON public.search_index USING btree (name_metaphone);


--
-- Name: idx_search_price_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_price_range ON public.search_index USING btree (price_range);


--
-- Name: idx_search_suggestions_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_suggestions_term ON public.search_suggestions USING btree (term);


--
-- Name: idx_search_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_tags_gin ON public.search_index USING gin (tags_array);


--
-- Name: idx_search_vector_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_vector_gin ON public.search_index USING gin (search_vector);


--
-- Name: idx_sellers_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sellers_location ON public.sellers USING btree (state, city);


--
-- Name: idx_sellers_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sellers_slug ON public.sellers USING btree (slug);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_shipping_modalities_delivery_days; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_modalities_delivery_days ON public.shipping_modalities USING btree (delivery_days_min, delivery_days_max);


--
-- Name: idx_shipping_quotes_cache; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_quotes_cache ON public.shipping_quotes USING btree (cache_key);


--
-- Name: idx_shipping_quotes_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_quotes_expires ON public.shipping_quotes USING btree (expires_at);


--
-- Name: idx_shipping_zones_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_zones_carrier ON public.shipping_zones USING btree (carrier_id);


--
-- Name: idx_shipping_zones_delivery_days; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_zones_delivery_days ON public.shipping_zones USING btree (delivery_days_min, delivery_days_max);


--
-- Name: idx_shipping_zones_postal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_zones_postal ON public.shipping_zones USING gin (postal_code_ranges);


--
-- Name: idx_shipping_zones_uf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_zones_uf ON public.shipping_zones USING btree (uf);


--
-- Name: idx_stock_movements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_created_at ON public.stock_movements USING btree (created_at DESC);


--
-- Name: idx_stock_movements_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_product ON public.stock_movements USING btree (product_id);


--
-- Name: idx_stock_movements_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_reference ON public.stock_movements USING btree (reference_id);


--
-- Name: idx_stock_movements_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_type ON public.stock_movements USING btree (type);


--
-- Name: idx_stock_reservations_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_expires ON public.stock_reservations USING btree (expires_at);


--
-- Name: idx_stock_reservations_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_session ON public.stock_reservations USING btree (session_id);


--
-- Name: idx_stock_reservations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_status ON public.stock_reservations USING btree (status);


--
-- Name: idx_support_messages_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_ticket_id ON public.support_messages USING btree (ticket_id);


--
-- Name: idx_support_tickets_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);


--
-- Name: idx_support_tickets_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_created_at ON public.support_tickets USING btree (created_at);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_support_tickets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);


--
-- Name: idx_tracking_consents_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_consents_session ON public.tracking_consents USING btree (session_id);


--
-- Name: idx_tracking_consents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_consents_user_id ON public.tracking_consents USING btree (user_id);


--
-- Name: idx_user_sessions_multi_role_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_multi_role_expires_at ON public.user_sessions_multi_role USING btree (expires_at);


--
-- Name: idx_user_sessions_multi_role_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_multi_role_token ON public.user_sessions_multi_role USING btree (token);


--
-- Name: idx_user_sessions_multi_role_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_multi_role_user_id ON public.user_sessions_multi_role USING btree (user_id);


--
-- Name: idx_users_admin_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_admin_data ON public.users USING gin (admin_data);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_roles; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_roles ON public.users USING gin (roles);


--
-- Name: idx_users_vendor_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_vendor_data ON public.users USING gin (vendor_data);


--
-- Name: idx_webhook_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_event ON public.webhook_logs USING btree (gateway, event_id);


--
-- Name: idx_webhook_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_created_at ON public.webhook_events USING btree (created_at);


--
-- Name: idx_webhook_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_event_type ON public.webhook_events USING btree (event_type);


--
-- Name: idx_webhook_events_next_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_next_retry ON public.webhook_events USING btree (next_retry_at) WHERE ((status)::text = 'retrying'::text);


--
-- Name: idx_webhook_events_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_priority ON public.webhook_events USING btree (priority, status);


--
-- Name: idx_webhook_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_status ON public.webhook_events USING btree (status);


--
-- Name: gift_lists trigger_generate_share_token; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_share_token BEFORE INSERT ON public.gift_lists FOR EACH ROW EXECUTE FUNCTION public.generate_share_token_trigger();


--
-- Name: gift_contributions trigger_update_gift_amounts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_gift_amounts AFTER INSERT OR UPDATE OF payment_status ON public.gift_contributions FOR EACH ROW EXECUTE FUNCTION public.update_gift_list_amounts();


--
-- Name: integration_environments update_integration_environments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integration_environments_updated_at BEFORE UPDATE ON public.integration_environments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: integration_provider_environments update_integration_provider_environments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integration_provider_environments_updated_at BEFORE UPDATE ON public.integration_provider_environments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: integration_providers update_integration_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integration_providers_updated_at BEFORE UPDATE ON public.integration_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: integration_retry_queue update_integration_retry_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integration_retry_queue_updated_at BEFORE UPDATE ON public.integration_retry_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_gateways_metadata update_payment_gateways_metadata_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_gateways_metadata_updated_at BEFORE UPDATE ON public.payment_gateways_metadata FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_gateways update_payment_gateways_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_transactions update_payment_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_product_search_index; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_search_index AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trigger_update_search_index();


--
-- Name: ab_test_assignments ab_test_assignments_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.ab_tests(id) ON DELETE CASCADE;


--
-- Name: ab_test_assignments ab_test_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ab_test_assignments ab_test_assignments_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_assignments
    ADD CONSTRAINT ab_test_assignments_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.ab_test_variants(id) ON DELETE CASCADE;


--
-- Name: ab_test_events ab_test_events_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_events
    ADD CONSTRAINT ab_test_events_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.ab_tests(id) ON DELETE CASCADE;


--
-- Name: ab_test_events ab_test_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_events
    ADD CONSTRAINT ab_test_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ab_test_events ab_test_events_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_events
    ADD CONSTRAINT ab_test_events_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.ab_test_variants(id) ON DELETE CASCADE;


--
-- Name: ab_test_variants ab_test_variants_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_variants
    ADD CONSTRAINT ab_test_variants_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.ab_tests(id) ON DELETE CASCADE;


--
-- Name: ab_tests ab_tests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_tests
    ADD CONSTRAINT ab_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: abandoned_carts abandoned_carts_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abandoned_carts
    ADD CONSTRAINT abandoned_carts_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: abandoned_carts abandoned_carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abandoned_carts
    ADD CONSTRAINT abandoned_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: campaign_analytics campaign_analytics_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_analytics
    ADD CONSTRAINT campaign_analytics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_recipients campaign_recipients_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_recipients campaign_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: chat_conversations chat_conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: chat_conversations chat_conversations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: chat_conversations chat_conversations_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: chat_message_reads chat_message_reads_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_message_reads chat_message_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: chat_presence chat_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_presence
    ADD CONSTRAINT chat_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_settings chat_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_settings
    ADD CONSTRAINT chat_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: consent_records consent_records_parent_consent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_parent_consent_id_fkey FOREIGN KEY (parent_consent_id) REFERENCES public.consent_records(id);


--
-- Name: consent_records consent_records_processing_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_processing_activity_id_fkey FOREIGN KEY (processing_activity_id) REFERENCES public.data_processing_activities(id);


--
-- Name: consent_records consent_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: coupon_categories coupon_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_categories
    ADD CONSTRAINT coupon_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: coupon_categories coupon_categories_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_categories
    ADD CONSTRAINT coupon_categories_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_conditions coupon_conditions_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_conditions
    ADD CONSTRAINT coupon_conditions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_products coupon_products_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_products coupon_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: coupon_usage coupon_usage_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_usage coupon_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions fk_sessions_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: gdpr_requests gdpr_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: gdpr_requests gdpr_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gift_contributions gift_contributions_contributor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_contributions
    ADD CONSTRAINT gift_contributions_contributor_user_id_fkey FOREIGN KEY (contributor_user_id) REFERENCES public.users(id);


--
-- Name: gift_contributions gift_contributions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_contributions
    ADD CONSTRAINT gift_contributions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.gift_list_items(id) ON DELETE CASCADE;


--
-- Name: gift_contributions gift_contributions_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_contributions
    ADD CONSTRAINT gift_contributions_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.gift_lists(id) ON DELETE CASCADE;


--
-- Name: gift_contributions gift_contributions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_contributions
    ADD CONSTRAINT gift_contributions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: gift_contributions gift_contributions_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_contributions
    ADD CONSTRAINT gift_contributions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: gift_list_analytics gift_list_analytics_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_analytics
    ADD CONSTRAINT gift_list_analytics_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.gift_lists(id) ON DELETE CASCADE;


--
-- Name: gift_list_comments gift_list_comments_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_comments
    ADD CONSTRAINT gift_list_comments_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.gift_lists(id) ON DELETE CASCADE;


--
-- Name: gift_list_comments gift_list_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_comments
    ADD CONSTRAINT gift_list_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.gift_list_comments(id);


--
-- Name: gift_list_comments gift_list_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_comments
    ADD CONSTRAINT gift_list_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gift_list_favorites gift_list_favorites_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_favorites
    ADD CONSTRAINT gift_list_favorites_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.gift_lists(id) ON DELETE CASCADE;


--
-- Name: gift_list_favorites gift_list_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_favorites
    ADD CONSTRAINT gift_list_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gift_list_invites gift_list_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_invites
    ADD CONSTRAINT gift_list_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: gift_list_invites gift_list_invites_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_invites
    ADD CONSTRAINT gift_list_invites_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.gift_lists(id) ON DELETE CASCADE;


--
-- Name: gift_list_items gift_list_items_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_items
    ADD CONSTRAINT gift_list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.gift_lists(id) ON DELETE CASCADE;


--
-- Name: gift_list_items gift_list_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_items
    ADD CONSTRAINT gift_list_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: gift_list_items gift_list_items_purchased_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_items
    ADD CONSTRAINT gift_list_items_purchased_by_fkey FOREIGN KEY (purchased_by) REFERENCES public.users(id);


--
-- Name: gift_list_templates gift_list_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_list_templates
    ADD CONSTRAINT gift_list_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: gift_lists gift_lists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_lists
    ADD CONSTRAINT gift_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: integration_logs integration_logs_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.integration_providers(id);


--
-- Name: integration_logs integration_logs_retry_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT integration_logs_retry_queue_id_fkey FOREIGN KEY (retry_queue_id) REFERENCES public.integration_retry_queue(id);


--
-- Name: integration_metrics integration_metrics_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_metrics
    ADD CONSTRAINT integration_metrics_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.integration_providers(id);


--
-- Name: integration_provider_environments integration_provider_environments_environment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_provider_environments
    ADD CONSTRAINT integration_provider_environments_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.integration_environments(id);


--
-- Name: integration_provider_environments integration_provider_environments_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_provider_environments
    ADD CONSTRAINT integration_provider_environments_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.integration_providers(id);


--
-- Name: integration_retry_queue integration_retry_queue_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_retry_queue
    ADD CONSTRAINT integration_retry_queue_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.integration_providers(id);


--
-- Name: kb_articles kb_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: marketing_campaigns marketing_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_items order_items_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id);


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: order_status_history order_status_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_tracking order_tracking_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tracking
    ADD CONSTRAINT order_tracking_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: order_tracking order_tracking_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tracking
    ADD CONSTRAINT order_tracking_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_gateways_metadata payment_gateways_metadata_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways_metadata
    ADD CONSTRAINT payment_gateways_metadata_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payment_queue payment_queue_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_queue
    ADD CONSTRAINT payment_queue_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id);


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_analytics product_analytics_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_coupons product_coupons_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_coupons
    ADD CONSTRAINT product_coupons_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: product_coupons product_coupons_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_coupons
    ADD CONSTRAINT product_coupons_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_option_values product_option_values_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_values
    ADD CONSTRAINT product_option_values_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.product_options(id) ON DELETE CASCADE;


--
-- Name: product_options product_options_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT product_options_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_price_history product_price_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: product_price_history product_price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_rankings product_rankings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rankings
    ADD CONSTRAINT product_rankings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- Name: return_items return_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id);


--
-- Name: return_items return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.returns(id) ON DELETE CASCADE;


--
-- Name: returns returns_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: returns returns_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: returns returns_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.return_reasons(id);


--
-- Name: returns returns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: search_history search_history_clicked_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_clicked_product_id_fkey FOREIGN KEY (clicked_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: search_history search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: search_index search_index_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_index
    ADD CONSTRAINT search_index_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: seller_shipping_configs seller_shipping_configs_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_shipping_configs
    ADD CONSTRAINT seller_shipping_configs_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id);


--
-- Name: seller_shipping_configs seller_shipping_configs_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_shipping_configs
    ADD CONSTRAINT seller_shipping_configs_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- Name: sellers sellers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shipping_base_rates shipping_base_rates_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_base_rates
    ADD CONSTRAINT shipping_base_rates_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- Name: shipping_calculated_options shipping_calculated_options_base_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_calculated_options
    ADD CONSTRAINT shipping_calculated_options_base_rate_id_fkey FOREIGN KEY (base_rate_id) REFERENCES public.shipping_base_rates(id);


--
-- Name: shipping_calculated_options shipping_calculated_options_modality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_calculated_options
    ADD CONSTRAINT shipping_calculated_options_modality_id_fkey FOREIGN KEY (modality_id) REFERENCES public.shipping_modalities(id);


--
-- Name: shipping_calculated_options shipping_calculated_options_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_calculated_options
    ADD CONSTRAINT shipping_calculated_options_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- Name: shipping_modality_configs shipping_modality_configs_modality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_modality_configs
    ADD CONSTRAINT shipping_modality_configs_modality_id_fkey FOREIGN KEY (modality_id) REFERENCES public.shipping_modalities(id);


--
-- Name: shipping_modality_configs shipping_modality_configs_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_modality_configs
    ADD CONSTRAINT shipping_modality_configs_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- Name: shipping_rates shipping_rates_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- Name: shipping_zones shipping_zones_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id);


--
-- Name: stock_movements stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_reservation_items stock_reservation_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservation_items
    ADD CONSTRAINT stock_reservation_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_reservation_items stock_reservation_items_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservation_items
    ADD CONSTRAINT stock_reservation_items_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.stock_reservations(id) ON DELETE CASCADE;


--
-- Name: store_credits store_credits_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_credits
    ADD CONSTRAINT store_credits_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.returns(id);


--
-- Name: store_credits store_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_credits
    ADD CONSTRAINT store_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: support_categories support_categories_auto_assign_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_categories
    ADD CONSTRAINT support_categories_auto_assign_to_fkey FOREIGN KEY (auto_assign_to) REFERENCES public.users(id);


--
-- Name: support_messages support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: support_tickets support_tickets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.support_categories(id);


--
-- Name: support_tickets support_tickets_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tracking_consents tracking_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_consents
    ADD CONSTRAINT tracking_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_sessions_multi_role user_sessions_multi_role_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions_multi_role
    ADD CONSTRAINT user_sessions_multi_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: variant_option_values variant_option_values_option_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_option_value_id_fkey FOREIGN KEY (option_value_id) REFERENCES public.product_option_values(id) ON DELETE CASCADE;


--
-- Name: variant_option_values variant_option_values_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

