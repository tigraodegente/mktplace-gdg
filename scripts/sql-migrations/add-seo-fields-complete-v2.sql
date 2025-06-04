-- =====================================================
-- ADICIONAR CAMPOS SEO FALTANTES NA TABELA PRODUCTS (V2)
-- =====================================================
-- Script para sincronizar os campos da aba SEO com o banco de dados

BEGIN;

-- 1. ADICIONAR CAMPOS SEO FALTANTES
ALTER TABLE products 
-- URL e Estrutura
ADD COLUMN IF NOT EXISTS canonical_url TEXT,

-- Configurações Avançadas de SEO
ADD COLUMN IF NOT EXISTS robots_meta VARCHAR(50) DEFAULT 'index,follow',
ADD COLUMN IF NOT EXISTS schema_type VARCHAR(50) DEFAULT 'Product',

-- Open Graph (Redes Sociais)
ADD COLUMN IF NOT EXISTS og_title TEXT,
ADD COLUMN IF NOT EXISTS og_description TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT,

-- Configurações de Indexação
ADD COLUMN IF NOT EXISTS seo_index BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS seo_follow BOOLEAN DEFAULT true;

-- 2. ADICIONAR COMENTÁRIOS EXPLICATIVOS
COMMENT ON COLUMN products.canonical_url IS 'URL canônica do produto para SEO';
COMMENT ON COLUMN products.robots_meta IS 'Configuração robots meta (index,follow, noindex,follow, etc)';
COMMENT ON COLUMN products.schema_type IS 'Tipo de schema structured data (Product, CreativeWork, Thing)';
COMMENT ON COLUMN products.og_title IS 'Título Open Graph para redes sociais';
COMMENT ON COLUMN products.og_description IS 'Descrição Open Graph para redes sociais';
COMMENT ON COLUMN products.og_image IS 'URL da imagem Open Graph para redes sociais';
COMMENT ON COLUMN products.seo_index IS 'Permitir indexação pelos motores de busca';
COMMENT ON COLUMN products.seo_follow IS 'Permitir seguir links pelos motores de busca';

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_seo_index ON products(seo_index) WHERE seo_index = true;
CREATE INDEX IF NOT EXISTS idx_products_seo_follow ON products(seo_follow) WHERE seo_follow = true;
CREATE INDEX IF NOT EXISTS idx_products_robots_meta ON products(robots_meta);
CREATE INDEX IF NOT EXISTS idx_products_schema_type ON products(schema_type);

-- 4. DEFINIR VALORES PADRÃO PARA PRODUTOS EXISTENTES
UPDATE products 
SET 
    robots_meta = COALESCE(robots_meta, 'index,follow'),
    schema_type = COALESCE(schema_type, 'Product'),
    seo_index = COALESCE(seo_index, true),
    seo_follow = COALESCE(seo_follow, true)
WHERE robots_meta IS NULL 
   OR schema_type IS NULL 
   OR seo_index IS NULL 
   OR seo_follow IS NULL;

-- 5. GERAR URLs CANÔNICAS AUTOMÁTICAS
UPDATE products 
SET canonical_url = 'https://www.marketplace-gdg.com.br/produto/' || slug
WHERE canonical_url IS NULL 
  AND slug IS NOT NULL 
  AND slug != '';

-- 6. GERAR OPEN GRAPH AUTOMATICAMENTE A PARTIR DOS DADOS EXISTENTES
-- OG Title baseado no meta_title ou name
UPDATE products 
SET og_title = COALESCE(meta_title, name)
WHERE og_title IS NULL 
  AND (meta_title IS NOT NULL OR name IS NOT NULL);

-- OG Description baseada no meta_description ou description
UPDATE products 
SET og_description = COALESCE(
    CASE 
        WHEN meta_description IS NOT NULL AND LENGTH(meta_description) > 0 
        THEN LEFT(meta_description, 160)
        WHEN description IS NOT NULL AND LENGTH(description) > 0 
        THEN LEFT(description, 160)
        ELSE 'Confira este produto incrível no Marketplace GDG'
    END
)
WHERE og_description IS NULL;

-- 7. VALIDAÇÃO DOS DADOS
-- Verificar se meta_title não excede 60 caracteres
UPDATE products 
SET meta_title = LEFT(meta_title, 60)
WHERE meta_title IS NOT NULL AND LENGTH(meta_title) > 60;

-- Verificar se meta_description não excede 160 caracteres
UPDATE products 
SET meta_description = LEFT(meta_description, 160)
WHERE meta_description IS NOT NULL AND LENGTH(meta_description) > 160;

COMMIT;

-- 8. RELATÓRIO DE SINCRONIZAÇÃO (executar fora da transação)
SELECT 
    'RELATÓRIO DE SINCRONIZAÇÃO SEO' as titulo,
    COUNT(*) as total_produtos,
    COUNT(*) FILTER (WHERE meta_title IS NOT NULL AND meta_title != '') as com_meta_title,
    COUNT(*) FILTER (WHERE meta_description IS NOT NULL AND meta_description != '') as com_meta_description,
    COUNT(*) FILTER (WHERE meta_keywords IS NOT NULL AND array_length(meta_keywords, 1) > 0) as com_meta_keywords,
    COUNT(*) FILTER (WHERE canonical_url IS NOT NULL AND canonical_url != '') as com_canonical_url,
    COUNT(*) FILTER (WHERE og_title IS NOT NULL AND og_title != '') as com_og_title,
    COUNT(*) FILTER (WHERE og_description IS NOT NULL AND og_description != '') as com_og_description,
    COUNT(*) FILTER (WHERE og_image IS NOT NULL AND og_image != '') as com_og_image,
    COUNT(*) FILTER (WHERE seo_index = true) as indexaveis,
    COUNT(*) FILTER (WHERE seo_follow = true) as com_follow_links,
    COUNT(*) FILTER (WHERE robots_meta = 'index,follow') as robots_padrao
FROM products;

-- 9. VERIFICAR ESTRUTURA FINAL DA TABELA
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'products'
    AND column_name IN (
        'meta_title', 'meta_description', 'meta_keywords', 'tags', 'slug',
        'canonical_url', 'robots_meta', 'schema_type', 
        'og_title', 'og_description', 'og_image',
        'seo_index', 'seo_follow'
    )
ORDER BY ordinal_position;

-- 10. EXEMPLOS DE DADOS APÓS MIGRAÇÃO
SELECT 
    name,
    meta_title,
    CASE 
        WHEN meta_description IS NOT NULL 
        THEN LEFT(meta_description, 50) || '...' 
        ELSE 'N/A'
    END as meta_desc_preview,
    canonical_url,
    robots_meta,
    schema_type,
    og_title,
    seo_index,
    seo_follow
FROM products
WHERE name IS NOT NULL
LIMIT 5; 