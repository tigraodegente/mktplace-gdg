-- =====================================================
-- SCRIPT PARA CRIAR HIERARQUIA DE CATEGORIAS
-- =====================================================

BEGIN;

-- 1. Criar categoria principal de Informática se não existir
INSERT INTO categories (id, name, slug, position, is_active, created_at)
VALUES 
    (gen_random_uuid(), 'Informática', 'informatica', 1, true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- 2. Criar subcategorias de Informática
WITH informatica_cat AS (
    SELECT id FROM categories WHERE slug = 'informatica' LIMIT 1
)
INSERT INTO categories (name, slug, parent_id, position, is_active, created_at)
SELECT 
    sub.name,
    sub.slug,
    ic.id,
    sub.position,
    true,
    NOW()
FROM informatica_cat ic
CROSS JOIN (
    VALUES 
        ('Notebooks', 'notebooks', 1),
        ('Computadores', 'computadores', 2),
        ('Monitores', 'monitores', 3),
        ('Periféricos', 'perifericos', 4),
        ('Componentes', 'componentes', 5),
        ('Armazenamento', 'armazenamento', 6),
        ('Impressoras', 'impressoras', 7),
        ('Redes', 'redes', 8)
) AS sub(name, slug, position)
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

-- 3. Criar categoria principal de Celulares e Telefonia
INSERT INTO categories (id, name, slug, position, is_active, created_at)
VALUES 
    (gen_random_uuid(), 'Celulares e Telefonia', 'celulares-telefonia', 2, true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- 4. Criar subcategorias de Celulares
WITH celulares_cat AS (
    SELECT id FROM categories WHERE slug = 'celulares-telefonia' LIMIT 1
)
INSERT INTO categories (name, slug, parent_id, position, is_active, created_at)
SELECT 
    sub.name,
    sub.slug,
    cc.id,
    sub.position,
    true,
    NOW()
FROM celulares_cat cc
CROSS JOIN (
    VALUES 
        ('Smartphones', 'smartphones', 1),
        ('Celulares Básicos', 'celulares-basicos', 2),
        ('Acessórios para Celular', 'acessorios-celular', 3),
        ('Smartwatches', 'smartwatches', 4),
        ('Fones de Ouvido', 'fones-ouvido', 5),
        ('Capas e Películas', 'capas-peliculas', 6)
) AS sub(name, slug, position)
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

-- 5. Criar categoria principal de Eletrônicos
INSERT INTO categories (id, name, slug, position, is_active, created_at)
VALUES 
    (gen_random_uuid(), 'Eletrônicos', 'eletronicos', 3, true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- 6. Criar subcategorias de Eletrônicos
WITH eletronicos_cat AS (
    SELECT id FROM categories WHERE slug = 'eletronicos' LIMIT 1
)
INSERT INTO categories (name, slug, parent_id, position, is_active, created_at)
SELECT 
    sub.name,
    sub.slug,
    ec.id,
    sub.position,
    true,
    NOW()
FROM eletronicos_cat ec
CROSS JOIN (
    VALUES 
        ('TVs', 'tvs', 1),
        ('Som e Áudio', 'som-audio', 2),
        ('Games', 'games', 3),
        ('Câmeras e Drones', 'cameras-drones', 4),
        ('Home Theater', 'home-theater', 5)
) AS sub(name, slug, position)
ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

-- 7. Atualizar produtos para as subcategorias apropriadas
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.slug = 'notebooks'
AND (p.name ILIKE '%notebook%' OR p.name ILIKE '%laptop%' OR p.name ILIKE '%macbook%');

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.slug = 'smartphones'
AND (p.name ILIKE '%smartphone%' OR p.name ILIKE '%celular%' OR p.name ILIKE '%iphone%' OR p.name ILIKE '%samsung%');

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.slug = 'monitores'
AND (p.name ILIKE '%monitor%' OR p.name ILIKE '%tela%' OR p.name ILIKE '%display%');

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.slug = 'fones-ouvido'
AND (p.name ILIKE '%fone%' OR p.name ILIKE '%headphone%' OR p.name ILIKE '%earphone%' OR p.name ILIKE '%airpod%');

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.slug = 'tvs'
AND (p.name ILIKE '%tv%' OR p.name ILIKE '%televisão%' OR p.name ILIKE '%televisao%');

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.slug = 'games'
AND (p.name ILIKE '%playstation%' OR p.name ILIKE '%xbox%' OR p.name ILIKE '%nintendo%' OR p.name ILIKE '%console%');

-- 8. Adicionar mais opções de produtos para garantir filtros dinâmicos ricos
-- Adicionar processador para mais produtos de informática
WITH informatica_products AS (
    SELECT DISTINCT p.id
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE c.parent_id = (SELECT id FROM categories WHERE slug = 'informatica')
    AND NOT EXISTS (
        SELECT 1 FROM product_options po 
        WHERE po.product_id = p.id AND po.name = 'processador'
    )
    LIMIT 20
)
INSERT INTO product_options (product_id, name, position)
SELECT ip.id, 'processador', 3
FROM informatica_products ip;

-- Valores de processador
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('Intel Core i3', 1),
        ('Intel Core i5', 2),
        ('Intel Core i7', 3),
        ('Intel Core i9', 4),
        ('AMD Ryzen 5', 5),
        ('AMD Ryzen 7', 6)
) AS val(value, position)
WHERE po.name = 'processador'
AND NOT EXISTS (
    SELECT 1 FROM product_option_values pov 
    WHERE pov.option_id = po.id AND pov.value = val.value
);

-- Relatório final
SELECT 
    'HIERARQUIA CRIADA' as status,
    (SELECT COUNT(*) FROM categories WHERE parent_id IS NULL) as categorias_principais,
    (SELECT COUNT(*) FROM categories WHERE parent_id IS NOT NULL) as subcategorias,
    (SELECT COUNT(*) FROM product_options) as total_opcoes,
    (SELECT COUNT(DISTINCT product_id) FROM product_options) as produtos_com_opcoes;

COMMIT; 