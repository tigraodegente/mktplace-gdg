-- Script para adicionar integração AppMax ao marketplace
-- Execute este script no banco de dados para configurar a integração

-- 1. Criar tabela de gateways de pagamento se não existir
CREATE TABLE IF NOT EXISTS payment_gateways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  api_key TEXT,
  secret_key TEXT,
  environment VARCHAR(20) DEFAULT 'sandbox',
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT false,
  is_sandbox BOOLEAN DEFAULT true,
  supported_methods JSONB DEFAULT '[]',
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  priority INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Criar tabela para metadados de usuários nos gateways
CREATE TABLE IF NOT EXISTS payment_gateways_metadata (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  gateway VARCHAR(50),
  external_customer_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, gateway)
);

-- 3. Criar tabela para logs de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  gateway VARCHAR(50),
  event_id VARCHAR(255),
  event_type VARCHAR(100),
  payload JSONB,
  signature TEXT,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_event ON webhook_logs(gateway, event_id);

-- 4. Criar tabela para transações de pagamento
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  gateway VARCHAR(50),
  external_transaction_id VARCHAR(255),
  amount DECIMAL(10,2),
  status VARCHAR(50),
  method VARCHAR(50),
  response_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_external ON payment_transactions(gateway, external_transaction_id);

-- 5. Adicionar campos na tabela orders se necessário
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- 6. Inserir configuração inicial da AppMax (EXEMPLO - AJUSTE OS VALORES)
-- ATENÇÃO: Substitua os valores de exemplo pelos reais
INSERT INTO payment_gateways (
  name,
  display_name,
  api_key,
  environment,
  webhook_secret,
  is_active,
  is_sandbox,
  supported_methods,
  min_amount,
  max_amount,
  priority,
  config
) VALUES (
  'appmax',
  'AppMax',
  'SEU_TOKEN_API_AQUI', -- SUBSTITUA pelo token real
  'sandbox', -- Mude para 'production' quando for para produção
  'SEU_WEBHOOK_SECRET_AQUI', -- SUBSTITUA pelo secret real
  false, -- Mude para true quando estiver configurado
  true, -- false para produção
  '["credit_card", "debit_card", "pix", "boleto"]'::jsonb,
  1.00, -- Valor mínimo
  99999.00, -- Valor máximo
  100, -- Prioridade alta (quanto maior, mais prioridade)
  '{
    "pixExpirationMinutes": 60,
    "boletoExpirationDays": 3,
    "webhookEvents": ["payment.approved", "payment.declined", "payment.refunded", "payment.cancelled"]
  }'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  updated_at = NOW();

-- 7. Inserir gateway padrão/fallback se não existir
INSERT INTO payment_gateways (
  name,
  display_name,
  is_active,
  supported_methods,
  priority
) VALUES (
  'default',
  'Gateway Padrão',
  true,
  '["credit_card", "debit_card", "pix", "boleto"]'::jsonb,
  1
) ON CONFLICT (name) DO UPDATE SET
  updated_at = NOW();

-- 8. Criar função para selecionar gateway automaticamente
CREATE OR REPLACE FUNCTION select_payment_gateway(
  p_payment_method VARCHAR,
  p_order_total DECIMAL
) RETURNS VARCHAR AS $$
DECLARE
  v_gateway_name VARCHAR;
BEGIN
  SELECT name INTO v_gateway_name
  FROM payment_gateways
  WHERE is_active = true
    AND supported_methods::jsonb ? p_payment_method
    AND (min_amount IS NULL OR p_order_total >= min_amount)
    AND (max_amount IS NULL OR p_order_total <= max_amount)
  ORDER BY priority DESC
  LIMIT 1;
  
  RETURN COALESCE(v_gateway_name, 'default');
END;
$$ LANGUAGE plpgsql;

-- 9. Adicionar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE
  ON payment_gateways FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_gateways_metadata_updated_at BEFORE UPDATE
  ON payment_gateways_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE
  ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Comentários para documentação
COMMENT ON TABLE payment_gateways IS 'Configurações dos gateways de pagamento disponíveis';
COMMENT ON TABLE payment_gateways_metadata IS 'Metadados dos usuários em cada gateway (IDs externos, etc)';
COMMENT ON TABLE webhook_logs IS 'Logs de todos os webhooks recebidos dos gateways';
COMMENT ON TABLE payment_transactions IS 'Histórico de todas as transações de pagamento';

COMMENT ON COLUMN payment_gateways.priority IS 'Prioridade do gateway (maior = mais prioridade na seleção automática)';
COMMENT ON COLUMN payment_gateways.supported_methods IS 'Array JSON com métodos suportados: credit_card, debit_card, pix, boleto';

-- Fim do script 