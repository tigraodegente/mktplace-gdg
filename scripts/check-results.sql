-- Verificar contagem
SELECT 'users' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'brands', COUNT(*) FROM brands
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'sellers', COUNT(*) FROM sellers
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_images', COUNT(*) FROM product_images;

-- Ver alguns produtos
SELECT id, name, price FROM products LIMIT 5; 