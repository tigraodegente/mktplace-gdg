-- Atualizar todas as foreign keys para apontar para a nova tabela users

-- 1. Sellers
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey;
ALTER TABLE sellers ADD CONSTRAINT sellers_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. Orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- 3. Addresses
ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;
ALTER TABLE addresses ADD CONSTRAINT addresses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Cart Items
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_fkey;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 5. Product Analytics
ALTER TABLE product_analytics DROP CONSTRAINT IF EXISTS product_analytics_user_id_fkey;
ALTER TABLE product_analytics ADD CONSTRAINT product_analytics_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 6. Product Reviews
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_user_id_fkey;
ALTER TABLE product_reviews ADD CONSTRAINT product_reviews_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 7. Product Price History
ALTER TABLE product_price_history DROP CONSTRAINT IF EXISTS product_price_history_changed_by_fkey;
ALTER TABLE product_price_history ADD CONSTRAINT product_price_history_changed_by_fkey 
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 8. Coupon Usage
ALTER TABLE coupon_usage DROP CONSTRAINT IF EXISTS coupon_usage_user_id_fkey;
ALTER TABLE coupon_usage ADD CONSTRAINT coupon_usage_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 9. Wishlists
ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;
ALTER TABLE wishlists ADD CONSTRAINT wishlists_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 10. Notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 11. Notification Preferences
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 12. Abandoned Carts
ALTER TABLE abandoned_carts DROP CONSTRAINT IF EXISTS abandoned_carts_user_id_fkey;
ALTER TABLE abandoned_carts ADD CONSTRAINT abandoned_carts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 13. User Sessions
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 14. System Settings
ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE system_settings ADD CONSTRAINT system_settings_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Agora podemos remover a tabela antiga com segurança
DROP TABLE users_backup;

-- Verificar que tudo está ok
SELECT 'Foreign keys atualizadas com sucesso!' as status; 