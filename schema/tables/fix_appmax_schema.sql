-- Script para corrigir problemas de schema para AppMax

-- 1. Recriar tabela payment_gateways_metadata com tipo correto
DROP TABLE IF EXISTS payment_gateways_metadata;

CREATE TABLE payment_gateways_metadata (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id), -- Corrigido para UUID
  gateway VARCHAR(50),
  external_customer_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, gateway)
);

-- 2. Verificar e adicionar coluna gateway em payment_transactions se não existir
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS gateway VARCHAR(50);

-- 3. Adicionar índice se não existir
CREATE INDEX IF NOT EXISTS idx_payment_gateway ON payment_transactions(gateway);

-- 4. Adicionar trigger para updated_at
CREATE TRIGGER update_payment_gateways_metadata_updated_at BEFORE UPDATE
  ON payment_gateways_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Comentários
COMMENT ON TABLE payment_gateways_metadata IS 'Metadados dos usuários em cada gateway (IDs externos, etc)';

-- 6. Atualizar transações existentes com gateway padrão
UPDATE payment_transactions 
SET gateway = 'default' 
WHERE gateway IS NULL;

-- 7. Verificar estrutura final
SELECT '=== ESTRUTURA CORRIGIDA ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_gateways_metadata'
ORDER BY ordinal_position;

SELECT '=== PAYMENT_TRANSACTIONS ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_transactions' 
  AND column_name IN ('gateway', 'order_id', 'external_transaction_id')
ORDER BY ordinal_position; 