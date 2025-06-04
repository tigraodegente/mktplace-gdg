-- =====================================================
-- SINCRONIZAÇÃO: Aba Avançada com Banco de Dados (CORRIGIDO)
-- =====================================================
-- Script para adicionar campos usados na aba Avançada
-- que ainda não existem no banco de dados

BEGIN;

-- 1. ADICIONAR CAMPOS FALTANTES NA TABELA PRODUCTS
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS warranty_period VARCHAR(100),
ADD COLUMN IF NOT EXISTS requires_shipping BOOLEAN DEFAULT true;

-- 2. CRIAR TABELAS PARA RELACIONAMENTOS

-- Tabela de produtos relacionados (similar, complementar)
CREATE TABLE IF NOT EXISTS product_related (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) DEFAULT 'similar' CHECK (relation_type IN ('similar', 'complementary', 'accessory', 'alternative')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, related_product_id)
);

-- Tabela de downloads de produtos digitais
CREATE TABLE IF NOT EXISTS product_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    download_limit INTEGER DEFAULT -1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_product_related_product_id ON product_related(product_id);
CREATE INDEX IF NOT EXISTS idx_product_related_related_id ON product_related(related_product_id);
CREATE INDEX IF NOT EXISTS idx_product_related_type ON product_related(relation_type);
CREATE INDEX IF NOT EXISTS idx_product_downloads_product_id ON product_downloads(product_id);
CREATE INDEX IF NOT EXISTS idx_product_downloads_active ON product_downloads(is_active);

-- 4. ADICIONAR COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON COLUMN products.warranty_period IS 'Período de garantia (ex: 12 meses, 2 anos)';
COMMENT ON COLUMN products.requires_shipping IS 'Produto precisa de envio físico';
COMMENT ON TABLE product_related IS 'Produtos relacionados (similares, complementares, etc)';
COMMENT ON TABLE product_downloads IS 'Arquivos digitais para download de produtos digitais';

COMMIT;

-- =====================================================
-- VERIFICAÇÃO: Consultar campos e tabelas criados
-- =====================================================

-- Verificar novos campos na tabela products
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('warranty_period', 'requires_shipping')
ORDER BY column_name;

-- Verificar novas tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('product_related', 'product_downloads')
  AND table_schema = 'public'
ORDER BY table_name; 