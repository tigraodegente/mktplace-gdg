-- =====================================================
-- CRIAÇÃO DE TABELAS FALTANTES - MARKETPLACE GDG
-- =====================================================
-- Este script cria:
-- 1. Sistema de Cupons
-- 2. Lista de Desejos
-- 3. Métodos de Envio
-- 4. Métodos de Pagamento
-- 5. Sistema de Notificações
-- 6. Tabelas auxiliares necessárias
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SISTEMA DE CUPONS
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    minimum_value DECIMAL(10,2) DEFAULT 0,
    maximum_discount DECIMAL(10,2), -- Para cupons de porcentagem
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    usage_per_customer INTEGER DEFAULT 1,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    seller_id UUID REFERENCES sellers(id), -- NULL = cupom geral da loja
    category_id UUID REFERENCES categories(id), -- Cupom específico de categoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de uso de cupons
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discount_applied DECIMAL(10,2) NOT NULL,
    UNIQUE(coupon_id, order_id)
);

-- Índices para cupons
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active) WHERE is_active = true;
CREATE INDEX idx_coupons_seller ON coupons(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);

-- =====================================================
-- 2. LISTA DE DESEJOS (WISHLIST)
-- =====================================================
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified_price_drop BOOLEAN DEFAULT false,
    notified_back_in_stock BOOLEAN DEFAULT false,
    UNIQUE(user_id, product_id, variant_id)
);

-- Índices para wishlist
CREATE INDEX idx_wishlist_user ON wishlists(user_id);
CREATE INDEX idx_wishlist_product ON wishlists(product_id);
CREATE INDEX idx_wishlist_added ON wishlists(added_at);

-- =====================================================
-- 3. MÉTODOS DE ENVIO
-- =====================================================
CREATE TABLE IF NOT EXISTS shipping_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    carrier VARCHAR(50) NOT NULL CHECK (carrier IN ('correios', 'transportadora', 'motoboy', 'retirada')),
    description TEXT,
    estimated_days_min INTEGER NOT NULL DEFAULT 1,
    estimated_days_max INTEGER NOT NULL DEFAULT 7,
    base_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_kg DECIMAL(10,2) DEFAULT 0,
    cost_per_km DECIMAL(10,2) DEFAULT 0,
    max_weight DECIMAL(10,2), -- em kg
    max_dimensions JSONB, -- {length, width, height} em cm
    regions JSONB, -- regiões atendidas
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- ordem de exibição
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zonas de envio
CREATE TABLE IF NOT EXISTS shipping_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    shipping_method_id UUID NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
    zip_code_start VARCHAR(8),
    zip_code_end VARCHAR(8),
    state VARCHAR(2),
    city VARCHAR(100),
    additional_cost DECIMAL(10,2) DEFAULT 0,
    additional_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Índices para shipping
CREATE INDEX idx_shipping_active ON shipping_methods(is_active) WHERE is_active = true;
CREATE INDEX idx_shipping_zones_method ON shipping_zones(shipping_method_id);
CREATE INDEX idx_shipping_zones_zip ON shipping_zones(zip_code_start, zip_code_end);

-- =====================================================
-- 4. MÉTODOS DE PAGAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'pix', 'boleto', 'wallet')),
    gateway VARCHAR(50) NOT NULL CHECK (gateway IN ('stripe', 'mercadopago', 'pagarme', 'cielo', 'internal')),
    configuration JSONB DEFAULT '{}', -- API keys, etc (criptografar em produção)
    icon_url TEXT,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_amount DECIMAL(10,2),
    installments_config JSONB, -- configuração de parcelamento
    fees JSONB, -- taxas por tipo de pagamento
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transações de pagamento
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
    gateway_transaction_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'cancelled', 'refunded')),
    gateway_response JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pagamentos
CREATE INDEX idx_payment_methods_active ON payment_methods(is_active) WHERE is_active = true;
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- =====================================================
-- 5. SISTEMA DE NOTIFICAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled',
        'payment_approved', 'payment_rejected',
        'product_review', 'seller_message',
        'price_drop', 'back_in_stock',
        'coupon_expiring', 'abandoned_cart'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    data JSONB DEFAULT '{}',
    channel VARCHAR(20) DEFAULT 'app' CHECK (channel IN ('app', 'email', 'sms', 'push')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('app', 'email', 'sms', 'push')),
    is_enabled BOOLEAN DEFAULT true,
    UNIQUE(user_id, notification_type, channel)
);

-- Índices para notificações
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- =====================================================
-- 6. TABELAS AUXILIARES
-- =====================================================

-- Carrinho abandonado
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    cart_data JSONB NOT NULL,
    total_value DECIMAL(10,2),
    reminder_sent_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMP WITH TIME ZONE,
    recovered BOOLEAN DEFAULT false,
    recovered_order_id UUID REFERENCES orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessões de usuário
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices auxiliares
CREATE INDEX idx_abandoned_carts_user ON abandoned_carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_abandoned_carts_session ON abandoned_carts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_system_settings_key ON system_settings(key);

-- =====================================================
-- 7. MELHORIAS NA TABELA DE ENDEREÇOS
-- =====================================================
ALTER TABLE addresses 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS label VARCHAR(50); -- Casa, Trabalho, etc

-- =====================================================
-- 8. MELHORIAS NA TABELA DE CARRINHO
-- =====================================================
ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS added_from VARCHAR(50), -- product_page, wishlist, etc
ADD COLUMN IF NOT EXISTS saved_for_later BOOLEAN DEFAULT false;

-- Índice para carrinho anônimo
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id) WHERE session_id IS NOT NULL;

-- =====================================================
-- 9. FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers de updated_at
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_methods_updated_at BEFORE UPDATE ON shipping_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_abandoned_carts_updated_at BEFORE UPDATE ON abandoned_carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. VIEWS ÚTEIS
-- =====================================================

-- View de cupons válidos
CREATE VIEW valid_coupons AS
SELECT * FROM coupons
WHERE is_active = true
AND (valid_until IS NULL OR valid_until > NOW())
AND (usage_limit IS NULL OR usage_count < usage_limit);

-- View de métodos de pagamento ativos
CREATE VIEW active_payment_methods AS
SELECT * FROM payment_methods
WHERE is_active = true
ORDER BY priority, name;

-- View de métodos de envio ativos
CREATE VIEW active_shipping_methods AS
SELECT * FROM shipping_methods
WHERE is_active = true
ORDER BY priority, name;

-- =====================================================
-- RELATÓRIO FINAL
-- =====================================================
SELECT 
    'TABELAS CRIADAS COM SUCESSO' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN (
        'coupons', 'coupon_usage', 'wishlists', 'shipping_methods', 'shipping_zones',
        'payment_methods', 'payment_transactions', 'notifications', 'notification_preferences',
        'abandoned_carts', 'user_sessions', 'system_settings'
    )) as total_tabelas_novas;

COMMIT; 