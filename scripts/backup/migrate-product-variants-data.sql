-- =====================================================
-- MIGRAÇÃO DE VARIANTES E DADOS RELACIONADOS A PRODUTOS
-- =====================================================
-- Este script extrai dados dos attributes dos produtos
-- para criar variantes e popular tabelas relacionadas
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRIAR VARIANTES PARA PRODUTOS COM CORES
-- =====================================================

-- Primeiro, identificar produtos que deveriam ter variantes de cor
-- Produtos com mesmo nome base mas cores diferentes
WITH produtos_com_variacao AS (
    SELECT 
        REGEXP_REPLACE(name, '\s*(Rosa|Azul|Verde|Amarelo|Branco|Cinza|Bege|Vermelho|Preto|Marrom|Lilás|Laranja|Colorido)\s*', '', 'gi') as nome_base,
        COUNT(DISTINCT attributes->>'color') as cores_distintas,
        COUNT(*) as total_produtos,
        MIN(id) as produto_principal_id
    FROM products
    WHERE attributes->>'color' IS NOT NULL 
    AND attributes->>'color' != ''
    AND (name ILIKE '%kit%' OR name ILIKE '%conjunto%' OR name ILIKE '%body%' 
         OR name ILIKE '%vestido%' OR name ILIKE '%macacão%' OR name ILIKE '%almofada%'
         OR name ILIKE '%manta%' OR name ILIKE '%toalha%')
    GROUP BY nome_base
    HAVING COUNT(DISTINCT attributes->>'color') > 1
    LIMIT 20
)
-- Criar opções de cor para esses produtos
INSERT INTO product_options (product_id, name, display_name, position)
SELECT 
    produto_principal_id,
    'cor',
    'Cor',
    1
FROM produtos_com_variacao;

-- Criar valores de cor baseados nos attributes existentes
INSERT INTO product_option_values (option_id, value, display_value, color_hex, position)
SELECT DISTINCT ON (po.id, p.attributes->>'color')
    po.id,
    LOWER(p.attributes->>'color'),
    p.attributes->>'color',
    CASE p.attributes->>'color'
        WHEN 'Rosa' THEN '#FFC0CB'
        WHEN 'Azul' THEN '#0066CC'
        WHEN 'Verde' THEN '#00AA00'
        WHEN 'Amarelo' THEN '#FFD700'
        WHEN 'Branco' THEN '#FFFFFF'
        WHEN 'Cinza' THEN '#808080'
        WHEN 'Bege' THEN '#F5DEB3'
        WHEN 'Vermelho' THEN '#FF0000'
        WHEN 'Preto' THEN '#000000'
        WHEN 'Marrom' THEN '#8B4513'
        WHEN 'Lilás' THEN '#C8A2C8'
        WHEN 'Laranja' THEN '#FFA500'
        WHEN 'Azul Marinho' THEN '#000080'
        WHEN 'Rosé' THEN '#FF69B4'
        ELSE NULL
    END,
    ROW_NUMBER() OVER (PARTITION BY po.id ORDER BY p.attributes->>'color')
FROM product_options po
JOIN products p ON p.seller_id = (SELECT seller_id FROM products WHERE id = po.product_id LIMIT 1)
WHERE po.name = 'cor'
AND p.attributes->>'color' IS NOT NULL
AND p.attributes->>'color' != '';

-- =====================================================
-- 2. CRIAR VARIANTES PARA PRODUTOS COM TAMANHOS
-- =====================================================

-- Produtos com tamanhos no nome (almofadas, mantas, etc)
WITH produtos_com_tamanho AS (
    SELECT DISTINCT
        id,
        name,
        CASE 
            WHEN name ~ '(\d+)cm' THEN SUBSTRING(name FROM '(\d+)cm')
            WHEN name ~ '(\d+)\s*[Pp]eças' THEN SUBSTRING(name FROM '(\d+)\s*[Pp]eças')
            ELSE NULL
        END as tamanho
    FROM products
    WHERE name ~ '\d+\s*(cm|peças|Peças)'
    AND (name ILIKE '%almofada%' OR name ILIKE '%manta%' OR name ILIKE '%tapete%' 
         OR name ILIKE '%cesto%' OR name ILIKE '%kit%')
    LIMIT 50
)
INSERT INTO product_options (product_id, name, display_name, position)
SELECT 
    id,
    'tamanho',
    'Tamanho',
    2
FROM produtos_com_tamanho
WHERE tamanho IS NOT NULL;

-- =====================================================
-- 3. CRIAR VARIANTES REAIS PARA ALGUNS PRODUTOS
-- =====================================================

-- Criar variantes para produtos Hello Kitty (exemplo de produtos com variação)
DO $$
DECLARE
    prod RECORD;
    opt_cor UUID;
    val_rosa UUID;
    val_branco UUID;
BEGIN
    -- Pegar produtos Hello Kitty que têm potencial para variantes
    FOR prod IN 
        SELECT DISTINCT ON (REGEXP_REPLACE(name, '\s*(Rosa|Branco)\s*', '', 'gi'))
            id, name, sku, price, original_price, cost, quantity, seller_id
        FROM products 
        WHERE name ILIKE '%hello kitty%'
        AND attributes->>'color' IS NOT NULL
        LIMIT 5
    LOOP
        -- Criar opção de cor se não existir
        SELECT id INTO opt_cor FROM product_options WHERE product_id = prod.id AND name = 'cor';
        
        IF opt_cor IS NULL THEN
            INSERT INTO product_options (product_id, name, display_name, position)
            VALUES (prod.id, 'cor', 'Cor', 1)
            RETURNING id INTO opt_cor;
            
            -- Criar valores de cor
            INSERT INTO product_option_values (option_id, value, display_value, color_hex, position)
            VALUES (opt_cor, 'rosa', 'Rosa', '#FFC0CB', 1)
            RETURNING id INTO val_rosa;
            
            INSERT INTO product_option_values (option_id, value, display_value, color_hex, position)
            VALUES (opt_cor, 'branco', 'Branco', '#FFFFFF', 2)
            RETURNING id INTO val_branco;
            
            -- Criar variantes
            INSERT INTO product_variants (product_id, sku, price, original_price, cost, quantity, is_default)
            VALUES 
                (prod.id, prod.sku || '-ROSA', prod.price, prod.original_price, prod.cost, 
                 GREATEST(prod.quantity / 2, 1), true),
                (prod.id, prod.sku || '-BRANCO', prod.price * 0.95, prod.original_price * 0.95, 
                 prod.cost, GREATEST(prod.quantity / 2, 1), false);
            
            -- Associar variantes com cores
            INSERT INTO variant_option_values (variant_id, option_value_id)
            VALUES 
                ((SELECT id FROM product_variants WHERE sku = prod.sku || '-ROSA'), val_rosa),
                ((SELECT id FROM product_variants WHERE sku = prod.sku || '-BRANCO'), val_branco);
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- 4. MIGRAR DADOS DE IMAGENS PARA VARIANTES
-- =====================================================

-- Associar imagens existentes às variantes criadas
UPDATE product_images pi
SET variant_id = (
    SELECT v.id 
    FROM product_variants v 
    WHERE v.product_id = pi.product_id 
    AND v.is_default = true
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM product_variants v WHERE v.product_id = pi.product_id
);

-- =====================================================
-- 5. CRIAR CATEGORIAS MAIS ESPECÍFICAS
-- =====================================================

-- Criar subcategorias baseadas nas tags e attributes
INSERT INTO categories (name, slug, description, parent_id, position)
SELECT DISTINCT ON (nome)
    nome,
    slug,
    descricao,
    parent_id,
    posicao
FROM (
    -- Categorias baseadas em gênero
    SELECT 
        'Menina' as nome,
        'menina' as slug,
        'Produtos para meninas' as descricao,
        (SELECT id FROM categories WHERE slug = 'produtos') as parent_id,
        1 as posicao
    WHERE EXISTS (SELECT 1 FROM products WHERE 'menina' = ANY(tags))
    
    UNION ALL
    
    SELECT 
        'Menino' as nome,
        'menino' as slug,
        'Produtos para meninos' as descricao,
        (SELECT id FROM categories WHERE slug = 'produtos') as parent_id,
        2 as posicao
    WHERE EXISTS (SELECT 1 FROM products WHERE 'menino' = ANY(tags))
    
    UNION ALL
    
    SELECT 
        'Bebê' as nome,
        'bebe' as slug,
        'Produtos para bebês' as descricao,
        (SELECT id FROM categories WHERE slug = 'produtos') as parent_id,
        3 as posicao
    WHERE EXISTS (SELECT 1 FROM products WHERE 'bebê' = ANY(tags) OR 'bebe' = ANY(tags))
    
    UNION ALL
    
    -- Categorias baseadas em tipo de produto
    SELECT 
        'Enxoval' as nome,
        'enxoval' as slug,
        'Kits e enxovais completos' as descricao,
        (SELECT id FROM categories WHERE slug = 'produtos') as parent_id,
        4 as posicao
    WHERE EXISTS (SELECT 1 FROM products WHERE name ILIKE '%kit%' OR name ILIKE '%enxoval%')
    
    UNION ALL
    
    SELECT 
        'Decoração' as nome,
        'decoracao' as slug,
        'Itens de decoração infantil' as descricao,
        (SELECT id FROM categories WHERE slug = 'produtos') as parent_id,
        5 as posicao
    WHERE EXISTS (SELECT 1 FROM products WHERE name ILIKE '%quadro%' OR name ILIKE '%papel de parede%' OR name ILIKE '%adesivo%')
    
    UNION ALL
    
    SELECT 
        'Roupas' as nome,
        'roupas' as slug,
        'Roupas infantis' as descricao,
        (SELECT id FROM categories WHERE slug = 'produtos') as parent_id,
        6 as posicao
    WHERE EXISTS (SELECT 1 FROM products WHERE name ILIKE '%body%' OR name ILIKE '%vestido%' OR name ILIKE '%macacão%')
    
    UNION ALL
    
    SELECT 
        'Móveis' as nome,
        'moveis' as slug,
        'Móveis infantis' as descricao,
        (SELECT id FROM categories WHERE slug = 'produtos') as parent_id,
        7 as posicao
    WHERE EXISTS (SELECT 1 FROM products WHERE name ILIKE '%berço%' OR name ILIKE '%cômoda%' OR name ILIKE '%guarda%roupa%')
) AS subcategorias;

-- =====================================================
-- 6. ATUALIZAR PRODUTOS COM NOVAS CATEGORIAS
-- =====================================================

-- Atualizar produtos para as novas subcategorias baseado em tags e nomes
UPDATE products p
SET category_id = COALESCE(
    -- Prioridade 1: Categoria específica por tag
    (SELECT id FROM categories WHERE slug = 'menina' AND 'menina' = ANY(p.tags) LIMIT 1),
    (SELECT id FROM categories WHERE slug = 'menino' AND 'menino' = ANY(p.tags) LIMIT 1),
    (SELECT id FROM categories WHERE slug = 'bebe' AND ('bebê' = ANY(p.tags) OR 'bebe' = ANY(p.tags)) LIMIT 1),
    -- Prioridade 2: Categoria por tipo de produto
    (SELECT id FROM categories WHERE slug = 'enxoval' AND (p.name ILIKE '%kit%' OR p.name ILIKE '%enxoval%') LIMIT 1),
    (SELECT id FROM categories WHERE slug = 'decoracao' AND (p.name ILIKE '%quadro%' OR p.name ILIKE '%papel de parede%') LIMIT 1),
    (SELECT id FROM categories WHERE slug = 'roupas' AND (p.name ILIKE '%body%' OR p.name ILIKE '%vestido%') LIMIT 1),
    (SELECT id FROM categories WHERE slug = 'moveis' AND (p.name ILIKE '%berço%' OR p.name ILIKE '%cômoda%') LIMIT 1),
    -- Manter categoria atual se não encontrar match
    p.category_id
)
WHERE EXISTS (SELECT 1 FROM categories WHERE parent_id IS NOT NULL);

-- =====================================================
-- 7. CRIAR PROMOÇÕES BASEADAS EM ATTRIBUTES
-- =====================================================

-- Criar cupons para temas populares
INSERT INTO coupons (code, description, discount_type, discount_value, minimum_value, usage_limit, valid_until)
SELECT DISTINCT ON (theme)
    UPPER(LEFT(REGEXP_REPLACE(theme, '[^a-zA-Z0-9]', '', 'g'), 10)) || '15',
    'Desconto em produtos ' || theme,
    'percentage',
    15,
    100,
    100,
    NOW() + INTERVAL '30 days'
FROM (
    SELECT attributes->>'theme' as theme, COUNT(*) as total
    FROM products
    WHERE attributes->>'theme' IS NOT NULL 
    AND attributes->>'theme' NOT IN ('None', '')
    GROUP BY theme
    ORDER BY total DESC
    LIMIT 5
) themes;

-- =====================================================
-- RELATÓRIO FINAL
-- =====================================================
SELECT 
    'MIGRAÇÃO DE VARIANTES CONCLUÍDA' as status,
    (SELECT COUNT(*) FROM product_options) as opcoes_criadas,
    (SELECT COUNT(*) FROM product_option_values) as valores_opcoes,
    (SELECT COUNT(*) FROM product_variants) as variantes_criadas,
    (SELECT COUNT(DISTINCT product_id) FROM product_variants) as produtos_com_variantes,
    (SELECT COUNT(*) FROM categories WHERE parent_id IS NOT NULL) as subcategorias_criadas,
    (SELECT COUNT(*) FROM coupons WHERE code LIKE '%15') as cupons_tematicos;

COMMIT; 