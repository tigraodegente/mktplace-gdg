-- Verificar se as tabelas antigas existem e têm dados

-- Verificar tabelas _old
SELECT 'products_old' as tabela, COUNT(*) as quantidade FROM products_old
UNION ALL
SELECT 'categories_old', COUNT(*) FROM categories_old
UNION ALL
SELECT 'brands_old', COUNT(*) FROM brands_old
UNION ALL
SELECT 'users_old', COUNT(*) FROM users_old
UNION ALL
SELECT 'sellers_old', COUNT(*) FROM sellers_old
UNION ALL
SELECT 'product_images_old', COUNT(*) FROM product_images_old;

-- Verificar alguns produtos da tabela antiga
SELECT id, name, sku, price FROM products_old LIMIT 5;

-- Verificar algumas categorias da tabela antiga
SELECT id, name, slug FROM categories_old LIMIT 5;

-- Verificar algumas marcas da tabela antiga
SELECT id, name, slug FROM brands_old LIMIT 5; 