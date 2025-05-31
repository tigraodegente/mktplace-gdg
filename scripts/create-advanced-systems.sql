-- =====================================================
-- SISTEMAS AVANÇADOS DO MARKETPLACE
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. SISTEMA DE NOTIFICAÇÕES
-- =====================================================

-- Tabela de templates de notificação
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'push', 'sms', 'internal')),
    variables JSONB DEFAULT '[]'::jsonb, -- Variáveis disponíveis no template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de notificações
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('order_status', 'abandoned_cart', 'price_drop', 'promotion', 'system', 'support')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb, -- Dados específicos da notificação
    channels VARCHAR(100)[] DEFAULT ARRAY['internal'], -- Canais usados
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações de notificação do usuário
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    order_status_email BOOLEAN DEFAULT true,
    order_status_push BOOLEAN DEFAULT true,
    abandoned_cart_email BOOLEAN DEFAULT true,
    abandoned_cart_push BOOLEAN DEFAULT false,
    price_drop_email BOOLEAN DEFAULT true,
    price_drop_push BOOLEAN DEFAULT true,
    promotions_email BOOLEAN DEFAULT true,
    promotions_push BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- 2. ACOMPANHAMENTO AVANÇADO DE PEDIDOS
-- =====================================================

-- Melhorar tabela de pedidos com status mais granulares
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Histórico detalhado de status dos pedidos
CREATE TABLE order_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    tracking_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================
-- 3. SISTEMA DE SUPORTE
-- =====================================================

-- Categorias de tickets
CREATE TABLE support_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    auto_assign_to UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets de suporte
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES support_categories(id),
    order_id UUID REFERENCES orders(id),
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    assigned_to UUID REFERENCES users(id),
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    satisfaction_comment TEXT,
    tags VARCHAR(50)[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Mensagens dos tickets
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Base de conhecimento
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags VARCHAR(50)[],
    views_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    author_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FAQ
CREATE TABLE faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. DEVOLUÇÕES/TROCAS
-- =====================================================

-- Motivos de devolução
CREATE TABLE return_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_photos BOOLEAN DEFAULT false,
    auto_approve BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Solicitações de devolução
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(20) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('return', 'exchange')),
    status VARCHAR(30) DEFAULT 'requested' CHECK (status IN (
        'requested', 'approved', 'rejected', 'shipped_by_customer', 
        'received', 'inspecting', 'processed', 'refunded', 'completed'
    )),
    reason_id UUID REFERENCES return_reasons(id),
    custom_reason TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    admin_notes TEXT,
    customer_notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    tracking_code VARCHAR(100),
    return_shipping_cost DECIMAL(10,2) DEFAULT 0,
    processing_fee DECIMAL(10,2) DEFAULT 0,
    refund_method VARCHAR(20) CHECK (refund_method IN ('original_payment', 'store_credit', 'bank_transfer')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens da devolução
CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    condition VARCHAR(20) CHECK (condition IN ('new', 'used', 'damaged', 'defective')),
    inspector_notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créditos da loja
CREATE TABLE store_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    return_id UUID REFERENCES returns(id),
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Notificações
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Rastreamento de pedidos
CREATE INDEX idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX idx_order_tracking_status ON order_tracking(status);
CREATE INDEX idx_order_tracking_created_at ON order_tracking(created_at);

-- Suporte
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);

-- Devoluções
CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_user_id ON returns(user_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_created_at ON returns(created_at);
CREATE INDEX idx_return_items_return_id ON return_items(return_id);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Templates de notificação
INSERT INTO notification_templates (name, title, content, type, variables) VALUES
('order_confirmed', 'Pedido Confirmado', 'Seu pedido {{order_number}} foi confirmado! Total: {{total_amount}}', 'email', '["order_number", "total_amount", "customer_name"]'),
('order_shipped', 'Pedido Enviado', 'Seu pedido {{order_number}} foi enviado! Código de rastreamento: {{tracking_code}}', 'email', '["order_number", "tracking_code", "estimated_delivery"]'),
('order_delivered', 'Pedido Entregue', 'Seu pedido {{order_number}} foi entregue! Como foi sua experiência?', 'email', '["order_number", "delivery_date"]'),
('abandoned_cart', 'Carrinho Esquecido', 'Você esqueceu {{items_count}} itens no seu carrinho. Finalize sua compra!', 'email', '["items_count", "cart_total", "customer_name"]'),
('price_drop', 'Preço Reduzido', 'Boa notícia! O produto {{product_name}} da sua lista de desejos está com desconto!', 'email', '["product_name", "old_price", "new_price", "discount_percentage"]');

-- Categorias de suporte
INSERT INTO support_categories (name, description, priority_level) VALUES
('Pedidos', 'Dúvidas sobre pedidos, entregas e pagamentos', 3),
('Produtos', 'Informações sobre produtos, defeitos e trocas', 3),
('Pagamentos', 'Problemas com pagamentos e reembolsos', 4),
('Técnico', 'Problemas técnicos do site', 2),
('Outros', 'Outras dúvidas e sugestões', 1);

-- Motivos de devolução
INSERT INTO return_reasons (name, description, requires_photos, auto_approve) VALUES
('Defeito de fabricação', 'Produto chegou com defeito', true, false),
('Produto diferente', 'Produto diferente do anunciado', true, false),
('Tamanho incorreto', 'Tamanho não confere', false, true),
('Não gostei', 'Produto não atendeu expectativas', false, true),
('Chegou danificado', 'Produto foi danificado no transporte', true, false),
('Erro na compra', 'Comprei por engano', false, true);

-- FAQ inicial
INSERT INTO faqs (question, answer, category, order_index, is_featured) VALUES
('Como rastrear meu pedido?', 'Acesse "Meus Pedidos" e clique no número do pedido para ver o rastreamento detalhado.', 'Pedidos', 1, true),
('Qual o prazo de entrega?', 'O prazo varia de 3 a 15 dias úteis, dependendo da sua região e modalidade escolhida.', 'Entrega', 2, true),
('Como cancelar um pedido?', 'Pedidos podem ser cancelados até 2 horas após a confirmação. Acesse "Meus Pedidos" e clique em "Cancelar".', 'Pedidos', 3, true),
('Posso trocar um produto?', 'Sim! Você tem até 7 dias para solicitar troca ou devolução. Acesse "Meus Pedidos" → "Solicitar Troca".', 'Trocas', 4, true),
('Quais formas de pagamento aceitas?', 'Aceitamos PIX, cartão de crédito/débito (até 12x sem juros) e boleto bancário.', 'Pagamentos', 5, true);

-- Configurações padrão de notificação para usuários existentes
INSERT INTO notification_settings (user_id)
SELECT id FROM users 
WHERE type = 'customer' 
ON CONFLICT (user_id) DO NOTHING;

COMMIT; 