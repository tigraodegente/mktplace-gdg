-- =====================================================
-- SISTEMA DE CHECKOUT - TABELAS BÁSICAS
-- =====================================================

-- Verificar se as extensões necessárias existem
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABELA DE PEDIDOS (ORDERS)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Status do pedido
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
    ),
    
    -- Valores monetários
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    
    -- Cupom aplicado
    coupon_code VARCHAR(50),
    
    -- Endereço de entrega (JSON para flexibilidade)
    shipping_address JSONB NOT NULL,
    
    -- Método de pagamento
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'timeout')
    ),
    
    -- Dados de envio
    shipping_tracking VARCHAR(100),
    shipping_method VARCHAR(50),
    
    -- Observações
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ITENS DO PEDIDO (ORDER_ITEMS)
-- =====================================================
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

-- =====================================================
-- 3. PAGAMENTOS (PAYMENTS)
-- =====================================================
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

-- =====================================================
-- 4. FILA DE PROCESSAMENTO (PAYMENT_QUEUE)
-- =====================================================
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

-- =====================================================
-- 5. HISTÓRICO DE STATUS (ORDER_STATUS_HISTORY)
-- =====================================================
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

-- =====================================================
-- 6. FILA DE EMAILS (EMAIL_QUEUE)
-- =====================================================
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

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);

-- Payment Queue
CREATE INDEX IF NOT EXISTS idx_payment_queue_payment_id ON payment_queue(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_queue_status ON payment_queue(status);

-- Order Status History
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- Email Queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS
-- =====================================================
INSERT INTO email_queue (to_email, to_name, subject, template, template_data, status)
VALUES (
    'admin@marketplace.com',
    'Admin',
    'Sistema de checkout instalado',
    'system_notification',
    '{"message": "Sistema de checkout básico foi configurado"}',
    'pending'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
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