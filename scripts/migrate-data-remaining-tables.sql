-- Script para migrar dados das tabelas restantes
-- Execute após criar todas as tabelas novas

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