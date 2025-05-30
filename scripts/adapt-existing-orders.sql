-- ====================================================================
-- ADAPTAÇÃO DA TABELA ORDERS EXISTENTE PARA O SISTEMA DE CHECKOUT
-- ====================================================================

-- Adicionar colunas que podem estar faltando
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS shipping_tracking VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Verificar e criar constraints se não existirem
ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS orders_status_check 
CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'));

ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS orders_payment_status_check 
CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'timeout'));

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code) WHERE coupon_code IS NOT NULL;

-- ====================================================================
-- CRIAR TABELAS QUE NÃO EXISTEM
-- ====================================================================

-- Verificar se tabela order_items existe, se não, criar
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    
    -- Quantidade e preços
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    
    -- Snapshot do produto no momento da compra
    product_snapshot JSONB NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ====================================================================
-- TABELA DE PAGAMENTOS
-- ====================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- ID externo do gateway de pagamento
    external_id VARCHAR(255),
    gateway VARCHAR(50) NOT NULL DEFAULT 'mock',
    
    -- Método e status
    method VARCHAR(50) NOT NULL CHECK (
        method IN ('pix', 'credit_card', 'debit_card', 'boleto', 'bank_transfer')
    ),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'timeout', 'cancelled')
    ),
    
    -- Valor
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'BRL',
    
    -- Dados específicos por método de pagamento
    payment_data JSONB,
    
    -- Resposta do gateway
    gateway_response JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);

-- ====================================================================
-- FILA DE PROCESSAMENTO
-- ====================================================================
CREATE TABLE IF NOT EXISTS payment_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Status da fila
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'retrying')
    ),
    
    -- Controle de tentativas
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER DEFAULT 3 CHECK (max_attempts > 0),
    
    -- Agendamento
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Logs de erro
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para payment_queue
CREATE INDEX IF NOT EXISTS idx_payment_queue_payment_id ON payment_queue(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_queue_status ON payment_queue(status);

-- ====================================================================
-- HISTÓRICO DE STATUS
-- ====================================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Status anterior e novo
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    
    -- Quem alterou e quando
    created_by UUID REFERENCES users(id),
    created_by_type VARCHAR(20) DEFAULT 'system' CHECK (
        created_by_type IN ('user', 'admin', 'system', 'webhook')
    ),
    
    -- Observações
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para order_status_history
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- ====================================================================
-- FILA DE EMAILS
-- ====================================================================
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados do email
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    template VARCHAR(100) NOT NULL,
    template_data JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'sending', 'sent', 'failed', 'retrying')
    ),
    
    -- Controle de tentativas
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Agendamento
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para email_queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);

-- ====================================================================
-- TRIGGERS
-- ====================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para histórico de status
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Só log se o status realmente mudou
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (
            order_id, 
            previous_status, 
            new_status, 
            created_by_type,
            notes
        ) VALUES (
            NEW.id, 
            OLD.status, 
            NEW.status, 
            'system',
            'Status alterado automaticamente'
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger para log de status
DROP TRIGGER IF EXISTS log_order_status_change_trigger ON orders;
CREATE TRIGGER log_order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ====================================================================
-- VERIFICAÇÃO FINAL
-- ====================================================================
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE tablename IN (
    'orders', 'order_items', 'payments', 'payment_queue', 
    'order_status_history', 'email_queue'
)
AND schemaname = 'public'
ORDER BY tablename; 