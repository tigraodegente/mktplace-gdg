-- Script para inserir imagens placeholder para os primeiros 100 produtos
-- Cada produto terá 3 imagens com cores diferentes

-- Inserir imagem principal (display_order = 1)
INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary)
SELECT 
    gen_random_uuid()::text,
    p.id,
    CASE (ROW_NUMBER() OVER (ORDER BY p.id) % 8)
        WHEN 0 THEN 'https://via.placeholder.com/600x800/3B82F6/FFFFFF?text=Produto+Infantil'
        WHEN 1 THEN 'https://via.placeholder.com/600x800/10B981/FFFFFF?text=Produto+Infantil'
        WHEN 2 THEN 'https://via.placeholder.com/600x800/F59E0B/FFFFFF?text=Produto+Infantil'
        WHEN 3 THEN 'https://via.placeholder.com/600x800/EF4444/FFFFFF?text=Produto+Infantil'
        WHEN 4 THEN 'https://via.placeholder.com/600x800/8B5CF6/FFFFFF?text=Produto+Infantil'
        WHEN 5 THEN 'https://via.placeholder.com/600x800/EC4899/FFFFFF?text=Produto+Infantil'
        WHEN 6 THEN 'https://via.placeholder.com/600x800/14B8A6/FFFFFF?text=Produto+Infantil'
        ELSE 'https://via.placeholder.com/600x800/F97316/FFFFFF?text=Produto+Infantil'
    END,
    SUBSTRING(p.name, 1, 50) || ' - Imagem Principal',
    1,
    true
FROM products p
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
)
ORDER BY p.featured DESC, p.sales_count DESC
LIMIT 100;

-- Inserir segunda imagem (display_order = 2)
INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary)
SELECT 
    gen_random_uuid()::text,
    p.id,
    CASE ((ROW_NUMBER() OVER (ORDER BY p.id) + 1) % 8)
        WHEN 0 THEN 'https://via.placeholder.com/600x800/3B82F6/FFFFFF?text=Vista+Lateral'
        WHEN 1 THEN 'https://via.placeholder.com/600x800/10B981/FFFFFF?text=Vista+Lateral'
        WHEN 2 THEN 'https://via.placeholder.com/600x800/F59E0B/FFFFFF?text=Vista+Lateral'
        WHEN 3 THEN 'https://via.placeholder.com/600x800/EF4444/FFFFFF?text=Vista+Lateral'
        WHEN 4 THEN 'https://via.placeholder.com/600x800/8B5CF6/FFFFFF?text=Vista+Lateral'
        WHEN 5 THEN 'https://via.placeholder.com/600x800/EC4899/FFFFFF?text=Vista+Lateral'
        WHEN 6 THEN 'https://via.placeholder.com/600x800/14B8A6/FFFFFF?text=Vista+Lateral'
        ELSE 'https://via.placeholder.com/600x800/F97316/FFFFFF?text=Vista+Lateral'
    END,
    SUBSTRING(p.name, 1, 50) || ' - Vista Lateral',
    2,
    false
FROM products p
WHERE p.is_active = true
AND EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.display_order = 1
)
AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.display_order = 2
)
ORDER BY p.featured DESC, p.sales_count DESC
LIMIT 100;

-- Inserir terceira imagem (display_order = 3)
INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary)
SELECT 
    gen_random_uuid()::text,
    p.id,
    CASE ((ROW_NUMBER() OVER (ORDER BY p.id) + 2) % 8)
        WHEN 0 THEN 'https://via.placeholder.com/600x800/3B82F6/FFFFFF?text=Detalhes'
        WHEN 1 THEN 'https://via.placeholder.com/600x800/10B981/FFFFFF?text=Detalhes'
        WHEN 2 THEN 'https://via.placeholder.com/600x800/F59E0B/FFFFFF?text=Detalhes'
        WHEN 3 THEN 'https://via.placeholder.com/600x800/EF4444/FFFFFF?text=Detalhes'
        WHEN 4 THEN 'https://via.placeholder.com/600x800/8B5CF6/FFFFFF?text=Detalhes'
        WHEN 5 THEN 'https://via.placeholder.com/600x800/EC4899/FFFFFF?text=Detalhes'
        WHEN 6 THEN 'https://via.placeholder.com/600x800/14B8A6/FFFFFF?text=Detalhes'
        ELSE 'https://via.placeholder.com/600x800/F97316/FFFFFF?text=Detalhes'
    END,
    SUBSTRING(p.name, 1, 50) || ' - Detalhes',
    3,
    false
FROM products p
WHERE p.is_active = true
AND EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.display_order = 2
)
AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id AND pi.display_order = 3
)
ORDER BY p.featured DESC, p.sales_count DESC
LIMIT 100; 