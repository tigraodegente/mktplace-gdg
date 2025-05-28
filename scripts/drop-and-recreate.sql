-- Dropar tabelas novas
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS sellers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recriar com ID como TEXT
CREATE TABLE users (
    xata_id TEXT PRIMARY KEY,
    id TEXT UNIQUE NOT NULL,
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

CREATE TABLE brands (
    xata_id TEXT PRIMARY KEY,
    id TEXT UNIQUE NOT NULL,
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

CREATE TABLE categories (
    xata_id TEXT PRIMARY KEY,
    id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id TEXT,
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

CREATE TABLE sellers (
    xata_id TEXT PRIMARY KEY,
    id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
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

CREATE TABLE products (
    xata_id TEXT PRIMARY KEY,
    id TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    brand_id TEXT REFERENCES brands(id),
    category_id TEXT REFERENCES categories(id),
    seller_id TEXT REFERENCES sellers(id),
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

CREATE TABLE product_images (
    xata_id TEXT PRIMARY KEY,
    id TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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