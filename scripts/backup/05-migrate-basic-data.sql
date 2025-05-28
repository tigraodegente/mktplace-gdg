-- PARTE 3: Migrar dados das tabelas básicas
-- Execute cada INSERT individualmente

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