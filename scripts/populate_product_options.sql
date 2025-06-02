-- =====================================================
-- SCRIPT PARA POPULAR OPÇÕES DE PRODUTOS MOCKADAS
-- =====================================================
-- Este script cria opções e valores para produtos existentes
-- Focando em categorias como informática, eletrônicos, etc
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRIAR OPÇÕES PARA PRODUTOS DE INFORMÁTICA
-- =====================================================

-- Notebooks e Computadores
WITH notebooks AS (
    SELECT DISTINCT p.id
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true
    AND (
        p.name ILIKE '%notebook%' OR 
        p.name ILIKE '%laptop%' OR 
        p.name ILIKE '%macbook%' OR
        p.name ILIKE '%computador%' OR
        p.name ILIKE '%pc%' OR
        c.slug IN ('informatica', 'notebooks', 'computadores')
    )
    LIMIT 50
)
INSERT INTO product_options (product_id, name, position)
SELECT 
    n.id,
    opt.name,
    opt.position
FROM notebooks n
CROSS JOIN (
    VALUES 
        ('memoria-ram', 1),
        ('armazenamento', 2),
        ('processador', 3),
        ('cor', 4)
) AS opt(name, position)
ON CONFLICT DO NOTHING;

-- Valores para Memória RAM
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('4GB', 1),
        ('8GB', 2),
        ('16GB', 3),
        ('32GB', 4),
        ('64GB', 5)
) AS val(value, position)
WHERE po.name = 'memoria-ram'
ON CONFLICT DO NOTHING;

-- Valores para Armazenamento
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('256GB SSD', 1),
        ('512GB SSD', 2),
        ('1TB SSD', 3),
        ('2TB SSD', 4),
        ('1TB HDD', 5),
        ('2TB HDD', 6)
) AS val(value, position)
WHERE po.name = 'armazenamento'
ON CONFLICT DO NOTHING;

-- Valores para Processador
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
        ('AMD Ryzen 7', 6),
        ('AMD Ryzen 9', 7),
        ('Apple M1', 8),
        ('Apple M2', 9),
        ('Apple M3', 10)
) AS val(value, position)
WHERE po.name = 'processador'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. CRIAR OPÇÕES PARA SMARTPHONES
-- =====================================================

WITH smartphones AS (
    SELECT DISTINCT p.id
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true
    AND (
        p.name ILIKE '%smartphone%' OR 
        p.name ILIKE '%celular%' OR 
        p.name ILIKE '%iphone%' OR
        p.name ILIKE '%samsung%' OR
        p.name ILIKE '%xiaomi%' OR
        c.slug IN ('celulares', 'smartphones', 'telefonia')
    )
    LIMIT 50
)
INSERT INTO product_options (product_id, name, position)
SELECT 
    s.id,
    opt.name,
    opt.position
FROM smartphones s
CROSS JOIN (
    VALUES 
        ('cor', 1),
        ('armazenamento', 2),
        ('memoria-ram', 3),
        ('dual-sim', 4)
) AS opt(name, position)
ON CONFLICT DO NOTHING;

-- Cores para eletrônicos
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('Preto', 1),
        ('Branco', 2),
        ('Azul', 3),
        ('Dourado', 4),
        ('Prata', 5),
        ('Rosa', 6),
        ('Verde', 7),
        ('Vermelho', 8),
        ('Grafite', 9),
        ('Midnight', 10)
) AS val(value, position)
WHERE po.name = 'cor'
AND EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id = po.product_id 
    AND (p.name ILIKE '%phone%' OR p.name ILIKE '%celular%' OR p.name ILIKE '%notebook%')
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. CRIAR OPÇÕES PARA MONITORES
-- =====================================================

WITH monitores AS (
    SELECT DISTINCT p.id
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true
    AND (
        p.name ILIKE '%monitor%' OR 
        p.name ILIKE '%tela%' OR 
        p.name ILIKE '%display%' OR
        c.slug = 'monitores'
    )
    LIMIT 30
)
INSERT INTO product_options (product_id, name, position)
SELECT 
    m.id,
    opt.name,
    opt.position
FROM monitores m
CROSS JOIN (
    VALUES 
        ('tamanho-tela', 1),
        ('resolucao', 2),
        ('taxa-atualizacao', 3),
        ('tipo-painel', 4)
) AS opt(name, position)
ON CONFLICT DO NOTHING;

-- Tamanhos de tela
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('21.5"', 1),
        ('24"', 2),
        ('27"', 3),
        ('29"', 4),
        ('32"', 5),
        ('34"', 6),
        ('43"', 7),
        ('49"', 8)
) AS val(value, position)
WHERE po.name = 'tamanho-tela'
ON CONFLICT DO NOTHING;

-- Resoluções
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('Full HD (1920x1080)', 1),
        ('Quad HD (2560x1440)', 2),
        ('4K UHD (3840x2160)', 3),
        ('5K (5120x2880)', 4),
        ('8K (7680x4320)', 5)
) AS val(value, position)
WHERE po.name = 'resolucao'
ON CONFLICT DO NOTHING;

-- Taxa de atualização
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('60Hz', 1),
        ('75Hz', 2),
        ('120Hz', 3),
        ('144Hz', 4),
        ('165Hz', 5),
        ('240Hz', 6),
        ('360Hz', 7)
) AS val(value, position)
WHERE po.name = 'taxa-atualizacao'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. CRIAR OPÇÕES PARA FONES DE OUVIDO
-- =====================================================

WITH fones AS (
    SELECT DISTINCT p.id
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true
    AND (
        p.name ILIKE '%fone%' OR 
        p.name ILIKE '%headphone%' OR 
        p.name ILIKE '%earphone%' OR
        p.name ILIKE '%airpod%' OR
        c.slug = 'audio'
    )
    LIMIT 30
)
INSERT INTO product_options (product_id, name, position)
SELECT 
    f.id,
    opt.name,
    opt.position
FROM fones f
CROSS JOIN (
    VALUES 
        ('cor', 1),
        ('tipo-conexao', 2),
        ('cancelamento-ruido', 3)
) AS opt(name, position)
ON CONFLICT DO NOTHING;

-- Tipo de conexão
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('Bluetooth', 1),
        ('USB-C', 2),
        ('P2 (3.5mm)', 3),
        ('Lightning', 4),
        ('Sem fio 2.4GHz', 5)
) AS val(value, position)
WHERE po.name = 'tipo-conexao'
ON CONFLICT DO NOTHING;

-- Cancelamento de ruído
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('Com cancelamento ativo', 1),
        ('Sem cancelamento', 2),
        ('Cancelamento passivo', 3)
) AS val(value, position)
WHERE po.name = 'cancelamento-ruido'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. CRIAR OPÇÕES PARA ROUPAS E MODA
-- =====================================================

WITH roupas AS (
    SELECT DISTINCT p.id
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true
    AND (
        p.name ILIKE '%camisa%' OR 
        p.name ILIKE '%camiseta%' OR 
        p.name ILIKE '%calça%' OR
        p.name ILIKE '%vestido%' OR
        p.name ILIKE '%blusa%' OR
        c.slug IN ('moda', 'roupas', 'vestuario')
    )
    LIMIT 50
)
INSERT INTO product_options (product_id, name, position)
SELECT 
    r.id,
    opt.name,
    opt.position
FROM roupas r
CROSS JOIN (
    VALUES 
        ('tamanho', 1),
        ('cor', 2),
        ('material', 3)
) AS opt(name, position)
ON CONFLICT DO NOTHING;

-- Tamanhos de roupa
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('PP', 1),
        ('P', 2),
        ('M', 3),
        ('G', 4),
        ('GG', 5),
        ('XG', 6),
        ('XXG', 7)
) AS val(value, position)
WHERE po.name = 'tamanho'
AND EXISTS (
    SELECT 1 FROM products p 
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = po.product_id 
    AND (p.name ILIKE '%roupa%' OR p.name ILIKE '%camisa%' OR p.name ILIKE '%calça%' OR c.slug IN ('moda', 'roupas'))
)
ON CONFLICT DO NOTHING;

-- Materiais
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('Algodão', 1),
        ('Poliéster', 2),
        ('Viscose', 3),
        ('Linho', 4),
        ('Jeans', 5),
        ('Malha', 6),
        ('Moletom', 7),
        ('Seda', 8)
) AS val(value, position)
WHERE po.name = 'material'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. CRIAR OPÇÕES GENÉRICAS PARA OUTROS PRODUTOS
-- =====================================================

-- Voltagem para eletrodomésticos
WITH eletrodomesticos AS (
    SELECT DISTINCT p.id
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true
    AND (
        p.name ILIKE '%geladeira%' OR 
        p.name ILIKE '%microondas%' OR 
        p.name ILIKE '%fogão%' OR
        p.name ILIKE '%liquidificador%' OR
        p.name ILIKE '%ventilador%' OR
        c.slug = 'eletrodomesticos'
    )
    LIMIT 30
)
INSERT INTO product_options (product_id, name, position)
SELECT 
    e.id,
    'voltagem',
    1
FROM eletrodomesticos e
ON CONFLICT DO NOTHING;

-- Valores de voltagem
INSERT INTO product_option_values (option_id, value, position)
SELECT DISTINCT
    po.id,
    val.value,
    val.position
FROM product_options po
CROSS JOIN (
    VALUES 
        ('110V', 1),
        ('220V', 2),
        ('Bivolt', 3)
) AS val(value, position)
WHERE po.name = 'voltagem'
ON CONFLICT DO NOTHING;

-- =====================================================
-- RELATÓRIO FINAL
-- =====================================================
SELECT 
    'OPÇÕES DE PRODUTOS CRIADAS' as status,
    (SELECT COUNT(*) FROM product_options) as total_opcoes,
    (SELECT COUNT(*) FROM product_option_values) as total_valores,
    (SELECT COUNT(DISTINCT product_id) FROM product_options) as produtos_com_opcoes,
    (SELECT COUNT(DISTINCT name) FROM product_options) as tipos_opcoes_distintas;

COMMIT; 