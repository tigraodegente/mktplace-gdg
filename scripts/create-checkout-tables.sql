-- =====================================================
-- SISTEMA DE CHECKOUT E PAGAMENTOS - SCHEMA COMPLETO
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
    estimated_delivery_date DATE,
    
    -- Observações
    notes TEXT,
    customer_notes TEXT,
    
    -- Metadados
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance (criados após a tabela)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

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
    
    -- Dados do vendedor
    seller_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- =====================================================
-- 3. PAGAMENTOS (PAYMENTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- ID externo do gateway de pagamento
    external_id VARCHAR(255),
    gateway VARCHAR(50) NOT NULL DEFAULT 'mock', -- mock, mercadopago, stripe, etc
    
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
    
    -- Metadados
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

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
    error_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_queue_payment_id ON payment_queue(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_queue_status ON payment_queue(status);
CREATE INDEX IF NOT EXISTS idx_payment_queue_scheduled_at ON payment_queue(scheduled_at);

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
    created_by_type VARCHAR(20) DEFAULT 'user' CHECK (
        created_by_type IN ('user', 'admin', 'system', 'webhook')
    ),
    
    -- Observações
    notes TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

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
    
    -- Prioridade e agendamento
    priority INTEGER DEFAULT 1 CHECK (priority >= 1),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'sending', 'sent', 'failed', 'retrying')
    ),
    
    -- Controle de tentativas
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Logs
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);

-- =====================================================
-- 7. CARRINHO COMPARTILHADO (SHARED_CARTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS shared_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados do carrinho
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    coupon_code VARCHAR(50),
    shipping_address JSONB,
    
    -- Metadados
    created_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shared_carts_created_by ON shared_carts(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_carts_expires_at ON shared_carts(expires_at);

-- =====================================================
-- 8. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
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
-- 9. TRIGGER PARA HISTÓRICO DE STATUS
-- =====================================================
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

-- Aplicar trigger
DROP TRIGGER IF EXISTS log_order_status_change_trigger ON orders;
CREATE TRIGGER log_order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- =====================================================
-- 10. DADOS INICIAIS E CONFIGURAÇÕES
-- =====================================================

-- Inserir dados de exemplo para testes
INSERT INTO email_queue (to_email, to_name, subject, template, template_data, status)
VALUES (
    'admin@marketplace.com',
    'Admin',
    'Sistema de checkout instalado',
    'system_notification',
    '{"message": "Sistema de checkout e pagamentos foi configurado com sucesso"}',
    'pending'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. VIEWS ÚTEIS (criadas por último)
-- =====================================================

-- View para resumo de pedidos
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.user_id,
    u.name as user_name,
    u.email as user_email,
    o.status,
    o.payment_status,
    o.total_amount,
    o.created_at,
    COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.name, u.email;

-- View para métricas de vendas
CREATE OR REPLACE VIEW sales_metrics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as orders_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as average_order_value,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Criar índice para coupon_code após a criação da tabela
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code) WHERE coupon_code IS NOT NULL;

-- Comentários nas tabelas
COMMENT ON TABLE orders IS 'Tabela principal de pedidos do marketplace';
COMMENT ON TABLE order_items IS 'Itens individuais de cada pedido';
COMMENT ON TABLE payments IS 'Transações de pagamento';
COMMENT ON TABLE payment_queue IS 'Fila para processamento assíncrono de pagamentos';
COMMENT ON TABLE order_status_history IS 'Histórico de mudanças de status dos pedidos';
COMMENT ON TABLE email_queue IS 'Fila para envio de emails';
COMMENT ON TABLE shared_carts IS 'Carrinhos compartilhados entre dispositivos';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN (
    'orders', 'order_items', 'payments', 'payment_queue', 
    'order_status_history', 'email_queue', 'shared_carts'
)
ORDER BY tablename; 