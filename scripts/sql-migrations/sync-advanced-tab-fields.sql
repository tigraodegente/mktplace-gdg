-- =====================================================
-- SINCRONIZAÇÃO: Aba Avançada com Banco de Dados
-- =====================================================
-- Script para adicionar campos usados na aba Avançada
-- que ainda não existem no banco de dados

BEGIN;

-- 1. ADICIONAR CAMPOS FALTANTES NA TABELA PRODUCTS
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS warranty_period VARCHAR(100) COMMENT 'Período de garantia (ex: 12 meses, 2 anos)',
ADD COLUMN IF NOT EXISTS requires_shipping BOOLEAN DEFAULT true COMMENT 'Produto precisa de envio físico';

-- 2. CRIAR TABELAS PARA RELACIONAMENTOS

-- Tabela de produtos relacionados (similar, complementar)
CREATE TABLE IF NOT EXISTS product_related (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) DEFAULT 'similar' CHECK (relation_type IN ('similar', 'complementary', 'alternative')),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, related_product_id)
);

-- Tabela de produtos upsell/cross-sell
CREATE TABLE IF NOT EXISTS product_upsell (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upsell_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upsell_type VARCHAR(50) DEFAULT 'upsell' CHECK (upsell_type IN ('upsell', 'cross_sell')),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, upsell_product_id)
);

-- Tabela de arquivos digitais para download
CREATE TABLE IF NOT EXISTS product_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER, -- em bytes
    file_type VARCHAR(50), -- pdf, zip, exe, etc
    download_limit INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_product_related_product_id ON product_related(product_id);
CREATE INDEX IF NOT EXISTS idx_product_related_related_id ON product_related(related_product_id);
CREATE INDEX IF NOT EXISTS idx_product_upsell_product_id ON product_upsell(product_id);
CREATE INDEX IF NOT EXISTS idx_product_upsell_upsell_id ON product_upsell(upsell_product_id);
CREATE INDEX IF NOT EXISTS idx_product_downloads_product_id ON product_downloads(product_id);

-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE product_related IS 'Produtos relacionados, similares ou complementares';
COMMENT ON TABLE product_upsell IS 'Produtos para upsell e cross-sell';
COMMENT ON TABLE product_downloads IS 'Arquivos digitais para download de produtos digitais';

COMMIT;

-- =====================================================
-- VERIFICAÇÃO: Consultar campos sincronizados
-- =====================================================

-- Verificar se os campos foram adicionados
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('warranty_period', 'requires_shipping')
ORDER BY column_name;

-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('product_related', 'product_upsell', 'product_downloads')
ORDER BY table_name; 