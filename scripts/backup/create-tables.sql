-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer', 'seller', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    cpf_cnpj TEXT UNIQUE,
    avatar_url TEXT,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_version INTEGER NOT NULL DEFAULT 0
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id TEXT REFERENCES categories(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_version INTEGER NOT NULL DEFAULT 0
);

-- Sellers table
CREATE TABLE IF NOT EXISTS sellers (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
    company_name TEXT NOT NULL,
    company_document TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    rating DECIMAL(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_sales INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_version INTEGER NOT NULL DEFAULT 0
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    seller_id TEXT NOT NULL REFERENCES sellers(id),
    category_id TEXT NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(10,2) CHECK (compare_at_price >= 0),
    cost DECIMAL(10,2) CHECK (cost >= 0),
    sku TEXT UNIQUE,
    barcode TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    stock_location TEXT,
    weight DECIMAL(10,3),
    dimensions JSONB,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_version INTEGER NOT NULL DEFAULT 0
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    user_id TEXT NOT NULL REFERENCES users(id),
    order_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    discount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    payment_method TEXT,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    notes TEXT,
    metadata JSONB,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_version INTEGER NOT NULL DEFAULT 0
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    order_id TEXT NOT NULL REFERENCES orders(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    seller_id TEXT NOT NULL REFERENCES sellers(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT now(),
    xata_version INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_seller_id ON order_items(seller_id); 