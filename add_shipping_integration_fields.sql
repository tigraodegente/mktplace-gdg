-- =====================================================
-- MIGRATION: Adicionar campos de integração de transportadoras
-- =====================================================

-- Adicionar campos genéricos para qualquer transportadora
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_provider VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_provider_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_response JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_attempts INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_shipping_attempt TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_webhook_data JSONB;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_shipping_provider ON orders(shipping_provider);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_attempts ON orders(shipping_attempts);

-- Constraint para status válidos
ALTER TABLE orders ADD CONSTRAINT check_shipping_status 
CHECK (shipping_status IN ('pending', 'sending', 'sent', 'failed', 'cancelled'));

-- Comentários para documentação
COMMENT ON COLUMN orders.shipping_provider IS 'Nome do provedor de transporte (cubbo, correios, etc)';
COMMENT ON COLUMN orders.shipping_provider_id IS 'ID do pedido no sistema da transportadora';
COMMENT ON COLUMN orders.shipping_status IS 'Status da integração com transportadora';
COMMENT ON COLUMN orders.shipping_response IS 'Resposta completa da API da transportadora';
COMMENT ON COLUMN orders.shipping_attempts IS 'Número de tentativas de envio';
COMMENT ON COLUMN orders.last_shipping_attempt IS 'Timestamp da última tentativa';
COMMENT ON COLUMN orders.shipping_error IS 'Último erro da integração';
COMMENT ON COLUMN orders.shipping_webhook_data IS 'Dados recebidos via webhook da transportadora'; 