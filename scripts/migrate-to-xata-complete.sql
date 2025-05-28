-- Script completo para migrar tabelas existentes para estrutura compatível com Xata ORM
-- Execute este script no SQL Editor do Xata
-- IMPORTANTE: Execute cada seção separadamente

-- ========================================
-- PARTE 1: BACKUP DAS TABELAS EXISTENTES
-- ========================================
-- Execute cada ALTER TABLE individualmente se necessário

ALTER TABLE products RENAME TO products_old;
ALTER TABLE categories RENAME TO categories_old;
ALTER TABLE brands RENAME TO brands_old;
ALTER TABLE product_images RENAME TO product_images_old;
ALTER TABLE sellers RENAME TO sellers_old;
ALTER TABLE users RENAME TO users_old;
ALTER TABLE addresses RENAME TO addresses_old;
ALTER TABLE orders RENAME TO orders_old;
ALTER TABLE order_items RENAME TO order_items_old;
ALTER TABLE cart_items RENAME TO cart_items_old;
ALTER TABLE abandoned_carts RENAME TO abandoned_carts_old;
ALTER TABLE wishlists RENAME TO wishlists_old;
ALTER TABLE product_reviews RENAME TO product_reviews_old;
ALTER TABLE product_variants RENAME TO product_variants_old;
ALTER TABLE product_options RENAME TO product_options_old;
ALTER TABLE product_option_values RENAME TO product_option_values_old;
ALTER TABLE variant_option_values RENAME TO variant_option_values_old;
ALTER TABLE coupons RENAME TO coupons_old;
ALTER TABLE coupon_usage RENAME TO coupon_usage_old;
ALTER TABLE payment_methods RENAME TO payment_methods_old;
ALTER TABLE payment_transactions RENAME TO payment_transactions_old;
ALTER TABLE shipping_methods RENAME TO shipping_methods_old;
ALTER TABLE shipping_zones RENAME TO shipping_zones_old;
ALTER TABLE notifications RENAME TO notifications_old;
ALTER TABLE notification_preferences RENAME TO notification_preferences_old;
ALTER TABLE user_sessions RENAME TO user_sessions_old;
ALTER TABLE product_analytics RENAME TO product_analytics_old;
ALTER TABLE product_price_history RENAME TO product_price_history_old;
ALTER TABLE system_settings RENAME TO system_settings_old;

-- ========================================
-- PARTE 2: CRIAR TABELAS COMPATÍVEIS COM XATA
-- ========================================

-- Tabela Users (criar primeiro por causa das foreign keys)
CREATE TABLE users (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Brands
CREATE TABLE brands (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Categories
CREATE TABLE categories (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id UUID,
    path TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Sellers
CREATE TABLE sellers (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    rating DECIMAL(3,2),
    total_sales INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Products
CREATE TABLE products (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    brand_id UUID REFERENCES brands(id),
    category_id UUID REFERENCES categories(id),
    seller_id UUID REFERENCES sellers(id),
    status TEXT NOT NULL DEFAULT 'active',
    is_active BOOLEAN NOT NULL DEFAULT true,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    currency TEXT NOT NULL DEFAULT 'BRL',
    quantity INTEGER NOT NULL DEFAULT 0,
    stock_location TEXT,
    track_inventory BOOLEAN NOT NULL DEFAULT true,
    allow_backorder BOOLEAN NOT NULL DEFAULT false,
    weight DECIMAL(10,3),
    height DECIMAL(10,2),
    width DECIMAL(10,2),
    length DECIMAL(10,2),
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    tags TEXT[],
    attributes JSONB DEFAULT '{}'::jsonb,
    specifications JSONB DEFAULT '{}'::jsonb,
    view_count INTEGER NOT NULL DEFAULT 0,
    sales_count INTEGER NOT NULL DEFAULT 0,
    rating_average DECIMAL(3,2),
    rating_count INTEGER NOT NULL DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    barcode TEXT,
    featuring JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Product Images
CREATE TABLE product_images (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Addresses
CREATE TABLE addresses (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL DEFAULT 'shipping',
    is_default BOOLEAN DEFAULT false,
    name TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'BR',
    postal_code TEXT NOT NULL,
    phone TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Orders
CREATE TABLE orders (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID REFERENCES sellers(id),
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    shipping_status TEXT NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    shipping_address_id UUID REFERENCES addresses(id),
    billing_address_id UUID REFERENCES addresses(id),
    payment_method_id UUID,
    shipping_method_id UUID,
    coupon_id UUID,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Order Items
CREATE TABLE order_items (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID,
    seller_id UUID REFERENCES sellers(id),
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Cart Items
CREATE TABLE cart_items (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Abandoned Carts
CREATE TABLE abandoned_carts (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id TEXT,
    email TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount DECIMAL(10,2) NOT NULL,
    recovery_token TEXT UNIQUE,
    recovered BOOLEAN DEFAULT false,
    recovered_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Wishlists
CREATE TABLE wishlists (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Product Reviews
CREATE TABLE product_reviews (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    pros TEXT,
    cons TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    images TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Product Variants
CREATE TABLE product_variants (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    quantity INTEGER NOT NULL DEFAULT 0,
    weight DECIMAL(10,3),
    is_active BOOLEAN NOT NULL DEFAULT true,
    position INTEGER DEFAULT 0,
    images TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Product Options
CREATE TABLE product_options (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'select',
    position INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Product Option Values
CREATE TABLE product_option_values (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Variant Option Values
CREATE TABLE variant_option_values (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES product_options(id),
    option_value_id UUID NOT NULL REFERENCES product_option_values(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Coupons
CREATE TABLE coupons (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'percentage',
    value DECIMAL(10,2) NOT NULL,
    minimum_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    usage_limit_per_user INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    applicable_products TEXT[],
    applicable_categories TEXT[],
    excluded_products TEXT[],
    excluded_categories TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Coupon Usage
CREATE TABLE coupon_usage (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Payment Methods
CREATE TABLE payment_methods (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    last_four TEXT,
    brand TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    holder_name TEXT,
    is_default BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Payment Transactions
CREATE TABLE payment_transactions (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    gateway TEXT NOT NULL,
    gateway_transaction_id TEXT,
    gateway_response JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Shipping Methods
CREATE TABLE shipping_methods (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    provider TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_per_kg DECIMAL(10,2) DEFAULT 0,
    price_per_item DECIMAL(10,2) DEFAULT 0,
    free_shipping_threshold DECIMAL(10,2),
    estimated_days_min INTEGER,
    estimated_days_max INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Shipping Zones
CREATE TABLE shipping_zones (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    countries TEXT[],
    states TEXT[],
    cities TEXT[],
    postal_codes TEXT[],
    shipping_method_id UUID NOT NULL REFERENCES shipping_methods(id),
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Notifications
CREATE TABLE notifications (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Notification Preferences
CREATE TABLE notification_preferences (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    channel TEXT NOT NULL,
    type TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela User Sessions
CREATE TABLE user_sessions (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Product Analytics
CREATE TABLE product_analytics (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    add_to_cart_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Product Price History
CREATE TABLE product_price_history (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela System Settings
CREATE TABLE system_settings (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    group_name TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- ========================================
-- PARTE 3: MIGRAR DADOS DAS TABELAS ANTIGAS
-- ========================================

-- Migrar Users
INSERT INTO users (
    id, email, password_hash, name, role, is_active,
    phone, avatar_url, email_verified,
    created_at, updated_at, last_login_at,
    xata_createdat, xata_updatedat
)
SELECT 
    id, email, password_hash, name, role, is_active,
    phone, avatar_url, email_verified,
    created_at, updated_at, last_login_at,
    COALESCE(xata_createdat, created_at), 
    COALESCE(xata_updatedat, updated_at)
FROM users_old
ON CONFLICT (id) DO NOTHING;

-- Migrar Brands
INSERT INTO brands (
    id, name, slug, description, logo_url, website, is_active,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    id, name, slug, description, logo_url, website, is_active,
    created_at, updated_at,
    COALESCE(xata_createdat, created_at), 
    COALESCE(xata_updatedat, updated_at)
FROM brands_old
ON CONFLICT (id) DO NOTHING;

-- Migrar Categories
INSERT INTO categories (
    id, name, slug, description, image_url, parent_id, path, is_active, position,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    id, name, slug, description, image_url, parent_id, path, is_active, position,
    created_at, updated_at,
    COALESCE(xata_createdat, created_at), 
    COALESCE(xata_updatedat, updated_at)
FROM categories_old
ON CONFLICT (id) DO NOTHING;

-- Migrar Sellers
INSERT INTO sellers (
    id, user_id, company_name, slug, description, logo_url, is_active,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    s.id, s.user_id, s.company_name, s.slug, s.description, s.logo_url, s.is_active,
    s.created_at, s.updated_at,
    COALESCE(s.xata_createdat, s.created_at), 
    COALESCE(s.xata_updatedat, s.updated_at)
FROM sellers_old s
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = s.user_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Products
INSERT INTO products (
    id, sku, name, slug, description, brand_id, category_id, seller_id,
    status, is_active, price, original_price, cost, currency,
    quantity, stock_location, track_inventory, allow_backorder,
    weight, height, width, length,
    meta_title, meta_description, meta_keywords, tags,
    attributes, specifications,
    view_count, sales_count, rating_average, rating_count,
    featured, barcode, featuring,
    created_at, updated_at, published_at,
    xata_createdat, xata_updatedat
)
SELECT 
    p.id, p.sku, p.name, p.slug, p.description, p.brand_id, p.category_id, p.seller_id,
    p.status, p.is_active, p.price::decimal, p.original_price::decimal, p.cost::decimal, p.currency,
    p.quantity, p.stock_location, p.track_inventory, p.allow_backorder,
    p.weight::decimal, p.height::decimal, p.width::decimal, p.length::decimal,
    p.meta_title, p.meta_description, p.meta_keywords, p.tags,
    p.attributes, p.specifications,
    p.view_count, p.sales_count, p.rating_average::decimal, p.rating_count,
    p.featured, p.barcode, p.featuring,
    p.created_at, p.updated_at, p.published_at,
    COALESCE(p.xata_createdat, p.created_at), 
    COALESCE(p.xata_updatedat, p.updated_at)
FROM products_old p
WHERE (p.brand_id IS NULL OR EXISTS (SELECT 1 FROM brands WHERE brands.id = p.brand_id))
  AND (p.category_id IS NULL OR EXISTS (SELECT 1 FROM categories WHERE categories.id = p.category_id))
  AND (p.seller_id IS NULL OR EXISTS (SELECT 1 FROM sellers WHERE sellers.id = p.seller_id))
ON CONFLICT (id) DO NOTHING;

-- Migrar Product Images
INSERT INTO product_images (
    id, product_id, image_url, alt_text, display_order, is_primary,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    pi.id, pi.product_id, pi.image_url, pi.alt_text, pi.display_order, pi.is_primary,
    pi.created_at, pi.updated_at,
    COALESCE(pi.xata_createdat, pi.created_at), 
    COALESCE(pi.xata_updatedat, pi.updated_at)
FROM product_images_old pi
WHERE EXISTS (SELECT 1 FROM products WHERE products.id = pi.product_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Addresses
INSERT INTO addresses (
    id, user_id, type, is_default, name, street, number, complement,
    neighborhood, city, state, country, postal_code, phone, instructions,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    id, user_id, type, is_default, name, street, number, complement,
    neighborhood, city, state, country, postal_code, phone, instructions,
    created_at, updated_at,
    COALESCE(xata_createdat, created_at), 
    COALESCE(xata_updatedat, updated_at)
FROM addresses_old
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = addresses_old.user_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Orders
INSERT INTO orders (
    id, order_number, user_id, seller_id, status, payment_status, shipping_status,
    subtotal, discount_amount, shipping_amount, tax_amount, total_amount, currency,
    shipping_address_id, billing_address_id, payment_method_id, shipping_method_id,
    coupon_id, notes, metadata,
    created_at, updated_at, paid_at, shipped_at, delivered_at, cancelled_at,
    xata_createdat, xata_updatedat
)
SELECT 
    o.id, o.order_number, o.user_id, o.seller_id, o.status, o.payment_status, o.shipping_status,
    o.subtotal::decimal, o.discount_amount::decimal, o.shipping_amount::decimal, 
    o.tax_amount::decimal, o.total_amount::decimal, o.currency,
    o.shipping_address_id, o.billing_address_id, o.payment_method_id, o.shipping_method_id,
    o.coupon_id, o.notes, o.metadata,
    o.created_at, o.updated_at, o.paid_at, o.shipped_at, o.delivered_at, o.cancelled_at,
    COALESCE(o.xata_createdat, o.created_at), 
    COALESCE(o.xata_updatedat, o.updated_at)
FROM orders_old o
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = o.user_id)
  AND (o.seller_id IS NULL OR EXISTS (SELECT 1 FROM sellers WHERE sellers.id = o.seller_id))
  AND (o.shipping_address_id IS NULL OR EXISTS (SELECT 1 FROM addresses WHERE addresses.id = o.shipping_address_id))
  AND (o.billing_address_id IS NULL OR EXISTS (SELECT 1 FROM addresses WHERE addresses.id = o.billing_address_id))
ON CONFLICT (id) DO NOTHING;

-- Migrar Order Items
INSERT INTO order_items (
    id, order_id, product_id, variant_id, seller_id, sku, name,
    price, quantity, subtotal, discount_amount, tax_amount, total, metadata,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    oi.id, oi.order_id, oi.product_id, oi.variant_id, oi.seller_id, oi.sku, oi.name,
    oi.price::decimal, oi.quantity, oi.subtotal::decimal, oi.discount_amount::decimal,
    oi.tax_amount::decimal, oi.total::decimal, oi.metadata,
    oi.created_at, oi.updated_at,
    COALESCE(oi.xata_createdat, oi.created_at), 
    COALESCE(oi.xata_updatedat, oi.updated_at)
FROM order_items_old oi
WHERE EXISTS (SELECT 1 FROM orders WHERE orders.id = oi.order_id)
  AND EXISTS (SELECT 1 FROM products WHERE products.id = oi.product_id)
  AND (oi.seller_id IS NULL OR EXISTS (SELECT 1 FROM sellers WHERE sellers.id = oi.seller_id))
ON CONFLICT (id) DO NOTHING;

-- Migrar Cart Items
INSERT INTO cart_items (
    id, user_id, product_id, variant_id, quantity, price, metadata,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    ci.id, ci.user_id, ci.product_id, ci.variant_id, ci.quantity, ci.price::decimal, ci.metadata,
    ci.created_at, ci.updated_at,
    COALESCE(ci.xata_createdat, ci.created_at), 
    COALESCE(ci.xata_updatedat, ci.updated_at)
FROM cart_items_old ci
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = ci.user_id)
  AND EXISTS (SELECT 1 FROM products WHERE products.id = ci.product_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Abandoned Carts
INSERT INTO abandoned_carts (
    id, user_id, session_id, email, items, total_amount, recovery_token,
    recovered, recovered_at, reminder_sent_at,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    ac.id, ac.user_id, ac.session_id, ac.email, ac.items, ac.total_amount::decimal,
    ac.recovery_token, ac.recovered, ac.recovered_at, ac.reminder_sent_at,
    ac.created_at, ac.updated_at,
    COALESCE(ac.xata_createdat, ac.created_at), 
    COALESCE(ac.xata_updatedat, ac.updated_at)
FROM abandoned_carts_old ac
WHERE ac.user_id IS NULL OR EXISTS (SELECT 1 FROM users WHERE users.id = ac.user_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Wishlists
INSERT INTO wishlists (
    id, user_id, product_id, variant_id, notes,
    created_at,
    xata_createdat, xata_updatedat
)
SELECT 
    w.id, w.user_id, w.product_id, w.variant_id, w.notes,
    w.created_at,
    COALESCE(w.xata_createdat, w.created_at), 
    COALESCE(w.xata_updatedat, w.created_at)
FROM wishlists_old w
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = w.user_id)
  AND EXISTS (SELECT 1 FROM products WHERE products.id = w.product_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Product Reviews
INSERT INTO product_reviews (
    id, product_id, user_id, order_id, rating, title, comment,
    pros, cons, is_verified_purchase, is_featured, helpful_count,
    not_helpful_count, status, images,
    created_at, updated_at, published_at,
    xata_createdat, xata_updatedat
)
SELECT 
    pr.id, pr.product_id, pr.user_id, pr.order_id, pr.rating, pr.title, pr.comment,
    pr.pros, pr.cons, pr.is_verified_purchase, pr.is_featured, pr.helpful_count,
    pr.not_helpful_count, pr.status, pr.images,
    pr.created_at, pr.updated_at, pr.published_at,
    COALESCE(pr.xata_createdat, pr.created_at), 
    COALESCE(pr.xata_updatedat, pr.updated_at)
FROM product_reviews_old pr
WHERE EXISTS (SELECT 1 FROM products WHERE products.id = pr.product_id)
  AND EXISTS (SELECT 1 FROM users WHERE users.id = pr.user_id)
  AND (pr.order_id IS NULL OR EXISTS (SELECT 1 FROM orders WHERE orders.id = pr.order_id))
ON CONFLICT (id) DO NOTHING;

-- Migrar Product Variants
INSERT INTO product_variants (
    id, product_id, sku, name, price, original_price, cost,
    quantity, weight, is_active, position, images,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    pv.id, pv.product_id, pv.sku, pv.name, pv.price::decimal, pv.original_price::decimal,
    pv.cost::decimal, pv.quantity, pv.weight::decimal, pv.is_active, pv.position, pv.images,
    pv.created_at, pv.updated_at,
    COALESCE(pv.xata_createdat, pv.created_at), 
    COALESCE(pv.xata_updatedat, pv.updated_at)
FROM product_variants_old pv
WHERE EXISTS (SELECT 1 FROM products WHERE products.id = pv.product_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Product Options
INSERT INTO product_options (
    id, product_id, name, type, position, is_required,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    po.id, po.product_id, po.name, po.type, po.position, po.is_required,
    po.created_at, po.updated_at,
    COALESCE(po.xata_createdat, po.created_at), 
    COALESCE(po.xata_updatedat, po.updated_at)
FROM product_options_old po
WHERE EXISTS (SELECT 1 FROM products WHERE products.id = po.product_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Product Option Values
INSERT INTO product_option_values (
    id, option_id, value, price_adjustment, position,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    pov.id, pov.option_id, pov.value, pov.price_adjustment::decimal, pov.position,
    pov.created_at, pov.updated_at,
    COALESCE(pov.xata_createdat, pov.created_at), 
    COALESCE(pov.xata_updatedat, pov.updated_at)
FROM product_option_values_old pov
WHERE EXISTS (SELECT 1 FROM product_options WHERE product_options.id = pov.option_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Variant Option Values
INSERT INTO variant_option_values (
    id, variant_id, option_id, option_value_id,
    created_at,
    xata_createdat, xata_updatedat
)
SELECT 
    vov.id, vov.variant_id, vov.option_id, vov.option_value_id,
    vov.created_at,
    COALESCE(vov.xata_createdat, vov.created_at), 
    COALESCE(vov.xata_updatedat, vov.created_at)
FROM variant_option_values_old vov
WHERE EXISTS (SELECT 1 FROM product_variants WHERE product_variants.id = vov.variant_id)
  AND EXISTS (SELECT 1 FROM product_options WHERE product_options.id = vov.option_id)
  AND EXISTS (SELECT 1 FROM product_option_values WHERE product_option_values.id = vov.option_value_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Coupons
INSERT INTO coupons (
    id, code, description, type, value, minimum_amount, maximum_discount,
    usage_limit, usage_count, usage_limit_per_user, is_active,
    valid_from, valid_until, applicable_products, applicable_categories,
    excluded_products, excluded_categories, metadata,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    c.id, c.code, c.description, c.type, c.value::decimal, c.minimum_amount::decimal,
    c.maximum_discount::decimal, c.usage_limit, c.usage_count, c.usage_limit_per_user,
    c.is_active, c.valid_from, c.valid_until, c.applicable_products, c.applicable_categories,
    c.excluded_products, c.excluded_categories, c.metadata,
    c.created_at, c.updated_at,
    COALESCE(c.xata_createdat, c.created_at), 
    COALESCE(c.xata_updatedat, c.updated_at)
FROM coupons_old c
ON CONFLICT (id) DO NOTHING;

-- Migrar Coupon Usage
INSERT INTO coupon_usage (
    id, coupon_id, user_id, order_id, discount_amount,
    created_at,
    xata_createdat, xata_updatedat
)
SELECT 
    cu.id, cu.coupon_id, cu.user_id, cu.order_id, cu.discount_amount::decimal,
    cu.created_at,
    COALESCE(cu.xata_createdat, cu.created_at), 
    COALESCE(cu.xata_updatedat, cu.created_at)
FROM coupon_usage_old cu
WHERE EXISTS (SELECT 1 FROM coupons WHERE coupons.id = cu.coupon_id)
  AND EXISTS (SELECT 1 FROM users WHERE users.id = cu.user_id)
  AND (cu.order_id IS NULL OR EXISTS (SELECT 1 FROM orders WHERE orders.id = cu.order_id))
ON CONFLICT (id) DO NOTHING;

-- Migrar Payment Methods
INSERT INTO payment_methods (
    id, user_id, type, provider, last_four, brand,
    exp_month, exp_year, holder_name, is_default, metadata,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    pm.id, pm.user_id, pm.type, pm.provider, pm.last_four, pm.brand,
    pm.exp_month, pm.exp_year, pm.holder_name, pm.is_default, pm.metadata,
    pm.created_at, pm.updated_at,
    COALESCE(pm.xata_createdat, pm.created_at), 
    COALESCE(pm.xata_updatedat, pm.updated_at)
FROM payment_methods_old pm
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = pm.user_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Payment Transactions
INSERT INTO payment_transactions (
    id, order_id, payment_method_id, type, status, amount, currency,
    gateway, gateway_transaction_id, gateway_response, metadata,
    created_at, updated_at, processed_at,
    xata_createdat, xata_updatedat
)
SELECT 
    pt.id, pt.order_id, pt.payment_method_id, pt.type, pt.status,
    pt.amount::decimal, pt.currency, pt.gateway, pt.gateway_transaction_id,
    pt.gateway_response, pt.metadata,
    pt.created_at, pt.updated_at, pt.processed_at,
    COALESCE(pt.xata_createdat, pt.created_at), 
    COALESCE(pt.xata_updatedat, pt.updated_at)
FROM payment_transactions_old pt
WHERE EXISTS (SELECT 1 FROM orders WHERE orders.id = pt.order_id)
  AND (pt.payment_method_id IS NULL OR EXISTS (SELECT 1 FROM payment_methods WHERE payment_methods.id = pt.payment_method_id))
ON CONFLICT (id) DO NOTHING;

-- Migrar Shipping Methods
INSERT INTO shipping_methods (
    id, name, code, description, provider, is_active,
    base_price, price_per_kg, price_per_item, free_shipping_threshold,
    estimated_days_min, estimated_days_max, metadata,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    sm.id, sm.name, sm.code, sm.description, sm.provider, sm.is_active,
    sm.base_price::decimal, sm.price_per_kg::decimal, sm.price_per_item::decimal,
    sm.free_shipping_threshold::decimal, sm.estimated_days_min, sm.estimated_days_max,
    sm.metadata,
    sm.created_at, sm.updated_at,
    COALESCE(sm.xata_createdat, sm.created_at), 
    COALESCE(sm.xata_updatedat, sm.updated_at)
FROM shipping_methods_old sm
ON CONFLICT (id) DO NOTHING;

-- Migrar Shipping Zones
INSERT INTO shipping_zones (
    id, name, countries, states, cities, postal_codes,
    shipping_method_id, price_adjustment, is_active,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    sz.id, sz.name, sz.countries, sz.states, sz.cities, sz.postal_codes,
    sz.shipping_method_id, sz.price_adjustment::decimal, sz.is_active,
    sz.created_at, sz.updated_at,
    COALESCE(sz.xata_createdat, sz.created_at), 
    COALESCE(sz.xata_updatedat, sz.updated_at)
FROM shipping_zones_old sz
WHERE EXISTS (SELECT 1 FROM shipping_methods WHERE shipping_methods.id = sz.shipping_method_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Notifications
INSERT INTO notifications (
    id, user_id, type, title, message, data, read, read_at,
    created_at,
    xata_createdat, xata_updatedat
)
SELECT 
    n.id, n.user_id, n.type, n.title, n.message, n.data, n.read, n.read_at,
    n.created_at,
    COALESCE(n.xata_createdat, n.created_at), 
    COALESCE(n.xata_updatedat, n.created_at)
FROM notifications_old n
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = n.user_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Notification Preferences
INSERT INTO notification_preferences (
    id, user_id, channel, type, enabled,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    np.id, np.user_id, np.channel, np.type, np.enabled,
    np.created_at, np.updated_at,
    COALESCE(np.xata_createdat, np.created_at), 
    COALESCE(np.xata_updatedat, np.updated_at)
FROM notification_preferences_old np
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = np.user_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar User Sessions
INSERT INTO user_sessions (
    id, user_id, token, ip_address, user_agent, expires_at,
    created_at, last_activity_at,
    xata_createdat, xata_updatedat
)
SELECT 
    us.id, us.user_id, us.token, us.ip_address, us.user_agent, us.expires_at,
    us.created_at, us.last_activity_at,
    COALESCE(us.xata_createdat, us.created_at), 
    COALESCE(us.xata_updatedat, us.last_activity_at)
FROM user_sessions_old us
WHERE EXISTS (SELECT 1 FROM users WHERE users.id = us.user_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Product Analytics
INSERT INTO product_analytics (
    id, product_id, date, views, unique_views, add_to_cart_count,
    purchase_count, revenue,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    pa.id, pa.product_id, pa.date, pa.views, pa.unique_views,
    pa.add_to_cart_count, pa.purchase_count, pa.revenue::decimal,
    pa.created_at, pa.updated_at,
    COALESCE(pa.xata_createdat, pa.created_at), 
    COALESCE(pa.xata_updatedat, pa.updated_at)
FROM product_analytics_old pa
WHERE EXISTS (SELECT 1 FROM products WHERE products.id = pa.product_id)
ON CONFLICT (id) DO NOTHING;

-- Migrar Product Price History
INSERT INTO product_price_history (
    id, product_id, variant_id, price, original_price, cost,
    changed_by, reason,
    created_at,
    xata_createdat, xata_updatedat
)
SELECT 
    pph.id, pph.product_id, pph.variant_id, pph.price::decimal,
    pph.original_price::decimal, pph.cost::decimal,
    pph.changed_by, pph.reason,
    pph.created_at,
    COALESCE(pph.xata_createdat, pph.created_at), 
    COALESCE(pph.xata_updatedat, pph.created_at)
FROM product_price_history_old pph
WHERE EXISTS (SELECT 1 FROM products WHERE products.id = pph.product_id)
  AND (pph.variant_id IS NULL OR EXISTS (SELECT 1 FROM product_variants WHERE product_variants.id = pph.variant_id))
  AND (pph.changed_by IS NULL OR EXISTS (SELECT 1 FROM users WHERE users.id = pph.changed_by))
ON CONFLICT (id) DO NOTHING;

-- Migrar System Settings
INSERT INTO system_settings (
    id, key, value, description, group_name, is_public,
    created_at, updated_at,
    xata_createdat, xata_updatedat
)
SELECT 
    ss.id, ss.key, ss.value, ss.description, ss.group_name, ss.is_public,
    ss.created_at, ss.updated_at,
    COALESCE(ss.xata_createdat, ss.created_at), 
    COALESCE(ss.xata_updatedat, ss.updated_at)
FROM system_settings_old ss
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- PARTE 4: CRIAR ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices para Products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(featured);

-- Índices para Categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Índices para Product Images
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_order ON product_images(display_order);

-- Índices para Users
CREATE INDEX idx_users_email ON users(email);

-- Índices para Sellers
CREATE INDEX idx_sellers_slug ON sellers(slug);
CREATE INDEX idx_sellers_user ON sellers(user_id);

-- Índices para Addresses
CREATE INDEX idx_addresses_user ON addresses(user_id);

-- Índices para Orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);

-- Índices para Order Items
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Índices para Cart Items
CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- Índices para Wishlists
CREATE INDEX idx_wishlists_user ON wishlists(user_id);

-- Índices para Product Reviews
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);

-- Índices para Product Variants
CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- Índices para Coupons
CREATE INDEX idx_coupons_code ON coupons(code);

-- Índices para Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Índices para User Sessions
CREATE INDEX idx_user_sessions_token ON user_sessions(token);

-- Índices para Product Analytics
CREATE INDEX idx_product_analytics_product_date ON product_analytics(product_id, date);

-- ========================================
-- PARTE 5: VERIFICAR MIGRAÇÃO
-- ========================================

-- Verificar contagem de registros
SELECT 'products' as tabela, COUNT(*) as quantidade FROM products
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'brands', COUNT(*) FROM brands
UNION ALL
SELECT 'product_images', COUNT(*) FROM product_images
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'sellers', COUNT(*) FROM sellers
UNION ALL
SELECT 'addresses', COUNT(*) FROM addresses
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL
SELECT 'abandoned_carts', COUNT(*) FROM abandoned_carts
UNION ALL
SELECT 'wishlists', COUNT(*) FROM wishlists
UNION ALL
SELECT 'product_reviews', COUNT(*) FROM product_reviews
UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'product_options', COUNT(*) FROM product_options
UNION ALL
SELECT 'product_option_values', COUNT(*) FROM product_option_values
UNION ALL
SELECT 'variant_option_values', COUNT(*) FROM variant_option_values
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'coupon_usage', COUNT(*) FROM coupon_usage
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM payment_methods
UNION ALL
SELECT 'payment_transactions', COUNT(*) FROM payment_transactions
UNION ALL
SELECT 'shipping_methods', COUNT(*) FROM shipping_methods
UNION ALL
SELECT 'shipping_zones', COUNT(*) FROM shipping_zones
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'notification_preferences', COUNT(*) FROM notification_preferences
UNION ALL
SELECT 'user_sessions', COUNT(*) FROM user_sessions
UNION ALL
SELECT 'product_analytics', COUNT(*) FROM product_analytics
UNION ALL
SELECT 'product_price_history', COUNT(*) FROM product_price_history
UNION ALL
SELECT 'system_settings', COUNT(*) FROM system_settings;

-- ========================================
-- PARTE 6: LIMPAR (EXECUTAR APENAS APÓS CONFIRMAR QUE TUDO ESTÁ OK)
-- ========================================

-- ATENÇÃO: Descomente as linhas abaixo APENAS após verificar que a migração foi bem-sucedida
-- DROP TABLE IF EXISTS products_old CASCADE;
-- DROP TABLE IF EXISTS categories_old CASCADE;
-- DROP TABLE IF EXISTS brands_old CASCADE;
-- DROP TABLE IF EXISTS product_images_old CASCADE;
-- DROP TABLE IF EXISTS users_old CASCADE;
-- DROP TABLE IF EXISTS sellers_old CASCADE;
-- DROP TABLE IF EXISTS addresses_old CASCADE;
-- DROP TABLE IF EXISTS orders_old CASCADE;
-- DROP TABLE IF EXISTS order_items_old CASCADE;
-- DROP TABLE IF EXISTS cart_items_old CASCADE;
-- DROP TABLE IF EXISTS abandoned_carts_old CASCADE;
-- DROP TABLE IF EXISTS wishlists_old CASCADE;
-- DROP TABLE IF EXISTS product_reviews_old CASCADE;
-- DROP TABLE IF EXISTS product_variants_old CASCADE;
-- DROP TABLE IF EXISTS product_options_old CASCADE;
-- DROP TABLE IF EXISTS product_option_values_old CASCADE;
-- DROP TABLE IF EXISTS variant_option_values_old CASCADE;
-- DROP TABLE IF EXISTS coupons_old CASCADE;
-- DROP TABLE IF EXISTS coupon_usage_old CASCADE;
-- DROP TABLE IF EXISTS payment_methods_old CASCADE;
-- DROP TABLE IF EXISTS payment_transactions_old CASCADE;
-- DROP TABLE IF EXISTS shipping_methods_old CASCADE;
-- DROP TABLE IF EXISTS shipping_zones_old CASCADE;
-- DROP TABLE IF EXISTS notifications_old CASCADE;
-- DROP TABLE IF EXISTS notification_preferences_old CASCADE;
-- DROP TABLE IF EXISTS user_sessions_old CASCADE;
-- DROP TABLE IF EXISTS product_analytics_old CASCADE;
-- DROP TABLE IF EXISTS product_price_history_old CASCADE;
-- DROP TABLE IF EXISTS system_settings_old CASCADE; 