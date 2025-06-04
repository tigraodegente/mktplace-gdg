-- Migração: Corrigir colunas faltando no banco
-- Data: 2025-06-04
-- Descrição: Adicionar colunas de shipping na tabela products e coluna updated_at na tabela notifications

-- =====================================================
-- 1. ADICIONAR COLUNAS DE SHIPPING NA TABELA PRODUCTS
-- =====================================================

-- Adicionar colunas de configuração de shipping
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_pac BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_sedex BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_carrier BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_pickup BOOLEAN DEFAULT false;

-- Criar comentários para documentar as colunas
COMMENT ON COLUMN products.shipping_pac IS 'Permite envio via PAC';
COMMENT ON COLUMN products.shipping_sedex IS 'Permite envio via SEDEX';
COMMENT ON COLUMN products.shipping_carrier IS 'Permite envio via transportadora';
COMMENT ON COLUMN products.shipping_pickup IS 'Permite retirada na loja';

-- =====================================================
-- 2. ADICIONAR COLUNA UPDATED_AT NA TABELA NOTIFICATIONS
-- =====================================================

-- Adicionar coluna updated_at se não existir
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at automaticamente na tabela notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Atualizar registros existentes para ter updated_at igual a created_at
UPDATE notifications 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para as colunas de shipping
CREATE INDEX IF NOT EXISTS idx_products_shipping_pac ON products(shipping_pac) WHERE shipping_pac = true;
CREATE INDEX IF NOT EXISTS idx_products_shipping_sedex ON products(shipping_sedex) WHERE shipping_sedex = true;
CREATE INDEX IF NOT EXISTS idx_products_shipping_carrier ON products(shipping_carrier) WHERE shipping_carrier = true;
CREATE INDEX IF NOT EXISTS idx_products_shipping_pickup ON products(shipping_pickup) WHERE shipping_pickup = true;

-- Índice para updated_at da tabela notifications
CREATE INDEX IF NOT EXISTS idx_notifications_updated_at ON notifications(updated_at);

-- =====================================================
-- 4. ATUALIZAR DADOS EXISTENTES (OPCIONAL)
-- =====================================================

-- Definir configurações padrão para produtos existentes
-- (Todos os produtos habilitados para PAC e SEDEX por padrão)
UPDATE products 
SET 
    shipping_pac = true,
    shipping_sedex = true,
    shipping_carrier = false,
    shipping_pickup = false
WHERE 
    shipping_pac IS NULL 
    OR shipping_sedex IS NULL 
    OR shipping_carrier IS NULL 
    OR shipping_pickup IS NULL;

COMMIT; 