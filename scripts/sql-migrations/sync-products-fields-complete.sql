-- =====================================================
-- SINCRONIZAÇÃO COMPLETA: CAMPOS DE PRODUTOS
-- =====================================================
-- Script para adicionar todos os campos usados nas telas
-- mas que ainda não existem no banco de dados

BEGIN;

-- 1. ADICIONAR CAMPOS FALTANTES NA TABELA PRODUCTS
ALTER TABLE products 
-- Campos de envio e entrega
ADD COLUMN IF NOT EXISTS has_free_shipping BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS seller_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS seller_city VARCHAR(100),

-- Campos de produto digital
ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_shipping BOOLEAN DEFAULT true,

-- Campos fiscais e legais
ADD COLUMN IF NOT EXISTS tax_class VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS ncm_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS gtin VARCHAR(20),
ADD COLUMN IF NOT EXISTS origin VARCHAR(5) DEFAULT '0',
ADD COLUMN IF NOT EXISTS manufacturing_country VARCHAR(2),

-- Campos de estoque
ADD COLUMN IF NOT EXISTS low_stock_alert INTEGER,

-- Campos de garantia e suporte
ADD COLUMN IF NOT EXISTS care_instructions TEXT,
ADD COLUMN IF NOT EXISTS manual_link TEXT,

-- Campos de configuração
ADD COLUMN IF NOT EXISTS allow_reviews BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS age_restricted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN DEFAULT false,

-- Campos internos
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 2. ADICIONAR COMENTÁRIOS NOS CAMPOS
COMMENT ON COLUMN products.has_free_shipping IS 'Produto tem frete grátis';
COMMENT ON COLUMN products.delivery_days IS 'Dias estimados para entrega';
COMMENT ON COLUMN products.seller_state IS 'Estado do vendedor para cálculo de frete';
COMMENT ON COLUMN products.seller_city IS 'Cidade do vendedor para cálculo de frete';
COMMENT ON COLUMN products.is_digital IS 'Produto é digital (download/serviço)';
COMMENT ON COLUMN products.requires_shipping IS 'Produto precisa de envio físico';
COMMENT ON COLUMN products.tax_class IS 'Classe tributária: standard, reduced, zero, food, medicine, books';
COMMENT ON COLUMN products.ncm_code IS 'Código NCM para nota fiscal';
COMMENT ON COLUMN products.gtin IS 'Código GTIN/EAN global';
COMMENT ON COLUMN products.origin IS 'Origem fiscal: 0-Nacional, 1-Importado direto, etc';
COMMENT ON COLUMN products.manufacturing_country IS 'País de fabricação (código ISO 2 letras)';
COMMENT ON COLUMN products.low_stock_alert IS 'Quantidade mínima para alerta de estoque baixo';
COMMENT ON COLUMN products.care_instructions IS 'Instruções de cuidado e manutenção';
COMMENT ON COLUMN products.manual_link IS 'URL do manual do produto';
COMMENT ON COLUMN products.allow_reviews IS 'Permite avaliações dos clientes';
COMMENT ON COLUMN products.age_restricted IS 'Produto com restrição de idade (+18)';
COMMENT ON COLUMN products.is_customizable IS 'Produto aceita personalização';
COMMENT ON COLUMN products.internal_notes IS 'Notas internas não visíveis para clientes';

-- 3. ATUALIZAR COMENTÁRIOS DOS CAMPOS JSONB
COMMENT ON COLUMN products.attributes IS 'Atributos técnicos do produto para filtros dinâmicos (cor, tamanho, etc)';
COMMENT ON COLUMN products.specifications IS 'Especificações técnicas detalhadas do produto';
COMMENT ON COLUMN products.featuring IS 'Recursos especiais: custom_fields, download_files, etc';

-- 4. CRIAR TABELAS RELACIONADAS

-- Tabela de produtos relacionados
CREATE TABLE IF NOT EXISTS product_related (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) DEFAULT 'similar', -- similar, complementary, bundle
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, related_product_id)
);

-- Tabela de produtos upsell/cross-sell
CREATE TABLE IF NOT EXISTS product_upsells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upsell_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upsell_type VARCHAR(50) DEFAULT 'upsell', -- upsell, cross-sell
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, upsell_product_id)
);

-- Tabela de downloads de produtos digitais
CREATE TABLE IF NOT EXISTS product_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    download_limit INTEGER, -- limite de downloads por compra
    expires_days INTEGER, -- dias até expirar o link
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_has_free_shipping ON products(has_free_shipping) WHERE has_free_shipping = true;
CREATE INDEX IF NOT EXISTS idx_products_is_digital ON products(is_digital) WHERE is_digital = true;
CREATE INDEX IF NOT EXISTS idx_products_age_restricted ON products(age_restricted) WHERE age_restricted = true;
CREATE INDEX IF NOT EXISTS idx_products_tax_class ON products(tax_class);
CREATE INDEX IF NOT EXISTS idx_products_delivery_days ON products(delivery_days);

CREATE INDEX IF NOT EXISTS idx_product_related_product ON product_related(product_id);
CREATE INDEX IF NOT EXISTS idx_product_related_related ON product_related(related_product_id);
CREATE INDEX IF NOT EXISTS idx_product_upsells_product ON product_upsells(product_id);
CREATE INDEX IF NOT EXISTS idx_product_downloads_product ON product_downloads(product_id);

-- 6. ADICIONAR TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_related_updated_at BEFORE UPDATE ON product_related
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_upsells_updated_at BEFORE UPDATE ON product_upsells
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_downloads_updated_at BEFORE UPDATE ON product_downloads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. MIGRAR DADOS DE WARRANTY_PERIOD DUPLICADO
-- Se existir warranty_period em featuring, mover para o campo principal
UPDATE products 
SET warranty_period = COALESCE(
    warranty_period,
    featuring->>'warranty_period',
    ''
)
WHERE featuring ? 'warranty_period';

-- 8. MIGRAR CUSTOM_FIELDS PARA FEATURING
UPDATE products 
SET featuring = jsonb_set(
    COALESCE(featuring, '{}'::jsonb),
    '{custom_fields}',
    COALESCE(featuring->'custom_fields', '{}'::jsonb),
    true
)
WHERE featuring ? 'custom_fields' OR featuring IS NULL;

-- 9. ESTATÍSTICAS DA MIGRAÇÃO
SELECT 
    'Estatísticas da Migração' as info,
    COUNT(*) as total_produtos,
    COUNT(*) FILTER (WHERE has_free_shipping = true) as com_frete_gratis,
    COUNT(*) FILTER (WHERE is_digital = true) as produtos_digitais,
    COUNT(*) FILTER (WHERE age_restricted = true) as com_restricao_idade,
    COUNT(*) FILTER (WHERE attributes IS NOT NULL AND attributes != '{}'::jsonb) as com_atributos,
    COUNT(*) FILTER (WHERE specifications IS NOT NULL AND specifications != '{}'::jsonb) as com_especificacoes
FROM products;

COMMIT;

-- 10. VERIFICAÇÃO FINAL
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
        'has_free_shipping', 'delivery_days', 'seller_state', 'seller_city',
        'is_digital', 'requires_shipping', 'tax_class', 'ncm_code', 'gtin',
        'origin', 'manufacturing_country', 'low_stock_alert', 'care_instructions',
        'manual_link', 'allow_reviews', 'age_restricted', 'is_customizable',
        'internal_notes'
    )
ORDER BY ordinal_position; 