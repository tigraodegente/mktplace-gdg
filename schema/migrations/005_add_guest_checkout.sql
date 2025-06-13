-- Migration 005: Implementar Checkout de Convidado
-- Permite checkout sem login capturando dados essenciais do convidado

-- 1. Modificar tabela orders para permitir user_id NULL e adicionar campos guest
ALTER TABLE orders 
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS guest_accepts_marketing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(255);

-- 2. Adicionar índices para performance em consultas de convidados
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_orders_guest_session ON orders(guest_session_id);

-- 3. Modificar order_status_history para permitir created_by NULL (convidados)
ALTER TABLE order_status_history 
  ALTER COLUMN created_by DROP NOT NULL;

-- 4. Modificar stock_movements para permitir created_by NULL (convidados)
ALTER TABLE stock_movements 
  ALTER COLUMN created_by DROP NOT NULL;

-- 5. Adicionar constraint para garantir que ou user_id ou guest_email estejam preenchidos
ALTER TABLE orders 
  ADD CONSTRAINT check_user_or_guest 
  CHECK (
    (user_id IS NOT NULL) OR 
    (guest_email IS NOT NULL AND guest_name IS NOT NULL)
  );

-- 6. Comentários para documentação
COMMENT ON COLUMN orders.guest_email IS 'Email do convidado para checkout sem login';
COMMENT ON COLUMN orders.guest_name IS 'Nome do convidado (capturado do endereço de entrega)';
COMMENT ON COLUMN orders.guest_phone IS 'Telefone do convidado para contato de entrega/suporte';
COMMENT ON COLUMN orders.guest_accepts_marketing IS 'Consentimento LGPD para receber comunicações de marketing';
COMMENT ON COLUMN orders.guest_session_id IS 'ID da sessão para tracking de conversão e analytics'; 