--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

-- Started on 2025-05-31 13:10:37 -03

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
-- TOC entry 2 (class 3079 OID 74520)
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- TOC entry 4942 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- TOC entry 3 (class 3079 OID 75515)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 4943 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 356 (class 1255 OID 74732)
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
-- TOC entry 357 (class 1255 OID 74734)
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
-- TOC entry 365 (class 1255 OID 74829)
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
-- TOC entry 366 (class 1255 OID 75140)
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
-- TOC entry 368 (class 1255 OID 75141)
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
-- TOC entry 367 (class 1255 OID 75682)
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
-- TOC entry 361 (class 1255 OID 74774)
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
-- TOC entry 362 (class 1255 OID 74775)
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
-- TOC entry 364 (class 1255 OID 74782)
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
-- TOC entry 314 (class 1255 OID 74760)
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
-- TOC entry 363 (class 1255 OID 74776)
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
-- TOC entry 359 (class 1255 OID 74735)
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
-- TOC entry 360 (class 1255 OID 74761)
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
-- TOC entry 324 (class 1255 OID 74519)
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
-- TOC entry 358 (class 1255 OID 74733)
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
-- TOC entry 319 (class 1255 OID 75617)
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
-- TOC entry 320 (class 1255 OID 75661)
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
-- TOC entry 234 (class 1259 OID 74096)
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
-- TOC entry 280 (class 1259 OID 75623)
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
-- TOC entry 241 (class 1259 OID 74275)
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
-- TOC entry 217 (class 1259 OID 73779)
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
-- TOC entry 220 (class 1259 OID 73835)
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
    CONSTRAINT products_condition_check CHECK (((condition)::text = ANY ((ARRAY['new'::character varying, 'used'::character varying, 'refurbished'::character varying])::text[]))),
    CONSTRAINT products_delivery_days_check CHECK ((delivery_days >= 0))
);


--
-- TOC entry 251 (class 1259 OID 74660)
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
-- TOC entry 233 (class 1259 OID 74073)
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
-- TOC entry 232 (class 1259 OID 74059)
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
-- TOC entry 218 (class 1259 OID 73792)
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
-- TOC entry 250 (class 1259 OID 74651)
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
-- TOC entry 295 (class 1259 OID 75966)
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
-- TOC entry 297 (class 1259 OID 76018)
-- Name: chat_message_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_message_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 296 (class 1259 OID 75994)
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
-- TOC entry 299 (class 1259 OID 76059)
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
-- TOC entry 298 (class 1259 OID 76037)
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
-- TOC entry 273 (class 1259 OID 75314)
-- Name: coupon_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 274 (class 1259 OID 75333)
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
-- TOC entry 272 (class 1259 OID 75295)
-- Name: coupon_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 231 (class 1259 OID 74042)
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
-- TOC entry 229 (class 1259 OID 74007)
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
-- TOC entry 279 (class 1259 OID 75589)
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
-- TOC entry 252 (class 1259 OID 74669)
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
-- TOC entry 243 (class 1259 OID 74301)
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
-- TOC entry 290 (class 1259 OID 75842)
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
-- TOC entry 289 (class 1259 OID 75820)
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
-- TOC entry 257 (class 1259 OID 74763)
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
-- TOC entry 256 (class 1259 OID 74762)
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
-- TOC entry 4944 (class 0 OID 0)
-- Dependencies: 256
-- Name: maintenance_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_log_id_seq OWNED BY public.maintenance_log.id;


--
-- TOC entry 284 (class 1259 OID 75698)
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
-- TOC entry 283 (class 1259 OID 75683)
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
-- TOC entry 244 (class 1259 OID 74313)
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
-- TOC entry 237 (class 1259 OID 74158)
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
-- TOC entry 278 (class 1259 OID 75568)
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
-- TOC entry 285 (class 1259 OID 75724)
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
-- TOC entry 236 (class 1259 OID 74135)
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
    estimated_delivery timestamp with time zone
);


--
-- TOC entry 242 (class 1259 OID 74288)
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
-- TOC entry 275 (class 1259 OID 75355)
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
-- TOC entry 239 (class 1259 OID 74214)
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
-- TOC entry 277 (class 1259 OID 75547)
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
-- TOC entry 240 (class 1259 OID 74226)
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 276 (class 1259 OID 75526)
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
-- TOC entry 258 (class 1259 OID 74777)
-- Name: pending_refreshes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_refreshes (
    view_name character varying(100) NOT NULL,
    requested_at timestamp without time zone NOT NULL,
    processed_at timestamp without time zone
);


--
-- TOC entry 249 (class 1259 OID 74645)
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
-- TOC entry 253 (class 1259 OID 74682)
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
-- TOC entry 255 (class 1259 OID 74720)
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
-- TOC entry 254 (class 1259 OID 74703)
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
-- TOC entry 259 (class 1259 OID 74783)
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
-- TOC entry 247 (class 1259 OID 74483)
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
-- TOC entry 228 (class 1259 OID 73989)
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
-- TOC entry 226 (class 1259 OID 73952)
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
-- TOC entry 230 (class 1259 OID 74023)
-- Name: product_coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 73874)
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
-- TOC entry 223 (class 1259 OID 73903)
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
-- TOC entry 222 (class 1259 OID 73890)
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
-- TOC entry 227 (class 1259 OID 73972)
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
-- TOC entry 224 (class 1259 OID 73916)
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
-- TOC entry 293 (class 1259 OID 75908)
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
-- TOC entry 291 (class 1259 OID 75856)
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
-- TOC entry 292 (class 1259 OID 75868)
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
-- TOC entry 238 (class 1259 OID 74186)
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
-- TOC entry 246 (class 1259 OID 74463)
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
-- TOC entry 248 (class 1259 OID 74501)
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
-- TOC entry 268 (class 1259 OID 75212)
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
-- TOC entry 219 (class 1259 OID 73811)
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
-- TOC entry 216 (class 1259 OID 73745)
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
-- TOC entry 262 (class 1259 OID 75028)
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
-- TOC entry 265 (class 1259 OID 75087)
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
-- TOC entry 260 (class 1259 OID 75001)
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
-- TOC entry 263 (class 1259 OID 75049)
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
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 264 (class 1259 OID 75065)
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
-- TOC entry 266 (class 1259 OID 75113)
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
-- TOC entry 267 (class 1259 OID 75189)
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
-- TOC entry 261 (class 1259 OID 75013)
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
    created_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 269 (class 1259 OID 75239)
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
-- TOC entry 271 (class 1259 OID 75274)
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
-- TOC entry 270 (class 1259 OID 75264)
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
-- TOC entry 294 (class 1259 OID 75930)
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
-- TOC entry 286 (class 1259 OID 75744)
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
-- TOC entry 288 (class 1259 OID 75799)
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
-- TOC entry 287 (class 1259 OID 75761)
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
-- TOC entry 245 (class 1259 OID 74327)
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
-- TOC entry 282 (class 1259 OID 75662)
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
-- TOC entry 215 (class 1259 OID 73730)
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
    customer_data jsonb DEFAULT '{"addresses": []}'::jsonb
);


--
-- TOC entry 281 (class 1259 OID 75651)
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
-- TOC entry 225 (class 1259 OID 73933)
-- Name: variant_option_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variant_option_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    option_value_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 235 (class 1259 OID 74116)
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 4096 (class 2604 OID 74766)
-- Name: maintenance_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_log ALTER COLUMN id SET DEFAULT nextval('public.maintenance_log_id_seq'::regclass);


--
-- TOC entry 4430 (class 2606 OID 74105)
-- Name: abandoned_carts abandoned_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abandoned_carts
    ADD CONSTRAINT abandoned_carts_pkey PRIMARY KEY (id);


--
-- TOC entry 4606 (class 2606 OID 75634)
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- TOC entry 4463 (class 2606 OID 74287)
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- TOC entry 4337 (class 2606 OID 73789)
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- TOC entry 4339 (class 2606 OID 73791)
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- TOC entry 4427 (class 2606 OID 74080)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4425 (class 2606 OID 74067)
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- TOC entry 4341 (class 2606 OID 73803)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4343 (class 2606 OID 73805)
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- TOC entry 4665 (class 2606 OID 75978)
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 4679 (class 2606 OID 76026)
-- Name: chat_message_reads chat_message_reads_message_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- TOC entry 4681 (class 2606 OID 76024)
-- Name: chat_message_reads chat_message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_pkey PRIMARY KEY (id);


--
-- TOC entry 4673 (class 2606 OID 76007)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4689 (class 2606 OID 76069)
-- Name: chat_presence chat_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_presence
    ADD CONSTRAINT chat_presence_pkey PRIMARY KEY (id);


--
-- TOC entry 4685 (class 2606 OID 76051)
-- Name: chat_settings chat_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_settings
    ADD CONSTRAINT chat_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4687 (class 2606 OID 76053)
-- Name: chat_settings chat_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_settings
    ADD CONSTRAINT chat_settings_user_id_key UNIQUE (user_id);


--
-- TOC entry 4580 (class 2606 OID 75322)
-- Name: coupon_categories coupon_categories_coupon_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_categories
    ADD CONSTRAINT coupon_categories_coupon_id_category_id_key UNIQUE (coupon_id, category_id);


--
-- TOC entry 4582 (class 2606 OID 75320)
-- Name: coupon_categories coupon_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_categories
    ADD CONSTRAINT coupon_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4584 (class 2606 OID 75342)
-- Name: coupon_conditions coupon_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_conditions
    ADD CONSTRAINT coupon_conditions_pkey PRIMARY KEY (id);


--
-- TOC entry 4576 (class 2606 OID 75303)
-- Name: coupon_products coupon_products_coupon_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_coupon_id_product_id_key UNIQUE (coupon_id, product_id);


--
-- TOC entry 4578 (class 2606 OID 75301)
-- Name: coupon_products coupon_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_pkey PRIMARY KEY (id);


--
-- TOC entry 4423 (class 2606 OID 74048)
-- Name: coupon_usage coupon_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 4414 (class 2606 OID 74022)
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- TOC entry 4416 (class 2606 OID 74020)
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- TOC entry 4602 (class 2606 OID 75602)
-- Name: email_queue email_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);


--
-- TOC entry 4500 (class 2606 OID 74678)
-- Name: facet_cache facet_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_cache
    ADD CONSTRAINT facet_cache_pkey PRIMARY KEY (cache_key);


--
-- TOC entry 4469 (class 2606 OID 74312)
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


--
-- TOC entry 4648 (class 2606 OID 75855)
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- TOC entry 4644 (class 2606 OID 75834)
-- Name: kb_articles kb_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_pkey PRIMARY KEY (id);


--
-- TOC entry 4646 (class 2606 OID 75836)
-- Name: kb_articles kb_articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_slug_key UNIQUE (slug);


--
-- TOC entry 4523 (class 2606 OID 74771)
-- Name: maintenance_log maintenance_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_log
    ADD CONSTRAINT maintenance_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4622 (class 2606 OID 75716)
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4624 (class 2606 OID 75718)
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- TOC entry 4618 (class 2606 OID 75697)
-- Name: notification_templates notification_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_name_key UNIQUE (name);


--
-- TOC entry 4620 (class 2606 OID 75695)
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 4473 (class 2606 OID 74321)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4449 (class 2606 OID 74165)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4600 (class 2606 OID 75578)
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4629 (class 2606 OID 75733)
-- Name: order_tracking order_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tracking
    ADD CONSTRAINT order_tracking_pkey PRIMARY KEY (id);


--
-- TOC entry 4442 (class 2606 OID 74152)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 4444 (class 2606 OID 74150)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4465 (class 2606 OID 74298)
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- TOC entry 4467 (class 2606 OID 74300)
-- Name: pages pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);


--
-- TOC entry 4586 (class 2606 OID 75362)
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- TOC entry 4588 (class 2606 OID 75364)
-- Name: password_resets password_resets_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_token_key UNIQUE (token);


--
-- TOC entry 4455 (class 2606 OID 74225)
-- Name: payment_methods payment_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);


--
-- TOC entry 4457 (class 2606 OID 74223)
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- TOC entry 4597 (class 2606 OID 75562)
-- Name: payment_queue payment_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_queue
    ADD CONSTRAINT payment_queue_pkey PRIMARY KEY (id);


--
-- TOC entry 4459 (class 2606 OID 74236)
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4461 (class 2606 OID 74238)
-- Name: payment_transactions payment_transactions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_transaction_id_key UNIQUE (transaction_id);


--
-- TOC entry 4593 (class 2606 OID 75541)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 4525 (class 2606 OID 74781)
-- Name: pending_refreshes pending_refreshes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_refreshes
    ADD CONSTRAINT pending_refreshes_pkey PRIMARY KEY (view_name);


--
-- TOC entry 4488 (class 2606 OID 74498)
-- Name: popular_searches popular_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.popular_searches
    ADD CONSTRAINT popular_searches_pkey PRIMARY KEY (id);


--
-- TOC entry 4490 (class 2606 OID 74500)
-- Name: popular_searches popular_searches_term_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.popular_searches
    ADD CONSTRAINT popular_searches_term_key UNIQUE (term);


--
-- TOC entry 4410 (class 2606 OID 73999)
-- Name: product_analytics product_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 4412 (class 2606 OID 74001)
-- Name: product_analytics product_analytics_product_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_product_id_date_key UNIQUE (product_id, date);


--
-- TOC entry 4404 (class 2606 OID 73959)
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4406 (class 2606 OID 73961)
-- Name: product_categories product_categories_product_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_category_id_key UNIQUE (product_id, category_id);


--
-- TOC entry 4419 (class 2606 OID 74031)
-- Name: product_coupons product_coupons_coupon_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_coupons
    ADD CONSTRAINT product_coupons_coupon_id_product_id_key UNIQUE (coupon_id, product_id);


--
-- TOC entry 4421 (class 2606 OID 74029)
-- Name: product_coupons product_coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_coupons
    ADD CONSTRAINT product_coupons_pkey PRIMARY KEY (id);


--
-- TOC entry 4382 (class 2606 OID 73884)
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4388 (class 2606 OID 73910)
-- Name: product_option_values product_option_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_values
    ADD CONSTRAINT product_option_values_pkey PRIMARY KEY (id);


--
-- TOC entry 4384 (class 2606 OID 73897)
-- Name: product_options product_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT product_options_pkey PRIMARY KEY (id);


--
-- TOC entry 4408 (class 2606 OID 73978)
-- Name: product_price_history product_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4509 (class 2606 OID 74693)
-- Name: product_rankings product_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rankings
    ADD CONSTRAINT product_rankings_pkey PRIMARY KEY (product_id);


--
-- TOC entry 4392 (class 2606 OID 73925)
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 4394 (class 2606 OID 73927)
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- TOC entry 4376 (class 2606 OID 73854)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4378 (class 2606 OID 73856)
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- TOC entry 4380 (class 2606 OID 73858)
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- TOC entry 4519 (class 2606 OID 74729)
-- Name: query_cache query_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_cache
    ADD CONSTRAINT query_cache_pkey PRIMARY KEY (query_hash);


--
-- TOC entry 4661 (class 2606 OID 75919)
-- Name: return_items return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4650 (class 2606 OID 75867)
-- Name: return_reasons return_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_reasons
    ADD CONSTRAINT return_reasons_pkey PRIMARY KEY (id);


--
-- TOC entry 4656 (class 2606 OID 75885)
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- TOC entry 4658 (class 2606 OID 75887)
-- Name: returns returns_return_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_return_number_key UNIQUE (return_number);


--
-- TOC entry 4453 (class 2606 OID 74198)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 4483 (class 2606 OID 74472)
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4515 (class 2606 OID 74710)
-- Name: search_index search_index_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_index
    ADD CONSTRAINT search_index_pkey PRIMARY KEY (product_id);


--
-- TOC entry 4493 (class 2606 OID 74512)
-- Name: search_suggestions search_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_suggestions
    ADD CONSTRAINT search_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 4561 (class 2606 OID 75226)
-- Name: seller_shipping_configs seller_shipping_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_shipping_configs
    ADD CONSTRAINT seller_shipping_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 4349 (class 2606 OID 73829)
-- Name: sellers sellers_company_document_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_company_document_key UNIQUE (company_document);


--
-- TOC entry 4351 (class 2606 OID 73825)
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- TOC entry 4353 (class 2606 OID 74622)
-- Name: sellers sellers_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_slug_key UNIQUE (slug);


--
-- TOC entry 4355 (class 2606 OID 73827)
-- Name: sellers sellers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_user_id_key UNIQUE (user_id);


--
-- TOC entry 4333 (class 2606 OID 73753)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4335 (class 2606 OID 73755)
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- TOC entry 4537 (class 2606 OID 75043)
-- Name: shipping_base_rates shipping_base_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_base_rates
    ADD CONSTRAINT shipping_base_rates_pkey PRIMARY KEY (id);


--
-- TOC entry 4551 (class 2606 OID 75097)
-- Name: shipping_calculated_options shipping_calculated_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_calculated_options
    ADD CONSTRAINT shipping_calculated_options_pkey PRIMARY KEY (id);


--
-- TOC entry 4527 (class 2606 OID 75012)
-- Name: shipping_carriers shipping_carriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_carriers
    ADD CONSTRAINT shipping_carriers_pkey PRIMARY KEY (id);


--
-- TOC entry 4541 (class 2606 OID 75064)
-- Name: shipping_modalities shipping_modalities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_modalities
    ADD CONSTRAINT shipping_modalities_pkey PRIMARY KEY (id);


--
-- TOC entry 4546 (class 2606 OID 75076)
-- Name: shipping_modality_configs shipping_modality_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_modality_configs
    ADD CONSTRAINT shipping_modality_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 4555 (class 2606 OID 75123)
-- Name: shipping_quotes shipping_quotes_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_quotes
    ADD CONSTRAINT shipping_quotes_cache_key_key UNIQUE (cache_key);


--
-- TOC entry 4557 (class 2606 OID 75121)
-- Name: shipping_quotes shipping_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_quotes
    ADD CONSTRAINT shipping_quotes_pkey PRIMARY KEY (id);


--
-- TOC entry 4559 (class 2606 OID 75206)
-- Name: shipping_rates shipping_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_pkey PRIMARY KEY (id);


--
-- TOC entry 4532 (class 2606 OID 75022)
-- Name: shipping_zones shipping_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_pkey PRIMARY KEY (id);


--
-- TOC entry 4567 (class 2606 OID 75249)
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- TOC entry 4574 (class 2606 OID 75281)
-- Name: stock_reservation_items stock_reservation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservation_items
    ADD CONSTRAINT stock_reservation_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4572 (class 2606 OID 75273)
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


--
-- TOC entry 4663 (class 2606 OID 75938)
-- Name: store_credits store_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_credits
    ADD CONSTRAINT store_credits_pkey PRIMARY KEY (id);


--
-- TOC entry 4631 (class 2606 OID 75755)
-- Name: support_categories support_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_categories
    ADD CONSTRAINT support_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4642 (class 2606 OID 75809)
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4637 (class 2606 OID 75776)
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 4639 (class 2606 OID 75778)
-- Name: support_tickets support_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);


--
-- TOC entry 4475 (class 2606 OID 74340)
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- TOC entry 4477 (class 2606 OID 74338)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4390 (class 2606 OID 74629)
-- Name: product_option_values unique_option_value; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_values
    ADD CONSTRAINT unique_option_value UNIQUE (option_id, value);


--
-- TOC entry 4386 (class 2606 OID 74627)
-- Name: product_options unique_product_option_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT unique_product_option_name UNIQUE (product_id, name);


--
-- TOC entry 4398 (class 2606 OID 74631)
-- Name: variant_option_values unique_variant_option_value; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT unique_variant_option_value UNIQUE (variant_id, option_value_id);


--
-- TOC entry 4396 (class 2606 OID 74633)
-- Name: product_variants unique_variant_sku; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT unique_variant_sku UNIQUE (sku);


--
-- TOC entry 4614 (class 2606 OID 75671)
-- Name: user_sessions_multi_role user_sessions_multi_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions_multi_role
    ADD CONSTRAINT user_sessions_multi_role_pkey PRIMARY KEY (id);


--
-- TOC entry 4616 (class 2606 OID 75673)
-- Name: user_sessions_multi_role user_sessions_multi_role_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions_multi_role
    ADD CONSTRAINT user_sessions_multi_role_token_key UNIQUE (token);


--
-- TOC entry 4326 (class 2606 OID 73744)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4328 (class 2606 OID 73742)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4400 (class 2606 OID 73939)
-- Name: variant_option_values variant_option_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_pkey PRIMARY KEY (id);


--
-- TOC entry 4402 (class 2606 OID 73941)
-- Name: variant_option_values variant_option_values_variant_id_option_value_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_variant_id_option_value_id_key UNIQUE (variant_id, option_value_id);


--
-- TOC entry 4432 (class 2606 OID 74122)
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- TOC entry 4434 (class 2606 OID 74124)
-- Name: wishlists wishlists_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- TOC entry 4607 (class 1259 OID 75637)
-- Name: idx_addresses_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_is_default ON public.addresses USING btree (is_default);


--
-- TOC entry 4608 (class 1259 OID 75636)
-- Name: idx_addresses_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_type ON public.addresses USING btree (type);


--
-- TOC entry 4609 (class 1259 OID 75635)
-- Name: idx_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_user_id ON public.addresses USING btree (user_id);


--
-- TOC entry 4533 (class 1259 OID 75128)
-- Name: idx_base_rates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_rates_active ON public.shipping_base_rates USING btree (is_active);


--
-- TOC entry 4534 (class 1259 OID 75129)
-- Name: idx_base_rates_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_rates_template ON public.shipping_base_rates USING btree (is_template);


--
-- TOC entry 4535 (class 1259 OID 75127)
-- Name: idx_base_rates_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_base_rates_zone ON public.shipping_base_rates USING btree (zone_id);


--
-- TOC entry 4497 (class 1259 OID 74667)
-- Name: idx_brand_counts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_counts_id ON public.brand_product_counts USING btree (brand_id);


--
-- TOC entry 4498 (class 1259 OID 74668)
-- Name: idx_brand_counts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_counts_slug ON public.brand_product_counts USING btree (brand_slug);


--
-- TOC entry 4547 (class 1259 OID 75135)
-- Name: idx_calculated_options_base; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculated_options_base ON public.shipping_calculated_options USING btree (base_rate_id);


--
-- TOC entry 4548 (class 1259 OID 75137)
-- Name: idx_calculated_options_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculated_options_expires ON public.shipping_calculated_options USING btree (expires_at);


--
-- TOC entry 4549 (class 1259 OID 75136)
-- Name: idx_calculated_options_modality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculated_options_modality ON public.shipping_calculated_options USING btree (modality_id);


--
-- TOC entry 4428 (class 1259 OID 74353)
-- Name: idx_cart_items_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart ON public.cart_items USING btree (cart_id);


--
-- TOC entry 4344 (class 1259 OID 74350)
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- TOC entry 4345 (class 1259 OID 74349)
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- TOC entry 4495 (class 1259 OID 74658)
-- Name: idx_category_counts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_counts_id ON public.category_product_counts USING btree (category_id);


--
-- TOC entry 4496 (class 1259 OID 74659)
-- Name: idx_category_counts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_counts_slug ON public.category_product_counts USING btree (category_slug);


--
-- TOC entry 4666 (class 1259 OID 76078)
-- Name: idx_chat_conversations_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations USING btree (last_message_at DESC);


--
-- TOC entry 4667 (class 1259 OID 76079)
-- Name: idx_chat_conversations_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_order_id ON public.chat_conversations USING btree (order_id);


--
-- TOC entry 4668 (class 1259 OID 76075)
-- Name: idx_chat_conversations_participants; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_participants ON public.chat_conversations USING gin (participants);


--
-- TOC entry 4669 (class 1259 OID 76080)
-- Name: idx_chat_conversations_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_seller_id ON public.chat_conversations USING btree (seller_id);


--
-- TOC entry 4670 (class 1259 OID 76077)
-- Name: idx_chat_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_status ON public.chat_conversations USING btree (status);


--
-- TOC entry 4671 (class 1259 OID 76076)
-- Name: idx_chat_conversations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_type ON public.chat_conversations USING btree (type);


--
-- TOC entry 4682 (class 1259 OID 76086)
-- Name: idx_chat_message_reads_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_message_reads_message_id ON public.chat_message_reads USING btree (message_id);


--
-- TOC entry 4683 (class 1259 OID 76085)
-- Name: idx_chat_message_reads_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_message_reads_user_id ON public.chat_message_reads USING btree (user_id);


--
-- TOC entry 4674 (class 1259 OID 76081)
-- Name: idx_chat_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);


--
-- TOC entry 4675 (class 1259 OID 76083)
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);


--
-- TOC entry 4676 (class 1259 OID 76082)
-- Name: idx_chat_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages USING btree (sender_id);


--
-- TOC entry 4677 (class 1259 OID 76084)
-- Name: idx_chat_messages_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_type ON public.chat_messages USING btree (message_type);


--
-- TOC entry 4690 (class 1259 OID 76089)
-- Name: idx_chat_presence_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_presence_last_activity ON public.chat_presence USING btree (last_activity DESC);


--
-- TOC entry 4691 (class 1259 OID 76088)
-- Name: idx_chat_presence_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_presence_status ON public.chat_presence USING btree (status);


--
-- TOC entry 4692 (class 1259 OID 76087)
-- Name: idx_chat_presence_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_presence_user_id ON public.chat_presence USING btree (user_id);


--
-- TOC entry 4417 (class 1259 OID 75348)
-- Name: idx_coupons_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);


--
-- TOC entry 4603 (class 1259 OID 75616)
-- Name: idx_email_queue_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_scheduled_at ON public.email_queue USING btree (scheduled_at);


--
-- TOC entry 4604 (class 1259 OID 75615)
-- Name: idx_email_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_status ON public.email_queue USING btree (status);


--
-- TOC entry 4501 (class 1259 OID 74681)
-- Name: idx_facet_cache_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facet_cache_created ON public.facet_cache USING btree (created_at DESC);


--
-- TOC entry 4502 (class 1259 OID 74679)
-- Name: idx_facet_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facet_cache_expires ON public.facet_cache USING btree (expires_at);


--
-- TOC entry 4503 (class 1259 OID 74680)
-- Name: idx_facet_cache_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facet_cache_type ON public.facet_cache USING btree (facet_type);


--
-- TOC entry 4520 (class 1259 OID 74772)
-- Name: idx_maintenance_log_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_log_task ON public.maintenance_log USING btree (task_name);


--
-- TOC entry 4521 (class 1259 OID 74773)
-- Name: idx_maintenance_log_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_log_time ON public.maintenance_log USING btree (execution_time DESC);


--
-- TOC entry 4538 (class 1259 OID 75130)
-- Name: idx_modalities_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modalities_active ON public.shipping_modalities USING btree (is_active);


--
-- TOC entry 4539 (class 1259 OID 75131)
-- Name: idx_modalities_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modalities_priority ON public.shipping_modalities USING btree (priority);


--
-- TOC entry 4542 (class 1259 OID 75134)
-- Name: idx_modality_configs_modality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modality_configs_modality ON public.shipping_modality_configs USING btree (modality_id);


--
-- TOC entry 4543 (class 1259 OID 75132)
-- Name: idx_modality_configs_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modality_configs_seller ON public.shipping_modality_configs USING btree (seller_id);


--
-- TOC entry 4544 (class 1259 OID 75133)
-- Name: idx_modality_configs_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modality_configs_zone ON public.shipping_modality_configs USING btree (zone_id);


--
-- TOC entry 4470 (class 1259 OID 75950)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- TOC entry 4471 (class 1259 OID 75949)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 4445 (class 1259 OID 75607)
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- TOC entry 4446 (class 1259 OID 75608)
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- TOC entry 4447 (class 1259 OID 75645)
-- Name: idx_order_items_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_seller_id ON public.order_items USING btree (seller_id);


--
-- TOC entry 4598 (class 1259 OID 75614)
-- Name: idx_order_status_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- TOC entry 4625 (class 1259 OID 75953)
-- Name: idx_order_tracking_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_tracking_created_at ON public.order_tracking USING btree (created_at);


--
-- TOC entry 4626 (class 1259 OID 75951)
-- Name: idx_order_tracking_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_tracking_order_id ON public.order_tracking USING btree (order_id);


--
-- TOC entry 4627 (class 1259 OID 75952)
-- Name: idx_order_tracking_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_tracking_status ON public.order_tracking USING btree (status);


--
-- TOC entry 4435 (class 1259 OID 75606)
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- TOC entry 4436 (class 1259 OID 74352)
-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_number ON public.orders USING btree (order_number);


--
-- TOC entry 4437 (class 1259 OID 75605)
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- TOC entry 4438 (class 1259 OID 75604)
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- TOC entry 4439 (class 1259 OID 74351)
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- TOC entry 4440 (class 1259 OID 75603)
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- TOC entry 4594 (class 1259 OID 75612)
-- Name: idx_payment_queue_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_queue_payment_id ON public.payment_queue USING btree (payment_id);


--
-- TOC entry 4595 (class 1259 OID 75613)
-- Name: idx_payment_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_queue_status ON public.payment_queue USING btree (status);


--
-- TOC entry 4589 (class 1259 OID 75611)
-- Name: idx_payments_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_method ON public.payments USING btree (method);


--
-- TOC entry 4590 (class 1259 OID 75609)
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- TOC entry 4591 (class 1259 OID 75610)
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- TOC entry 4484 (class 1259 OID 74517)
-- Name: idx_popular_searches_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_popular_searches_count ON public.popular_searches USING btree (search_count DESC);


--
-- TOC entry 4485 (class 1259 OID 74607)
-- Name: idx_popular_searches_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_popular_searches_period ON public.popular_searches USING btree (period_end DESC, search_count DESC);


--
-- TOC entry 4486 (class 1259 OID 74516)
-- Name: idx_popular_searches_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_popular_searches_term ON public.popular_searches USING btree (term);


--
-- TOC entry 4494 (class 1259 OID 74650)
-- Name: idx_product_counts_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_counts_unique ON public.product_counts USING btree ((1));


--
-- TOC entry 4356 (class 1259 OID 74346)
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- TOC entry 4357 (class 1259 OID 74613)
-- Name: idx_products_condition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_condition ON public.products USING btree (condition);


--
-- TOC entry 4358 (class 1259 OID 74614)
-- Name: idx_products_delivery_days; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_delivery_days ON public.products USING btree (delivery_days);


--
-- TOC entry 4359 (class 1259 OID 74348)
-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_featured ON public.products USING btree (featured) WHERE (featured = true);


--
-- TOC entry 4360 (class 1259 OID 74604)
-- Name: idx_products_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_filters ON public.products USING btree (is_active, quantity, category_id, brand_id, price) WHERE ((is_active = true) AND (quantity > 0));


--
-- TOC entry 4361 (class 1259 OID 74617)
-- Name: idx_products_has_free_shipping; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_has_free_shipping ON public.products USING btree (has_free_shipping);


--
-- TOC entry 4362 (class 1259 OID 74602)
-- Name: idx_products_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name_trgm ON public.products USING gin (name public.gin_trgm_ops);


--
-- TOC entry 4363 (class 1259 OID 74615)
-- Name: idx_products_rating_average; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_rating_average ON public.products USING btree (rating_average);


--
-- TOC entry 4364 (class 1259 OID 74605)
-- Name: idx_products_sales; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sales ON public.products USING btree (sales_count DESC, created_at DESC) WHERE (is_active = true);


--
-- TOC entry 4365 (class 1259 OID 74356)
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('portuguese'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- TOC entry 4366 (class 1259 OID 74601)
-- Name: idx_products_search_text; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search_text ON public.products USING gin (to_tsvector('portuguese'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- TOC entry 4367 (class 1259 OID 74347)
-- Name: idx_products_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller ON public.products USING btree (seller_id);


--
-- TOC entry 4368 (class 1259 OID 74639)
-- Name: idx_products_seller_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller_city ON public.products USING btree (seller_city) WHERE ((is_active = true) AND (seller_city IS NOT NULL));


--
-- TOC entry 4369 (class 1259 OID 74640)
-- Name: idx_products_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller_id ON public.products USING btree (seller_id) WHERE (is_active = true);


--
-- TOC entry 4370 (class 1259 OID 74620)
-- Name: idx_products_seller_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller_location ON public.products USING btree (seller_state, seller_city);


--
-- TOC entry 4371 (class 1259 OID 74638)
-- Name: idx_products_seller_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller_state ON public.products USING btree (seller_state) WHERE ((is_active = true) AND (seller_state IS NOT NULL));


--
-- TOC entry 4372 (class 1259 OID 74345)
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- TOC entry 4373 (class 1259 OID 74344)
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- TOC entry 4374 (class 1259 OID 74603)
-- Name: idx_products_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_tags ON public.products USING gin (tags);


--
-- TOC entry 4516 (class 1259 OID 74730)
-- Name: idx_query_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_cache_expires ON public.query_cache USING btree (expires_at);


--
-- TOC entry 4517 (class 1259 OID 74731)
-- Name: idx_query_cache_hits; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_cache_hits ON public.query_cache USING btree (hit_count DESC);


--
-- TOC entry 4504 (class 1259 OID 74701)
-- Name: idx_rankings_overall; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_overall ON public.product_rankings USING btree (overall_score DESC);


--
-- TOC entry 4505 (class 1259 OID 74699)
-- Name: idx_rankings_popularity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_popularity ON public.product_rankings USING btree (popularity_score DESC);


--
-- TOC entry 4506 (class 1259 OID 74700)
-- Name: idx_rankings_relevance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_relevance ON public.product_rankings USING btree (relevance_score DESC);


--
-- TOC entry 4507 (class 1259 OID 74702)
-- Name: idx_rankings_trending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_trending ON public.product_rankings USING btree (trending_score DESC);


--
-- TOC entry 4659 (class 1259 OID 75963)
-- Name: idx_return_items_return_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_items_return_id ON public.return_items USING btree (return_id);


--
-- TOC entry 4651 (class 1259 OID 75962)
-- Name: idx_returns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_created_at ON public.returns USING btree (created_at);


--
-- TOC entry 4652 (class 1259 OID 75959)
-- Name: idx_returns_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_order_id ON public.returns USING btree (order_id);


--
-- TOC entry 4653 (class 1259 OID 75961)
-- Name: idx_returns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_status ON public.returns USING btree (status);


--
-- TOC entry 4654 (class 1259 OID 75960)
-- Name: idx_returns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_user_id ON public.returns USING btree (user_id);


--
-- TOC entry 4450 (class 1259 OID 74354)
-- Name: idx_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product ON public.reviews USING btree (product_id);


--
-- TOC entry 4451 (class 1259 OID 74355)
-- Name: idx_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user ON public.reviews USING btree (user_id);


--
-- TOC entry 4478 (class 1259 OID 74514)
-- Name: idx_search_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_created_at ON public.search_history USING btree (created_at);


--
-- TOC entry 4479 (class 1259 OID 74513)
-- Name: idx_search_history_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_query ON public.search_history USING btree (query);


--
-- TOC entry 4480 (class 1259 OID 74606)
-- Name: idx_search_history_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_session ON public.search_history USING btree (session_id, created_at DESC) WHERE (session_id IS NOT NULL);


--
-- TOC entry 4481 (class 1259 OID 74515)
-- Name: idx_search_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_history_user_id ON public.search_history USING btree (user_id);


--
-- TOC entry 4510 (class 1259 OID 74717)
-- Name: idx_search_metaphone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_metaphone ON public.search_index USING btree (name_metaphone);


--
-- TOC entry 4511 (class 1259 OID 74719)
-- Name: idx_search_price_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_price_range ON public.search_index USING btree (price_range);


--
-- TOC entry 4491 (class 1259 OID 74518)
-- Name: idx_search_suggestions_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_suggestions_term ON public.search_suggestions USING btree (term);


--
-- TOC entry 4512 (class 1259 OID 74718)
-- Name: idx_search_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_tags_gin ON public.search_index USING gin (tags_array);


--
-- TOC entry 4513 (class 1259 OID 74716)
-- Name: idx_search_vector_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_vector_gin ON public.search_index USING gin (search_vector);


--
-- TOC entry 4346 (class 1259 OID 74619)
-- Name: idx_sellers_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sellers_location ON public.sellers USING btree (state, city);


--
-- TOC entry 4347 (class 1259 OID 74623)
-- Name: idx_sellers_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sellers_slug ON public.sellers USING btree (slug);


--
-- TOC entry 4329 (class 1259 OID 75644)
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- TOC entry 4330 (class 1259 OID 74342)
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- TOC entry 4331 (class 1259 OID 74343)
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- TOC entry 4552 (class 1259 OID 75138)
-- Name: idx_shipping_quotes_cache; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_quotes_cache ON public.shipping_quotes USING btree (cache_key);


--
-- TOC entry 4553 (class 1259 OID 75139)
-- Name: idx_shipping_quotes_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_quotes_expires ON public.shipping_quotes USING btree (expires_at);


--
-- TOC entry 4528 (class 1259 OID 75124)
-- Name: idx_shipping_zones_carrier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_zones_carrier ON public.shipping_zones USING btree (carrier_id);


--
-- TOC entry 4529 (class 1259 OID 75126)
-- Name: idx_shipping_zones_postal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_zones_postal ON public.shipping_zones USING gin (postal_code_ranges);


--
-- TOC entry 4530 (class 1259 OID 75125)
-- Name: idx_shipping_zones_uf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_zones_uf ON public.shipping_zones USING btree (uf);


--
-- TOC entry 4562 (class 1259 OID 75262)
-- Name: idx_stock_movements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_created_at ON public.stock_movements USING btree (created_at DESC);


--
-- TOC entry 4563 (class 1259 OID 75260)
-- Name: idx_stock_movements_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_product ON public.stock_movements USING btree (product_id);


--
-- TOC entry 4564 (class 1259 OID 75263)
-- Name: idx_stock_movements_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_reference ON public.stock_movements USING btree (reference_id);


--
-- TOC entry 4565 (class 1259 OID 75261)
-- Name: idx_stock_movements_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_type ON public.stock_movements USING btree (type);


--
-- TOC entry 4568 (class 1259 OID 75293)
-- Name: idx_stock_reservations_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_expires ON public.stock_reservations USING btree (expires_at);


--
-- TOC entry 4569 (class 1259 OID 75292)
-- Name: idx_stock_reservations_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_session ON public.stock_reservations USING btree (session_id);


--
-- TOC entry 4570 (class 1259 OID 75294)
-- Name: idx_stock_reservations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_reservations_status ON public.stock_reservations USING btree (status);


--
-- TOC entry 4640 (class 1259 OID 75958)
-- Name: idx_support_messages_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_ticket_id ON public.support_messages USING btree (ticket_id);


--
-- TOC entry 4632 (class 1259 OID 75957)
-- Name: idx_support_tickets_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);


--
-- TOC entry 4633 (class 1259 OID 75956)
-- Name: idx_support_tickets_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_created_at ON public.support_tickets USING btree (created_at);


--
-- TOC entry 4634 (class 1259 OID 75955)
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- TOC entry 4635 (class 1259 OID 75954)
-- Name: idx_support_tickets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);


--
-- TOC entry 4610 (class 1259 OID 75681)
-- Name: idx_user_sessions_multi_role_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_multi_role_expires_at ON public.user_sessions_multi_role USING btree (expires_at);


--
-- TOC entry 4611 (class 1259 OID 75679)
-- Name: idx_user_sessions_multi_role_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_multi_role_token ON public.user_sessions_multi_role USING btree (token);


--
-- TOC entry 4612 (class 1259 OID 75680)
-- Name: idx_user_sessions_multi_role_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_multi_role_user_id ON public.user_sessions_multi_role USING btree (user_id);


--
-- TOC entry 4321 (class 1259 OID 75660)
-- Name: idx_users_admin_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_admin_data ON public.users USING gin (admin_data);


--
-- TOC entry 4322 (class 1259 OID 74341)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4323 (class 1259 OID 75658)
-- Name: idx_users_roles; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_roles ON public.users USING gin (roles);


--
-- TOC entry 4324 (class 1259 OID 75659)
-- Name: idx_users_vendor_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_vendor_data ON public.users USING gin (vendor_data);


--
-- TOC entry 4792 (class 2620 OID 75620)
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4793 (class 2620 OID 75621)
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4791 (class 2620 OID 74736)
-- Name: products update_product_search_index; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_search_index AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trigger_update_search_index();


--
-- TOC entry 4719 (class 2606 OID 74106)
-- Name: abandoned_carts abandoned_carts_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abandoned_carts
    ADD CONSTRAINT abandoned_carts_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- TOC entry 4720 (class 2606 OID 74111)
-- Name: abandoned_carts abandoned_carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abandoned_carts
    ADD CONSTRAINT abandoned_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4716 (class 2606 OID 74081)
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- TOC entry 4717 (class 2606 OID 74086)
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4718 (class 2606 OID 74091)
-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 4715 (class 2606 OID 74068)
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4695 (class 2606 OID 73806)
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 4782 (class 2606 OID 75989)
-- Name: chat_conversations chat_conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4783 (class 2606 OID 75979)
-- Name: chat_conversations chat_conversations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4784 (class 2606 OID 75984)
-- Name: chat_conversations chat_conversations_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- TOC entry 4787 (class 2606 OID 76027)
-- Name: chat_message_reads chat_message_reads_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- TOC entry 4788 (class 2606 OID 76032)
-- Name: chat_message_reads chat_message_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_message_reads
    ADD CONSTRAINT chat_message_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4785 (class 2606 OID 76008)
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- TOC entry 4786 (class 2606 OID 76013)
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- TOC entry 4790 (class 2606 OID 76070)
-- Name: chat_presence chat_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_presence
    ADD CONSTRAINT chat_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4789 (class 2606 OID 76054)
-- Name: chat_settings chat_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_settings
    ADD CONSTRAINT chat_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4755 (class 2606 OID 75328)
-- Name: coupon_categories coupon_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_categories
    ADD CONSTRAINT coupon_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- TOC entry 4754 (class 2606 OID 75323)
-- Name: coupon_categories coupon_categories_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_categories
    ADD CONSTRAINT coupon_categories_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- TOC entry 4756 (class 2606 OID 75343)
-- Name: coupon_conditions coupon_conditions_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_conditions
    ADD CONSTRAINT coupon_conditions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- TOC entry 4752 (class 2606 OID 75304)
-- Name: coupon_products coupon_products_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- TOC entry 4753 (class 2606 OID 75309)
-- Name: coupon_products coupon_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4713 (class 2606 OID 74049)
-- Name: coupon_usage coupon_usage_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- TOC entry 4714 (class 2606 OID 74054)
-- Name: coupon_usage coupon_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4694 (class 2606 OID 75646)
-- Name: sessions fk_sessions_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4773 (class 2606 OID 75837)
-- Name: kb_articles kb_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- TOC entry 4763 (class 2606 OID 75719)
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4733 (class 2606 OID 74322)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4724 (class 2606 OID 74166)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4725 (class 2606 OID 74171)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 4727 (class 2606 OID 74181)
-- Name: order_items order_items_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id);


--
-- TOC entry 4726 (class 2606 OID 74176)
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- TOC entry 4761 (class 2606 OID 75584)
-- Name: order_status_history order_status_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4760 (class 2606 OID 75579)
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4764 (class 2606 OID 75739)
-- Name: order_tracking order_tracking_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tracking
    ADD CONSTRAINT order_tracking_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4765 (class 2606 OID 75734)
-- Name: order_tracking order_tracking_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_tracking
    ADD CONSTRAINT order_tracking_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4723 (class 2606 OID 74153)
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4757 (class 2606 OID 75365)
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4759 (class 2606 OID 75563)
-- Name: payment_queue payment_queue_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_queue
    ADD CONSTRAINT payment_queue_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- TOC entry 4731 (class 2606 OID 74239)
-- Name: payment_transactions payment_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4732 (class 2606 OID 74244)
-- Name: payment_transactions payment_transactions_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id);


--
-- TOC entry 4758 (class 2606 OID 75542)
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4710 (class 2606 OID 74002)
-- Name: product_analytics product_analytics_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4707 (class 2606 OID 73967)
-- Name: product_categories product_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- TOC entry 4706 (class 2606 OID 73962)
-- Name: product_categories product_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4711 (class 2606 OID 74032)
-- Name: product_coupons product_coupons_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_coupons
    ADD CONSTRAINT product_coupons_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- TOC entry 4712 (class 2606 OID 74037)
-- Name: product_coupons product_coupons_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_coupons
    ADD CONSTRAINT product_coupons_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4700 (class 2606 OID 73885)
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4702 (class 2606 OID 73911)
-- Name: product_option_values product_option_values_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_values
    ADD CONSTRAINT product_option_values_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.product_options(id) ON DELETE CASCADE;


--
-- TOC entry 4701 (class 2606 OID 73898)
-- Name: product_options product_options_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT product_options_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4708 (class 2606 OID 73984)
-- Name: product_price_history product_price_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- TOC entry 4709 (class 2606 OID 73979)
-- Name: product_price_history product_price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4736 (class 2606 OID 74694)
-- Name: product_rankings product_rankings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rankings
    ADD CONSTRAINT product_rankings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4703 (class 2606 OID 73928)
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4697 (class 2606 OID 73859)
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- TOC entry 4698 (class 2606 OID 73864)
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 4699 (class 2606 OID 73869)
-- Name: products products_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- TOC entry 4779 (class 2606 OID 75925)
-- Name: return_items return_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id);


--
-- TOC entry 4778 (class 2606 OID 75920)
-- Name: return_items return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.returns(id) ON DELETE CASCADE;


--
-- TOC entry 4777 (class 2606 OID 75903)
-- Name: returns returns_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 4774 (class 2606 OID 75888)
-- Name: returns returns_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4776 (class 2606 OID 75898)
-- Name: returns returns_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.return_reasons(id);


--
-- TOC entry 4775 (class 2606 OID 75893)
-- Name: returns returns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4730 (class 2606 OID 74209)
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- TOC entry 4728 (class 2606 OID 74199)
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4729 (class 2606 OID 74204)
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4734 (class 2606 OID 74478)
-- Name: search_history search_history_clicked_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_clicked_product_id_fkey FOREIGN KEY (clicked_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- TOC entry 4735 (class 2606 OID 74473)
-- Name: search_history search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4737 (class 2606 OID 74711)
-- Name: search_index search_index_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_index
    ADD CONSTRAINT search_index_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4746 (class 2606 OID 75227)
-- Name: seller_shipping_configs seller_shipping_configs_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_shipping_configs
    ADD CONSTRAINT seller_shipping_configs_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id);


--
-- TOC entry 4747 (class 2606 OID 75232)
-- Name: seller_shipping_configs seller_shipping_configs_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_shipping_configs
    ADD CONSTRAINT seller_shipping_configs_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- TOC entry 4696 (class 2606 OID 73830)
-- Name: sellers sellers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4693 (class 2606 OID 73756)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4739 (class 2606 OID 75044)
-- Name: shipping_base_rates shipping_base_rates_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_base_rates
    ADD CONSTRAINT shipping_base_rates_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- TOC entry 4742 (class 2606 OID 75098)
-- Name: shipping_calculated_options shipping_calculated_options_base_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_calculated_options
    ADD CONSTRAINT shipping_calculated_options_base_rate_id_fkey FOREIGN KEY (base_rate_id) REFERENCES public.shipping_base_rates(id);


--
-- TOC entry 4743 (class 2606 OID 75103)
-- Name: shipping_calculated_options shipping_calculated_options_modality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_calculated_options
    ADD CONSTRAINT shipping_calculated_options_modality_id_fkey FOREIGN KEY (modality_id) REFERENCES public.shipping_modalities(id);


--
-- TOC entry 4744 (class 2606 OID 75108)
-- Name: shipping_calculated_options shipping_calculated_options_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_calculated_options
    ADD CONSTRAINT shipping_calculated_options_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- TOC entry 4740 (class 2606 OID 75082)
-- Name: shipping_modality_configs shipping_modality_configs_modality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_modality_configs
    ADD CONSTRAINT shipping_modality_configs_modality_id_fkey FOREIGN KEY (modality_id) REFERENCES public.shipping_modalities(id);


--
-- TOC entry 4741 (class 2606 OID 75077)
-- Name: shipping_modality_configs shipping_modality_configs_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_modality_configs
    ADD CONSTRAINT shipping_modality_configs_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- TOC entry 4745 (class 2606 OID 75207)
-- Name: shipping_rates shipping_rates_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id);


--
-- TOC entry 4738 (class 2606 OID 75023)
-- Name: shipping_zones shipping_zones_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.shipping_carriers(id);


--
-- TOC entry 4749 (class 2606 OID 75255)
-- Name: stock_movements stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4748 (class 2606 OID 75250)
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4751 (class 2606 OID 75287)
-- Name: stock_reservation_items stock_reservation_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservation_items
    ADD CONSTRAINT stock_reservation_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4750 (class 2606 OID 75282)
-- Name: stock_reservation_items stock_reservation_items_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservation_items
    ADD CONSTRAINT stock_reservation_items_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.stock_reservations(id) ON DELETE CASCADE;


--
-- TOC entry 4780 (class 2606 OID 75944)
-- Name: store_credits store_credits_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_credits
    ADD CONSTRAINT store_credits_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.returns(id);


--
-- TOC entry 4781 (class 2606 OID 75939)
-- Name: store_credits store_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_credits
    ADD CONSTRAINT store_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4766 (class 2606 OID 75756)
-- Name: support_categories support_categories_auto_assign_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_categories
    ADD CONSTRAINT support_categories_auto_assign_to_fkey FOREIGN KEY (auto_assign_to) REFERENCES public.users(id);


--
-- TOC entry 4771 (class 2606 OID 75810)
-- Name: support_messages support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- TOC entry 4772 (class 2606 OID 75815)
-- Name: support_messages support_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4770 (class 2606 OID 75794)
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- TOC entry 4768 (class 2606 OID 75784)
-- Name: support_tickets support_tickets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.support_categories(id);


--
-- TOC entry 4769 (class 2606 OID 75789)
-- Name: support_tickets support_tickets_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4767 (class 2606 OID 75779)
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4762 (class 2606 OID 75674)
-- Name: user_sessions_multi_role user_sessions_multi_role_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions_multi_role
    ADD CONSTRAINT user_sessions_multi_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4705 (class 2606 OID 73947)
-- Name: variant_option_values variant_option_values_option_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_option_value_id_fkey FOREIGN KEY (option_value_id) REFERENCES public.product_option_values(id) ON DELETE CASCADE;


--
-- TOC entry 4704 (class 2606 OID 73942)
-- Name: variant_option_values variant_option_values_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- TOC entry 4722 (class 2606 OID 74130)
-- Name: wishlists wishlists_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4721 (class 2606 OID 74125)
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2025-05-31 13:10:37 -03

--
-- PostgreSQL database dump complete
--

