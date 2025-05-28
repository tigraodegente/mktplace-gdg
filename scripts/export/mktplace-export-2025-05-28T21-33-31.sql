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

ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.variant_option_values DROP CONSTRAINT IF EXISTS variant_option_values_variant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.variant_option_values DROP CONSTRAINT IF EXISTS variant_option_values_option_value_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shipping_zones DROP CONSTRAINT IF EXISTS shipping_zones_shipping_method_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_seller_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_brand_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_price_history DROP CONSTRAINT IF EXISTS product_price_history_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_price_history DROP CONSTRAINT IF EXISTS product_price_history_changed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.product_options DROP CONSTRAINT IF EXISTS product_options_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_option_values DROP CONSTRAINT IF EXISTS product_option_values_option_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_images DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_coupons DROP CONSTRAINT IF EXISTS product_coupons_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_coupons DROP CONSTRAINT IF EXISTS product_coupons_coupon_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_categories DROP CONSTRAINT IF EXISTS product_categories_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_categories DROP CONSTRAINT IF EXISTS product_categories_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_analytics DROP CONSTRAINT IF EXISTS product_analytics_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_payment_method_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_seller_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.coupon_usage DROP CONSTRAINT IF EXISTS coupon_usage_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.coupon_usage DROP CONSTRAINT IF EXISTS coupon_usage_coupon_id_fkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
ALTER TABLE IF EXISTS ONLY public.carts DROP CONSTRAINT IF EXISTS carts_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_variant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_fkey;
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.abandoned_carts DROP CONSTRAINT IF EXISTS abandoned_carts_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.abandoned_carts DROP CONSTRAINT IF EXISTS abandoned_carts_cart_id_fkey;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_sessions_user_id;
DROP INDEX IF EXISTS public.idx_sessions_token;
DROP INDEX IF EXISTS public.idx_reviews_user;
DROP INDEX IF EXISTS public.idx_reviews_product;
DROP INDEX IF EXISTS public.idx_products_slug;
DROP INDEX IF EXISTS public.idx_products_sku;
DROP INDEX IF EXISTS public.idx_products_seller;
DROP INDEX IF EXISTS public.idx_products_search;
DROP INDEX IF EXISTS public.idx_products_featured;
DROP INDEX IF EXISTS public.idx_products_category;
DROP INDEX IF EXISTS public.idx_orders_user;
DROP INDEX IF EXISTS public.idx_orders_number;
DROP INDEX IF EXISTS public.idx_categories_slug;
DROP INDEX IF EXISTS public.idx_categories_parent;
DROP INDEX IF EXISTS public.idx_cart_items_cart;
ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_product_id_key;
ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_pkey;
ALTER TABLE IF EXISTS ONLY public.variant_option_values DROP CONSTRAINT IF EXISTS variant_option_values_variant_id_option_value_id_key;
ALTER TABLE IF EXISTS ONLY public.variant_option_values DROP CONSTRAINT IF EXISTS variant_option_values_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
ALTER TABLE IF EXISTS ONLY public.shipping_zones DROP CONSTRAINT IF EXISTS shipping_zones_pkey;
ALTER TABLE IF EXISTS ONLY public.shipping_methods DROP CONSTRAINT IF EXISTS shipping_methods_pkey;
ALTER TABLE IF EXISTS ONLY public.shipping_methods DROP CONSTRAINT IF EXISTS shipping_methods_code_key;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_token_key;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_user_id_key;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_pkey;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_company_document_key;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_slug_key;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_key;
ALTER TABLE IF EXISTS ONLY public.product_variants DROP CONSTRAINT IF EXISTS product_variants_pkey;
ALTER TABLE IF EXISTS ONLY public.product_price_history DROP CONSTRAINT IF EXISTS product_price_history_pkey;
ALTER TABLE IF EXISTS ONLY public.product_options DROP CONSTRAINT IF EXISTS product_options_pkey;
ALTER TABLE IF EXISTS ONLY public.product_option_values DROP CONSTRAINT IF EXISTS product_option_values_pkey;
ALTER TABLE IF EXISTS ONLY public.product_images DROP CONSTRAINT IF EXISTS product_images_pkey;
ALTER TABLE IF EXISTS ONLY public.product_coupons DROP CONSTRAINT IF EXISTS product_coupons_pkey;
ALTER TABLE IF EXISTS ONLY public.product_coupons DROP CONSTRAINT IF EXISTS product_coupons_coupon_id_product_id_key;
ALTER TABLE IF EXISTS ONLY public.product_categories DROP CONSTRAINT IF EXISTS product_categories_product_id_category_id_key;
ALTER TABLE IF EXISTS ONLY public.product_categories DROP CONSTRAINT IF EXISTS product_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.product_analytics DROP CONSTRAINT IF EXISTS product_analytics_product_id_date_key;
ALTER TABLE IF EXISTS ONLY public.product_analytics DROP CONSTRAINT IF EXISTS product_analytics_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_transaction_id_key;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_code_key;
ALTER TABLE IF EXISTS ONLY public.pages DROP CONSTRAINT IF EXISTS pages_slug_key;
ALTER TABLE IF EXISTS ONLY public.pages DROP CONSTRAINT IF EXISTS pages_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.faq DROP CONSTRAINT IF EXISTS faq_pkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_pkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_code_key;
ALTER TABLE IF EXISTS ONLY public.coupon_usage DROP CONSTRAINT IF EXISTS coupon_usage_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.carts DROP CONSTRAINT IF EXISTS carts_pkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_pkey;
ALTER TABLE IF EXISTS ONLY public.brands DROP CONSTRAINT IF EXISTS brands_slug_key;
ALTER TABLE IF EXISTS ONLY public.brands DROP CONSTRAINT IF EXISTS brands_pkey;
ALTER TABLE IF EXISTS ONLY public.banners DROP CONSTRAINT IF EXISTS banners_pkey;
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS addresses_pkey;
ALTER TABLE IF EXISTS ONLY public.abandoned_carts DROP CONSTRAINT IF EXISTS abandoned_carts_pkey;
DROP TABLE IF EXISTS public.wishlists;
DROP TABLE IF EXISTS public.variant_option_values;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.shipping_zones;
DROP TABLE IF EXISTS public.shipping_methods;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.sellers;
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.product_variants;
DROP TABLE IF EXISTS public.product_price_history;
DROP TABLE IF EXISTS public.product_options;
DROP TABLE IF EXISTS public.product_option_values;
DROP TABLE IF EXISTS public.product_images;
DROP TABLE IF EXISTS public.product_coupons;
DROP TABLE IF EXISTS public.product_categories;
DROP TABLE IF EXISTS public.product_analytics;
DROP TABLE IF EXISTS public.payment_transactions;
DROP TABLE IF EXISTS public.payment_methods;
DROP TABLE IF EXISTS public.pages;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.faq;
DROP TABLE IF EXISTS public.coupons;
DROP TABLE IF EXISTS public.coupon_usage;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.carts;
DROP TABLE IF EXISTS public.cart_items;
DROP TABLE IF EXISTS public.brands;
DROP TABLE IF EXISTS public.banners;
DROP TABLE IF EXISTS public.addresses;
DROP TABLE IF EXISTS public.abandoned_carts;
SET default_tablespace = '';

SET default_table_access_method = heap;

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
    type character varying(50) DEFAULT 'shipping'::character varying NOT NULL,
    is_default boolean DEFAULT false,
    street character varying(255) NOT NULL,
    number character varying(20) NOT NULL,
    complement character varying(255),
    neighborhood character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    state character varying(2) NOT NULL,
    postal_code character varying(10) NOT NULL,
    country character varying(2) DEFAULT 'BR'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


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
    minimum_amount numeric(10,2),
    maximum_discount numeric(10,2),
    usage_limit integer,
    used_count integer DEFAULT 0,
    valid_from timestamp without time zone DEFAULT now() NOT NULL,
    valid_until timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


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
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: product_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
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
    featuring jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    published_at timestamp without time zone
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
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
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: shipping_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    carrier character varying(255),
    is_active boolean DEFAULT true,
    min_days integer,
    max_days integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: shipping_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    shipping_method_id uuid NOT NULL,
    regions text[],
    price numeric(10,2) NOT NULL,
    free_above numeric(10,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
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
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: abandoned_carts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.abandoned_carts (id, cart_id, user_id, email, total_value, reminder_sent_count, last_reminder_at, recovered, recovered_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.addresses (id, user_id, type, is_default, street, number, complement, neighborhood, city, state, postal_code, country, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banners (id, title, subtitle, image_url, link_url, "position", display_order, starts_at, ends_at, is_active, created_at, updated_at) FROM stdin;
f29988ef-e8f8-45d5-91c3-00d336d26069	Black Friday Antecipada	Até 70% de desconto em produtos selecionados	https://picsum.photos/seed/banner-bf/1920/600	/categoria/eletronicos	home	0	2025-05-28 22:24:01.506879	2025-06-27 22:24:01.506879	t	2025-05-28 22:24:01.506879	2025-05-28 22:24:01.506879
5d588304-f89b-46eb-a151-5cd82e3dd125	Novos iPhones 15	Em até 12x sem juros com frete grátis	https://picsum.photos/seed/banner-iphone/1920/600	/categoria/smartphones	home	1	2025-05-28 22:24:01.507285	2025-06-27 22:24:01.507285	t	2025-05-28 22:24:01.507285	2025-05-28 22:24:01.507285
acb87abf-fd97-466a-a7c1-9a2bec83d5e0	Gaming Week	Consoles e jogos com preços imperdíveis	https://picsum.photos/seed/banner-gaming/1920/600	/categoria/games	category	2	2025-05-28 22:24:01.507524	2025-06-27 22:24:01.507524	t	2025-05-28 22:24:01.507524	2025-05-28 22:24:01.507524
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brands (id, name, slug, description, logo_url, website, is_active, created_at, updated_at) FROM stdin;
6f3b272d-b3fa-4009-8c8d-30972b9be20d	Samsung	samsung	\N	\N	\N	t	2025-05-28 22:13:11.616892	2025-05-28 22:13:11.616892
6567b65b-502a-4f9a-b43f-e454dc6ccf00	Apple	apple	\N	\N	\N	t	2025-05-28 22:13:11.618078	2025-05-28 22:13:11.618078
321f28cf-85b6-48a3-9f9d-15cf83a7f43d	Xiaomi	xiaomi	\N	\N	\N	t	2025-05-28 22:13:11.618767	2025-05-28 22:13:11.618767
3a297cbe-a984-447b-a4cc-74582b819acb	Sony	sony	\N	\N	\N	t	2025-05-28 22:13:11.619447	2025-05-28 22:13:11.619447
9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	LG	lg	\N	\N	\N	t	2025-05-28 22:13:11.620139	2025-05-28 22:13:11.620139
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, cart_id, product_id, variant_id, quantity, price, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.carts (id, user_id, session_id, status, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, description, parent_id, image_url, is_active, "position", path, created_at, updated_at) FROM stdin;
7a98cd4f-c85f-4a0b-9bb0-5f00ea68f38e	Eletrônicos	eletronicos	Produtos eletrônicos em geral	\N	\N	t	0	{eletronicos}	2025-05-28 22:13:11.620824	2025-05-28 22:13:11.620824
367c84e6-8968-4786-b73e-fc1a00a6a364	Informática	informatica	Computadores e acessórios	\N	\N	t	0	{informatica}	2025-05-28 22:13:11.623211	2025-05-28 22:13:11.623211
2988bacc-9bf2-49bb-9bfa-1d2e7b176e1e	Celulares	celulares	Smartphones e acessórios	\N	\N	t	0	{celulares}	2025-05-28 22:13:11.623832	2025-05-28 22:13:11.623832
8dd51395-566d-435c-ae47-8d5e780f336b	Games	games	Consoles e jogos	\N	\N	t	0	{games}	2025-05-28 22:13:11.624453	2025-05-28 22:13:11.624453
dbac9eda-ef0b-454b-9fb4-fb2a3c953618	Casa	casa	Produtos para casa	\N	\N	t	0	{casa}	2025-05-28 22:13:11.625702	2025-05-28 22:13:11.625702
e7ee4488-175b-476d-8f77-92408f8121d9	Smartphones	smartphones	\N	2988bacc-9bf2-49bb-9bfa-1d2e7b176e1e	\N	t	0	{celulares,smartphones}	2025-05-28 22:13:11.626524	2025-05-28 22:13:11.626524
4956d68d-bf5b-45b6-9e57-2d98ba6c8278	Acessórios para Celular	acessorios-celular	\N	2988bacc-9bf2-49bb-9bfa-1d2e7b176e1e	\N	t	0	{celulares,acessorios-celular}	2025-05-28 22:13:11.62733	2025-05-28 22:13:11.62733
249f5633-0bf2-4eba-a187-f90b4f8c54cf	Notebooks	notebooks	\N	367c84e6-8968-4786-b73e-fc1a00a6a364	\N	t	0	{informatica,notebooks}	2025-05-28 22:13:11.6279	2025-05-28 22:13:11.6279
2ed9bc71-b78b-42ba-92f2-1b49757e1fe6	Monitores	monitores	\N	367c84e6-8968-4786-b73e-fc1a00a6a364	\N	t	0	{informatica,monitores}	2025-05-28 22:13:11.628557	2025-05-28 22:13:11.628557
8d127abf-7fdf-4f67-b2dd-20b52176bdd3	TVs	tvs	\N	7a98cd4f-c85f-4a0b-9bb0-5f00ea68f38e	\N	t	0	{eletronicos,tvs}	2025-05-28 22:13:11.62918	2025-05-28 22:13:11.62918
75e6681c-a1fb-4e6e-8b4c-6504e1e7b1bf	Fones de Ouvido	fones-ouvido	\N	7a98cd4f-c85f-4a0b-9bb0-5f00ea68f38e	\N	t	0	{eletronicos,fones-ouvido}	2025-05-28 22:13:11.629729	2025-05-28 22:13:11.629729
3c991042-c1b7-4e19-b11a-a3e505308612	PlayStation	playstation	\N	8dd51395-566d-435c-ae47-8d5e780f336b	\N	t	0	{games,playstation}	2025-05-28 22:13:11.630279	2025-05-28 22:13:11.630279
8e1f9888-5679-4d1b-86dc-9a3f16ab7f99	Xbox	xbox	\N	8dd51395-566d-435c-ae47-8d5e780f336b	\N	t	0	{games,xbox}	2025-05-28 22:13:11.630815	2025-05-28 22:13:11.630815
0cc21e81-3fb1-41c0-bc40-2e7d9c843e9a	Nintendo	nintendo	\N	8dd51395-566d-435c-ae47-8d5e780f336b	\N	t	0	{games,nintendo}	2025-05-28 22:13:11.631484	2025-05-28 22:13:11.631484
\.


--
-- Data for Name: coupon_usage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupon_usage (id, coupon_id, user_id, order_id, used_at) FROM stdin;
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupons (id, code, description, type, value, minimum_amount, maximum_discount, usage_limit, used_count, valid_from, valid_until, is_active, created_at, updated_at) FROM stdin;
a38fdbcf-3f97-4195-92f6-faf278bc9453	BEMVINDO10	10% de desconto para novos clientes	percentage	10.00	100.00	\N	865	0	2025-05-28 22:24:01.501744	2025-06-27 22:24:01.501744	t	2025-05-28 22:24:01.501744	2025-05-28 22:24:01.501744
535802ef-bc87-4cdf-b54e-7a920e3193e4	FRETEGRATIS	Frete grátis em compras acima de R$ 200	fixed	30.00	200.00	\N	506	0	2025-05-28 22:24:01.50306	2025-06-27 22:24:01.50306	t	2025-05-28 22:24:01.50306	2025-05-28 22:24:01.50306
5d493298-682d-4489-9997-bf7fff547ded	NATAL25	25% de desconto de Natal	percentage	25.00	500.00	250.00	590	0	2025-05-28 22:24:01.503298	2025-06-27 22:24:01.503298	t	2025-05-28 22:24:01.503298	2025-05-28 22:24:01.503298
f2950a7f-5848-407d-8bed-fb5420ea87d2	TECH15	15% em produtos de tecnologia	percentage	15.00	300.00	\N	488	0	2025-05-28 22:24:01.503566	2025-06-27 22:24:01.503566	t	2025-05-28 22:24:01.503566	2025-05-28 22:24:01.503566
a451c232-0080-40b4-bd66-17236991e978	APP20	20% de desconto exclusivo do app	percentage	20.00	150.00	\N	984	0	2025-05-28 22:24:01.506621	2025-06-27 22:24:01.506621	t	2025-05-28 22:24:01.506621	2025-05-28 22:24:01.506621
\.


--
-- Data for Name: faq; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.faq (id, question, answer, category, display_order, is_active, created_at, updated_at) FROM stdin;
086dd683-dd56-4ea4-adb2-f7718fb57a1c	Como faço para comprar?	Basta adicionar os produtos ao carrinho e finalizar a compra.	compras	0	t	2025-05-28 22:13:11.654052	2025-05-28 22:13:11.654052
0fe88df4-df8c-469c-abcf-f09c8e737fd1	Quais formas de pagamento são aceitas?	Aceitamos cartão de crédito, débito, PIX e boleto.	pagamento	0	t	2025-05-28 22:13:11.655382	2025-05-28 22:13:11.655382
420ac606-6224-4d28-baeb-f4f25f5f8583	Qual o prazo de entrega?	O prazo varia de acordo com sua região e método de envio escolhido.	entrega	0	t	2025-05-28 22:13:11.655871	2025-05-28 22:13:11.655871
c363e736-4208-4898-8a29-e4d463033274	Como faço para devolver um produto?	Entre em contato conosco em até 7 dias após o recebimento.	devolucao	0	t	2025-05-28 22:13:11.656512	2025-05-28 22:13:11.656512
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, data, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, variant_id, seller_id, quantity, price, total, status, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, order_number, status, payment_status, payment_method, subtotal, shipping_cost, discount_amount, tax_amount, total, currency, shipping_address, billing_address, notes, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pages (id, title, slug, content, meta_title, meta_description, is_published, created_at, updated_at) FROM stdin;
b5ecb5f7-5fa9-48cc-85e7-6e1afda81755	Sobre Nós	sobre-nos	Somos o melhor marketplace do Brasil, conectando vendedores e compradores.	\N	\N	t	2025-05-28 22:13:11.649938	2025-05-28 22:13:11.649938
7e9a6061-9239-4274-b843-26b06a7848c5	Termos de Uso	termos-de-uso	Ao usar nosso marketplace, você concorda com os seguintes termos...	\N	\N	t	2025-05-28 22:13:11.651095	2025-05-28 22:13:11.651095
d1a58d2f-caa0-4ebc-9a30-96f70234b591	Política de Privacidade	politica-privacidade	Respeitamos sua privacidade e protegemos seus dados...	\N	\N	t	2025-05-28 22:13:11.651527	2025-05-28 22:13:11.651527
60c7d75f-318c-4b23-8675-de6dea70da9d	Como Comprar	como-comprar	Guia passo a passo para fazer suas compras em nosso marketplace.	\N	\N	t	2025-05-28 22:13:11.651988	2025-05-28 22:13:11.651988
48df488c-4790-4c34-981e-985fb6fa7458	Como Vender	como-vender	Torne-se um vendedor e aumente suas vendas online.	\N	\N	t	2025-05-28 22:13:11.653398	2025-05-28 22:13:11.653398
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_methods (id, name, code, type, is_active, configuration, created_at) FROM stdin;
ae9a6160-ccb7-4b34-a238-764ee2a1e2f5	Cartão de Crédito	credit_card	card	t	\N	2025-05-28 22:13:11.632327
2ff5974f-3c5e-4ebe-972a-cf03898147ed	Cartão de Débito	debit_card	card	t	\N	2025-05-28 22:13:11.633938
4f85fdfa-1253-4870-a700-983468bbe581	PIX	pix	instant	t	\N	2025-05-28 22:13:11.634702
7de85b79-9e80-4cc4-af6a-656aa7e7759b	Boleto	boleto	boleto	t	\N	2025-05-28 22:13:11.63534
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_transactions (id, order_id, payment_method_id, transaction_id, status, amount, currency, gateway_response, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product_analytics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_analytics (id, product_id, date, views, clicks, add_to_cart, purchases, revenue) FROM stdin;
3538fa42-fd74-4af9-9c7c-52d103cf2c58	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	2025-05-28	454	85	42	7	53994.00
2c4ca1ad-2a23-40e2-b289-bf54504f4c74	56f47c40-6aca-4545-a51a-0478fc9f240f	2025-05-28	743	128	44	7	111993.00
ff57f86b-8778-4dcd-b0e3-6e0b63848eec	fdc599e7-933d-4539-8c1f-57d91afd9e11	2025-05-28	607	127	17	2	104997.00
1de100f8-5abb-4167-92db-d8cf204e2d2c	df337b23-b0f9-4f55-a7cb-b18892a2617d	2025-05-28	963	149	28	10	49990.00
e0a0f739-76e1-4c12-b82e-13e714d8c829	9edcafc7-8b50-4051-9d23-e55b2d8c5071	2025-05-28	899	190	14	1	1499.00
58d14ba6-7296-438f-b574-dbabca97dac5	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	2025-05-28	804	159	26	9	22497.00
c8eae6b2-6deb-437c-a0cb-d3a12aa2c9e3	aab3e474-3461-425c-9b52-a0747e3a1589	2025-05-28	967	91	34	5	38997.00
8b41ca3e-cb0f-4b98-bd73-7a72462877e4	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	2025-05-28	363	80	23	7	31996.00
c2ecaaae-dc24-4fac-b7e6-dd299140357f	c86387ec-8507-40e4-b318-5af2ba9c40e9	2025-05-28	128	131	21	3	27993.00
4a5b716d-8ec9-4915-aa79-244b6231ed4f	534f2118-2dd8-41d6-9917-566639e1594f	2025-05-28	136	154	31	1	22490.00
b68d4866-1654-451e-b633-cee4b79bf9d3	caed0e38-d5d1-459e-8070-9ee2f35f8a15	2025-05-28	293	157	45	4	47992.00
e5c984ff-8283-4df0-b347-e1b254666141	48db0f1d-54cb-4601-83fa-707ae3410755	2025-05-28	339	69	38	4	95992.00
eb6a6312-284c-4919-bbcc-28a48f101a58	44e4194e-814c-42e8-b8ad-b789ada5fad5	2025-05-28	483	188	45	8	69993.00
7c49be70-2447-4bf7-9230-c68a0fa3d204	5b4f3816-9f66-4999-94ef-d13f31d5b809	2025-05-28	437	137	15	10	6998.00
b8b9ccf2-6600-4560-ad15-f5c8ab2a27f7	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	2025-05-28	843	96	41	1	13995.00
3b0bba48-9777-46fc-836a-523c0161b80b	13d44ab2-1ef8-4c91-9e57-9b57ca234873	2025-05-28	279	99	42	2	27993.00
53da119d-88f8-4928-b1fc-ba2233b7a7ba	4f071e9b-9881-4ed4-8302-a52478f6af44	2025-05-28	538	135	22	3	134990.00
86c2b218-cf8c-4149-9cde-2c5a0e557bbc	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	2025-05-28	480	179	29	9	209993.00
fcc55490-eb39-4459-af1f-cc8876340aaf	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	2025-05-28	275	134	35	10	15996.00
4470694c-c7d6-47d0-ad1f-d782fc432a79	179f0477-9d08-4813-ab38-1ee29381cb1a	2025-05-28	854	135	18	4	13196.00
663ecc65-b337-40c8-9504-2aa56ff0b4f2	7d1791b0-aa62-4c23-874f-cd21b561c4b3	2025-05-28	271	106	10	5	35992.00
79bba63d-2ffa-4d5b-9497-fa603e0fd702	8915c19c-982f-4d82-97be-a60eeae01554	2025-05-28	918	140	33	1	224991.00
b1711139-b845-491d-848e-648951e4b99d	7f10909f-e557-43ef-821d-3f6f025bb4da	2025-05-28	146	152	45	1	64995.00
bba8240f-4362-4eda-8466-70103d42a8e0	8adc667a-208a-4167-bd91-db5958de8051	2025-05-28	933	125	46	2	19992.00
8aee2386-0438-408f-afbb-e50486006018	24a3c406-f6d1-452b-b8db-cbd85b6578f1	2025-05-28	703	70	16	3	3598.00
\.


--
-- Data for Name: product_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_categories (id, product_id, category_id, is_primary, created_at) FROM stdin;
\.


--
-- Data for Name: product_coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_coupons (id, coupon_id, product_id, created_at) FROM stdin;
16f55ce4-f711-4588-9aef-fa34e70b6054	f2950a7f-5848-407d-8bed-fb5420ea87d2	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	2025-05-28 22:24:01.504215
fc1cce87-79bb-4bc5-ad60-4a4f353df3a2	f2950a7f-5848-407d-8bed-fb5420ea87d2	56f47c40-6aca-4545-a51a-0478fc9f240f	2025-05-28 22:24:01.5047
6c829f76-ad01-4245-abf6-19be9a5f8a3f	f2950a7f-5848-407d-8bed-fb5420ea87d2	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	2025-05-28 22:24:01.504907
c6906dc7-3950-46f0-a62c-6a17ba470bf2	f2950a7f-5848-407d-8bed-fb5420ea87d2	aab3e474-3461-425c-9b52-a0747e3a1589	2025-05-28 22:24:01.505135
6d5709ce-a43c-4e4e-ac36-ac75edda3e75	f2950a7f-5848-407d-8bed-fb5420ea87d2	caed0e38-d5d1-459e-8070-9ee2f35f8a15	2025-05-28 22:24:01.505414
1078aa2e-b7f4-49e1-b80f-0af0b23192e0	f2950a7f-5848-407d-8bed-fb5420ea87d2	48db0f1d-54cb-4601-83fa-707ae3410755	2025-05-28 22:24:01.505703
7c7948dc-ae89-4e70-b5bb-92405c692ff8	f2950a7f-5848-407d-8bed-fb5420ea87d2	13d44ab2-1ef8-4c91-9e57-9b57ca234873	2025-05-28 22:24:01.505923
ac2bcac9-1a85-420c-8ca0-374fb6b7af20	f2950a7f-5848-407d-8bed-fb5420ea87d2	4f071e9b-9881-4ed4-8302-a52478f6af44	2025-05-28 22:24:01.506128
979d9188-a332-4d8d-b51c-51a35c354200	f2950a7f-5848-407d-8bed-fb5420ea87d2	7d1791b0-aa62-4c23-874f-cd21b561c4b3	2025-05-28 22:24:01.50629
d51f65cf-55a8-4722-b005-129627147649	f2950a7f-5848-407d-8bed-fb5420ea87d2	8915c19c-982f-4d82-97be-a60eeae01554	2025-05-28 22:24:01.506452
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_images (id, product_id, url, alt_text, "position", is_primary, created_at) FROM stdin;
239d1093-010e-4be8-92f6-e9531fe7d7d2	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	https://picsum.photos/seed/iphone-15-pro-max-256gb-1/800/800	iPhone 15 Pro Max 256GB - Imagem 1	0	t	2025-05-28 22:24:01.334001
c7577bef-2d5f-4a10-8581-c79905cfa0aa	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	https://picsum.photos/seed/iphone-15-pro-max-256gb-2/800/800	iPhone 15 Pro Max 256GB - Imagem 2	1	f	2025-05-28 22:24:01.33503
301b4b76-f83b-4b26-955f-fc72630b1e4f	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	https://picsum.photos/seed/iphone-15-pro-max-256gb-3/800/800	iPhone 15 Pro Max 256GB - Imagem 3	2	f	2025-05-28 22:24:01.335549
7343a3cb-3d7c-42b6-8252-7f734858bd31	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	https://picsum.photos/seed/iphone-15-pro-max-256gb-4/800/800	iPhone 15 Pro Max 256GB - Imagem 4	3	f	2025-05-28 22:24:01.336058
75d16c37-20a5-47ae-ae30-cee9968627d9	56f47c40-6aca-4545-a51a-0478fc9f240f	https://picsum.photos/seed/dell-xps-15-oled-1/800/800	Dell XPS 15 OLED - Imagem 1	0	t	2025-05-28 22:24:01.361218
0f76c08b-23e0-40cb-87a4-f25abf3bbc67	56f47c40-6aca-4545-a51a-0478fc9f240f	https://picsum.photos/seed/dell-xps-15-oled-2/800/800	Dell XPS 15 OLED - Imagem 2	1	f	2025-05-28 22:24:01.36167
9f188d22-7aed-4142-9120-1f86d9a645f4	56f47c40-6aca-4545-a51a-0478fc9f240f	https://picsum.photos/seed/dell-xps-15-oled-3/800/800	Dell XPS 15 OLED - Imagem 3	2	f	2025-05-28 22:24:01.362135
a2ab5650-24c9-474c-b965-dc3b2077c0e4	56f47c40-6aca-4545-a51a-0478fc9f240f	https://picsum.photos/seed/dell-xps-15-oled-4/800/800	Dell XPS 15 OLED - Imagem 4	3	f	2025-05-28 22:24:01.362511
52528d69-0735-4a96-a987-f6b2b2d0f7bd	fdc599e7-933d-4539-8c1f-57d91afd9e11	https://picsum.photos/seed/sony-bravia-xr-a95l-77-1/800/800	Sony BRAVIA XR A95L 77" - Imagem 1	0	t	2025-05-28 22:24:01.370936
520e72e9-3efc-4ce1-b18c-07717c6c40aa	fdc599e7-933d-4539-8c1f-57d91afd9e11	https://picsum.photos/seed/sony-bravia-xr-a95l-77-2/800/800	Sony BRAVIA XR A95L 77" - Imagem 2	1	f	2025-05-28 22:24:01.371264
571ab6d4-a1d1-4044-a68b-e4059c101521	fdc599e7-933d-4539-8c1f-57d91afd9e11	https://picsum.photos/seed/sony-bravia-xr-a95l-77-3/800/800	Sony BRAVIA XR A95L 77" - Imagem 3	2	f	2025-05-28 22:24:01.371582
7bbc7a4f-1231-44a3-9a74-2d985211dab9	fdc599e7-933d-4539-8c1f-57d91afd9e11	https://picsum.photos/seed/sony-bravia-xr-a95l-77-4/800/800	Sony BRAVIA XR A95L 77" - Imagem 4	3	f	2025-05-28 22:24:01.371899
f0576489-1708-4a8a-b0f8-0fa1308c9cf1	df337b23-b0f9-4f55-a7cb-b18892a2617d	https://picsum.photos/seed/steam-deck-oled-1tb-1/800/800	Steam Deck OLED 1TB - Imagem 1	0	t	2025-05-28 22:24:01.378155
a4e7e022-c6e4-4e5d-9ee0-62c86f493eb1	df337b23-b0f9-4f55-a7cb-b18892a2617d	https://picsum.photos/seed/steam-deck-oled-1tb-2/800/800	Steam Deck OLED 1TB - Imagem 2	1	f	2025-05-28 22:24:01.378524
cc292b15-c609-4a6d-b378-f53a1bdf886f	df337b23-b0f9-4f55-a7cb-b18892a2617d	https://picsum.photos/seed/steam-deck-oled-1tb-3/800/800	Steam Deck OLED 1TB - Imagem 3	2	f	2025-05-28 22:24:01.37883
cad854a0-19bc-466e-bc76-ad90c6e51dbc	df337b23-b0f9-4f55-a7cb-b18892a2617d	https://picsum.photos/seed/steam-deck-oled-1tb-4/800/800	Steam Deck OLED 1TB - Imagem 4	3	f	2025-05-28 22:24:01.379134
6d83e37a-948a-4284-8776-c5731f5e150c	9edcafc7-8b50-4051-9d23-e55b2d8c5071	https://picsum.photos/seed/jbl-tour-pro-2-1/800/800	JBL Tour Pro 2 - Imagem 1	0	t	2025-05-28 22:24:01.383842
5f2c5daf-e2c0-4d53-8d64-7008ff2801aa	9edcafc7-8b50-4051-9d23-e55b2d8c5071	https://picsum.photos/seed/jbl-tour-pro-2-2/800/800	JBL Tour Pro 2 - Imagem 2	1	f	2025-05-28 22:24:01.384155
29f859c6-81f7-4db1-b054-bf1d16a634d6	9edcafc7-8b50-4051-9d23-e55b2d8c5071	https://picsum.photos/seed/jbl-tour-pro-2-3/800/800	JBL Tour Pro 2 - Imagem 3	2	f	2025-05-28 22:24:01.384573
f3279e8b-64bb-4a96-a65e-ff29f4dca6e7	9edcafc7-8b50-4051-9d23-e55b2d8c5071	https://picsum.photos/seed/jbl-tour-pro-2-4/800/800	JBL Tour Pro 2 - Imagem 4	3	f	2025-05-28 22:24:01.384883
28797aa6-57da-47d2-b9ea-d2a2a21820ba	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	https://picsum.photos/seed/samsung-galaxy-s24-ultra-512gb-1/800/800	Samsung Galaxy S24 Ultra 512GB - Imagem 1	0	t	2025-05-28 22:24:01.391447
5e7d1251-ac3f-4af3-9836-c3c767ce8835	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	https://picsum.photos/seed/samsung-galaxy-s24-ultra-512gb-2/800/800	Samsung Galaxy S24 Ultra 512GB - Imagem 2	1	f	2025-05-28 22:24:01.391728
c6473bbf-f35f-4325-beef-bd682aee6d69	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	https://picsum.photos/seed/samsung-galaxy-s24-ultra-512gb-3/800/800	Samsung Galaxy S24 Ultra 512GB - Imagem 3	2	f	2025-05-28 22:24:01.392015
4a6b32b7-8202-43dc-b0d0-74d88ee4efba	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	https://picsum.photos/seed/samsung-galaxy-s24-ultra-512gb-4/800/800	Samsung Galaxy S24 Ultra 512GB - Imagem 4	3	f	2025-05-28 22:24:01.392293
d7ec067a-bc90-4fcf-b009-59941a566c49	aab3e474-3461-425c-9b52-a0747e3a1589	https://picsum.photos/seed/asus-rog-strix-g16-1/800/800	ASUS ROG Strix G16 - Imagem 1	0	t	2025-05-28 22:24:01.399367
ddf127a6-b802-40ff-a6f2-45e7a2c9634f	aab3e474-3461-425c-9b52-a0747e3a1589	https://picsum.photos/seed/asus-rog-strix-g16-2/800/800	ASUS ROG Strix G16 - Imagem 2	1	f	2025-05-28 22:24:01.39982
ca2906cd-540a-44b3-a1a1-606887fcf7d8	aab3e474-3461-425c-9b52-a0747e3a1589	https://picsum.photos/seed/asus-rog-strix-g16-3/800/800	ASUS ROG Strix G16 - Imagem 3	2	f	2025-05-28 22:24:01.400361
d0635a00-2178-4eeb-918f-5491aef91d27	aab3e474-3461-425c-9b52-a0747e3a1589	https://picsum.photos/seed/asus-rog-strix-g16-4/800/800	ASUS ROG Strix G16 - Imagem 4	3	f	2025-05-28 22:24:01.40064
64c38c8c-cfcc-446f-aeaf-8bfe496ad90d	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	https://picsum.photos/seed/tcl-mini-led-4k-75-1/800/800	TCL Mini LED 4K 75" - Imagem 1	0	t	2025-05-28 22:24:01.406229
baa3d72a-b3c0-4e52-93d8-8f132b226f48	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	https://picsum.photos/seed/tcl-mini-led-4k-75-2/800/800	TCL Mini LED 4K 75" - Imagem 2	1	f	2025-05-28 22:24:01.406473
00ec4f29-a449-4c7c-bed7-07d34d3478c3	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	https://picsum.photos/seed/tcl-mini-led-4k-75-3/800/800	TCL Mini LED 4K 75" - Imagem 3	2	f	2025-05-28 22:24:01.406723
ed3086b8-f4e0-4368-93b3-bb71d2e775bc	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	https://picsum.photos/seed/tcl-mini-led-4k-75-4/800/800	TCL Mini LED 4K 75" - Imagem 4	3	f	2025-05-28 22:24:01.406963
f8c477fd-6637-4f71-a583-a8d1cc48653a	c86387ec-8507-40e4-b318-5af2ba9c40e9	https://picsum.photos/seed/asus-rog-ally-1/800/800	ASUS ROG Ally - Imagem 1	0	t	2025-05-28 22:24:01.41314
24a5932f-a92a-497a-8068-30dd529db7f2	c86387ec-8507-40e4-b318-5af2ba9c40e9	https://picsum.photos/seed/asus-rog-ally-2/800/800	ASUS ROG Ally - Imagem 2	1	f	2025-05-28 22:24:01.413411
b781ed1f-0949-4f46-b812-2d239d1be9ad	c86387ec-8507-40e4-b318-5af2ba9c40e9	https://picsum.photos/seed/asus-rog-ally-3/800/800	ASUS ROG Ally - Imagem 3	2	f	2025-05-28 22:24:01.413693
59aeea72-ecb5-4d9b-9014-6b234f20b328	c86387ec-8507-40e4-b318-5af2ba9c40e9	https://picsum.photos/seed/asus-rog-ally-4/800/800	ASUS ROG Ally - Imagem 4	3	f	2025-05-28 22:24:01.41397
3615bd89-4774-46e7-a79e-f8b968bd9d51	534f2118-2dd8-41d6-9917-566639e1594f	https://picsum.photos/seed/airpods-pro-2-geracao-usb-c-1/800/800	AirPods Pro 2ª Geração USB-C - Imagem 1	0	t	2025-05-28 22:24:01.418705
7ac5c4ea-5a0d-4814-ac74-a9de482f7de1	534f2118-2dd8-41d6-9917-566639e1594f	https://picsum.photos/seed/airpods-pro-2-geracao-usb-c-2/800/800	AirPods Pro 2ª Geração USB-C - Imagem 2	1	f	2025-05-28 22:24:01.41897
857fdbeb-2177-423b-b136-94b9aaea0cab	534f2118-2dd8-41d6-9917-566639e1594f	https://picsum.photos/seed/airpods-pro-2-geracao-usb-c-3/800/800	AirPods Pro 2ª Geração USB-C - Imagem 3	2	f	2025-05-28 22:24:01.419215
fb0dd26e-c41f-4264-9d5c-5b066da0061e	534f2118-2dd8-41d6-9917-566639e1594f	https://picsum.photos/seed/airpods-pro-2-geracao-usb-c-4/800/800	AirPods Pro 2ª Geração USB-C - Imagem 4	3	f	2025-05-28 22:24:01.419459
577d31dc-f0a5-468c-a0e8-bb54fd7dd880	caed0e38-d5d1-459e-8070-9ee2f35f8a15	https://picsum.photos/seed/xiaomi-14-pro-512gb-1/800/800	Xiaomi 14 Pro 512GB - Imagem 1	0	t	2025-05-28 22:24:01.424792
f9d1c38c-24b8-46e7-b8ec-f37e3ab82150	caed0e38-d5d1-459e-8070-9ee2f35f8a15	https://picsum.photos/seed/xiaomi-14-pro-512gb-2/800/800	Xiaomi 14 Pro 512GB - Imagem 2	1	f	2025-05-28 22:24:01.425031
dbaf0b08-51c5-426a-947d-7ee8c2367e3c	caed0e38-d5d1-459e-8070-9ee2f35f8a15	https://picsum.photos/seed/xiaomi-14-pro-512gb-3/800/800	Xiaomi 14 Pro 512GB - Imagem 3	2	f	2025-05-28 22:24:01.425278
0d9c553c-0486-486d-bd6e-c9d7496d7964	caed0e38-d5d1-459e-8070-9ee2f35f8a15	https://picsum.photos/seed/xiaomi-14-pro-512gb-4/800/800	Xiaomi 14 Pro 512GB - Imagem 4	3	f	2025-05-28 22:24:01.425513
79c2a3b8-6ad5-4d2d-9047-ce17f917d008	48db0f1d-54cb-4601-83fa-707ae3410755	https://picsum.photos/seed/lenovo-thinkpad-x1-carbon-1/800/800	Lenovo ThinkPad X1 Carbon - Imagem 1	0	t	2025-05-28 22:24:01.431214
7696e2ca-44f8-468a-a990-093149e291ad	48db0f1d-54cb-4601-83fa-707ae3410755	https://picsum.photos/seed/lenovo-thinkpad-x1-carbon-2/800/800	Lenovo ThinkPad X1 Carbon - Imagem 2	1	f	2025-05-28 22:24:01.431416
34182183-7339-4984-b1cd-f87d02b3af3f	48db0f1d-54cb-4601-83fa-707ae3410755	https://picsum.photos/seed/lenovo-thinkpad-x1-carbon-3/800/800	Lenovo ThinkPad X1 Carbon - Imagem 3	2	f	2025-05-28 22:24:01.431591
cc9ace8b-d984-4185-9b02-b003c09a82b7	48db0f1d-54cb-4601-83fa-707ae3410755	https://picsum.photos/seed/lenovo-thinkpad-x1-carbon-4/800/800	Lenovo ThinkPad X1 Carbon - Imagem 4	3	f	2025-05-28 22:24:01.431782
95d64fa7-77b3-4d28-a4b7-9e177c8e677c	44e4194e-814c-42e8-b8ad-b789ada5fad5	https://picsum.photos/seed/philips-ambilight-oled-55-1/800/800	Philips Ambilight OLED 55" - Imagem 1	0	t	2025-05-28 22:24:01.436298
51ec2f81-ef9e-42d0-b30d-b8cc0f6b2f80	44e4194e-814c-42e8-b8ad-b789ada5fad5	https://picsum.photos/seed/philips-ambilight-oled-55-2/800/800	Philips Ambilight OLED 55" - Imagem 2	1	f	2025-05-28 22:24:01.436715
308ed04b-64e8-4afc-a937-987d5e638eb3	44e4194e-814c-42e8-b8ad-b789ada5fad5	https://picsum.photos/seed/philips-ambilight-oled-55-3/800/800	Philips Ambilight OLED 55" - Imagem 3	2	f	2025-05-28 22:24:01.436889
4374adbd-1b69-46d3-8493-14b2b1f32eaa	44e4194e-814c-42e8-b8ad-b789ada5fad5	https://picsum.photos/seed/philips-ambilight-oled-55-4/800/800	Philips Ambilight OLED 55" - Imagem 4	3	f	2025-05-28 22:24:01.437082
c2b0e0b3-206d-4ce4-ba8c-9eed4b115f87	5b4f3816-9f66-4999-94ef-d13f31d5b809	https://picsum.photos/seed/playstation-5-slim-digital-1/800/800	PlayStation 5 Slim Digital - Imagem 1	0	t	2025-05-28 22:24:01.441038
96c3a9e0-5e86-4fe1-8200-46f74029a005	5b4f3816-9f66-4999-94ef-d13f31d5b809	https://picsum.photos/seed/playstation-5-slim-digital-2/800/800	PlayStation 5 Slim Digital - Imagem 2	1	f	2025-05-28 22:24:01.441232
fa4ba9da-78ba-4505-919d-e0b686e1e886	5b4f3816-9f66-4999-94ef-d13f31d5b809	https://picsum.photos/seed/playstation-5-slim-digital-3/800/800	PlayStation 5 Slim Digital - Imagem 3	2	f	2025-05-28 22:24:01.44142
9c61bc96-6b5f-4878-8e95-92ebb3f85690	5b4f3816-9f66-4999-94ef-d13f31d5b809	https://picsum.photos/seed/playstation-5-slim-digital-4/800/800	PlayStation 5 Slim Digital - Imagem 4	3	f	2025-05-28 22:24:01.441704
0c38f2c0-046a-44f2-b097-36cc3f7aa198	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	https://picsum.photos/seed/sony-wh-1000xm5-1/800/800	Sony WH-1000XM5 - Imagem 1	0	t	2025-05-28 22:24:01.446032
59528bea-9357-481b-a9ce-1e1c03245a4a	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	https://picsum.photos/seed/sony-wh-1000xm5-2/800/800	Sony WH-1000XM5 - Imagem 2	1	f	2025-05-28 22:24:01.446229
3141a18f-2c6b-4f79-9940-029dbc53940e	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	https://picsum.photos/seed/sony-wh-1000xm5-3/800/800	Sony WH-1000XM5 - Imagem 3	2	f	2025-05-28 22:24:01.446424
1f60e7bb-25ca-4a81-9438-8ba3965cd63c	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	https://picsum.photos/seed/sony-wh-1000xm5-4/800/800	Sony WH-1000XM5 - Imagem 4	3	f	2025-05-28 22:24:01.446597
a25867ce-fcbb-46ab-8ab9-ea4f7b76a174	13d44ab2-1ef8-4c91-9e57-9b57ca234873	https://picsum.photos/seed/motorola-edge-40-pro-1/800/800	Motorola Edge 40 Pro - Imagem 1	0	t	2025-05-28 22:24:01.45191
4e28a6d4-1b45-4b0d-bfcd-d814e896f522	13d44ab2-1ef8-4c91-9e57-9b57ca234873	https://picsum.photos/seed/motorola-edge-40-pro-2/800/800	Motorola Edge 40 Pro - Imagem 2	1	f	2025-05-28 22:24:01.452155
81209044-34c2-42b1-8d40-316a096abdbc	13d44ab2-1ef8-4c91-9e57-9b57ca234873	https://picsum.photos/seed/motorola-edge-40-pro-3/800/800	Motorola Edge 40 Pro - Imagem 3	2	f	2025-05-28 22:24:01.452416
0da0d7bf-e40c-447c-a52d-e8b3be45bb92	13d44ab2-1ef8-4c91-9e57-9b57ca234873	https://picsum.photos/seed/motorola-edge-40-pro-4/800/800	Motorola Edge 40 Pro - Imagem 4	3	f	2025-05-28 22:24:01.453213
42fc49c4-c4f8-451c-9aca-8be45b1e3345	4f071e9b-9881-4ed4-8302-a52478f6af44	https://picsum.photos/seed/hp-spectre-x360-16-1/800/800	HP Spectre x360 16" - Imagem 1	0	t	2025-05-28 22:24:01.457391
38d18f36-6f63-4e1f-952f-f137746aa5fe	4f071e9b-9881-4ed4-8302-a52478f6af44	https://picsum.photos/seed/hp-spectre-x360-16-2/800/800	HP Spectre x360 16" - Imagem 2	1	f	2025-05-28 22:24:01.457626
4eb32c86-cd4c-4283-97b3-b18654e2f3dd	4f071e9b-9881-4ed4-8302-a52478f6af44	https://picsum.photos/seed/hp-spectre-x360-16-3/800/800	HP Spectre x360 16" - Imagem 3	2	f	2025-05-28 22:24:01.457828
9776e156-e869-43af-a207-2856a700577d	4f071e9b-9881-4ed4-8302-a52478f6af44	https://picsum.photos/seed/hp-spectre-x360-16-4/800/800	HP Spectre x360 16" - Imagem 4	3	f	2025-05-28 22:24:01.458051
bfdc02d1-4fc9-4be4-9ca8-94ef591899a7	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	https://picsum.photos/seed/samsung-neo-qled-8k-75-1/800/800	Samsung Neo QLED 8K 75" - Imagem 1	0	t	2025-05-28 22:24:01.462
9316e045-3be5-4c28-b73c-7ec698ecb326	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	https://picsum.photos/seed/samsung-neo-qled-8k-75-2/800/800	Samsung Neo QLED 8K 75" - Imagem 2	1	f	2025-05-28 22:24:01.462188
1bf088da-cf8d-40ba-a60a-43b74db36725	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	https://picsum.photos/seed/samsung-neo-qled-8k-75-3/800/800	Samsung Neo QLED 8K 75" - Imagem 3	2	f	2025-05-28 22:24:01.46239
bf1a7ad0-a5a0-4af1-a98d-f1194188c046	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	https://picsum.photos/seed/samsung-neo-qled-8k-75-4/800/800	Samsung Neo QLED 8K 75" - Imagem 4	3	f	2025-05-28 22:24:01.462583
863980aa-92a4-42f6-9a34-f00610d864b9	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	https://picsum.photos/seed/xbox-series-x-1tb-1/800/800	Xbox Series X 1TB - Imagem 1	0	t	2025-05-28 22:24:01.467434
9489399f-ae57-47c2-ab63-26a8a05ca0f3	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	https://picsum.photos/seed/xbox-series-x-1tb-2/800/800	Xbox Series X 1TB - Imagem 2	1	f	2025-05-28 22:24:01.467616
980ef442-ea8d-4cb9-90d6-f745736878f3	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	https://picsum.photos/seed/xbox-series-x-1tb-3/800/800	Xbox Series X 1TB - Imagem 3	2	f	2025-05-28 22:24:01.467788
b41e788f-fe14-47bc-9e60-18011da5fb71	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	https://picsum.photos/seed/xbox-series-x-1tb-4/800/800	Xbox Series X 1TB - Imagem 4	3	f	2025-05-28 22:24:01.468134
3d121e26-70fb-46cc-ba79-421348de1392	179f0477-9d08-4813-ab38-1ee29381cb1a	https://picsum.photos/seed/bose-quietcomfort-ultra-1/800/800	Bose QuietComfort Ultra - Imagem 1	0	t	2025-05-28 22:24:01.470964
61a33ed1-e311-47bb-a9ed-e22925a975ad	179f0477-9d08-4813-ab38-1ee29381cb1a	https://picsum.photos/seed/bose-quietcomfort-ultra-2/800/800	Bose QuietComfort Ultra - Imagem 2	1	f	2025-05-28 22:24:01.471144
7f47787d-7396-4664-a396-7b72a3d04c41	179f0477-9d08-4813-ab38-1ee29381cb1a	https://picsum.photos/seed/bose-quietcomfort-ultra-3/800/800	Bose QuietComfort Ultra - Imagem 3	2	f	2025-05-28 22:24:01.471325
a6ac5493-0031-4e52-bee4-def4685a3666	179f0477-9d08-4813-ab38-1ee29381cb1a	https://picsum.photos/seed/bose-quietcomfort-ultra-4/800/800	Bose QuietComfort Ultra - Imagem 4	3	f	2025-05-28 22:24:01.471509
e5de9530-a244-41e4-966e-d7098d36013b	7d1791b0-aa62-4c23-874f-cd21b561c4b3	https://picsum.photos/seed/oneplus-12-256gb-1/800/800	OnePlus 12 256GB - Imagem 1	0	t	2025-05-28 22:24:01.476019
26b1dd9b-cec6-4823-abee-1a080a7c7b95	7d1791b0-aa62-4c23-874f-cd21b561c4b3	https://picsum.photos/seed/oneplus-12-256gb-2/800/800	OnePlus 12 256GB - Imagem 2	1	f	2025-05-28 22:24:01.476208
38900c33-75c3-4714-a3da-adb627edde94	7d1791b0-aa62-4c23-874f-cd21b561c4b3	https://picsum.photos/seed/oneplus-12-256gb-3/800/800	OnePlus 12 256GB - Imagem 3	2	f	2025-05-28 22:24:01.476377
457f6b5a-16ce-483d-8a71-f772b795f367	7d1791b0-aa62-4c23-874f-cd21b561c4b3	https://picsum.photos/seed/oneplus-12-256gb-4/800/800	OnePlus 12 256GB - Imagem 4	3	f	2025-05-28 22:24:01.476558
7141a54b-203a-46ca-a16e-0074e8901dc1	8915c19c-982f-4d82-97be-a60eeae01554	https://picsum.photos/seed/macbook-pro-16-m3-max-1/800/800	MacBook Pro 16" M3 Max - Imagem 1	0	t	2025-05-28 22:24:01.480078
7dbf995e-dbc7-4276-9ceb-c215af21422e	8915c19c-982f-4d82-97be-a60eeae01554	https://picsum.photos/seed/macbook-pro-16-m3-max-2/800/800	MacBook Pro 16" M3 Max - Imagem 2	1	f	2025-05-28 22:24:01.480251
d8a8003a-00f0-4f10-9ad1-cb6cfef092a8	8915c19c-982f-4d82-97be-a60eeae01554	https://picsum.photos/seed/macbook-pro-16-m3-max-3/800/800	MacBook Pro 16" M3 Max - Imagem 3	2	f	2025-05-28 22:24:01.480439
d6028da8-5e4d-481c-bc6d-ed89b63c1b35	8915c19c-982f-4d82-97be-a60eeae01554	https://picsum.photos/seed/macbook-pro-16-m3-max-4/800/800	MacBook Pro 16" M3 Max - Imagem 4	3	f	2025-05-28 22:24:01.48062
5d356390-0c12-4d88-8a4c-fde9b01e5267	7f10909f-e557-43ef-821d-3f6f025bb4da	https://picsum.photos/seed/lg-oled-evo-c3-65-1/800/800	LG OLED evo C3 65" - Imagem 1	0	t	2025-05-28 22:24:01.488685
9227e0ca-ca87-47b1-bfb1-8fe50769505b	7f10909f-e557-43ef-821d-3f6f025bb4da	https://picsum.photos/seed/lg-oled-evo-c3-65-2/800/800	LG OLED evo C3 65" - Imagem 2	1	f	2025-05-28 22:24:01.48888
7f333f8b-ee15-436d-b9d2-85d4f8b5da5b	7f10909f-e557-43ef-821d-3f6f025bb4da	https://picsum.photos/seed/lg-oled-evo-c3-65-3/800/800	LG OLED evo C3 65" - Imagem 3	2	f	2025-05-28 22:24:01.489111
3ee58ae4-060b-422b-8d1b-6e1c02f8640b	7f10909f-e557-43ef-821d-3f6f025bb4da	https://picsum.photos/seed/lg-oled-evo-c3-65-4/800/800	LG OLED evo C3 65" - Imagem 4	3	f	2025-05-28 22:24:01.489346
f4562514-53e6-4602-b6a2-c4815fc64253	8adc667a-208a-4167-bd91-db5958de8051	https://picsum.photos/seed/nintendo-switch-oled-1/800/800	Nintendo Switch OLED - Imagem 1	0	t	2025-05-28 22:24:01.492044
b33d0323-0bc5-43ee-8508-4892d9ff4c78	8adc667a-208a-4167-bd91-db5958de8051	https://picsum.photos/seed/nintendo-switch-oled-2/800/800	Nintendo Switch OLED - Imagem 2	1	f	2025-05-28 22:24:01.492251
d1676ab1-1239-47db-a013-bd462bf1a554	8adc667a-208a-4167-bd91-db5958de8051	https://picsum.photos/seed/nintendo-switch-oled-3/800/800	Nintendo Switch OLED - Imagem 3	2	f	2025-05-28 22:24:01.492428
83d614c0-ca9f-40ce-a88a-5570b8b56573	8adc667a-208a-4167-bd91-db5958de8051	https://picsum.photos/seed/nintendo-switch-oled-4/800/800	Nintendo Switch OLED - Imagem 4	3	f	2025-05-28 22:24:01.492596
ea724d1b-f7e2-4fb0-b5dd-92212836ff37	24a3c406-f6d1-452b-b8db-cbd85b6578f1	https://picsum.photos/seed/samsung-galaxy-buds3-pro-1/800/800	Samsung Galaxy Buds3 Pro - Imagem 1	0	t	2025-05-28 22:24:01.49705
36c4b5d0-4467-4d68-ad40-8fed7fc85ecb	24a3c406-f6d1-452b-b8db-cbd85b6578f1	https://picsum.photos/seed/samsung-galaxy-buds3-pro-2/800/800	Samsung Galaxy Buds3 Pro - Imagem 2	1	f	2025-05-28 22:24:01.497256
2d631ee3-54c9-4d4e-84d9-086cf54ab98e	24a3c406-f6d1-452b-b8db-cbd85b6578f1	https://picsum.photos/seed/samsung-galaxy-buds3-pro-3/800/800	Samsung Galaxy Buds3 Pro - Imagem 3	2	f	2025-05-28 22:24:01.497437
571d1615-c8f3-446f-acab-e5565b9ec895	24a3c406-f6d1-452b-b8db-cbd85b6578f1	https://picsum.photos/seed/samsung-galaxy-buds3-pro-4/800/800	Samsung Galaxy Buds3 Pro - Imagem 4	3	f	2025-05-28 22:24:01.497609
\.


--
-- Data for Name: product_option_values; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_option_values (id, option_id, value, "position", created_at) FROM stdin;
b16d109d-14ef-44e8-8b23-4bd2d2bf3d70	3f4de74b-5d01-46a0-b313-005faacbaac2	Titânio Natural	0	2025-05-28 22:24:01.337212
bd779483-1148-4d9d-9c3f-58451f19ed54	3f4de74b-5d01-46a0-b313-005faacbaac2	Titânio Azul	1	2025-05-28 22:24:01.337982
51bd30b6-d0a2-421e-9398-65fca35b4c44	3f4de74b-5d01-46a0-b313-005faacbaac2	Titânio Branco	2	2025-05-28 22:24:01.338365
2ca28b85-f7f4-4bc8-b3da-4160e63999b9	3f4de74b-5d01-46a0-b313-005faacbaac2	Titânio Preto	3	2025-05-28 22:24:01.338756
1e51a0d7-6e95-4fbf-9c65-bb8dd7f76dc0	c0a47d9e-c849-490e-828d-9fdbc4d42679	256GB	0	2025-05-28 22:24:01.347388
bc003d1f-fd9a-42ee-af58-66a4727695d0	c0a47d9e-c849-490e-828d-9fdbc4d42679	512GB	1	2025-05-28 22:24:01.347933
81b8403f-16bf-46ba-ba82-b49d5f636a1b	c0a47d9e-c849-490e-828d-9fdbc4d42679	1TB	2	2025-05-28 22:24:01.348467
0a8c3ac4-addb-4582-a0f4-f39e25830e40	206a7345-4ecc-4940-99db-95e2d59876b2	i7/16GB/512GB	0	2025-05-28 22:24:01.363289
ebb27aa0-63df-49fa-97f0-3ba3296273ad	206a7345-4ecc-4940-99db-95e2d59876b2	i9/32GB/1TB	1	2025-05-28 22:24:01.363619
430bae21-c391-4f87-8508-55da4e8ceb79	206a7345-4ecc-4940-99db-95e2d59876b2	i9/64GB/2TB	2	2025-05-28 22:24:01.363934
773ee6d2-35df-4977-8de4-f35b68af77c0	17f09e37-1cae-4937-a0b1-2d25a48f6560	55"	0	2025-05-28 22:24:01.372556
2c2bdadf-9a10-4ae8-8ca0-ed0a59883560	17f09e37-1cae-4937-a0b1-2d25a48f6560	65"	1	2025-05-28 22:24:01.372872
5561cca1-6857-443c-840a-3b6a7f11c07a	17f09e37-1cae-4937-a0b1-2d25a48f6560	77"	2	2025-05-28 22:24:01.373187
d5fdd0db-5c2e-436e-bb8c-08660ef31df8	c14ba402-7b57-45c9-aaea-61f2309c3030	512GB	0	2025-05-28 22:24:01.379767
5a072bb5-2e2f-4fe3-b48e-b1b2b809c798	c14ba402-7b57-45c9-aaea-61f2309c3030	1TB	1	2025-05-28 22:24:01.380079
1c6dc116-b214-4360-a978-564f2ec340c7	c5246ed5-5ec3-481b-b77b-7fb8f69efc7d	Black	0	2025-05-28 22:24:01.385453
8b9a6aa5-718b-4512-be3f-8861d7a2a9e8	c5246ed5-5ec3-481b-b77b-7fb8f69efc7d	Champagne	1	2025-05-28 22:24:01.385733
da2fa701-843c-4911-aa9a-8c0bcdc69b09	8e36ea5f-edad-45b2-b094-a387ab7b51aa	Titânio Preto	0	2025-05-28 22:24:01.392873
28452e20-892e-4ed4-ad35-a52e48140fb0	8e36ea5f-edad-45b2-b094-a387ab7b51aa	Titânio Cinza	1	2025-05-28 22:24:01.39316
67c37725-ce59-4dba-b9ca-7d1ca607f271	8e36ea5f-edad-45b2-b094-a387ab7b51aa	Titânio Violeta	2	2025-05-28 22:24:01.393436
12d0b156-c870-4d71-b8d3-6f642232d44d	f4685452-2765-4dfc-9914-5227a402429c	RTX 4070/16GB	0	2025-05-28 22:24:01.401162
14faaac4-a6d0-4152-834d-5af3ba70c044	f4685452-2765-4dfc-9914-5227a402429c	RTX 4080/32GB	1	2025-05-28 22:24:01.401415
76a6f86e-d615-4db1-9920-45e90c5ac712	896c4b3c-10ff-4846-8b71-23979f9b6317	65"	0	2025-05-28 22:24:01.407503
9108ca43-391c-44a3-abc4-b78fd0aca551	896c4b3c-10ff-4846-8b71-23979f9b6317	75"	1	2025-05-28 22:24:01.407781
c10525fa-b69f-4e82-8e92-ac23edebbc00	896c4b3c-10ff-4846-8b71-23979f9b6317	85"	2	2025-05-28 22:24:01.408053
d869f95b-444c-4887-b190-4d2cb588955c	ec9aed30-732d-4414-90c0-1853fdc4fe26	Z1	0	2025-05-28 22:24:01.414512
87b4cf61-b447-4688-b047-45d6c92068f1	ec9aed30-732d-4414-90c0-1853fdc4fe26	Z1 Extreme	1	2025-05-28 22:24:01.414755
56c67d21-c301-4f49-98ff-97bb0096347e	5b00c3fc-4232-436b-98ef-52f74aece04e	Sem gravação	0	2025-05-28 22:24:01.419954
1b31f45c-69ba-4399-b3b7-d4a34daf31b9	5b00c3fc-4232-436b-98ef-52f74aece04e	Com gravação personalizada	1	2025-05-28 22:24:01.420208
013ee3a6-e8f3-4c23-888f-96bbb68d1ece	73cd2425-3711-4274-9acf-ef20ede3181d	Preto	0	2025-05-28 22:24:01.425982
cbaa4e8f-8a7a-4b67-875c-19f1d89c44b5	73cd2425-3711-4274-9acf-ef20ede3181d	Branco	1	2025-05-28 22:24:01.426256
3733f7c9-000c-4409-9b8c-60548833d957	73cd2425-3711-4274-9acf-ef20ede3181d	Verde	2	2025-05-28 22:24:01.42647
b2b1b55c-be54-4483-8228-4245e39a64d9	fbb4ed8a-4910-4a70-a5dc-0d62a31ab871	FHD Touch	0	2025-05-28 22:24:01.432583
1fc4fcaf-2cf8-47c2-a6e5-1e428d33b506	fbb4ed8a-4910-4a70-a5dc-0d62a31ab871	2.8K OLED	1	2025-05-28 22:24:01.43283
0e8bc397-b78c-4cd9-99ae-df98ccd4f39c	5e893336-7b12-4570-95b8-81b63a81d77c	48"	0	2025-05-28 22:24:01.437402
f5ed3bf5-36a2-4c6d-aa6d-ed3c3b6b6162	5e893336-7b12-4570-95b8-81b63a81d77c	55"	1	2025-05-28 22:24:01.437568
8e6c6023-f259-4564-9741-de03bc2df2f1	5e893336-7b12-4570-95b8-81b63a81d77c	65"	2	2025-05-28 22:24:01.437736
874ef3b0-db16-4728-956e-6b358ac9c9ed	d038dd29-cb17-4aa0-8d6a-c91078ba03a0	Console apenas	0	2025-05-28 22:24:01.442075
f1b1f63c-8d58-4a73-b631-902a11cfd07c	d038dd29-cb17-4aa0-8d6a-c91078ba03a0	Com Spider-Man 2	1	2025-05-28 22:24:01.442274
d74f8f63-21a8-4936-9f3f-a0ea0daa5bbd	d038dd29-cb17-4aa0-8d6a-c91078ba03a0	Com God of War Ragnarök	2	2025-05-28 22:24:01.442469
8f8dc01d-3fa2-4e77-a4d3-a27b3257a9a0	d641366b-389d-41e5-b087-083f7eb7d573	Preto	0	2025-05-28 22:24:01.446935
7c00ac1d-85ca-4193-a1ee-42decf0ec862	d641366b-389d-41e5-b087-083f7eb7d573	Prata	1	2025-05-28 22:24:01.447111
5c323210-a286-4391-8fe3-af7a343add7c	d641366b-389d-41e5-b087-083f7eb7d573	Midnight Blue	2	2025-05-28 22:24:01.447289
99962a5a-3fd5-49b8-aaed-639446e7121e	152b36fd-1e27-4e51-8845-6d6fa881c26a	Lunar Blue	0	2025-05-28 22:24:01.453796
600b642e-f6bd-41a6-9ea2-6503c84b04b1	152b36fd-1e27-4e51-8845-6d6fa881c26a	Interstellar Black	1	2025-05-28 22:24:01.454018
6fc51181-9420-42fd-8188-ffb8940c5e78	4d150aa5-7c56-42a4-9d7b-f85dabb0941f	Nightfall Black	0	2025-05-28 22:24:01.458498
184c1016-3501-434b-b6cf-6b9af74c441d	4d150aa5-7c56-42a4-9d7b-f85dabb0941f	Nocturne Blue	1	2025-05-28 22:24:01.458711
b168aff7-f3e9-48e4-af86-2703e4742ef3	2c8a1391-5203-4794-8ed5-698d043302b4	65"	0	2025-05-28 22:24:01.463026
8f4d24be-edbc-43a7-a524-c457eccad0a6	2c8a1391-5203-4794-8ed5-698d043302b4	75"	1	2025-05-28 22:24:01.463237
ffe44abd-32ee-477f-b6dc-05ba59bd8010	2c8a1391-5203-4794-8ed5-698d043302b4	85"	2	2025-05-28 22:24:01.463416
1bfdec47-e5fb-477a-ac49-feda454556da	cfd91dc1-19a4-4762-bb8d-b4ed9733c9c2	Carbon Black	0	2025-05-28 22:24:01.468493
4d333e88-5442-4a77-b04b-1b954006ba1b	cfd91dc1-19a4-4762-bb8d-b4ed9733c9c2	Robot White	1	2025-05-28 22:24:01.468683
71eb4afd-b3df-4d79-9b29-8b41ec93b8c0	75a3f910-bd84-4cf3-9505-d6dd026fe2c7	Black	0	2025-05-28 22:24:01.47189
568f9004-4c78-4ed5-815d-36bd65b779f0	75a3f910-bd84-4cf3-9505-d6dd026fe2c7	White Smoke	1	2025-05-28 22:24:01.472105
d187b5ce-3b07-4c89-837f-deef071e227c	75a3f910-bd84-4cf3-9505-d6dd026fe2c7	Sandstone	2	2025-05-28 22:24:01.472315
6d5b4485-5270-471b-9b9b-e5837cc23428	a82d8c88-11d5-445f-9f7d-4faf3946b83f	Silky Black	0	2025-05-28 22:24:01.476922
b727a016-2a77-4d2e-ba3f-ec5382ddfea1	a82d8c88-11d5-445f-9f7d-4faf3946b83f	Flowy Emerald	1	2025-05-28 22:24:01.477111
14458428-0884-4fc8-847b-a51ce139aecc	455e3f43-08f4-4945-9a77-041ee8dea11e	Space Black	0	2025-05-28 22:24:01.481001
bec26eae-249e-4c8d-bede-c96385d99810	455e3f43-08f4-4945-9a77-041ee8dea11e	Silver	1	2025-05-28 22:24:01.481234
558f0b37-5683-49af-b243-286c39da24b2	831b50f3-5973-4782-a183-4884dac56704	1TB	0	2025-05-28 22:24:01.483259
f59ac38e-7fe1-4ca6-b0d3-b5e4df3eefe5	831b50f3-5973-4782-a183-4884dac56704	2TB	1	2025-05-28 22:24:01.483483
03923f4c-c7b2-4a5b-9861-5bbb74fb7f41	831b50f3-5973-4782-a183-4884dac56704	4TB	2	2025-05-28 22:24:01.483711
7e14d89a-0333-4451-b0e3-7a4050f4ddcc	7563e882-4a62-4409-aa0a-2ec69d267d78	55"	0	2025-05-28 22:24:01.489737
e09e78f2-dc07-4444-b7de-dcc7fd448b59	7563e882-4a62-4409-aa0a-2ec69d267d78	65"	1	2025-05-28 22:24:01.489912
7375ef67-2f02-4e78-90bc-edec54028873	7563e882-4a62-4409-aa0a-2ec69d267d78	77"	2	2025-05-28 22:24:01.490086
20cce1e6-6e1c-4ffe-ab91-847f29d1ea7b	7563e882-4a62-4409-aa0a-2ec69d267d78	83"	3	2025-05-28 22:24:01.490296
772dbe43-1a66-4b39-bbd9-0e0c01bb4fe6	b9f280e3-c9ba-4a73-9626-70e6e5aeaff1	Neon Blue/Red	0	2025-05-28 22:24:01.492999
ffbd4409-a639-4346-9a39-feaff969d4bb	b9f280e3-c9ba-4a73-9626-70e6e5aeaff1	White	1	2025-05-28 22:24:01.493194
6b998d9c-1de1-47d5-b373-ebff344f4b88	b9f280e3-c9ba-4a73-9626-70e6e5aeaff1	Zelda Edition	2	2025-05-28 22:24:01.493376
70eb58f5-b3f9-442a-9330-21e089d5be5b	c247f69d-581c-4c17-8321-feba1893c13b	Graphite	0	2025-05-28 22:24:01.497952
254cff59-d00e-4eb1-a2cf-a984f3ff0bb9	c247f69d-581c-4c17-8321-feba1893c13b	White	1	2025-05-28 22:24:01.498138
\.


--
-- Data for Name: product_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_options (id, product_id, name, "position", created_at) FROM stdin;
3f4de74b-5d01-46a0-b313-005faacbaac2	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	Cor	0	2025-05-28 22:24:01.336435
c0a47d9e-c849-490e-828d-9fdbc4d42679	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	Armazenamento	0	2025-05-28 22:24:01.346853
206a7345-4ecc-4940-99db-95e2d59876b2	56f47c40-6aca-4545-a51a-0478fc9f240f	Configuração	0	2025-05-28 22:24:01.362881
17f09e37-1cae-4937-a0b1-2d25a48f6560	fdc599e7-933d-4539-8c1f-57d91afd9e11	Tamanho	0	2025-05-28 22:24:01.372206
c14ba402-7b57-45c9-aaea-61f2309c3030	df337b23-b0f9-4f55-a7cb-b18892a2617d	Armazenamento	0	2025-05-28 22:24:01.379433
c5246ed5-5ec3-481b-b77b-7fb8f69efc7d	9edcafc7-8b50-4051-9d23-e55b2d8c5071	Cor	0	2025-05-28 22:24:01.385145
8e36ea5f-edad-45b2-b094-a387ab7b51aa	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	Cor	0	2025-05-28 22:24:01.392599
f4685452-2765-4dfc-9914-5227a402429c	aab3e474-3461-425c-9b52-a0747e3a1589	Configuração	0	2025-05-28 22:24:01.400898
896c4b3c-10ff-4846-8b71-23979f9b6317	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	Tamanho	0	2025-05-28 22:24:01.407231
ec9aed30-732d-4414-90c0-1853fdc4fe26	c86387ec-8507-40e4-b318-5af2ba9c40e9	Processador	0	2025-05-28 22:24:01.414229
5b00c3fc-4232-436b-98ef-52f74aece04e	534f2118-2dd8-41d6-9917-566639e1594f	Gravação	0	2025-05-28 22:24:01.419703
73cd2425-3711-4274-9acf-ef20ede3181d	caed0e38-d5d1-459e-8070-9ee2f35f8a15	Cor	0	2025-05-28 22:24:01.425743
fbb4ed8a-4910-4a70-a5dc-0d62a31ab871	48db0f1d-54cb-4601-83fa-707ae3410755	Display	0	2025-05-28 22:24:01.43221
5e893336-7b12-4570-95b8-81b63a81d77c	44e4194e-814c-42e8-b8ad-b789ada5fad5	Tamanho	0	2025-05-28 22:24:01.437238
d038dd29-cb17-4aa0-8d6a-c91078ba03a0	5b4f3816-9f66-4999-94ef-d13f31d5b809	Bundle	0	2025-05-28 22:24:01.441888
d641366b-389d-41e5-b087-083f7eb7d573	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	Cor	0	2025-05-28 22:24:01.446763
152b36fd-1e27-4e51-8845-6d6fa881c26a	13d44ab2-1ef8-4c91-9e57-9b57ca234873	Cor	0	2025-05-28 22:24:01.45361
4d150aa5-7c56-42a4-9d7b-f85dabb0941f	4f071e9b-9881-4ed4-8302-a52478f6af44	Cor	0	2025-05-28 22:24:01.458281
2c8a1391-5203-4794-8ed5-698d043302b4	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	Tamanho	0	2025-05-28 22:24:01.462765
cfd91dc1-19a4-4762-bb8d-b4ed9733c9c2	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	Cor	0	2025-05-28 22:24:01.46831
75a3f910-bd84-4cf3-9505-d6dd026fe2c7	179f0477-9d08-4813-ab38-1ee29381cb1a	Cor	0	2025-05-28 22:24:01.471697
a82d8c88-11d5-445f-9f7d-4faf3946b83f	7d1791b0-aa62-4c23-874f-cd21b561c4b3	Cor	0	2025-05-28 22:24:01.476737
455e3f43-08f4-4945-9a77-041ee8dea11e	8915c19c-982f-4d82-97be-a60eeae01554	Cor	0	2025-05-28 22:24:01.480815
831b50f3-5973-4782-a183-4884dac56704	8915c19c-982f-4d82-97be-a60eeae01554	Armazenamento	0	2025-05-28 22:24:01.483019
7563e882-4a62-4409-aa0a-2ec69d267d78	7f10909f-e557-43ef-821d-3f6f025bb4da	Tamanho	0	2025-05-28 22:24:01.489556
b9f280e3-c9ba-4a73-9626-70e6e5aeaff1	8adc667a-208a-4167-bd91-db5958de8051	Cor	0	2025-05-28 22:24:01.492799
c247f69d-581c-4c17-8321-feba1893c13b	24a3c406-f6d1-452b-b8db-cbd85b6578f1	Cor	0	2025-05-28 22:24:01.49777
\.


--
-- Data for Name: product_price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_price_history (id, product_id, price, original_price, changed_by, reason, created_at) FROM stdin;
bf2b08a5-7f63-48bb-af70-5e5b2d52206d	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	8999.00	10798.80	\N	Preço inicial	2025-05-28 22:24:01.352126
ad006a89-2e8b-4329-b597-8a1e073f1299	56f47c40-6aca-4545-a51a-0478fc9f240f	15999.00	19198.80	\N	Preço inicial	2025-05-28 22:24:01.366601
190e17f9-5b6b-47bc-a267-e11dcbeccd71	fdc599e7-933d-4539-8c1f-57d91afd9e11	34999.00	41998.80	\N	Preço inicial	2025-05-28 22:24:01.375448
6c8cd9a9-130c-4d98-bd72-efef7f8dd1f0	df337b23-b0f9-4f55-a7cb-b18892a2617d	4999.00	5998.80	\N	Preço inicial	2025-05-28 22:24:01.381686
58d62660-9896-4509-bb8a-5c09ee8d861f	9edcafc7-8b50-4051-9d23-e55b2d8c5071	1499.00	1798.80	\N	Preço inicial	2025-05-28 22:24:01.387145
32005669-92f5-48d5-bb25-094c9a911ff1	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	7499.00	8998.80	\N	Preço inicial	2025-05-28 22:24:01.395526
2fb5ff0e-83ab-4ff1-9597-9e58bbcff844	aab3e474-3461-425c-9b52-a0747e3a1589	12999.00	15598.80	\N	Preço inicial	2025-05-28 22:24:01.402901
b991e5dd-b6bc-43fc-8d8b-08d3fd35f8ca	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	7999.00	9598.80	\N	Preço inicial	2025-05-28 22:24:01.409889
0da712f6-880f-4a23-ab5d-3154a735eff9	c86387ec-8507-40e4-b318-5af2ba9c40e9	3999.00	4798.80	\N	Preço inicial	2025-05-28 22:24:01.416472
fab26850-4803-4a8f-be32-3d588ccafcd0	534f2118-2dd8-41d6-9917-566639e1594f	2249.00	2698.80	\N	Preço inicial	2025-05-28 22:24:01.421774
7f1bb379-c1ab-4613-bc09-7cc27a55ee1a	caed0e38-d5d1-459e-8070-9ee2f35f8a15	5999.00	7198.80	\N	Preço inicial	2025-05-28 22:24:01.428274
26691159-eaaa-4e2e-a4a6-62cec596a71d	48db0f1d-54cb-4601-83fa-707ae3410755	11999.00	14398.80	\N	Preço inicial	2025-05-28 22:24:01.434058
197d744f-9a84-467c-9592-a0c10039f70d	44e4194e-814c-42e8-b8ad-b789ada5fad5	9999.00	11998.80	\N	Preço inicial	2025-05-28 22:24:01.439213
d0c86a32-e711-4288-baf7-1bb31c62b075	5b4f3816-9f66-4999-94ef-d13f31d5b809	3499.00	4198.80	\N	Preço inicial	2025-05-28 22:24:01.44385
a56f53ba-0402-4556-b060-26098e59d984	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	2799.00	3358.80	\N	Preço inicial	2025-05-28 22:24:01.449241
011e710a-743c-4041-bcc7-b9dea2ea5a02	13d44ab2-1ef8-4c91-9e57-9b57ca234873	3999.00	4798.80	\N	Preço inicial	2025-05-28 22:24:01.454997
0da4c012-c958-40cb-9fdd-7e5feb41b0dc	4f071e9b-9881-4ed4-8302-a52478f6af44	13499.00	16198.80	\N	Preço inicial	2025-05-28 22:24:01.459738
d827448a-c8ac-4958-a018-e6a56dd9832c	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	29999.00	35998.80	\N	Preço inicial	2025-05-28 22:24:01.465107
3f088acc-9c71-43e0-9b25-bbf414f6a683	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	3999.00	4798.80	\N	Preço inicial	2025-05-28 22:24:01.469581
81fe69ba-8b0f-44c8-b5c6-4db15d0753f3	179f0477-9d08-4813-ab38-1ee29381cb1a	3299.00	3958.80	\N	Preço inicial	2025-05-28 22:24:01.473799
972df537-8656-4b96-a419-9606ef1fefad	7d1791b0-aa62-4c23-874f-cd21b561c4b3	4499.00	5398.80	\N	Preço inicial	2025-05-28 22:24:01.478372
610c4b5d-645b-4d65-9651-913a6cfd2d85	8915c19c-982f-4d82-97be-a60eeae01554	24999.00	29998.80	\N	Preço inicial	2025-05-28 22:24:01.485253
8aa9f60d-dc41-46be-8736-5627657e4987	7f10909f-e557-43ef-821d-3f6f025bb4da	12999.00	15598.80	\N	Preço inicial	2025-05-28 22:24:01.490468
527a4fee-6e22-48e5-8b53-afd891d98081	8adc667a-208a-4167-bd91-db5958de8051	2499.00	2998.80	\N	Preço inicial	2025-05-28 22:24:01.49506
3307d32f-cbad-4e2c-a331-05685959f8e1	24a3c406-f6d1-452b-b8db-cbd85b6578f1	1799.00	2158.80	\N	Preço inicial	2025-05-28 22:24:01.499735
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variants (id, product_id, sku, price, original_price, cost, quantity, weight, barcode, is_active, created_at, updated_at) FROM stdin;
6b2f2e16-1324-412f-8556-cbecd3edcb17	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	APPLE-1748467441324-0001-TITÂNIO-NATURAL	9397.14	11276.57	\N	13	\N	\N	t	2025-05-28 22:24:01.339247	2025-05-28 22:24:01.339247
af5a7a60-3ef3-4a7b-b85f-9fd7f5ac17e9	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	APPLE-1748467441324-0001-TITÂNIO-AZUL	9239.35	11087.22	\N	21	\N	\N	t	2025-05-28 22:24:01.343184	2025-05-28 22:24:01.343184
692aad03-76df-4561-ad69-2b7b52149c28	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	APPLE-1748467441324-0001-TITÂNIO-BRANCO	9136.98	10964.38	\N	34	\N	\N	t	2025-05-28 22:24:01.344378	2025-05-28 22:24:01.344378
5a3dabad-fa5a-4e63-a358-d94ac28e5255	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	APPLE-1748467441324-0001-TITÂNIO-PRETO	9579.01	11494.81	\N	48	\N	\N	t	2025-05-28 22:24:01.345759	2025-05-28 22:24:01.345759
4f273d76-cea2-4716-a646-ece9a9352bdc	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	APPLE-1748467441324-0001-256GB	9725.78	11670.94	\N	50	\N	\N	t	2025-05-28 22:24:01.349091	2025-05-28 22:24:01.349091
b6253620-584c-4902-975f-4d90909511b3	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	APPLE-1748467441324-0001-512GB	9229.39	11075.27	\N	18	\N	\N	t	2025-05-28 22:24:01.35026	2025-05-28 22:24:01.35026
e1631755-1af2-4f26-8973-392965f63a73	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	APPLE-1748467441324-0001-1TB	9179.81	11015.77	\N	44	\N	\N	t	2025-05-28 22:24:01.351168	2025-05-28 22:24:01.351168
951d364e-bbd4-4f04-9bca-707bc718fce0	56f47c40-6aca-4545-a51a-0478fc9f240f	SAMSUNG-1748467441360-0002-I7/16GB/512GB	16115.85	19339.02	\N	31	\N	\N	t	2025-05-28 22:24:01.364267	2025-05-28 22:24:01.364267
3bcc80e4-4e90-4b44-9910-3a3db5a29f3e	56f47c40-6aca-4545-a51a-0478fc9f240f	SAMSUNG-1748467441360-0002-I9/32GB/1TB	17247.34	20696.81	\N	38	\N	\N	t	2025-05-28 22:24:01.364979	2025-05-28 22:24:01.364979
9969b213-34b9-4343-9965-fe8155aace64	56f47c40-6aca-4545-a51a-0478fc9f240f	SAMSUNG-1748467441360-0002-I9/64GB/2TB	17275.68	20730.81	\N	20	\N	\N	t	2025-05-28 22:24:01.365867	2025-05-28 22:24:01.365867
598d1d3d-653e-4995-9f31-453e521b61cd	fdc599e7-933d-4539-8c1f-57d91afd9e11	SONY-1748467441370-0003-55"	35857.54	43029.05	\N	45	\N	\N	t	2025-05-28 22:24:01.373521	2025-05-28 22:24:01.373521
e9e36d75-6f61-46a5-aa59-7223a9c67371	fdc599e7-933d-4539-8c1f-57d91afd9e11	SONY-1748467441370-0003-65"	38097.09	45716.51	\N	24	\N	\N	t	2025-05-28 22:24:01.374164	2025-05-28 22:24:01.374164
608cc327-e5c5-4530-a7f4-efc1794d8ddc	fdc599e7-933d-4539-8c1f-57d91afd9e11	SONY-1748467441370-0003-77"	36583.76	43900.51	\N	22	\N	\N	t	2025-05-28 22:24:01.374833	2025-05-28 22:24:01.374833
c196e8b6-c0d8-4d23-856f-7f9ad6d9f058	df337b23-b0f9-4f55-a7cb-b18892a2617d	LG-1748467441377-0004-512GB	5430.80	6516.96	\N	49	\N	\N	t	2025-05-28 22:24:01.380415	2025-05-28 22:24:01.380415
f5099e46-5723-4b32-9f27-537b84986c6a	df337b23-b0f9-4f55-a7cb-b18892a2617d	LG-1748467441377-0004-1TB	5141.91	6170.29	\N	22	\N	\N	t	2025-05-28 22:24:01.381047	2025-05-28 22:24:01.381047
00b2e28e-cd72-4c76-b0a1-3c481994eed9	9edcafc7-8b50-4051-9d23-e55b2d8c5071	LG-1748467441383-0005-BLACK	1604.84	1925.81	\N	48	\N	\N	t	2025-05-28 22:24:01.386009	2025-05-28 22:24:01.386009
749f88d2-27cc-4e79-bf1e-bb5f3e5ffd5e	9edcafc7-8b50-4051-9d23-e55b2d8c5071	LG-1748467441383-0005-CHAMPAGNE	1643.68	1972.41	\N	17	\N	\N	t	2025-05-28 22:24:01.38657	2025-05-28 22:24:01.38657
9992296e-8a26-4c0f-beed-d6dee2777f21	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	SAMSUNG-1748467441390-0006-TITÂNIO-PRETO	8034.80	9641.76	\N	24	\N	\N	t	2025-05-28 22:24:01.393724	2025-05-28 22:24:01.393724
92dd6ea6-35d4-42d9-9bbe-b88fdc969a94	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	SAMSUNG-1748467441390-0006-TITÂNIO-CINZA	8081.66	9698.00	\N	14	\N	\N	t	2025-05-28 22:24:01.39429	2025-05-28 22:24:01.39429
aeee7d44-b1cc-4593-b622-b7e9b68ba4ca	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	SAMSUNG-1748467441390-0006-TITÂNIO-VIOLETA	8116.57	9739.88	\N	15	\N	\N	t	2025-05-28 22:24:01.394952	2025-05-28 22:24:01.394952
ee2fc9e2-ec0a-41df-92df-415e9fbe5d44	aab3e474-3461-425c-9b52-a0747e3a1589	LG-1748467441398-0007-RTX-4070/16GB	14077.71	16893.25	\N	49	\N	\N	t	2025-05-28 22:24:01.401684	2025-05-28 22:24:01.401684
2e69f8bb-19b6-4e7b-9c34-17f50680aed9	aab3e474-3461-425c-9b52-a0747e3a1589	LG-1748467441398-0007-RTX-4080/32GB	13228.60	15874.31	\N	18	\N	\N	t	2025-05-28 22:24:01.402329	2025-05-28 22:24:01.402329
57b6f77b-3825-4fd6-820d-043c61678f64	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	LG-1748467441405-0008-65"	8504.86	10205.83	\N	17	\N	\N	t	2025-05-28 22:24:01.40832	2025-05-28 22:24:01.40832
feba1886-03d6-4c68-bb1f-d77cd4f1c3df	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	LG-1748467441405-0008-75"	8130.87	9757.05	\N	30	\N	\N	t	2025-05-28 22:24:01.408837	2025-05-28 22:24:01.408837
c7f97725-8514-4416-a6a6-853ddb12e848	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	LG-1748467441405-0008-85"	8777.76	10533.31	\N	11	\N	\N	t	2025-05-28 22:24:01.409371	2025-05-28 22:24:01.409371
570edae2-aa37-4873-8334-6ab22821cb93	c86387ec-8507-40e4-b318-5af2ba9c40e9	LG-1748467441412-0009-Z1	4044.41	4853.29	\N	14	\N	\N	t	2025-05-28 22:24:01.415058	2025-05-28 22:24:01.415058
1d68aa4b-4160-4c18-9802-1aeb8bdd0dfe	c86387ec-8507-40e4-b318-5af2ba9c40e9	LG-1748467441412-0009-Z1-EXTREME	4188.92	5026.70	\N	25	\N	\N	t	2025-05-28 22:24:01.415902	2025-05-28 22:24:01.415902
b7f222b6-27db-42bc-9c0b-8f064badf1ba	534f2118-2dd8-41d6-9917-566639e1594f	APPLE-1748467441418-0010-SEM-GRAVAÇÃO	2327.90	2793.49	\N	13	\N	\N	t	2025-05-28 22:24:01.420486	2025-05-28 22:24:01.420486
301c65e0-e40b-4d78-9902-b67f6c64416f	534f2118-2dd8-41d6-9917-566639e1594f	APPLE-1748467441418-0010-COM-GRAVAÇÃO-PERSONALIZADA	2411.50	2893.80	\N	6	\N	\N	t	2025-05-28 22:24:01.421281	2025-05-28 22:24:01.421281
bc3fbd8e-8759-48f8-b879-7132b052180b	caed0e38-d5d1-459e-8070-9ee2f35f8a15	XIAOMI-1748467441424-0011-PRETO	6246.07	7495.28	\N	7	\N	\N	t	2025-05-28 22:24:01.42668	2025-05-28 22:24:01.42668
53c72c1d-eb37-4bd6-9722-f07bb5c9285d	caed0e38-d5d1-459e-8070-9ee2f35f8a15	XIAOMI-1748467441424-0011-BRANCO	6307.05	7568.46	\N	43	\N	\N	t	2025-05-28 22:24:01.427247	2025-05-28 22:24:01.427247
22440a7f-9cd6-423c-9b82-07830d000ef4	caed0e38-d5d1-459e-8070-9ee2f35f8a15	XIAOMI-1748467441424-0011-VERDE	6487.39	7784.86	\N	29	\N	\N	t	2025-05-28 22:24:01.427766	2025-05-28 22:24:01.427766
14a15692-684b-4d73-b291-89021bb28494	48db0f1d-54cb-4601-83fa-707ae3410755	LG-1748467441430-0012-FHD-TOUCH	13032.07	15638.49	\N	47	\N	\N	t	2025-05-28 22:24:01.433088	2025-05-28 22:24:01.433088
62098ea8-30f5-4fb7-8e67-cb6c4758afcf	48db0f1d-54cb-4601-83fa-707ae3410755	LG-1748467441430-0012-2.8K-OLED	12050.10	14460.12	\N	20	\N	\N	t	2025-05-28 22:24:01.433638	2025-05-28 22:24:01.433638
74f5790c-58cc-47bb-b36e-c6ef55d6fd8b	44e4194e-814c-42e8-b8ad-b789ada5fad5	SAMSUNG-1748467441435-0013-48"	10218.15	12261.78	\N	11	\N	\N	t	2025-05-28 22:24:01.437891	2025-05-28 22:24:01.437891
eb37af77-bdce-42d5-b81f-d9ab32160ea1	44e4194e-814c-42e8-b8ad-b789ada5fad5	SAMSUNG-1748467441435-0013-55"	10824.22	12989.06	\N	48	\N	\N	t	2025-05-28 22:24:01.438426	2025-05-28 22:24:01.438426
afd8dc6e-a62d-42af-aede-35a024c67bc2	44e4194e-814c-42e8-b8ad-b789ada5fad5	SAMSUNG-1748467441435-0013-65"	10367.42	12440.91	\N	33	\N	\N	t	2025-05-28 22:24:01.438848	2025-05-28 22:24:01.438848
b2c7072a-b9dd-4ad5-96a8-99e4bae78787	5b4f3816-9f66-4999-94ef-d13f31d5b809	SONY-1748467441440-0014-CONSOLE-APENAS	3530.08	4236.10	\N	20	\N	\N	t	2025-05-28 22:24:01.442662	2025-05-28 22:24:01.442662
5bea41d2-5104-46ef-8bc7-a2c1418b3b7b	5b4f3816-9f66-4999-94ef-d13f31d5b809	SONY-1748467441440-0014-COM-SPIDER-MAN-2	3843.86	4612.64	\N	49	\N	\N	t	2025-05-28 22:24:01.44305	2025-05-28 22:24:01.44305
deeec748-32bd-4ae7-850b-bb9e2e7417b0	5b4f3816-9f66-4999-94ef-d13f31d5b809	SONY-1748467441440-0014-COM-GOD-OF-WAR-RAGNARÖK	3687.39	4424.86	\N	11	\N	\N	t	2025-05-28 22:24:01.44345	2025-05-28 22:24:01.44345
fb56e313-43f0-4876-ab99-9aa911a6204b	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	SONY-1748467441445-0015-PRETO	3067.93	3681.52	\N	45	\N	\N	t	2025-05-28 22:24:01.447472	2025-05-28 22:24:01.447472
2550d660-8fef-4f8a-a968-61fe64955fe1	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	SONY-1748467441445-0015-PRATA	2874.52	3449.43	\N	31	\N	\N	t	2025-05-28 22:24:01.447996	2025-05-28 22:24:01.447996
719fe7e6-e928-4e82-bcf5-b0d4e0e33372	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	SONY-1748467441445-0015-MIDNIGHT-BLUE	2865.11	3438.13	\N	6	\N	\N	t	2025-05-28 22:24:01.448696	2025-05-28 22:24:01.448696
ac9dc2ee-42a4-40ef-884e-ac96440f6405	13d44ab2-1ef8-4c91-9e57-9b57ca234873	SAMSUNG-1748467441451-0016-LUNAR-BLUE	4059.24	4871.08	\N	40	\N	\N	t	2025-05-28 22:24:01.454212	2025-05-28 22:24:01.454212
802047bd-8da3-45bc-8d7c-7b505ed48f45	13d44ab2-1ef8-4c91-9e57-9b57ca234873	SAMSUNG-1748467441451-0016-INTERSTELLAR-BLACK	4381.53	5257.84	\N	30	\N	\N	t	2025-05-28 22:24:01.454626	2025-05-28 22:24:01.454626
748e9dd7-e34d-4d19-8962-f9a096c0cbdf	4f071e9b-9881-4ed4-8302-a52478f6af44	SAMSUNG-1748467441457-0017-NIGHTFALL-BLACK	13786.78	16544.14	\N	27	\N	\N	t	2025-05-28 22:24:01.458929	2025-05-28 22:24:01.458929
e5a4d2db-2f99-4324-b336-7fd99791d3d0	4f071e9b-9881-4ed4-8302-a52478f6af44	SAMSUNG-1748467441457-0017-NOCTURNE-BLUE	14447.18	17336.62	\N	20	\N	\N	t	2025-05-28 22:24:01.459361	2025-05-28 22:24:01.459361
36a89761-6b38-4480-812c-894542c268b1	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	SAMSUNG-1748467441461-0018-65"	30522.28	36626.74	\N	8	\N	\N	t	2025-05-28 22:24:01.463606	2025-05-28 22:24:01.463606
342a5f75-f2da-4cf4-b2b7-304963247197	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	SAMSUNG-1748467441461-0018-75"	31725.90	38071.09	\N	47	\N	\N	t	2025-05-28 22:24:01.463991	2025-05-28 22:24:01.463991
fe7f9f87-fe56-4c83-b3e3-16dbba52af08	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	SAMSUNG-1748467441461-0018-85"	32752.33	39302.80	\N	22	\N	\N	t	2025-05-28 22:24:01.464577	2025-05-28 22:24:01.464577
2ef762d1-eea3-4b9c-8d1b-40f278821ead	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	SONY-1748467441467-0019-CARBON-BLACK	4328.27	5193.92	\N	34	\N	\N	t	2025-05-28 22:24:01.468856	2025-05-28 22:24:01.468856
326fe5b7-cdf3-4399-9cf0-6490b7f3fd76	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	SONY-1748467441467-0019-ROBOT-WHITE	4263.57	5116.29	\N	7	\N	\N	t	2025-05-28 22:24:01.469217	2025-05-28 22:24:01.469217
6fe1606c-314a-4b0c-83ee-22a4482798ed	179f0477-9d08-4813-ab38-1ee29381cb1a	LG-1748467441470-0020-BLACK	3587.79	4305.35	\N	46	\N	\N	t	2025-05-28 22:24:01.472554	2025-05-28 22:24:01.472554
e0617878-62e3-44d0-845a-0902c8dd75bc	179f0477-9d08-4813-ab38-1ee29381cb1a	LG-1748467441470-0020-WHITE-SMOKE	3618.78	4342.53	\N	19	\N	\N	t	2025-05-28 22:24:01.473046	2025-05-28 22:24:01.473046
17a3562d-8420-42f0-bb57-4d76ccbc5b33	179f0477-9d08-4813-ab38-1ee29381cb1a	LG-1748467441470-0020-SANDSTONE	3359.92	4031.90	\N	34	\N	\N	t	2025-05-28 22:24:01.473443	2025-05-28 22:24:01.473443
54d6ec7d-3926-4760-8046-8ffbca22e8ea	7d1791b0-aa62-4c23-874f-cd21b561c4b3	XIAOMI-1748467441475-0021-SILKY-BLACK	4618.01	5541.61	\N	18	\N	\N	t	2025-05-28 22:24:01.477291	2025-05-28 22:24:01.477291
5ed3bd79-4777-4b0e-8ce0-5ad46968aaae	7d1791b0-aa62-4c23-874f-cd21b561c4b3	XIAOMI-1748467441475-0021-FLOWY-EMERALD	4761.49	5713.78	\N	14	\N	\N	t	2025-05-28 22:24:01.477933	2025-05-28 22:24:01.477933
0f3fc934-b8fd-47fc-8115-fee7ff819a81	8915c19c-982f-4d82-97be-a60eeae01554	APPLE-1748467441479-0022-SPACE-BLACK	26243.23	31491.88	\N	6	\N	\N	t	2025-05-28 22:24:01.481465	2025-05-28 22:24:01.481465
5345f5a0-8a2b-4942-b215-70282aabd3fb	8915c19c-982f-4d82-97be-a60eeae01554	APPLE-1748467441479-0022-SILVER	27009.25	32411.11	\N	30	\N	\N	t	2025-05-28 22:24:01.48203	2025-05-28 22:24:01.48203
b7951dd1-283b-4102-8621-e4f2e44deb1f	8915c19c-982f-4d82-97be-a60eeae01554	APPLE-1748467441479-0022-1TB	27470.04	32964.05	\N	38	\N	\N	t	2025-05-28 22:24:01.483942	2025-05-28 22:24:01.483942
5306d71d-2c31-45a1-8ca4-507f2ad03d50	8915c19c-982f-4d82-97be-a60eeae01554	APPLE-1748467441479-0022-2TB	27320.94	32785.13	\N	19	\N	\N	t	2025-05-28 22:24:01.484453	2025-05-28 22:24:01.484453
f17063d7-2877-4053-b62b-978c412f200a	8915c19c-982f-4d82-97be-a60eeae01554	APPLE-1748467441479-0022-4TB	27279.93	32735.92	\N	45	\N	\N	t	2025-05-28 22:24:01.484853	2025-05-28 22:24:01.484853
9e19e890-ef20-47d1-9596-d2a7efaabae6	8adc667a-208a-4167-bd91-db5958de8051	LG-1748467441491-0024-NEON-BLUE/RED	2573.30	3087.96	\N	35	\N	\N	t	2025-05-28 22:24:01.493573	2025-05-28 22:24:01.493573
7a92e153-0c45-477c-87d9-2d35b48bdb9d	8adc667a-208a-4167-bd91-db5958de8051	LG-1748467441491-0024-WHITE	2732.82	3279.39	\N	9	\N	\N	t	2025-05-28 22:24:01.493954	2025-05-28 22:24:01.493954
70c5f0b5-13da-4ca4-9476-31712309a285	8adc667a-208a-4167-bd91-db5958de8051	LG-1748467441491-0024-ZELDA-EDITION	2601.47	3121.76	\N	43	\N	\N	t	2025-05-28 22:24:01.494386	2025-05-28 22:24:01.494386
b0e939eb-02ce-444d-8be4-6c23a67efded	24a3c406-f6d1-452b-b8db-cbd85b6578f1	SAMSUNG-1748467441496-0025-GRAPHITE	1865.56	2238.67	\N	46	\N	\N	t	2025-05-28 22:24:01.498311	2025-05-28 22:24:01.498311
09a407c7-3db2-4142-902d-f0a73bd831fd	24a3c406-f6d1-452b-b8db-cbd85b6578f1	SAMSUNG-1748467441496-0025-WHITE	1892.76	2271.31	\N	24	\N	\N	t	2025-05-28 22:24:01.498992	2025-05-28 22:24:01.498992
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, sku, name, slug, description, brand_id, category_id, seller_id, status, is_active, price, original_price, cost, currency, quantity, stock_location, track_inventory, allow_backorder, weight, height, width, length, meta_title, meta_description, meta_keywords, tags, attributes, specifications, view_count, sales_count, rating_average, rating_count, featured, barcode, featuring, created_at, updated_at, published_at) FROM stdin;
5d6e3e02-3cc2-413c-9ac1-73e84503d90b	APPLE-1748467441324-0001	iPhone 15 Pro Max 256GB	iphone-15-pro-max-256gb	O iPhone mais avançado com chip A17 Pro, sistema de câmera Pro de 48MP e titânio.	6567b65b-502a-4f9a-b43f-e454dc6ccf00	e7ee4488-175b-476d-8f77-92408f8121d9	0c882099-6a71-4f35-88b3-a467322be13b	active	t	8999.00	10798.80	5399.40	BRL	15	\N	t	f	\N	\N	\N	\N	iPhone 15 Pro Max 256GB - Melhor Preço	O iPhone mais avançado com chip A17 Pro, sistema de câmera Pro de 48MP e titânio.	\N	{iphone,apple,premium,5g,titanio}	"{\\"tela\\":\\"6.7\\\\\\"\\",\\"memoria\\":\\"256GB\\",\\"ram\\":\\"8GB\\",\\"camera\\":\\"48MP + 12MP + 12MP\\",\\"bateria\\":\\"4422mAh\\"}"	"{\\"peso\\":\\"221g\\",\\"dimensoes\\":\\"159.9 x 76.7 x 8.25mm\\",\\"resistencia\\":\\"IP68\\",\\"carregamento\\":\\"USB-C\\"}"	0	0	3.90	0	t	\N	\N	2025-05-28 22:24:01.324806	2025-05-28 22:24:01.324806	2025-05-28 22:24:01.324806
56f47c40-6aca-4545-a51a-0478fc9f240f	SAMSUNG-1748467441360-0002	Dell XPS 15 OLED	dell-xps-15-oled	Notebook premium com tela OLED 3.5K, Intel Core i9 e NVIDIA RTX 4070.	6f3b272d-b3fa-4009-8c8d-30972b9be20d	249f5633-0bf2-4eba-a187-f90b4f8c54cf	0c882099-6a71-4f35-88b3-a467322be13b	active	t	15999.00	19198.80	9599.40	BRL	68	\N	t	f	\N	\N	\N	\N	Dell XPS 15 OLED - Melhor Preço	Notebook premium com tela OLED 3.5K, Intel Core i9 e NVIDIA RTX 4070.	\N	{dell,xps,oled,creator,gaming}	"{\\"tela\\":\\"15.6\\\\\\" OLED\\",\\"processador\\":\\"Intel i9-13900H\\",\\"ram\\":\\"32GB\\",\\"ssd\\":\\"1TB\\",\\"gpu\\":\\"RTX 4070\\"}"	"{\\"peso\\":\\"1.86kg\\",\\"bateria\\":\\"86Wh\\",\\"portas\\":\\"2x Thunderbolt 4, USB-A, SD\\",\\"teclado\\":\\"Retroiluminado\\"}"	0	0	3.60	0	t	\N	\N	2025-05-28 22:24:01.360283	2025-05-28 22:24:01.360283	2025-05-28 22:24:01.360283
fdc599e7-933d-4539-8c1f-57d91afd9e11	SONY-1748467441370-0003	Sony BRAVIA XR A95L 77"	sony-bravia-xr-a95l-77	TV QD-OLED com Cognitive Processor XR e Acoustic Surface Audio+.	3a297cbe-a984-447b-a4cc-74582b819acb	8d127abf-7fdf-4f67-b2dd-20b52176bdd3	0c882099-6a71-4f35-88b3-a467322be13b	active	t	34999.00	41998.80	20999.40	BRL	93	\N	t	f	\N	\N	\N	\N	Sony BRAVIA XR A95L 77" - Melhor Preço	TV QD-OLED com Cognitive Processor XR e Acoustic Surface Audio+.	\N	{sony,qd-oled,bravia,premium,ps5}	"{\\"tamanho\\":\\"77\\\\\\"\\",\\"resolucao\\":\\"4K\\",\\"tecnologia\\":\\"QD-OLED\\",\\"hdr\\":\\"HDR10/Dolby Vision\\",\\"smart\\":\\"Google TV\\"}"	"{\\"taxa\\":\\"120Hz\\",\\"hdmi\\":\\"4x HDMI 2.1\\",\\"audio\\":\\"Acoustic Surface Audio+\\",\\"gaming\\":\\"Perfect for PS5\\"}"	0	0	3.90	0	t	\N	\N	2025-05-28 22:24:01.370404	2025-05-28 22:24:01.370404	2025-05-28 22:24:01.370404
df337b23-b0f9-4f55-a7cb-b18892a2617d	LG-1748467441377-0004	Steam Deck OLED 1TB	steam-deck-oled-1tb	PC portátil para jogos com tela OLED HDR e 1TB de armazenamento.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	3c991042-c1b7-4e19-b11a-a3e505308612	0c882099-6a71-4f35-88b3-a467322be13b	active	t	4999.00	5998.80	2999.40	BRL	32	\N	t	f	\N	\N	\N	\N	Steam Deck OLED 1TB - Melhor Preço	PC portátil para jogos com tela OLED HDR e 1TB de armazenamento.	\N	{steam-deck,valve,portable,pc-gaming}	"{\\"tela\\":\\"7.4\\\\\\" OLED HDR\\",\\"armazenamento\\":\\"1TB NVMe SSD\\",\\"cpu\\":\\"AMD APU Zen 2\\",\\"gpu\\":\\"AMD RDNA 2\\",\\"ram\\":\\"16GB LPDDR5\\"}"	"{\\"peso\\":\\"640g\\",\\"bateria\\":\\"3-12 horas\\",\\"audio\\":\\"Stereo com DSP\\",\\"conectividade\\":\\"Wi-Fi 6E, Bluetooth 5.3\\"}"	0	0	4.30	0	f	\N	\N	2025-05-28 22:24:01.377475	2025-05-28 22:24:01.377475	2025-05-28 22:24:01.377475
9edcafc7-8b50-4051-9d23-e55b2d8c5071	LG-1748467441383-0005	JBL Tour Pro 2	jbl-tour-pro-2	TWS com case touchscreen inteligente e True Adaptive ANC.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	75e6681c-a1fb-4e6e-8b4c-6504e1e7b1bf	0c882099-6a71-4f35-88b3-a467322be13b	active	t	1499.00	1798.80	899.40	BRL	75	\N	t	f	\N	\N	\N	\N	JBL Tour Pro 2 - Melhor Preço	TWS com case touchscreen inteligente e True Adaptive ANC.	\N	{jbl,tour-pro,tws,smart-case,anc}	"{\\"tipo\\":\\"In-ear TWS\\",\\"anc\\":\\"True Adaptive\\",\\"bateria\\":\\"10h (40h com case)\\",\\"resistencia\\":\\"IPX5\\",\\"conectividade\\":\\"Bluetooth 5.3\\"}"	"{\\"driver\\":\\"10mm\\",\\"codec\\":\\"AAC, SBC\\",\\"controles\\":\\"Touch + Smart Case\\",\\"carregamento\\":\\"USB-C, Qi\\"}"	0	0	3.90	0	t	\N	\N	2025-05-28 22:24:01.383286	2025-05-28 22:24:01.383286	2025-05-28 22:24:01.383286
9a104dbf-8a63-466b-93d0-7ac78ae9cd39	SAMSUNG-1748467441390-0006	Samsung Galaxy S24 Ultra 512GB	samsung-galaxy-s24-ultra-512gb	Galaxy AI. O smartphone mais inteligente com S Pen integrada e câmera de 200MP.	6f3b272d-b3fa-4009-8c8d-30972b9be20d	e7ee4488-175b-476d-8f77-92408f8121d9	efa2d07d-8a24-47c0-b402-39f8f26f478c	active	t	7499.00	8998.80	4499.40	BRL	55	\N	t	f	\N	\N	\N	\N	Samsung Galaxy S24 Ultra 512GB - Melhor Preço	Galaxy AI. O smartphone mais inteligente com S Pen integrada e câmera de 200MP.	\N	{samsung,galaxy,s24,5g,spen}	"{\\"tela\\":\\"6.8\\\\\\"\\",\\"memoria\\":\\"512GB\\",\\"ram\\":\\"12GB\\",\\"camera\\":\\"200MP + 50MP + 12MP + 10MP\\",\\"bateria\\":\\"5000mAh\\"}"	"{\\"peso\\":\\"233g\\",\\"dimensoes\\":\\"162.3 x 79.0 x 8.6mm\\",\\"resistencia\\":\\"IP68\\",\\"carregamento\\":\\"45W\\"}"	0	0	3.30	0	t	\N	\N	2025-05-28 22:24:01.390976	2025-05-28 22:24:01.390976	2025-05-28 22:24:01.390976
aab3e474-3461-425c-9b52-a0747e3a1589	LG-1748467441398-0007	ASUS ROG Strix G16	asus-rog-strix-g16	Notebook gamer com Intel i9, RTX 4080 e tela 240Hz.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	249f5633-0bf2-4eba-a187-f90b4f8c54cf	efa2d07d-8a24-47c0-b402-39f8f26f478c	active	t	12999.00	15598.80	7799.40	BRL	67	\N	t	f	\N	\N	\N	\N	ASUS ROG Strix G16 - Melhor Preço	Notebook gamer com Intel i9, RTX 4080 e tela 240Hz.	\N	{asus,rog,gaming,rtx4080,240hz}	"{\\"tela\\":\\"16\\\\\\" QHD 240Hz\\",\\"processador\\":\\"Intel i9-13980HX\\",\\"ram\\":\\"32GB\\",\\"ssd\\":\\"2TB\\",\\"gpu\\":\\"RTX 4080\\"}"	"{\\"peso\\":\\"2.5kg\\",\\"bateria\\":\\"90Wh\\",\\"portas\\":\\"USB-C, 3x USB-A, HDMI 2.1, RJ45\\",\\"teclado\\":\\"RGB per-key\\"}"	0	0	3.00	0	f	\N	\N	2025-05-28 22:24:01.398752	2025-05-28 22:24:01.398752	2025-05-28 22:24:01.398752
e4882d6d-58ae-4ba9-b30a-cb30de8569ae	LG-1748467441405-0008	TCL Mini LED 4K 75"	tcl-mini-led-4k-75	TV Mini LED com Quantum Dot, 144Hz para gaming e Google TV.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	8d127abf-7fdf-4f67-b2dd-20b52176bdd3	efa2d07d-8a24-47c0-b402-39f8f26f478c	active	t	7999.00	9598.80	4799.40	BRL	58	\N	t	f	\N	\N	\N	\N	TCL Mini LED 4K 75" - Melhor Preço	TV Mini LED com Quantum Dot, 144Hz para gaming e Google TV.	\N	{tcl,mini-led,4k,144hz,gaming}	"{\\"tamanho\\":\\"75\\\\\\"\\",\\"resolucao\\":\\"4K\\",\\"tecnologia\\":\\"Mini LED QLED\\",\\"hdr\\":\\"Dolby Vision\\",\\"smart\\":\\"Google TV\\"}"	"{\\"taxa\\":\\"144Hz VRR\\",\\"hdmi\\":\\"2x HDMI 2.1\\",\\"audio\\":\\"Dolby Atmos\\",\\"gaming\\":\\"Game Master Pro 2.0\\"}"	0	0	3.60	0	f	\N	\N	2025-05-28 22:24:01.405847	2025-05-28 22:24:01.405847	2025-05-28 22:24:01.405847
c86387ec-8507-40e4-b318-5af2ba9c40e9	LG-1748467441412-0009	ASUS ROG Ally	asus-rog-ally	Console portátil Windows com AMD Ryzen Z1 Extreme e tela 120Hz.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	3c991042-c1b7-4e19-b11a-a3e505308612	efa2d07d-8a24-47c0-b402-39f8f26f478c	active	t	3999.00	4798.80	2399.40	BRL	90	\N	t	f	\N	\N	\N	\N	ASUS ROG Ally - Melhor Preço	Console portátil Windows com AMD Ryzen Z1 Extreme e tela 120Hz.	\N	{rog-ally,asus,portable,windows,gaming}	"{\\"tela\\":\\"7\\\\\\" FHD 120Hz\\",\\"processador\\":\\"AMD Ryzen Z1 Extreme\\",\\"ram\\":\\"16GB\\",\\"armazenamento\\":\\"512GB\\",\\"gpu\\":\\"AMD RDNA 3\\"}"	"{\\"peso\\":\\"608g\\",\\"bateria\\":\\"40Wh\\",\\"audio\\":\\"Dolby Atmos\\",\\"conectividade\\":\\"Wi-Fi 6E, Bluetooth 5.2\\"}"	0	0	3.40	0	f	\N	\N	2025-05-28 22:24:01.412776	2025-05-28 22:24:01.412776	2025-05-28 22:24:01.412776
534f2118-2dd8-41d6-9917-566639e1594f	APPLE-1748467441418-0010	AirPods Pro 2ª Geração USB-C	airpods-pro-2-geracao-usb-c	Fones com cancelamento de ruído adaptativo, áudio espacial e chip H2.	6567b65b-502a-4f9a-b43f-e454dc6ccf00	75e6681c-a1fb-4e6e-8b4c-6504e1e7b1bf	efa2d07d-8a24-47c0-b402-39f8f26f478c	active	t	2249.00	2698.80	1349.40	BRL	13	\N	t	f	\N	\N	\N	\N	AirPods Pro 2ª Geração USB-C - Melhor Preço	Fones com cancelamento de ruído adaptativo, áudio espacial e chip H2.	\N	{airpods,apple,tws,anc,premium}	"{\\"tipo\\":\\"In-ear TWS\\",\\"anc\\":\\"Adaptativo\\",\\"bateria\\":\\"6h (30h com case)\\",\\"resistencia\\":\\"IPX4\\",\\"conectividade\\":\\"Bluetooth 5.3\\"}"	"{\\"driver\\":\\"Custom Apple\\",\\"codec\\":\\"AAC\\",\\"controles\\":\\"Touch + Volume\\",\\"carregamento\\":\\"USB-C, MagSafe, Qi\\"}"	0	0	4.40	0	t	\N	\N	2025-05-28 22:24:01.418297	2025-05-28 22:24:01.418297	2025-05-28 22:24:01.418297
caed0e38-d5d1-459e-8070-9ee2f35f8a15	XIAOMI-1748467441424-0011	Xiaomi 14 Pro 512GB	xiaomi-14-pro-512gb	Fotografia Leica. Performance Snapdragon 8 Gen 3.	321f28cf-85b6-48a3-9f9d-15cf83a7f43d	e7ee4488-175b-476d-8f77-92408f8121d9	044c014e-dd44-4f7d-906a-b88eac634358	active	t	5999.00	7198.80	3599.40	BRL	69	\N	t	f	\N	\N	\N	\N	Xiaomi 14 Pro 512GB - Melhor Preço	Fotografia Leica. Performance Snapdragon 8 Gen 3.	\N	{xiaomi,leica,premium,5g}	"{\\"tela\\":\\"6.73\\\\\\"\\",\\"memoria\\":\\"512GB\\",\\"ram\\":\\"12GB\\",\\"camera\\":\\"50MP Leica + 50MP + 50MP\\",\\"bateria\\":\\"4880mAh\\"}"	"{\\"peso\\":\\"223g\\",\\"dimensoes\\":\\"161.4 x 75.3 x 8.5mm\\",\\"resistencia\\":\\"IP68\\",\\"carregamento\\":\\"120W\\"}"	0	0	3.50	0	t	\N	\N	2025-05-28 22:24:01.424391	2025-05-28 22:24:01.424391	2025-05-28 22:24:01.424391
48db0f1d-54cb-4601-83fa-707ae3410755	LG-1748467441430-0012	Lenovo ThinkPad X1 Carbon	lenovo-thinkpad-x1-carbon	Ultrabook empresarial com 14" 2.8K, Intel vPro e durabilidade militar.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	249f5633-0bf2-4eba-a187-f90b4f8c54cf	044c014e-dd44-4f7d-906a-b88eac634358	active	t	11999.00	14398.80	7199.40	BRL	98	\N	t	f	\N	\N	\N	\N	Lenovo ThinkPad X1 Carbon - Melhor Preço	Ultrabook empresarial com 14" 2.8K, Intel vPro e durabilidade militar.	\N	{thinkpad,business,ultrabook,vpro}	"{\\"tela\\":\\"14\\\\\\" 2.8K\\",\\"processador\\":\\"Intel i7-1365U vPro\\",\\"ram\\":\\"32GB\\",\\"ssd\\":\\"1TB\\",\\"gpu\\":\\"Intel Iris Xe\\"}"	"{\\"peso\\":\\"1.12kg\\",\\"bateria\\":\\"57Wh\\",\\"portas\\":\\"2x Thunderbolt 4, 2x USB-A, HDMI\\",\\"teclado\\":\\"ThinkPad retroiluminado\\"}"	0	0	3.70	0	f	\N	\N	2025-05-28 22:24:01.430671	2025-05-28 22:24:01.430671	2025-05-28 22:24:01.430671
44e4194e-814c-42e8-b8ad-b789ada5fad5	SAMSUNG-1748467441435-0013	Philips Ambilight OLED 55"	philips-ambilight-oled-55	TV OLED com Ambilight 4 lados, P5 AI Perfect Picture e Dolby Atmos.	6f3b272d-b3fa-4009-8c8d-30972b9be20d	8d127abf-7fdf-4f67-b2dd-20b52176bdd3	044c014e-dd44-4f7d-906a-b88eac634358	active	t	9999.00	11998.80	5999.40	BRL	58	\N	t	f	\N	\N	\N	\N	Philips Ambilight OLED 55" - Melhor Preço	TV OLED com Ambilight 4 lados, P5 AI Perfect Picture e Dolby Atmos.	\N	{philips,ambilight,oled,4k}	"{\\"tamanho\\":\\"55\\\\\\"\\",\\"resolucao\\":\\"4K\\",\\"tecnologia\\":\\"OLED\\",\\"hdr\\":\\"HDR10+ Adaptive\\",\\"smart\\":\\"Android TV\\"}"	"{\\"taxa\\":\\"120Hz\\",\\"hdmi\\":\\"4x HDMI 2.1\\",\\"audio\\":\\"2.1ch 50W\\",\\"gaming\\":\\"VRR, ALLM\\"}"	0	0	3.40	0	f	\N	\N	2025-05-28 22:24:01.435998	2025-05-28 22:24:01.435998	2025-05-28 22:24:01.435998
5b4f3816-9f66-4999-94ef-d13f31d5b809	SONY-1748467441440-0014	PlayStation 5 Slim Digital	playstation-5-slim-digital	Console PlayStation 5 versão Slim Digital com SSD de 1TB.	3a297cbe-a984-447b-a4cc-74582b819acb	3c991042-c1b7-4e19-b11a-a3e505308612	044c014e-dd44-4f7d-906a-b88eac634358	active	t	3499.00	4198.80	2099.40	BRL	92	\N	t	f	\N	\N	\N	\N	PlayStation 5 Slim Digital - Melhor Preço	Console PlayStation 5 versão Slim Digital com SSD de 1TB.	\N	{ps5,playstation,sony,console,gaming}	"{\\"armazenamento\\":\\"1TB SSD\\",\\"cpu\\":\\"AMD Zen 2 8-core\\",\\"gpu\\":\\"AMD RDNA 2\\",\\"ram\\":\\"16GB GDDR6\\",\\"resolucao\\":\\"Até 4K 120fps\\"}"	"{\\"peso\\":\\"2.6kg\\",\\"dimensoes\\":\\"358×96×216mm\\",\\"audio\\":\\"Tempest 3D\\",\\"conectividade\\":\\"Wi-Fi 6, Bluetooth 5.1\\"}"	0	0	4.00	0	f	\N	\N	2025-05-28 22:24:01.440745	2025-05-28 22:24:01.440745	2025-05-28 22:24:01.440745
cc530b63-f3cf-45c9-8f3a-d2e7454cec61	SONY-1748467441445-0015	Sony WH-1000XM5	sony-wh-1000xm5	Headphone com o melhor cancelamento de ruído do mercado e 30h de bateria.	3a297cbe-a984-447b-a4cc-74582b819acb	75e6681c-a1fb-4e6e-8b4c-6504e1e7b1bf	044c014e-dd44-4f7d-906a-b88eac634358	active	t	2799.00	3358.80	1679.40	BRL	84	\N	t	f	\N	\N	\N	\N	Sony WH-1000XM5 - Melhor Preço	Headphone com o melhor cancelamento de ruído do mercado e 30h de bateria.	\N	{sony,wh1000xm5,anc,over-ear,premium}	"{\\"tipo\\":\\"Over-ear\\",\\"anc\\":\\"Industry Leading\\",\\"bateria\\":\\"30h\\",\\"resistencia\\":\\"N/A\\",\\"conectividade\\":\\"Bluetooth 5.2\\"}"	"{\\"driver\\":\\"30mm\\",\\"codec\\":\\"LDAC, AAC, SBC\\",\\"controles\\":\\"Touch\\",\\"carregamento\\":\\"USB-C fast charge\\"}"	0	0	4.50	0	f	\N	\N	2025-05-28 22:24:01.445758	2025-05-28 22:24:01.445758	2025-05-28 22:24:01.445758
13d44ab2-1ef8-4c91-9e57-9b57ca234873	SAMSUNG-1748467441451-0016	Motorola Edge 40 Pro	motorola-edge-40-pro	Tela curva 165Hz, carregamento 125W e câmera de 50MP.	6f3b272d-b3fa-4009-8c8d-30972b9be20d	e7ee4488-175b-476d-8f77-92408f8121d9	0dfda12b-7031-461f-80c2-51ff1969297a	active	t	3999.00	4798.80	2399.40	BRL	14	\N	t	f	\N	\N	\N	\N	Motorola Edge 40 Pro - Melhor Preço	Tela curva 165Hz, carregamento 125W e câmera de 50MP.	\N	{motorola,edge,5g,curva}	"{\\"tela\\":\\"6.67\\\\\\"\\",\\"memoria\\":\\"256GB\\",\\"ram\\":\\"12GB\\",\\"camera\\":\\"50MP + 50MP + 12MP\\",\\"bateria\\":\\"4600mAh\\"}"	"{\\"peso\\":\\"199g\\",\\"dimensoes\\":\\"161.2 x 74.0 x 8.6mm\\",\\"resistencia\\":\\"IP68\\",\\"carregamento\\":\\"125W\\"}"	0	0	3.10	0	t	\N	\N	2025-05-28 22:24:01.451528	2025-05-28 22:24:01.451528	2025-05-28 22:24:01.451528
4f071e9b-9881-4ed4-8302-a52478f6af44	SAMSUNG-1748467441457-0017	HP Spectre x360 16"	hp-spectre-x360-16	Conversível 2-em-1 com tela OLED 3K+ touch e Intel Arc.	6f3b272d-b3fa-4009-8c8d-30972b9be20d	249f5633-0bf2-4eba-a187-f90b4f8c54cf	0dfda12b-7031-461f-80c2-51ff1969297a	active	t	13499.00	16198.80	8099.40	BRL	81	\N	t	f	\N	\N	\N	\N	HP Spectre x360 16" - Melhor Preço	Conversível 2-em-1 com tela OLED 3K+ touch e Intel Arc.	\N	{hp,spectre,2em1,oled,touch}	"{\\"tela\\":\\"16\\\\\\" 3K+ OLED Touch\\",\\"processador\\":\\"Intel i7-13700H\\",\\"ram\\":\\"32GB\\",\\"ssd\\":\\"1TB\\",\\"gpu\\":\\"Intel Arc A370M\\"}"	"{\\"peso\\":\\"2.19kg\\",\\"bateria\\":\\"83Wh\\",\\"portas\\":\\"2x Thunderbolt 4, USB-A, HDMI\\",\\"teclado\\":\\"Retroiluminado\\"}"	0	0	4.80	0	f	\N	\N	2025-05-28 22:24:01.457091	2025-05-28 22:24:01.457091	2025-05-28 22:24:01.457091
582525f0-56c9-48fe-8a5f-58fef4ea9d7b	SAMSUNG-1748467441461-0018	Samsung Neo QLED 8K 75"	samsung-neo-qled-8k-75	TV 8K com Quantum Matrix Technology Pro, processador Neural 8K e som Dolby Atmos.	6f3b272d-b3fa-4009-8c8d-30972b9be20d	8d127abf-7fdf-4f67-b2dd-20b52176bdd3	0dfda12b-7031-461f-80c2-51ff1969297a	active	t	29999.00	35998.80	17999.40	BRL	81	\N	t	f	\N	\N	\N	\N	Samsung Neo QLED 8K 75" - Melhor Preço	TV 8K com Quantum Matrix Technology Pro, processador Neural 8K e som Dolby Atmos.	\N	{samsung,8k,neo-qled,premium,gaming}	"{\\"tamanho\\":\\"75\\\\\\"\\",\\"resolucao\\":\\"8K\\",\\"tecnologia\\":\\"Neo QLED\\",\\"hdr\\":\\"HDR10+\\",\\"smart\\":\\"Tizen OS\\"}"	"{\\"taxa\\":\\"120Hz\\",\\"hdmi\\":\\"4x HDMI 2.1\\",\\"audio\\":\\"6.2.4ch 90W\\",\\"gaming\\":\\"Game Mode Pro\\"}"	0	0	3.60	0	f	\N	\N	2025-05-28 22:24:01.461642	2025-05-28 22:24:01.461642	2025-05-28 22:24:01.461642
d224c6ca-89f3-42a9-a6fc-d4e57b978a49	SONY-1748467441467-0019	Xbox Series X 1TB	xbox-series-x-1tb	Console mais poderoso da Microsoft com 12 teraflops e ray tracing.	3a297cbe-a984-447b-a4cc-74582b819acb	3c991042-c1b7-4e19-b11a-a3e505308612	0dfda12b-7031-461f-80c2-51ff1969297a	active	t	3999.00	4798.80	2399.40	BRL	66	\N	t	f	\N	\N	\N	\N	Xbox Series X 1TB - Melhor Preço	Console mais poderoso da Microsoft com 12 teraflops e ray tracing.	\N	{xbox,series-x,microsoft,console,gaming}	"{\\"armazenamento\\":\\"1TB SSD\\",\\"cpu\\":\\"AMD Zen 2 8-core\\",\\"gpu\\":\\"12 TFLOPS AMD RDNA 2\\",\\"ram\\":\\"16GB GDDR6\\",\\"resolucao\\":\\"Até 4K 120fps/8K\\"}"	"{\\"peso\\":\\"4.45kg\\",\\"dimensoes\\":\\"301×151×151mm\\",\\"audio\\":\\"Spatial Sound\\",\\"conectividade\\":\\"Wi-Fi, Bluetooth\\"}"	0	0	3.80	0	t	\N	\N	2025-05-28 22:24:01.467152	2025-05-28 22:24:01.467152	2025-05-28 22:24:01.467152
179f0477-9d08-4813-ab38-1ee29381cb1a	LG-1748467441470-0020	Bose QuietComfort Ultra	bose-quietcomfort-ultra	Fone com Immersive Audio, cancelamento de ruído de classe mundial.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	75e6681c-a1fb-4e6e-8b4c-6504e1e7b1bf	0dfda12b-7031-461f-80c2-51ff1969297a	active	t	3299.00	3958.80	1979.40	BRL	35	\N	t	f	\N	\N	\N	\N	Bose QuietComfort Ultra - Melhor Preço	Fone com Immersive Audio, cancelamento de ruído de classe mundial.	\N	{bose,quietcomfort,anc,immersive,premium}	"{\\"tipo\\":\\"Over-ear\\",\\"anc\\":\\"World-class\\",\\"bateria\\":\\"24h\\",\\"resistencia\\":\\"N/A\\",\\"conectividade\\":\\"Bluetooth 5.3\\"}"	"{\\"driver\\":\\"35mm\\",\\"codec\\":\\"aptX Adaptive, AAC, SBC\\",\\"controles\\":\\"Touch + Botões\\",\\"carregamento\\":\\"USB-C\\"}"	0	0	4.40	0	f	\N	\N	2025-05-28 22:24:01.470697	2025-05-28 22:24:01.470697	2025-05-28 22:24:01.470697
7d1791b0-aa62-4c23-874f-cd21b561c4b3	XIAOMI-1748467441475-0021	OnePlus 12 256GB	oneplus-12-256gb	Hasselblad Camera, Display 2K 120Hz, Snapdragon 8 Gen 3.	321f28cf-85b6-48a3-9f9d-15cf83a7f43d	e7ee4488-175b-476d-8f77-92408f8121d9	c5583a76-92f0-4464-bf9a-8f624ce32f5d	active	t	4499.00	5398.80	2699.40	BRL	47	\N	t	f	\N	\N	\N	\N	OnePlus 12 256GB - Melhor Preço	Hasselblad Camera, Display 2K 120Hz, Snapdragon 8 Gen 3.	\N	{oneplus,hasselblad,5g,flagship}	"{\\"tela\\":\\"6.82\\\\\\"\\",\\"memoria\\":\\"256GB\\",\\"ram\\":\\"12GB\\",\\"camera\\":\\"50MP Hasselblad + 48MP + 64MP\\",\\"bateria\\":\\"5400mAh\\"}"	"{\\"peso\\":\\"220g\\",\\"dimensoes\\":\\"164.3 x 75.8 x 9.2mm\\",\\"resistencia\\":\\"IP65\\",\\"carregamento\\":\\"100W\\"}"	0	0	4.10	0	t	\N	\N	2025-05-28 22:24:01.475716	2025-05-28 22:24:01.475716	2025-05-28 22:24:01.475716
8915c19c-982f-4d82-97be-a60eeae01554	APPLE-1748467441479-0022	MacBook Pro 16" M3 Max	macbook-pro-16-m3-max	O notebook mais poderoso da Apple com chip M3 Max, 36GB RAM e tela Liquid Retina XDR.	6567b65b-502a-4f9a-b43f-e454dc6ccf00	249f5633-0bf2-4eba-a187-f90b4f8c54cf	c5583a76-92f0-4464-bf9a-8f624ce32f5d	active	t	24999.00	29998.80	14999.40	BRL	27	\N	t	f	\N	\N	\N	\N	MacBook Pro 16" M3 Max - Melhor Preço	O notebook mais poderoso da Apple com chip M3 Max, 36GB RAM e tela Liquid Retina XDR.	\N	{macbook,apple,m3,pro,creator}	"{\\"tela\\":\\"16.2\\\\\\"\\",\\"processador\\":\\"M3 Max\\",\\"ram\\":\\"36GB\\",\\"ssd\\":\\"1TB\\",\\"gpu\\":\\"40-core GPU\\"}"	"{\\"peso\\":\\"2.16kg\\",\\"bateria\\":\\"até 22h\\",\\"portas\\":\\"3x Thunderbolt 4, HDMI, SD, MagSafe 3\\",\\"teclado\\":\\"Magic Keyboard retroiluminado\\"}"	0	0	3.40	0	f	\N	\N	2025-05-28 22:24:01.479747	2025-05-28 22:24:01.479747	2025-05-28 22:24:01.479747
7f10909f-e557-43ef-821d-3f6f025bb4da	LG-1748467441488-0023	LG OLED evo C3 65"	lg-oled-evo-c3-65	TV OLED com processador α9 AI 4K Gen6, Dolby Vision IQ e webOS 23.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	8d127abf-7fdf-4f67-b2dd-20b52176bdd3	c5583a76-92f0-4464-bf9a-8f624ce32f5d	active	t	12999.00	15598.80	7799.40	BRL	83	\N	t	f	\N	\N	\N	\N	LG OLED evo C3 65" - Melhor Preço	TV OLED com processador α9 AI 4K Gen6, Dolby Vision IQ e webOS 23.	\N	{lg,oled,4k,dolby-vision,gaming}	"{\\"tamanho\\":\\"65\\\\\\"\\",\\"resolucao\\":\\"4K\\",\\"tecnologia\\":\\"OLED evo\\",\\"hdr\\":\\"Dolby Vision IQ\\",\\"smart\\":\\"webOS 23\\"}"	"{\\"taxa\\":\\"120Hz\\",\\"hdmi\\":\\"4x HDMI 2.1\\",\\"audio\\":\\"2.2ch 40W\\",\\"gaming\\":\\"G-Sync, FreeSync\\"}"	0	0	3.80	0	f	\N	\N	2025-05-28 22:24:01.488309	2025-05-28 22:24:01.488309	2025-05-28 22:24:01.488309
8adc667a-208a-4167-bd91-db5958de8051	LG-1748467441491-0024	Nintendo Switch OLED	nintendo-switch-oled	Console híbrido com tela OLED de 7 polegadas vibrante.	9d7b14b5-2b11-481e-b9db-1d269a6ea3a3	3c991042-c1b7-4e19-b11a-a3e505308612	c5583a76-92f0-4464-bf9a-8f624ce32f5d	active	t	2499.00	2998.80	1499.40	BRL	12	\N	t	f	\N	\N	\N	\N	Nintendo Switch OLED - Melhor Preço	Console híbrido com tela OLED de 7 polegadas vibrante.	\N	{nintendo,switch,oled,portable,gaming}	"{\\"tela\\":\\"7\\\\\\" OLED\\",\\"armazenamento\\":\\"64GB\\",\\"bateria\\":\\"4.5-9 horas\\",\\"cpu\\":\\"NVIDIA Tegra X1+\\",\\"resolucao\\":\\"Até 1080p docked\\"}"	"{\\"peso\\":\\"420g com Joy-Con\\",\\"dimensoes\\":\\"242×102×13.9mm\\",\\"audio\\":\\"Stereo aprimorado\\",\\"conectividade\\":\\"Wi-Fi, Bluetooth\\"}"	0	0	4.80	0	f	\N	\N	2025-05-28 22:24:01.491522	2025-05-28 22:24:01.491522	2025-05-28 22:24:01.491522
24a3c406-f6d1-452b-b8db-cbd85b6578f1	SAMSUNG-1748467441496-0025	Samsung Galaxy Buds3 Pro	samsung-galaxy-buds3-pro	TWS com design blade, ANC inteligente e som Hi-Fi 24bit.	6f3b272d-b3fa-4009-8c8d-30972b9be20d	75e6681c-a1fb-4e6e-8b4c-6504e1e7b1bf	c5583a76-92f0-4464-bf9a-8f624ce32f5d	active	t	1799.00	2158.80	1079.40	BRL	10	\N	t	f	\N	\N	\N	\N	Samsung Galaxy Buds3 Pro - Melhor Preço	TWS com design blade, ANC inteligente e som Hi-Fi 24bit.	\N	{galaxy-buds,samsung,tws,anc,hifi}	"{\\"tipo\\":\\"In-ear TWS\\",\\"anc\\":\\"Inteligente\\",\\"bateria\\":\\"6h (26h com case)\\",\\"resistencia\\":\\"IP57\\",\\"conectividade\\":\\"Bluetooth 5.4\\"}"	"{\\"driver\\":\\"10.5mm + 6.1mm planar\\",\\"codec\\":\\"SSC HiFi, AAC, SBC\\",\\"controles\\":\\"Touch + Pinch\\",\\"carregamento\\":\\"USB-C, Qi\\"}"	0	0	3.20	0	f	\N	\N	2025-05-28 22:24:01.496781	2025-05-28 22:24:01.496781	2025-05-28 22:24:01.496781
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, product_id, user_id, order_id, rating, title, comment, is_verified, helpful_count, created_at, updated_at) FROM stdin;
a1b99c4d-9fe3-4c30-a93f-bbb12f86a90e	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	8	2025-05-28 22:24:01.354603	2025-05-28 22:24:01.354603
2d755518-4ecc-483a-a144-4226386323b4	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	8	2025-05-28 22:24:01.356483	2025-05-28 22:24:01.356483
3f9be3f7-36af-48fb-b9a5-5c4c0acbfed4	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	9	2025-05-28 22:24:01.357296	2025-05-28 22:24:01.357296
12b17cfc-51ed-40ae-82dc-bc6ab9e61273	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	9	2025-05-28 22:24:01.358106	2025-05-28 22:24:01.358106
1157ed69-a433-42f5-a2ef-90a1ed8d0859	5d6e3e02-3cc2-413c-9ac1-73e84503d90b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	18	2025-05-28 22:24:01.359536	2025-05-28 22:24:01.359536
9daa7c1c-6e9f-4063-b5dd-0cbf0ba4ea41	56f47c40-6aca-4545-a51a-0478fc9f240f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	12	2025-05-28 22:24:01.367748	2025-05-28 22:24:01.367748
4182c0d6-318b-4197-8d10-84e990127213	56f47c40-6aca-4545-a51a-0478fc9f240f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	17	2025-05-28 22:24:01.368134	2025-05-28 22:24:01.368134
6e38486f-dc8b-4d4e-9fb8-18be75263fd2	56f47c40-6aca-4545-a51a-0478fc9f240f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	19	2025-05-28 22:24:01.368447	2025-05-28 22:24:01.368447
70c28ea2-32a9-4ee7-8c83-f45f275eab0e	56f47c40-6aca-4545-a51a-0478fc9f240f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	18	2025-05-28 22:24:01.368774	2025-05-28 22:24:01.368774
32f15bb7-90a7-4511-8b3d-5fb328c7fcc6	56f47c40-6aca-4545-a51a-0478fc9f240f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	10	2025-05-28 22:24:01.369074	2025-05-28 22:24:01.369074
4ac0c6f5-b916-43dd-b2c6-76793aede139	56f47c40-6aca-4545-a51a-0478fc9f240f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	6	2025-05-28 22:24:01.369392	2025-05-28 22:24:01.369392
c224e898-026e-431e-9fb2-8884ee814df4	56f47c40-6aca-4545-a51a-0478fc9f240f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Vale a pena	Entrega rápida, produto conforme anunciado.	t	4	2025-05-28 22:24:01.369699	2025-05-28 22:24:01.369699
7567c5e6-fcfd-427f-9ea3-e0226aa04854	56f47c40-6aca-4545-a51a-0478fc9f240f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	4	2025-05-28 22:24:01.370005	2025-05-28 22:24:01.370005
18e61189-035d-429d-803e-a875097fce76	fdc599e7-933d-4539-8c1f-57d91afd9e11	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	4	2025-05-28 22:24:01.37611	2025-05-28 22:24:01.37611
577d4beb-741c-47a4-9beb-074122b4795f	fdc599e7-933d-4539-8c1f-57d91afd9e11	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	16	2025-05-28 22:24:01.376451	2025-05-28 22:24:01.376451
8db24626-b4fa-4301-ba34-cca35766db39	fdc599e7-933d-4539-8c1f-57d91afd9e11	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	14	2025-05-28 22:24:01.37675	2025-05-28 22:24:01.37675
eab0d024-a542-4170-a2e9-49ddd9916b0e	fdc599e7-933d-4539-8c1f-57d91afd9e11	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	12	2025-05-28 22:24:01.377065	2025-05-28 22:24:01.377065
7fc9bb91-127f-421c-81af-18ff823177ed	df337b23-b0f9-4f55-a7cb-b18892a2617d	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	14	2025-05-28 22:24:01.382362	2025-05-28 22:24:01.382362
d4db6869-5f81-45fa-a9e8-9405f098af5b	df337b23-b0f9-4f55-a7cb-b18892a2617d	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	14	2025-05-28 22:24:01.382667	2025-05-28 22:24:01.382667
5c93956a-0bdb-4c5e-aa82-79471b10ad0a	df337b23-b0f9-4f55-a7cb-b18892a2617d	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	8	2025-05-28 22:24:01.382957	2025-05-28 22:24:01.382957
b9107996-6c93-44b6-8e62-e4e4c9e760fd	9edcafc7-8b50-4051-9d23-e55b2d8c5071	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	8	2025-05-28 22:24:01.387769	2025-05-28 22:24:01.387769
72fc566d-eec4-4620-b2ee-845895876b8d	9edcafc7-8b50-4051-9d23-e55b2d8c5071	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	9	2025-05-28 22:24:01.388121	2025-05-28 22:24:01.388121
f6e08290-86de-41ef-8b98-520060803dac	9edcafc7-8b50-4051-9d23-e55b2d8c5071	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	13	2025-05-28 22:24:01.388481	2025-05-28 22:24:01.388481
ff7dc610-0a22-4ca3-a5e0-b95762944917	9edcafc7-8b50-4051-9d23-e55b2d8c5071	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	13	2025-05-28 22:24:01.388841	2025-05-28 22:24:01.388841
1add075d-feab-4433-aa8a-90bff488721e	9edcafc7-8b50-4051-9d23-e55b2d8c5071	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	13	2025-05-28 22:24:01.389143	2025-05-28 22:24:01.389143
f28803ed-2087-4c61-ba13-b787c62c62c1	9edcafc7-8b50-4051-9d23-e55b2d8c5071	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	11	2025-05-28 22:24:01.389622	2025-05-28 22:24:01.389622
b377600a-4498-40b4-87fd-698cf0deaf74	9edcafc7-8b50-4051-9d23-e55b2d8c5071	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Vale a pena	Entrega rápida, produto conforme anunciado.	t	16	2025-05-28 22:24:01.389899	2025-05-28 22:24:01.389899
5c53d433-3eaf-46ca-8504-5a8212fa773c	9edcafc7-8b50-4051-9d23-e55b2d8c5071	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	19	2025-05-28 22:24:01.390184	2025-05-28 22:24:01.390184
2aa3a0d6-68ac-4a6f-84be-5fe0cce6aa0f	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	2	2025-05-28 22:24:01.396153	2025-05-28 22:24:01.396153
dff1ec5a-d0a7-43a5-ba3b-0709d1374657	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	15	2025-05-28 22:24:01.396429	2025-05-28 22:24:01.396429
657ea292-aa96-42c3-b118-9cb9d670936e	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	16	2025-05-28 22:24:01.396726	2025-05-28 22:24:01.396726
c8923143-0aa0-43a3-9baa-17a37e47e94c	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	4	2025-05-28 22:24:01.397016	2025-05-28 22:24:01.397016
46b14505-1e03-4836-9413-7d72979be0d1	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	8	2025-05-28 22:24:01.397292	2025-05-28 22:24:01.397292
6e51ffec-8a54-4246-946a-da31e1cdae3c	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	20	2025-05-28 22:24:01.397894	2025-05-28 22:24:01.397894
9e47f772-96b5-444c-9943-fee890776f73	9a104dbf-8a63-466b-93d0-7ac78ae9cd39	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Vale a pena	Entrega rápida, produto conforme anunciado.	t	16	2025-05-28 22:24:01.398217	2025-05-28 22:24:01.398217
7e105652-561c-48d9-b7ec-bfd7864b5c60	aab3e474-3461-425c-9b52-a0747e3a1589	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	7	2025-05-28 22:24:01.40359	2025-05-28 22:24:01.40359
8f8f2b01-4e2e-4650-a986-8a44e7f37be5	aab3e474-3461-425c-9b52-a0747e3a1589	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	4	2025-05-28 22:24:01.403894	2025-05-28 22:24:01.403894
adee1ff6-f98e-4bb9-a9d5-671b3a609a87	aab3e474-3461-425c-9b52-a0747e3a1589	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	9	2025-05-28 22:24:01.404185	2025-05-28 22:24:01.404185
ebb8148b-eb45-4d3a-959f-105a177f8970	aab3e474-3461-425c-9b52-a0747e3a1589	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	10	2025-05-28 22:24:01.404457	2025-05-28 22:24:01.404457
77d0d2bf-8027-484a-9013-f994bc897d3f	aab3e474-3461-425c-9b52-a0747e3a1589	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	5	2025-05-28 22:24:01.404737	2025-05-28 22:24:01.404737
850d5788-bca0-43fe-abe0-94a2e683ce71	aab3e474-3461-425c-9b52-a0747e3a1589	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	1	2025-05-28 22:24:01.405001	2025-05-28 22:24:01.405001
95e1011a-ab34-42d0-a85c-fc355d3cbd6e	aab3e474-3461-425c-9b52-a0747e3a1589	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Vale a pena	Entrega rápida, produto conforme anunciado.	t	13	2025-05-28 22:24:01.405291	2025-05-28 22:24:01.405291
2f2cebdd-4624-4af6-8db2-641dc39437fd	aab3e474-3461-425c-9b52-a0747e3a1589	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	6	2025-05-28 22:24:01.405557	2025-05-28 22:24:01.405557
328ec338-f523-476b-8f4b-0592346e0164	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	18	2025-05-28 22:24:01.410717	2025-05-28 22:24:01.410717
839a5dc0-ea05-42ba-bdfc-a57f32bc7c03	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	9	2025-05-28 22:24:01.4113	2025-05-28 22:24:01.4113
573d7929-6b81-4ba1-a9de-382cdd6e6e67	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	18	2025-05-28 22:24:01.41157	2025-05-28 22:24:01.41157
e409b105-26ec-4932-a591-1ee6ec95cba8	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	9	2025-05-28 22:24:01.41224	2025-05-28 22:24:01.41224
69fa438b-4aa2-4be7-81aa-10ed1e1d51da	e4882d6d-58ae-4ba9-b30a-cb30de8569ae	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	13	2025-05-28 22:24:01.4125	2025-05-28 22:24:01.4125
a404fec2-4fed-41b3-aac0-eb81ffa76191	c86387ec-8507-40e4-b318-5af2ba9c40e9	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	11	2025-05-28 22:24:01.416987	2025-05-28 22:24:01.416987
84ec95a2-7f68-44c6-bff4-5989bbf58883	c86387ec-8507-40e4-b318-5af2ba9c40e9	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	19	2025-05-28 22:24:01.417257	2025-05-28 22:24:01.417257
5fbf2d9a-de5f-4dc1-9ebd-229c06ad5e0d	c86387ec-8507-40e4-b318-5af2ba9c40e9	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	2	2025-05-28 22:24:01.417523	2025-05-28 22:24:01.417523
1fb6dd93-c6a3-445f-af79-784d328cb020	c86387ec-8507-40e4-b318-5af2ba9c40e9	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	12	2025-05-28 22:24:01.417844	2025-05-28 22:24:01.417844
9b5c75cf-a1b3-42fb-846d-f9b98bbfe4fe	534f2118-2dd8-41d6-9917-566639e1594f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	2	2025-05-28 22:24:01.422275	2025-05-28 22:24:01.422275
8a2d87fc-8dfc-488d-8fba-4a091d84537a	534f2118-2dd8-41d6-9917-566639e1594f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	2	2025-05-28 22:24:01.422537	2025-05-28 22:24:01.422537
a2c1f1d1-23ea-4bdd-a883-40126aca7bd5	534f2118-2dd8-41d6-9917-566639e1594f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	20	2025-05-28 22:24:01.422799	2025-05-28 22:24:01.422799
10535034-031f-4c95-ade3-0e741f29b6bd	534f2118-2dd8-41d6-9917-566639e1594f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	2	2025-05-28 22:24:01.423048	2025-05-28 22:24:01.423048
102b3ea1-e3ce-46ae-a42e-62d7961229e4	534f2118-2dd8-41d6-9917-566639e1594f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	13	2025-05-28 22:24:01.423326	2025-05-28 22:24:01.423326
171713ac-c6a7-4fcc-a616-23528bfadf63	534f2118-2dd8-41d6-9917-566639e1594f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	2	2025-05-28 22:24:01.423573	2025-05-28 22:24:01.423573
9014e83b-3063-4b6c-8b7f-59173312ea6b	534f2118-2dd8-41d6-9917-566639e1594f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Vale a pena	Entrega rápida, produto conforme anunciado.	t	12	2025-05-28 22:24:01.423817	2025-05-28 22:24:01.423817
c5874330-749f-457c-9083-db47aa1cff0c	534f2118-2dd8-41d6-9917-566639e1594f	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	19	2025-05-28 22:24:01.424056	2025-05-28 22:24:01.424056
1c24bb8c-bb1c-4171-a9b3-abdd562f092e	caed0e38-d5d1-459e-8070-9ee2f35f8a15	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	11	2025-05-28 22:24:01.428875	2025-05-28 22:24:01.428875
31af51ee-9505-4ed1-9b83-d58272501c20	caed0e38-d5d1-459e-8070-9ee2f35f8a15	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	16	2025-05-28 22:24:01.429131	2025-05-28 22:24:01.429131
6b27014b-3b5c-4192-81a2-64588664aabc	caed0e38-d5d1-459e-8070-9ee2f35f8a15	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	10	2025-05-28 22:24:01.429383	2025-05-28 22:24:01.429383
cfc072f4-75d4-4cf1-a9ec-f23d9b991224	caed0e38-d5d1-459e-8070-9ee2f35f8a15	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	0	2025-05-28 22:24:01.429609	2025-05-28 22:24:01.429609
906db348-41e6-4f39-b6c7-1547becd2baa	caed0e38-d5d1-459e-8070-9ee2f35f8a15	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	6	2025-05-28 22:24:01.430169	2025-05-28 22:24:01.430169
611b12ef-2066-4a0b-b64e-77a023c4da48	caed0e38-d5d1-459e-8070-9ee2f35f8a15	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	3	2025-05-28 22:24:01.430425	2025-05-28 22:24:01.430425
23f6bff3-717c-4a96-a9e2-8e9bf39eeaca	48db0f1d-54cb-4601-83fa-707ae3410755	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	17	2025-05-28 22:24:01.434713	2025-05-28 22:24:01.434713
8693d17e-fd5f-4689-8b06-ec1c1f88b327	48db0f1d-54cb-4601-83fa-707ae3410755	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	17	2025-05-28 22:24:01.434937	2025-05-28 22:24:01.434937
beaf65da-78b3-45fe-9080-907a090e4d6b	48db0f1d-54cb-4601-83fa-707ae3410755	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	6	2025-05-28 22:24:01.435142	2025-05-28 22:24:01.435142
ba1399a2-a227-487f-9adf-9afc772f946b	48db0f1d-54cb-4601-83fa-707ae3410755	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	16	2025-05-28 22:24:01.435348	2025-05-28 22:24:01.435348
4b206aff-9a94-46a1-bd37-c53dc0f997ad	48db0f1d-54cb-4601-83fa-707ae3410755	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	11	2025-05-28 22:24:01.435574	2025-05-28 22:24:01.435574
1a722255-b74d-46b5-8cec-27c6e6ee8b7f	48db0f1d-54cb-4601-83fa-707ae3410755	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	13	2025-05-28 22:24:01.435778	2025-05-28 22:24:01.435778
26774cde-5727-4a06-b069-52f4b218fe32	44e4194e-814c-42e8-b8ad-b789ada5fad5	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	11	2025-05-28 22:24:01.439576	2025-05-28 22:24:01.439576
8f614242-5af0-4ee6-84af-af59250ea2ca	44e4194e-814c-42e8-b8ad-b789ada5fad5	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	10	2025-05-28 22:24:01.439781	2025-05-28 22:24:01.439781
919eb5fb-545a-41f8-b274-ca5dbf1db4ee	44e4194e-814c-42e8-b8ad-b789ada5fad5	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	11	2025-05-28 22:24:01.439953	2025-05-28 22:24:01.439953
7acc0f22-7721-4124-85b3-2ac96bd953e3	44e4194e-814c-42e8-b8ad-b789ada5fad5	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	10	2025-05-28 22:24:01.440149	2025-05-28 22:24:01.440149
61b0dc49-8822-424a-acba-a043845fb1ab	44e4194e-814c-42e8-b8ad-b789ada5fad5	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	6	2025-05-28 22:24:01.440351	2025-05-28 22:24:01.440351
4db7ce9d-265f-484e-8007-7c4bc7dc6d93	44e4194e-814c-42e8-b8ad-b789ada5fad5	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	13	2025-05-28 22:24:01.440543	2025-05-28 22:24:01.440543
2ce23af5-4d59-4b41-8bc2-8ec7e8beb185	5b4f3816-9f66-4999-94ef-d13f31d5b809	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	0	2025-05-28 22:24:01.444211	2025-05-28 22:24:01.444211
6fe48950-2dea-42c9-a3ca-10d6a210ced9	5b4f3816-9f66-4999-94ef-d13f31d5b809	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	3	2025-05-28 22:24:01.444407	2025-05-28 22:24:01.444407
3d3b819e-de97-4ff5-86c2-be731cba9d91	5b4f3816-9f66-4999-94ef-d13f31d5b809	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	1	2025-05-28 22:24:01.444605	2025-05-28 22:24:01.444605
bccb738a-d2af-4366-bcae-90ccc98f7397	5b4f3816-9f66-4999-94ef-d13f31d5b809	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	8	2025-05-28 22:24:01.4448	2025-05-28 22:24:01.4448
9089aa09-6136-40ef-8ef4-f7e623afc09d	5b4f3816-9f66-4999-94ef-d13f31d5b809	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	19	2025-05-28 22:24:01.444993	2025-05-28 22:24:01.444993
6506dc03-5544-4e1d-97db-cd023dad5185	5b4f3816-9f66-4999-94ef-d13f31d5b809	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	18	2025-05-28 22:24:01.44537	2025-05-28 22:24:01.44537
388ae0e6-e9e5-4629-be57-8909630336a7	5b4f3816-9f66-4999-94ef-d13f31d5b809	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Vale a pena	Entrega rápida, produto conforme anunciado.	t	16	2025-05-28 22:24:01.445561	2025-05-28 22:24:01.445561
567a1df3-f533-45ca-9fe7-a0f5b9447cd6	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	17	2025-05-28 22:24:01.449721	2025-05-28 22:24:01.449721
15c5f041-708c-4f88-bdf0-725834efed87	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	13	2025-05-28 22:24:01.44996	2025-05-28 22:24:01.44996
2af752dc-3d4f-44e1-94f4-b3dded6a86c9	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	2	2025-05-28 22:24:01.450251	2025-05-28 22:24:01.450251
1c7c9bfd-d6f2-4ba9-a2a5-24790018462c	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	15	2025-05-28 22:24:01.450479	2025-05-28 22:24:01.450479
840a73fc-397d-47b0-a84f-65c705144cdc	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	19	2025-05-28 22:24:01.45071	2025-05-28 22:24:01.45071
f1ee76d5-2c22-46ff-8152-d50fd4214c51	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	3	2025-05-28 22:24:01.450946	2025-05-28 22:24:01.450946
50087944-b946-4719-bd01-11c9fca28a8d	cc530b63-f3cf-45c9-8f3a-d2e7454cec61	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Vale a pena	Entrega rápida, produto conforme anunciado.	t	9	2025-05-28 22:24:01.451185	2025-05-28 22:24:01.451185
71c0cc7f-baea-41fe-a8ca-929812c9aca3	13d44ab2-1ef8-4c91-9e57-9b57ca234873	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	11	2025-05-28 22:24:01.455404	2025-05-28 22:24:01.455404
13e28fa1-7d3c-4917-8cd7-911f766afc27	13d44ab2-1ef8-4c91-9e57-9b57ca234873	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	18	2025-05-28 22:24:01.455607	2025-05-28 22:24:01.455607
8b552f3c-ffaa-43a4-9482-aa5afbf12a10	13d44ab2-1ef8-4c91-9e57-9b57ca234873	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	2	2025-05-28 22:24:01.4558	2025-05-28 22:24:01.4558
4b4164a8-5f8a-45ef-94bd-51b763151360	13d44ab2-1ef8-4c91-9e57-9b57ca234873	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	13	2025-05-28 22:24:01.456003	2025-05-28 22:24:01.456003
e733af57-cbd8-4ea6-9c59-759e67138f97	13d44ab2-1ef8-4c91-9e57-9b57ca234873	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	15	2025-05-28 22:24:01.456212	2025-05-28 22:24:01.456212
1b75b4d3-0442-4afa-9875-c27e758927c8	13d44ab2-1ef8-4c91-9e57-9b57ca234873	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	5	2025-05-28 22:24:01.4564	2025-05-28 22:24:01.4564
b53a8e8b-a33f-4d61-8bb3-3d21f3f7afce	13d44ab2-1ef8-4c91-9e57-9b57ca234873	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Vale a pena	Entrega rápida, produto conforme anunciado.	t	10	2025-05-28 22:24:01.456587	2025-05-28 22:24:01.456587
bf1ecb06-e8ff-4ae7-937d-2c3e13eccf2d	13d44ab2-1ef8-4c91-9e57-9b57ca234873	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	19	2025-05-28 22:24:01.456851	2025-05-28 22:24:01.456851
4dc250ce-8698-4d25-927b-3287a5638ee3	4f071e9b-9881-4ed4-8302-a52478f6af44	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	8	2025-05-28 22:24:01.460113	2025-05-28 22:24:01.460113
8261699b-5cdb-403d-9088-dd97f110e2c3	4f071e9b-9881-4ed4-8302-a52478f6af44	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	10	2025-05-28 22:24:01.460321	2025-05-28 22:24:01.460321
968a0ccf-bd59-4678-a42a-267caca6af86	4f071e9b-9881-4ed4-8302-a52478f6af44	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	8	2025-05-28 22:24:01.460506	2025-05-28 22:24:01.460506
31e401b8-636a-412f-b19f-b3f617c66ea0	4f071e9b-9881-4ed4-8302-a52478f6af44	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	20	2025-05-28 22:24:01.460862	2025-05-28 22:24:01.460862
d2dd62a0-62d3-433d-a219-2943fd86875d	4f071e9b-9881-4ed4-8302-a52478f6af44	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	9	2025-05-28 22:24:01.461051	2025-05-28 22:24:01.461051
9ae0587f-75ce-4e4f-be0a-969933514424	4f071e9b-9881-4ed4-8302-a52478f6af44	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	4	2025-05-28 22:24:01.461232	2025-05-28 22:24:01.461232
7f1047db-b7f7-47ec-8ba4-9c463c48752f	4f071e9b-9881-4ed4-8302-a52478f6af44	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Vale a pena	Entrega rápida, produto conforme anunciado.	t	12	2025-05-28 22:24:01.461429	2025-05-28 22:24:01.461429
575fa08c-7bb5-4a1f-b1b8-80e8d05c2594	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	11	2025-05-28 22:24:01.465596	2025-05-28 22:24:01.465596
eb271fa2-e972-49e7-99ed-cc41c252abf8	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	17	2025-05-28 22:24:01.46598	2025-05-28 22:24:01.46598
bfe1a90c-b26f-4bdb-8284-93951eed5133	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	10	2025-05-28 22:24:01.466238	2025-05-28 22:24:01.466238
b6d68557-354a-4dda-97ec-7dc914fc8716	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	3	2025-05-28 22:24:01.466458	2025-05-28 22:24:01.466458
6cf6ecdb-8820-45ff-afc1-acdceeaacc67	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	7	2025-05-28 22:24:01.466666	2025-05-28 22:24:01.466666
4c60388f-b2d0-4ace-8c30-b05de8bf2f9f	582525f0-56c9-48fe-8a5f-58fef4ea9d7b	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	5	2025-05-28 22:24:01.466888	2025-05-28 22:24:01.466888
c4cb6aac-2f9c-46c4-8447-849ecb0a3e59	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	0	2025-05-28 22:24:01.469931	2025-05-28 22:24:01.469931
769d5265-13b4-4e67-b009-65ffd6a2c4ac	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	14	2025-05-28 22:24:01.470123	2025-05-28 22:24:01.470123
4aae4e48-5a88-4962-838d-7c7f75b1efd2	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	2	2025-05-28 22:24:01.470316	2025-05-28 22:24:01.470316
c0451dd2-ed58-4754-a318-0d59b73a7bab	d224c6ca-89f3-42a9-a6fc-d4e57b978a49	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	20	2025-05-28 22:24:01.470498	2025-05-28 22:24:01.470498
81897d9d-c346-4d29-a6e1-133451bee2ef	179f0477-9d08-4813-ab38-1ee29381cb1a	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	10	2025-05-28 22:24:01.474177	2025-05-28 22:24:01.474177
0409708d-32d2-4cb1-9963-6ffb9067d861	179f0477-9d08-4813-ab38-1ee29381cb1a	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	5	2025-05-28 22:24:01.474379	2025-05-28 22:24:01.474379
9b109085-ec8a-449b-9dd4-649ae6c6a7a3	179f0477-9d08-4813-ab38-1ee29381cb1a	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	20	2025-05-28 22:24:01.474579	2025-05-28 22:24:01.474579
73926878-b762-4243-a888-3946b6ed66dd	179f0477-9d08-4813-ab38-1ee29381cb1a	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	8	2025-05-28 22:24:01.474836	2025-05-28 22:24:01.474836
b7b57205-8ff2-42f1-bf75-bc1b6ace8ecc	179f0477-9d08-4813-ab38-1ee29381cb1a	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	17	2025-05-28 22:24:01.475061	2025-05-28 22:24:01.475061
2f2d6b63-5a77-4d4f-a98a-dad2cbddb1c4	179f0477-9d08-4813-ab38-1ee29381cb1a	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	16	2025-05-28 22:24:01.475438	2025-05-28 22:24:01.475438
d0efe5db-d0b3-4690-83ce-a44dc36e4e00	7d1791b0-aa62-4c23-874f-cd21b561c4b3	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	19	2025-05-28 22:24:01.478741	2025-05-28 22:24:01.478741
7facd68a-08d9-4a31-af27-0f455159e504	7d1791b0-aa62-4c23-874f-cd21b561c4b3	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	7	2025-05-28 22:24:01.478939	2025-05-28 22:24:01.478939
65727877-d4f5-4e62-a00b-8be15748228b	7d1791b0-aa62-4c23-874f-cd21b561c4b3	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	15	2025-05-28 22:24:01.47913	2025-05-28 22:24:01.47913
7dd76fbc-2421-4741-887f-621f2911da92	7d1791b0-aa62-4c23-874f-cd21b561c4b3	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	2	2025-05-28 22:24:01.479354	2025-05-28 22:24:01.479354
d8f1010c-a13e-4c1e-a5ff-e71b0f980548	7d1791b0-aa62-4c23-874f-cd21b561c4b3	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	1	2025-05-28 22:24:01.479544	2025-05-28 22:24:01.479544
3859b73a-d4b9-471c-8b5b-5ec940189048	8915c19c-982f-4d82-97be-a60eeae01554	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	18	2025-05-28 22:24:01.485649	2025-05-28 22:24:01.485649
99896239-a78a-432e-9f38-a740a3d1c032	8915c19c-982f-4d82-97be-a60eeae01554	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	6	2025-05-28 22:24:01.485867	2025-05-28 22:24:01.485867
9c0f11bd-780e-4a95-8289-036e7aedc019	8915c19c-982f-4d82-97be-a60eeae01554	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	15	2025-05-28 22:24:01.486082	2025-05-28 22:24:01.486082
9b28f3c8-f13a-4dae-ba4d-672e89305316	8915c19c-982f-4d82-97be-a60eeae01554	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	3	2025-05-28 22:24:01.486382	2025-05-28 22:24:01.486382
9e808797-26e9-4ab3-a2ff-dda64a7544cf	8915c19c-982f-4d82-97be-a60eeae01554	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	19	2025-05-28 22:24:01.48665	2025-05-28 22:24:01.48665
c1ab4257-2ccc-43ce-827f-f93dbcb348a2	8915c19c-982f-4d82-97be-a60eeae01554	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	9	2025-05-28 22:24:01.487172	2025-05-28 22:24:01.487172
9910f851-89ab-416e-b9f0-f8dae3112354	8915c19c-982f-4d82-97be-a60eeae01554	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Vale a pena	Entrega rápida, produto conforme anunciado.	t	20	2025-05-28 22:24:01.487536	2025-05-28 22:24:01.487536
f80b85cc-ed57-438b-a05f-449732d86465	8915c19c-982f-4d82-97be-a60eeae01554	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	3	2025-05-28 22:24:01.487947	2025-05-28 22:24:01.487947
b930dcb7-c0fd-452a-998d-413e1ac87dd3	7f10909f-e557-43ef-821d-3f6f025bb4da	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	9	2025-05-28 22:24:01.490861	2025-05-28 22:24:01.490861
d3ad53da-7a98-4c5c-a99f-d6124bbf2392	7f10909f-e557-43ef-821d-3f6f025bb4da	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	8	2025-05-28 22:24:01.491074	2025-05-28 22:24:01.491074
d7dc9f28-736c-4d3b-9704-15ff8af37bbe	7f10909f-e557-43ef-821d-3f6f025bb4da	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	10	2025-05-28 22:24:01.491275	2025-05-28 22:24:01.491275
5775e21e-2b95-4596-9fea-ef66afbda4f1	8adc667a-208a-4167-bd91-db5958de8051	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	8	2025-05-28 22:24:01.495462	2025-05-28 22:24:01.495462
fcd64328-089f-4553-8933-98a59790ef0e	8adc667a-208a-4167-bd91-db5958de8051	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	19	2025-05-28 22:24:01.495665	2025-05-28 22:24:01.495665
9af10cb3-22ca-46e3-8a07-db11250fe04e	8adc667a-208a-4167-bd91-db5958de8051	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	4	2025-05-28 22:24:01.495851	2025-05-28 22:24:01.495851
016399fc-dc37-401c-8290-b5671cfc691a	8adc667a-208a-4167-bd91-db5958de8051	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	11	2025-05-28 22:24:01.496034	2025-05-28 22:24:01.496034
ccee866b-bf33-49c3-bb00-27306920cf29	8adc667a-208a-4167-bd91-db5958de8051	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	19	2025-05-28 22:24:01.496214	2025-05-28 22:24:01.496214
0d04fb85-aa7c-43d6-b268-3ce49f82db48	8adc667a-208a-4167-bd91-db5958de8051	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	18	2025-05-28 22:24:01.496403	2025-05-28 22:24:01.496403
9c86f8b3-6b6a-42f0-ba1f-cce0454967d8	8adc667a-208a-4167-bd91-db5958de8051	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Vale a pena	Entrega rápida, produto conforme anunciado.	t	13	2025-05-28 22:24:01.496588	2025-05-28 22:24:01.496588
d655bc62-c1c7-4c1d-8f10-c3e461d1d3e3	24a3c406-f6d1-452b-b8db-cbd85b6578f1	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	10	2025-05-28 22:24:01.500148	2025-05-28 22:24:01.500148
44633a6c-26b1-4307-9171-c25c8526ac0c	24a3c406-f6d1-452b-b8db-cbd85b6578f1	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Muito bom	Atendeu todas as minhas expectativas. Recomendo a compra.	t	4	2025-05-28 22:24:01.500352	2025-05-28 22:24:01.500352
3c7fdaac-98fc-4ecd-bd2e-86f73f06ddba	24a3c406-f6d1-452b-b8db-cbd85b6578f1	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Recomendo	Ótimo custo-benefício. Estou muito satisfeito.	t	20	2025-05-28 22:24:01.500528	2025-05-28 22:24:01.500528
9d5fe749-76c1-426d-a80c-e3ab80b94e93	24a3c406-f6d1-452b-b8db-cbd85b6578f1	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Ótima compra	Produto original, chegou antes do prazo. Vendedor confiável.	t	18	2025-05-28 22:24:01.500706	2025-05-28 22:24:01.500706
5664331f-0509-43ab-8ff0-d61592eb2b8c	24a3c406-f6d1-452b-b8db-cbd85b6578f1	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	5	Superou expectativas	Qualidade premium, vale cada centavo investido.	t	15	2025-05-28 22:24:01.500887	2025-05-28 22:24:01.500887
c8916806-cb38-4be9-9d2e-f6fe35d31b72	24a3c406-f6d1-452b-b8db-cbd85b6578f1	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Produto de qualidade	Comprei e não me arrependi. Produto top!	t	0	2025-05-28 22:24:01.501078	2025-05-28 22:24:01.501078
4f32c967-de43-41e2-81ae-1549b2419a9e	24a3c406-f6d1-452b-b8db-cbd85b6578f1	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	4	Vale a pena	Entrega rápida, produto conforme anunciado.	t	20	2025-05-28 22:24:01.501263	2025-05-28 22:24:01.501263
cd1689fe-b99e-4ac5-b920-84054c380be2	24a3c406-f6d1-452b-b8db-cbd85b6578f1	d30f9321-21d7-4bb6-9a9a-21936167fc2d	\N	3	Excelente produto!	Produto chegou rápido e bem embalado. Qualidade excelente!	t	4	2025-05-28 22:24:01.501436	2025-05-28 22:24:01.501436
\.


--
-- Data for Name: sellers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sellers (id, user_id, company_name, company_document, description, logo_url, banner_url, is_verified, is_active, rating_average, rating_count, total_sales, created_at, updated_at) FROM stdin;
0c882099-6a71-4f35-88b3-a467322be13b	27524622-6345-4801-be54-81254dc0f48c	Loja Exemplo	12345678000190	A melhor loja de produtos eletrônicos do marketplace	\N	\N	f	t	3.96	28	343	2025-05-28 22:24:01.232885	2025-05-28 22:24:01.232885
efa2d07d-8a24-47c0-b402-39f8f26f478c	6e9960d7-76d6-461f-aaa4-c6a94720d8cf	Tech Store Premium	23456789000101	Especializada em produtos de tecnologia de ponta	\N	\N	t	t	4.06	32	415	2025-05-28 22:24:01.317811	2025-05-28 22:24:01.317811
044c014e-dd44-4f7d-906a-b88eac634358	3fdff0bb-156d-4c80-9f01-9eea43fb4f60	Game Zone Brasil	34567890000102	A maior loja de games do Brasil	\N	\N	t	t	3.97	32	299	2025-05-28 22:24:01.320326	2025-05-28 22:24:01.320326
0dfda12b-7031-461f-80c2-51ff1969297a	553c8273-9310-4c2b-8ae5-06559e767d2d	Smart Shop Electronics	45678901000103	Smartphones e acessórios com garantia estendida	\N	\N	t	t	3.90	31	203	2025-05-28 22:24:01.322027	2025-05-28 22:24:01.322027
c5583a76-92f0-4464-bf9a-8f624ce32f5d	14d931f1-6cbf-4198-a37b-81d1f9761dbd	Mega Store Variedades	56789012000104	Tudo em eletrônicos e informática	\N	\N	t	t	3.97	31	242	2025-05-28 22:24:01.32362	2025-05-28 22:24:01.32362
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: shipping_methods; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shipping_methods (id, name, code, carrier, is_active, min_days, max_days, created_at) FROM stdin;
3d9f4757-acb8-4e98-97ea-9bd4a0114987	Correios PAC	correios_pac	Correios	t	5	10	2025-05-28 22:13:11.635934
f5aa6241-865c-4c07-ad1c-fab4fac965cf	Correios SEDEX	correios_sedex	Correios	t	1	3	2025-05-28 22:13:11.637997
e23e7799-f06b-4329-8f21-cf95526d0a5e	Transportadora	transportadora	Genérica	t	3	7	2025-05-28 22:13:11.638988
bc601c2f-5734-450a-a37e-77fba73e4e94	Retirada na Loja	retirada	\N	t	0	0	2025-05-28 22:13:11.639699
\.


--
-- Data for Name: shipping_zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shipping_zones (id, name, shipping_method_id, regions, price, free_above, created_at) FROM stdin;
0b110b67-de00-4e6d-b479-f7d69ff00f92	São Paulo Capital	3d9f4757-acb8-4e98-97ea-9bd4a0114987	{SP}	15.00	299.00	2025-05-28 22:13:11.640405
f5f442cd-a277-4fb9-b1f9-819d92836d45	Grande São Paulo	3d9f4757-acb8-4e98-97ea-9bd4a0114987	{SP-GRU}	20.00	299.00	2025-05-28 22:13:11.643095
a09c4f76-d7f7-4d9f-94a7-fc1f3229c329	Sudeste	3d9f4757-acb8-4e98-97ea-9bd4a0114987	{SP,RJ,MG,ES}	25.00	299.00	2025-05-28 22:13:11.643967
4e91d48d-7c14-41dc-9e8c-b69e4eeb2ddd	Sul	3d9f4757-acb8-4e98-97ea-9bd4a0114987	{PR,SC,RS}	30.00	299.00	2025-05-28 22:13:11.644626
c57bdacf-4d9b-4b40-a6c7-81337d3f83df	Brasil	3d9f4757-acb8-4e98-97ea-9bd4a0114987	{BR}	40.00	299.00	2025-05-28 22:13:11.645279
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, key, value, type, description, is_public, created_at, updated_at) FROM stdin;
0ee8e67e-ada2-40c5-b8a6-28362d9bb902	site_name	Marketplace GDG	string	Nome do site	t	2025-05-28 22:13:11.645858	2025-05-28 22:13:11.645858
cfcaab4d-bf70-4976-89d1-230cc5fa10cb	site_description	O melhor marketplace do Brasil	string	Descrição do site	t	2025-05-28 22:13:11.647226	2025-05-28 22:13:11.647226
93d5b1ff-24ff-47a7-b79d-072822112472	currency	BRL	string	Moeda padrão	t	2025-05-28 22:13:11.647871	2025-05-28 22:13:11.647871
afbf304c-81b5-49d2-8763-c5265b36329b	min_order_value	10.00	number	Valor mínimo do pedido	t	2025-05-28 22:13:11.648486	2025-05-28 22:13:11.648486
8dbeb7e1-1834-408c-b3a7-c0b530054d6a	max_cart_items	50	number	Máximo de itens no carrinho	t	2025-05-28 22:13:11.649032	2025-05-28 22:13:11.649032
f8c25ab2-646a-48f7-9e01-f84a9b8d3d34	commission_rate	10	number	Taxa de comissão (%)	f	2025-05-28 22:13:11.649429	2025-05-28 22:13:11.649429
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, password_hash, role, is_active, email_verified, phone, avatar_url, last_login_at, created_at, updated_at) FROM stdin;
907a427e-9195-4ddc-b883-0da04fbfa82b	admin@marketplace.com	Admin User	ac584ea75db49e8c0507a42007b7a5a8:aaef0878e3767b22585b540e66fb9dbf5810fced66203b626f216613744bdbf7f9118bae054d5660f21835c293545e8d2d86e55fc78e2807b38175af32b99b10	admin	t	f	\N	\N	\N	2025-05-28 22:24:01.225311	2025-05-28 22:24:01.225311
27524622-6345-4801-be54-81254dc0f48c	vendedor@marketplace.com	Vendedor Teste	1812cf38d0aafff5404797fa95b88680:5d2b71acb1bf6f0af4d4b516b9916a5c10b06c3a3b768002ad05d6fba671d83f4583597644ed92bb17fdd65b08e90f71402c000cabfe175dd329b3d1192b217d	seller	t	f	\N	\N	\N	2025-05-28 22:24:01.230759	2025-05-28 22:24:01.230759
d30f9321-21d7-4bb6-9a9a-21936167fc2d	cliente@marketplace.com	Cliente Teste	f5d2ed03d0870f23f0c96e53c687bb93:ebe62e784f2f5e13ef4f67fcd54f9c689c910fb54f85897d06d72a42a1d93b5e42d861c4e0e006dd7141a98be013a18fa108bc73e14080aa584d199dbd6ea49d	customer	t	f	\N	\N	\N	2025-05-28 22:24:01.231995	2025-05-28 22:24:01.231995
6e9960d7-76d6-461f-aaa4-c6a94720d8cf	techstore@marketplace.com	Tech Store Manager	92c50b1e46124a16c110c7643b6de40c:04f3911403c359afbb360b57ec90921f6cf9e413f5328fcb9381ad72caf50ad1b8ae8a7ce84b5807924fcc024f4ad5c9c4005f1e25a15fd64d23079b8a15a7e7	seller	t	f	\N	\N	\N	2025-05-28 22:24:01.316289	2025-05-28 22:24:01.316289
3fdff0bb-156d-4c80-9f01-9eea43fb4f60	gamezone@marketplace.com	Game Zone Manager	5ffbdfabc23803cbeae8373b0c948ab8:31edcca0b40d7530c3e87f95779a50ecbfb65380c7e7771d303c8d8bdb9a00b35abfa90b473b36a415608fbef3671e5290effe5a3364bb3533b57740e23790ab	seller	t	f	\N	\N	\N	2025-05-28 22:24:01.319552	2025-05-28 22:24:01.319552
553c8273-9310-4c2b-8ae5-06559e767d2d	smartshop@marketplace.com	Smart Shop Manager	3c24ebc2b4c80123f82200736ec36e63:1c2e4f9c3336c7677f9eaff200e9ca9705fd4ede15ebb2eef3a3b4bd7d186b7eebe483c4282253b11125674c866a0076200d0d75bae6231a7435d884583a4157	seller	t	f	\N	\N	\N	2025-05-28 22:24:01.321438	2025-05-28 22:24:01.321438
14d931f1-6cbf-4198-a37b-81d1f9761dbd	megastore@marketplace.com	Mega Store Manager	4f7f4c39742ce2d433a8e6c2be35e708:2135b31ffc1a6780cea7ad4c82075b5798e2a9d4979f0fe432c5ab46c9cbb641720d39d64d5518ea2ee1d4acd9aa128bf62ca356f3a82ebea5c80eb5898a8d55	seller	t	f	\N	\N	\N	2025-05-28 22:24:01.322999	2025-05-28 22:24:01.322999
\.


--
-- Data for Name: variant_option_values; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.variant_option_values (id, variant_id, option_value_id, created_at) FROM stdin;
7ac56f1a-43c9-4ad8-a07a-8cd7cd64e7a5	6b2f2e16-1324-412f-8556-cbecd3edcb17	b16d109d-14ef-44e8-8b23-4bd2d2bf3d70	2025-05-28 22:24:01.340793
8fdca29c-d3c0-4d78-991a-33b078fa1e80	af5a7a60-3ef3-4a7b-b85f-9fd7f5ac17e9	bd779483-1148-4d9d-9c3f-58451f19ed54	2025-05-28 22:24:01.343843
8f682186-6125-4628-86f0-30da0d77ac20	692aad03-76df-4561-ad69-2b7b52149c28	51bd30b6-d0a2-421e-9398-65fca35b4c44	2025-05-28 22:24:01.344956
9670c88a-b868-4bf9-a182-f456f0977d12	5a3dabad-fa5a-4e63-a358-d94ac28e5255	2ca28b85-f7f4-4bc8-b3da-4160e63999b9	2025-05-28 22:24:01.346332
2f3041b0-bc6e-4e36-a034-2429aee02f9b	4f273d76-cea2-4716-a646-ece9a9352bdc	1e51a0d7-6e95-4fbf-9c65-bb8dd7f76dc0	2025-05-28 22:24:01.349664
09f07686-876a-4907-ad8d-e36c588bc5bf	b6253620-584c-4902-975f-4d90909511b3	bc003d1f-fd9a-42ee-af58-66a4727695d0	2025-05-28 22:24:01.350699
020fd0a5-73a7-46e4-8fdc-81fb3e24372d	e1631755-1af2-4f26-8973-392965f63a73	81b8403f-16bf-46ba-ba82-b49d5f636a1b	2025-05-28 22:24:01.351632
75e70177-5c3e-4c12-a9c9-80be20573f14	951d364e-bbd4-4f04-9bca-707bc718fce0	0a8c3ac4-addb-4582-a0f4-f39e25830e40	2025-05-28 22:24:01.364616
bf0f7a0f-c78f-48ed-bfb2-015819638fdb	3bcc80e4-4e90-4b44-9910-3a3db5a29f3e	ebb27aa0-63df-49fa-97f0-3ba3296273ad	2025-05-28 22:24:01.365413
ee54f74a-f098-4cfc-acfc-ea98964cc797	9969b213-34b9-4343-9965-fe8155aace64	430bae21-c391-4f87-8508-55da4e8ceb79	2025-05-28 22:24:01.366256
eec37229-7dfd-4cb2-a285-268c6dd5923e	598d1d3d-653e-4995-9f31-453e521b61cd	773ee6d2-35df-4977-8de4-f35b68af77c0	2025-05-28 22:24:01.373857
9419a6c8-ecb8-410f-a9df-117cf4de6361	e9e36d75-6f61-46a5-aa59-7223a9c67371	2c2bdadf-9a10-4ae8-8ca0-ed0a59883560	2025-05-28 22:24:01.3745
32844c9f-7e0c-4159-b7c5-9d2b7c56f3c2	608cc327-e5c5-4530-a7f4-efc1794d8ddc	5561cca1-6857-443c-840a-3b6a7f11c07a	2025-05-28 22:24:01.375163
9ebfdfd6-b8d1-4c54-853b-fae20346a8d3	c196e8b6-c0d8-4d23-856f-7f9ad6d9f058	d5fdd0db-5c2e-436e-bb8c-08660ef31df8	2025-05-28 22:24:01.380742
be697761-d2a8-4efa-a501-f0cff24ae1fc	f5099e46-5723-4b32-9f27-537b84986c6a	5a072bb5-2e2f-4fe3-b48e-b1b2b809c798	2025-05-28 22:24:01.381359
c062c54c-0475-4a62-a19e-19551fba0f0b	00b2e28e-cd72-4c76-b0a1-3c481994eed9	1c6dc116-b214-4360-a978-564f2ec340c7	2025-05-28 22:24:01.386296
e344ded1-acb1-4c88-92f8-b8a53463ac18	749f88d2-27cc-4e79-bf1e-bb5f3e5ffd5e	8b9a6aa5-718b-4512-be3f-8861d7a2a9e8	2025-05-28 22:24:01.386865
d6e22843-b6c9-4806-a6d6-af722fe02c0f	9992296e-8a26-4c0f-beed-d6dee2777f21	da2fa701-843c-4911-aa9a-8c0bcdc69b09	2025-05-28 22:24:01.394012
0461e6bc-500b-4af1-a8c6-dabfeac0e577	92dd6ea6-35d4-42d9-9bbe-b88fdc969a94	28452e20-892e-4ed4-ad35-a52e48140fb0	2025-05-28 22:24:01.394579
95ba316f-04b0-4087-8078-09b62fc78bab	aeee7d44-b1cc-4593-b622-b7e9b68ba4ca	67c37725-ce59-4dba-b9ca-7d1ca607f271	2025-05-28 22:24:01.395235
53d591a0-7fbb-434e-bcb3-b4b83247897f	ee2fc9e2-ec0a-41df-92df-415e9fbe5d44	12d0b156-c870-4d71-b8d3-6f642232d44d	2025-05-28 22:24:01.40195
283d4aff-4b7c-41b0-ab9b-bbf4b0718113	2e69f8bb-19b6-4e7b-9c34-17f50680aed9	14faaac4-a6d0-4152-834d-5af3ba70c044	2025-05-28 22:24:01.402627
d5eca1fd-79c8-42b7-a233-e427bf112e8f	57b6f77b-3825-4fd6-820d-043c61678f64	76a6f86e-d615-4db1-9920-45e90c5ac712	2025-05-28 22:24:01.408582
75bfe6a6-afec-4342-a3c5-98cc7895078d	feba1886-03d6-4c68-bb1f-d77cd4f1c3df	9108ca43-391c-44a3-abc4-b78fd0aca551	2025-05-28 22:24:01.409108
46de23d9-6b18-420d-ae15-e5b91f6f9a63	c7f97725-8514-4416-a6a6-853ddb12e848	c10525fa-b69f-4e82-8e92-ac23edebbc00	2025-05-28 22:24:01.409641
4fd6f956-dae5-4271-8400-9a5795344f09	570edae2-aa37-4873-8334-6ab22821cb93	d869f95b-444c-4887-b190-4d2cb588955c	2025-05-28 22:24:01.415475
d500dd3b-39ee-4c29-af12-01445146e38e	1d68aa4b-4160-4c18-9802-1aeb8bdd0dfe	87b4cf61-b447-4688-b047-45d6c92068f1	2025-05-28 22:24:01.416224
b59727ea-0cca-4ace-b730-3096357b349d	b7f222b6-27db-42bc-9c0b-8f064badf1ba	56c67d21-c301-4f49-98ff-97bb0096347e	2025-05-28 22:24:01.420774
0f762118-17b0-48bf-9928-0e01e2a7e2e2	301c65e0-e40b-4d78-9902-b67f6c64416f	1b31f45c-69ba-4399-b3b7-d4a34daf31b9	2025-05-28 22:24:01.421542
993347e2-1234-4be2-b8fc-3c937f60ce88	bc3fbd8e-8759-48f8-b879-7132b052180b	013ee3a6-e8f3-4c23-888f-96bbb68d1ece	2025-05-28 22:24:01.426922
5969151d-8f9d-404c-82f9-8f393e56c3e5	53c72c1d-eb37-4bd6-9722-f07bb5c9285d	cbaa4e8f-8a7a-4b67-875c-19f1d89c44b5	2025-05-28 22:24:01.427514
6225a5aa-0848-41b1-b3ea-257e3e225f23	22440a7f-9cd6-423c-9b82-07830d000ef4	3733f7c9-000c-4409-9b8c-60548833d957	2025-05-28 22:24:01.428055
e5560aa4-e807-4dac-82bd-d45faf313542	14a15692-684b-4d73-b291-89021bb28494	b2b1b55c-be54-4483-8228-4245e39a64d9	2025-05-28 22:24:01.433408
cb712452-f0a2-4f57-81ce-86d82155053f	62098ea8-30f5-4fb7-8e67-cb6c4758afcf	1fc4fcaf-2cf8-47c2-a6e5-1e428d33b506	2025-05-28 22:24:01.433874
e35685f6-3ac8-43ed-b01e-38a43abde81e	74f5790c-58cc-47bb-b36e-c6ef55d6fd8b	0e8bc397-b78c-4cd9-99ae-df98ccd4f39c	2025-05-28 22:24:01.438069
873f2a48-ee5f-405b-97ed-5c4b132924fa	eb37af77-bdce-42d5-b81f-d9ab32160ea1	f5ed3bf5-36a2-4c6d-aa6d-ed3c3b6b6162	2025-05-28 22:24:01.438652
cf72e785-45c9-4f60-bfd6-fca5625a1c71	afd8dc6e-a62d-42af-aede-35a024c67bc2	8e6c6023-f259-4564-9741-de03bc2df2f1	2025-05-28 22:24:01.439044
daaba5b9-2b87-4916-99e2-1ee810cc1f49	b2c7072a-b9dd-4ad5-96a8-99e4bae78787	874ef3b0-db16-4728-956e-6b358ac9c9ed	2025-05-28 22:24:01.442854
c7855ef9-7252-4bfa-88e0-13153eb5d1bc	5bea41d2-5104-46ef-8bc7-a2c1418b3b7b	f1b1f63c-8d58-4a73-b631-902a11cfd07c	2025-05-28 22:24:01.443257
ee0ffafd-ef12-4f3d-86be-3ec86f48dca1	deeec748-32bd-4ae7-850b-bb9e2e7417b0	d74f8f63-21a8-4936-9f3f-a0ea0daa5bbd	2025-05-28 22:24:01.443663
6b2fd6bf-8dab-4a86-b0d1-e2a39c4f8b09	fb56e313-43f0-4876-ab99-9aa911a6204b	8f8dc01d-3fa2-4e77-a4d3-a27b3257a9a0	2025-05-28 22:24:01.447759
a3ab677d-037a-41ed-9e7f-03fe56ddf0e2	2550d660-8fef-4f8a-a968-61fe64955fe1	7c00ac1d-85ca-4193-a1ee-42decf0ec862	2025-05-28 22:24:01.448406
b2ab862b-18d3-48ea-9fe2-51a0c5207a41	719fe7e6-e928-4e82-bcf5-b0d4e0e33372	5c323210-a286-4391-8fe3-af7a343add7c	2025-05-28 22:24:01.449015
44d2424b-837c-4d2c-96d1-03ed5aa038b6	ac9dc2ee-42a4-40ef-884e-ac96440f6405	99962a5a-3fd5-49b8-aaed-639446e7121e	2025-05-28 22:24:01.45442
5ef8651c-0810-4415-b660-b0814b597f08	802047bd-8da3-45bc-8d7c-7b505ed48f45	600b642e-f6bd-41a6-9ea2-6503c84b04b1	2025-05-28 22:24:01.45481
dcedf710-a6df-478b-adad-9b70d1111d53	748e9dd7-e34d-4d19-8962-f9a096c0cbdf	6fc51181-9420-42fd-8188-ffb8940c5e78	2025-05-28 22:24:01.459167
6eb55e1f-6b55-4387-8d34-c766b61bd8c8	e5a4d2db-2f99-4324-b336-7fd99791d3d0	184c1016-3501-434b-b6cf-6b9af74c441d	2025-05-28 22:24:01.459554
87e8c98e-45de-4f1f-a334-34dca4956a52	36a89761-6b38-4480-812c-894542c268b1	b168aff7-f3e9-48e4-af86-2703e4742ef3	2025-05-28 22:24:01.463795
4b7bace1-eb04-4b80-b1bf-c832fee6172b	342a5f75-f2da-4cf4-b2b7-304963247197	8f4d24be-edbc-43a7-a524-c457eccad0a6	2025-05-28 22:24:01.464203
2beabd6c-46f8-42f1-9008-113bb860295e	fe7f9f87-fe56-4c83-b3e3-16dbba52af08	ffe44abd-32ee-477f-b6dc-05ba59bd8010	2025-05-28 22:24:01.464841
4647aa25-dcea-43fb-96b3-fe7c01cf0ce9	2ef762d1-eea3-4b9c-8d1b-40f278821ead	1bfdec47-e5fb-477a-ac49-feda454556da	2025-05-28 22:24:01.469045
a52b98da-a7fa-4177-95dd-1dfa6ce23c4a	326fe5b7-cdf3-4399-9cf0-6490b7f3fd76	4d333e88-5442-4a77-b04b-1b954006ba1b	2025-05-28 22:24:01.469395
8dffde3e-3229-4422-ad5f-023146f90959	6fe1606c-314a-4b0c-83ee-22a4482798ed	71eb4afd-b3df-4d79-9b29-8b41ec93b8c0	2025-05-28 22:24:01.472822
d7683438-00f9-4eeb-86d5-5e79f8d704b3	e0617878-62e3-44d0-845a-0902c8dd75bc	568f9004-4c78-4ed5-815d-36bd65b779f0	2025-05-28 22:24:01.473267
0ee1abd7-6d95-4a0d-b5cb-0596127e397a	17a3562d-8420-42f0-bb57-4d76ccbc5b33	d187b5ce-3b07-4c89-837f-deef071e227c	2025-05-28 22:24:01.473616
6c4119d6-d385-472a-9b47-8344c7fd20f6	54d6ec7d-3926-4760-8046-8ffbca22e8ea	6d5b4485-5270-471b-9b9b-e5837cc23428	2025-05-28 22:24:01.477705
3babb483-ccaa-493b-8944-1658c30888f9	5ed3bd79-4777-4b0e-8ce0-5ad46968aaae	b727a016-2a77-4d2e-ba3f-ec5382ddfea1	2025-05-28 22:24:01.478181
6459c0dd-293c-408e-8d83-96cba6383275	0f3fc934-b8fd-47fc-8115-fee7ff819a81	14458428-0884-4fc8-847b-a51ce139aecc	2025-05-28 22:24:01.481659
b4411e6a-5007-48df-bf9a-29dd5503d786	5345f5a0-8a2b-4942-b215-70282aabd3fb	bec26eae-249e-4c8d-bede-c96385d99810	2025-05-28 22:24:01.482389
eb753661-cd95-4267-a211-c98cd4b076ec	b7951dd1-283b-4102-8621-e4f2e44deb1f	558f0b37-5683-49af-b243-286c39da24b2	2025-05-28 22:24:01.484224
8b6bc3c5-6a85-4210-94bc-321935a5549e	5306d71d-2c31-45a1-8ca4-507f2ad03d50	f59ac38e-7fe1-4ca6-b0d3-b5e4df3eefe5	2025-05-28 22:24:01.484663
4d2aaf7a-7e34-417c-8746-1e26b1b36d9d	f17063d7-2877-4053-b62b-978c412f200a	03923f4c-c7b2-4a5b-9861-5bbb74fb7f41	2025-05-28 22:24:01.485064
e4bb4e52-9c90-4e7d-9e28-fd74094dbc20	9e19e890-ef20-47d1-9596-d2a7efaabae6	772dbe43-1a66-4b39-bbd9-0e0c01bb4fe6	2025-05-28 22:24:01.493766
3ed2bf37-bc73-425b-9a83-a1ec894e50a7	7a92e153-0c45-477c-87d9-2d35b48bdb9d	ffbd4409-a639-4346-9a39-feaff969d4bb	2025-05-28 22:24:01.4942
3a2dee9e-aff4-4559-b5b0-019f5f2256b4	70c5f0b5-13da-4ca4-9476-31712309a285	6b998d9c-1de1-47d5-b373-ebff344f4b88	2025-05-28 22:24:01.494568
60191a38-f766-48b2-84c6-6801ec9ae50b	b0e939eb-02ce-444d-8be4-6c23a67efded	70eb58f5-b3f9-442a-9330-21e089d5be5b	2025-05-28 22:24:01.498576
29e3f21c-f30a-42a0-bb55-564d4ed2ecbc	09a407c7-3db2-4142-902d-f0a73bd831fd	254cff59-d00e-4eb1-a2cf-a984f3ff0bb9	2025-05-28 22:24:01.499375
\.


--
-- Data for Name: wishlists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wishlists (id, user_id, product_id, created_at) FROM stdin;
\.


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
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


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
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


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
-- Name: shipping_methods shipping_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_code_key UNIQUE (code);


--
-- Name: shipping_methods shipping_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_pkey PRIMARY KEY (id);


--
-- Name: shipping_zones shipping_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_pkey PRIMARY KEY (id);


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
-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_featured ON public.products USING btree (featured) WHERE (featured = true);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('portuguese'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_products_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_seller ON public.products USING btree (seller_id);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user ON public.reviews USING btree (user_id);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


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
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


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
-- Name: shipping_zones shipping_zones_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id) ON DELETE CASCADE;


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

