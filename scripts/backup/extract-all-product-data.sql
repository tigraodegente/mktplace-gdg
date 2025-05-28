-- =====================================================
-- EXTRAÇÃO COMPLETA DE DADOS DOS PRODUTOS
-- =====================================================
-- Este script extrai TODOS os dados ainda não explorados
-- dos produtos e os migra para as tabelas apropriadas
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRIAR TABELA DE MATERIAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Popular materiais únicos
INSERT INTO materials (name, slug, description, properties)
SELECT DISTINCT ON (material)
    material as name,
    LOWER(REGEXP_REPLACE(material, '[^a-zA-Z0-9]', '-', 'g')) as slug,
    CASE 
        WHEN material LIKE '%Algodão%' THEN 'Material natural, respirável e confortável'
        WHEN material LIKE '%Microfibra%' THEN 'Material sintético, macio e durável'
        WHEN material LIKE '%Tricot%' THEN 'Tecido de malha, quente e aconchegante'
        WHEN material LIKE '%MDF%' THEN 'Material derivado de madeira, resistente e versátil'
        WHEN material LIKE '%Plástico%' THEN 'Material sintético, leve e fácil de limpar'
        ELSE 'Material de qualidade para produtos infantis'
    END as description,
    jsonb_build_object(
        'is_natural', material LIKE '%Algodão%' OR material LIKE '%Madeira%' OR material LIKE '%Bambu%',
        'is_washable', material NOT LIKE '%MDF%' AND material NOT LIKE '%Madeira%',
        'is_hypoallergenic', material LIKE '%Algodão%' OR material LIKE '%Bambu%'
    ) as properties
FROM (
    SELECT attributes->>'material' as material
    FROM products
    WHERE attributes->>'material' IS NOT NULL 
    AND attributes->>'material' != ''
    AND attributes->>'material' != 'None'
) materials
WHERE material IS NOT NULL;

-- =====================================================
-- 2. CRIAR TABELA DE TEMAS/ESTILOS
-- =====================================================
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color_palette JSONB DEFAULT '[]',
    target_age VARCHAR(50),
    target_gender VARCHAR(20),
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Popular temas
INSERT INTO themes (name, slug, description, target_gender, popularity_score)
SELECT 
    theme as name,
    LOWER(REGEXP_REPLACE(theme, '[^a-zA-Z0-9]', '-', 'g')) as slug,
    CASE 
        WHEN theme = 'Bichinhos' THEN 'Tema com animais fofos e divertidos'
        WHEN theme = 'Flores, Fadas e Borboletas' THEN 'Tema delicado com elementos da natureza'
        WHEN theme = 'Nuvem, Céu e Anjo' THEN 'Tema celestial e tranquilo'
        WHEN theme = 'Príncipes e Princesas' THEN 'Tema de contos de fadas e realeza'
        WHEN theme = 'Carrinho, Trem e Avião' THEN 'Tema de veículos e aventuras'
        WHEN theme = 'Disney' THEN 'Personagens clássicos da Disney'
        WHEN theme = 'Astronautas' THEN 'Tema espacial e futurista'
        WHEN theme = 'Safári' THEN 'Aventura na selva com animais selvagens'
        ELSE 'Tema decorativo para produtos infantis'
    END as description,
    CASE 
        WHEN theme IN ('Flores, Fadas e Borboletas', 'Príncipes e Princesas', 'Bailarinas e Bonecas') THEN 'feminino'
        WHEN theme IN ('Carrinho, Trem e Avião', 'Astronautas', 'Esportes e Brincadeiras') THEN 'masculino'
        ELSE 'unissex'
    END as target_gender,
    total as popularity_score
FROM (
    SELECT 
        attributes->>'theme' as theme,
        COUNT(*) as total
    FROM products
    WHERE attributes->>'theme' IS NOT NULL 
    AND attributes->>'theme' != ''
    AND attributes->>'theme' != 'None'
    GROUP BY theme
) themes
ORDER BY total DESC;

-- =====================================================
-- 3. CRIAR TABELA DE COLEÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    theme_id UUID REFERENCES themes(id),
    brand_id UUID REFERENCES brands(id),
    launch_date DATE,
    is_active BOOLEAN DEFAULT true,
    featured_image_url TEXT,
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Popular coleções
INSERT INTO collections (name, slug, description, product_count)
SELECT 
    collection as name,
    LOWER(REGEXP_REPLACE(collection, '[^a-zA-Z0-9]', '-', 'g')) as slug,
    'Coleção ' || collection || ' - ' || total || ' produtos disponíveis' as description,
    total as product_count
FROM (
    SELECT 
        attributes->>'collection' as collection,
        COUNT(*) as total
    FROM products
    WHERE attributes->>'collection' IS NOT NULL 
    AND attributes->>'collection' != ''
    AND attributes->>'collection' != 'None'
    GROUP BY collection
) collections
ORDER BY total DESC;

-- =====================================================
-- 4. CRIAR TABELA DE COMPOSIÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) UNIQUE NOT NULL,
    materials TEXT[],
    percentages INTEGER[],
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Popular composições
INSERT INTO compositions (name, materials, properties)
SELECT DISTINCT ON (composition)
    composition as name,
    string_to_array(composition, ', ') as materials,
    jsonb_build_object(
        'is_100_percent', composition LIKE '100%',
        'has_filling', composition LIKE '%Enchimento%',
        'thread_count', 
            CASE 
                WHEN composition LIKE '%180 Fios%' THEN 180
                WHEN composition LIKE '%150 Fios%' THEN 150
                ELSE NULL
            END
    ) as properties
FROM (
    SELECT attributes->>'composition' as composition
    FROM products
    WHERE attributes->>'composition' IS NOT NULL 
    AND attributes->>'composition' != ''
    AND attributes->>'composition' != 'None'
) compositions;

-- =====================================================
-- 5. CRIAR TABELA DE TAGS ORGANIZADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS tag_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organized_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category_id UUID REFERENCES tag_categories(id),
    usage_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar categorias de tags
INSERT INTO tag_categories (name, slug, description, color)
VALUES 
    ('Preço', 'preco', 'Tags relacionadas a preço e valor', '#4CAF50'),
    ('Gênero', 'genero', 'Tags de gênero e idade', '#2196F3'),
    ('Qualidade', 'qualidade', 'Tags de qualidade e acabamento', '#FF9800'),
    ('Tema', 'tema', 'Tags temáticas e decorativas', '#9C27B0'),
    ('Funcional', 'funcional', 'Tags de funcionalidade', '#795548');

-- Popular tags organizadas
INSERT INTO organized_tags (name, slug, category_id, usage_count, is_featured)
SELECT 
    tag,
    LOWER(REGEXP_REPLACE(tag, '[^a-zA-Z0-9]', '-', 'g')),
    CASE 
        WHEN tag IN ('bom-custo-beneficio', 'economia', 'barato') THEN 
            (SELECT id FROM tag_categories WHERE slug = 'preco')
        WHEN tag IN ('menina', 'menino', 'unissex', 'bebê', 'bebe', 'infantil') THEN 
            (SELECT id FROM tag_categories WHERE slug = 'genero')
        WHEN tag IN ('luxo', 'premium') THEN 
            (SELECT id FROM tag_categories WHERE slug = 'qualidade')
        WHEN tag IN ('organizacao', 'cestos') THEN 
            (SELECT id FROM tag_categories WHERE slug = 'funcional')
        ELSE 
            (SELECT id FROM tag_categories WHERE slug = 'tema')
    END,
    total,
    total > 1000
FROM (
    SELECT 
        unnest(tags) as tag,
        COUNT(*) as total
    FROM products
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
    GROUP BY tag
) tag_counts;

-- =====================================================
-- 6. CRIAR TABELA DE RELACIONAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS product_materials (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    percentage INTEGER,
    PRIMARY KEY (product_id, material_id)
);

CREATE TABLE IF NOT EXISTS product_themes (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, theme_id)
);

CREATE TABLE IF NOT EXISTS product_collections (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    position INTEGER,
    PRIMARY KEY (product_id, collection_id)
);

CREATE TABLE IF NOT EXISTS product_compositions (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    composition_id UUID REFERENCES compositions(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, composition_id)
);

-- =====================================================
-- 7. POPULAR RELACIONAMENTOS
-- =====================================================

-- Relacionar produtos com materiais
INSERT INTO product_materials (product_id, material_id, is_primary)
SELECT DISTINCT
    p.id,
    m.id,
    true
FROM products p
JOIN materials m ON m.name = p.attributes->>'material'
WHERE p.attributes->>'material' IS NOT NULL 
AND p.attributes->>'material' != ''
AND p.attributes->>'material' != 'None';

-- Relacionar produtos com temas
INSERT INTO product_themes (product_id, theme_id)
SELECT DISTINCT
    p.id,
    t.id
FROM products p
JOIN themes t ON t.name = p.attributes->>'theme'
WHERE p.attributes->>'theme' IS NOT NULL 
AND p.attributes->>'theme' != ''
AND p.attributes->>'theme' != 'None';

-- Relacionar produtos com coleções
INSERT INTO product_collections (product_id, collection_id)
SELECT DISTINCT
    p.id,
    c.id
FROM products p
JOIN collections c ON c.name = p.attributes->>'collection'
WHERE p.attributes->>'collection' IS NOT NULL 
AND p.attributes->>'collection' != ''
AND p.attributes->>'collection' != 'None';

-- Relacionar produtos com composições
INSERT INTO product_compositions (product_id, composition_id)
SELECT DISTINCT
    p.id,
    c.id
FROM products p
JOIN compositions c ON c.name = p.attributes->>'composition'
WHERE p.attributes->>'composition' IS NOT NULL 
AND p.attributes->>'composition' != ''
AND p.attributes->>'composition' != 'None';

-- =====================================================
-- 8. CRIAR SISTEMA DE GARANTIA
-- =====================================================
CREATE TABLE IF NOT EXISTS warranty_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warranty_months INTEGER NOT NULL,
    coverage_type VARCHAR(50) DEFAULT 'standard',
    terms TEXT,
    contact_info JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Todos produtos têm 3 meses de garantia
INSERT INTO warranty_terms (product_id, warranty_months, coverage_type, terms)
SELECT 
    id,
    3,
    'standard',
    'Garantia de 3 meses contra defeitos de fabricação. Não cobre danos por mau uso, desgaste natural ou acidentes.'
FROM products;

-- =====================================================
-- 9. CRIAR SISTEMA DE BUNDLES/KITS
-- =====================================================
CREATE TABLE IF NOT EXISTS product_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bundle_items (
    bundle_id UUID REFERENCES product_bundles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    PRIMARY KEY (bundle_id, product_id)
);

-- Criar bundles baseados em produtos que são kits
INSERT INTO product_bundles (name, slug, description, discount_percentage)
SELECT DISTINCT ON (nome_base)
    'Kit ' || nome_base,
    LOWER(REGEXP_REPLACE('kit-' || nome_base, '[^a-zA-Z0-9]', '-', 'g')),
    'Kit especial com produtos da linha ' || nome_base,
    10
FROM (
    SELECT 
        REGEXP_REPLACE(name, '\s*\d+\s*[Pp]eças?\s*', '', 'g') as nome_base,
        COUNT(*) as total
    FROM products
    WHERE name ILIKE '%kit%' OR name ILIKE '%conjunto%'
    GROUP BY nome_base
    HAVING COUNT(*) >= 3
) kits
LIMIT 20;

-- =====================================================
-- 10. CRIAR SISTEMA DE RECOMENDAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS product_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    recommended_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50), -- 'similar', 'complementary', 'upgrade'
    score DECIMAL(3,2),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, recommended_product_id)
);

-- Criar recomendações baseadas em tema e categoria
INSERT INTO product_recommendations (product_id, recommended_product_id, recommendation_type, score, reason)
SELECT DISTINCT ON (p1.id, p2.id)
    p1.id,
    p2.id,
    'similar',
    0.85,
    'Produtos do mesmo tema e categoria'
FROM products p1
JOIN products p2 ON 
    p1.category_id = p2.category_id 
    AND p1.attributes->>'theme' = p2.attributes->>'theme'
    AND p1.id != p2.id
    AND p1.seller_id = p2.seller_id
WHERE p1.attributes->>'theme' IS NOT NULL 
AND p1.attributes->>'theme' != 'None'
LIMIT 10000;

-- =====================================================
-- 11. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_material ON products((attributes->>'material'));
CREATE INDEX IF NOT EXISTS idx_products_theme ON products((attributes->>'theme'));
CREATE INDEX IF NOT EXISTS idx_products_collection ON products((attributes->>'collection'));
CREATE INDEX IF NOT EXISTS idx_products_composition ON products((attributes->>'composition'));
CREATE INDEX IF NOT EXISTS idx_product_materials_product ON product_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_product_themes_product ON product_themes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_product ON product_collections(product_id);

-- =====================================================
-- 12. ATUALIZAR ESTATÍSTICAS
-- =====================================================
UPDATE themes t
SET popularity_score = (
    SELECT COUNT(*) 
    FROM product_themes pt 
    WHERE pt.theme_id = t.id
);

UPDATE collections c
SET product_count = (
    SELECT COUNT(*) 
    FROM product_collections pc 
    WHERE pc.collection_id = c.id
);

-- =====================================================
-- RELATÓRIO FINAL
-- =====================================================
SELECT 
    'EXTRAÇÃO COMPLETA DE DADOS CONCLUÍDA' as status,
    (SELECT COUNT(*) FROM materials) as materiais_criados,
    (SELECT COUNT(*) FROM themes) as temas_criados,
    (SELECT COUNT(*) FROM collections) as colecoes_criadas,
    (SELECT COUNT(*) FROM compositions) as composicoes_criadas,
    (SELECT COUNT(*) FROM organized_tags) as tags_organizadas,
    (SELECT COUNT(*) FROM product_materials) as relacoes_material,
    (SELECT COUNT(*) FROM product_themes) as relacoes_tema,
    (SELECT COUNT(*) FROM product_collections) as relacoes_colecao,
    (SELECT COUNT(*) FROM warranty_terms) as garantias_criadas,
    (SELECT COUNT(*) FROM product_bundles) as bundles_criados,
    (SELECT COUNT(*) FROM product_recommendations) as recomendacoes_criadas;

COMMIT; 