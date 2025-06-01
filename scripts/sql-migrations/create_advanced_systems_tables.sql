-- =====================================================
-- CRIAR TABELAS PARA SISTEMAS AVANÇADOS DO MARKETPLACE
-- =====================================================

-- =====================================================
-- 1. SISTEMA DE NOTIFICAÇÕES
-- =====================================================

-- Templates de notificação
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  title_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  template_id UUID REFERENCES notification_templates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configurações de notificação por usuário
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- =====================================================
-- 2. SISTEMA DE RASTREAMENTO AVANÇADO
-- =====================================================

-- Histórico de rastreamento de pedidos
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  tracking_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Atualizar tabela orders com campos de rastreamento
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- =====================================================
-- 3. SISTEMA DE SUPORTE
-- =====================================================

-- Categorias de suporte
CREATE TABLE IF NOT EXISTS support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tickets de suporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  category_id UUID REFERENCES support_categories(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  order_id UUID REFERENCES orders(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT check_ticket_status CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed'))
);

-- Mensagens dos tickets
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Base de conhecimento
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES support_categories(id),
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FAQ
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category_id UUID REFERENCES support_categories(id),
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. SISTEMA DE DEVOLUÇÕES/TROCAS
-- =====================================================

-- Motivos de devolução
CREATE TABLE IF NOT EXISTS return_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  requires_photos BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Devoluções
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('return', 'exchange')),
  status TEXT NOT NULL DEFAULT 'requested',
  reason_id UUID REFERENCES return_reasons(id),
  custom_reason TEXT,
  total_amount NUMERIC(10,2) NOT NULL,
  refund_amount NUMERIC(10,2) DEFAULT 0,
  return_method TEXT DEFAULT 'pickup',
  tracking_code TEXT,
  photos JSONB DEFAULT '[]',
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  CONSTRAINT check_return_status CHECK (status IN ('requested', 'approved', 'rejected', 'shipped', 'received', 'processed', 'completed', 'cancelled'))
);

-- Itens da devolução
CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  condition TEXT DEFAULT 'new',
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Créditos da loja
CREATE TABLE IF NOT EXISTS store_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  return_id UUID REFERENCES returns(id),
  amount NUMERIC(10,2) NOT NULL,
  balance NUMERIC(10,2) NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at DESC);

-- Índices para rastreamento
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_created_at ON order_tracking(created_at);

-- Índices para suporte
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- Índices para devoluções
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Templates de notificação
INSERT INTO notification_templates (name, type, title_template, content_template, variables) VALUES
('order_confirmed', 'order_status', 'Pedido Confirmado', 'Seu pedido {{order_number}} foi confirmado! Total: R$ {{total_amount}}', '{"order_number": "string", "total_amount": "number"}'),
('order_shipped', 'order_status', 'Produto Enviado', 'Seu pedido {{order_number}} foi enviado! Código: {{tracking_code}}', '{"order_number": "string", "tracking_code": "string"}'),
('price_drop', 'price_drop', 'Preço Reduzido!', 'O produto "{{product_name}}" da sua lista de desejos está com {{discount}}% de desconto!', '{"product_name": "string", "discount": "number"}'),
('support_response', 'support', 'Resposta do Suporte', 'Sua solicitação {{ticket_number}} foi respondida. Clique para ver a resposta.', '{"ticket_number": "string"}'),
('promotion', 'promotion', 'Promoção Especial!', 'Desconto de {{discount}}% em toda a loja até {{end_date}}! Use o cupom: {{coupon_code}}', '{"discount": "number", "end_date": "string", "coupon_code": "string"}')
ON CONFLICT (name) DO NOTHING;

-- Categorias de suporte
INSERT INTO support_categories (name, description, icon, is_active) VALUES
('Pedidos', 'Dúvidas sobre pedidos e entregas', '📦', true),
('Produtos', 'Informações sobre produtos', '🛍️', true),
('Pagamentos', 'Problemas com pagamentos', '💳', true),
('Conta', 'Gerenciamento de conta', '👤', true),
('Outros', 'Outras dúvidas', '❓', true)
ON CONFLICT (name) DO NOTHING;

-- Motivos de devolução
INSERT INTO return_reasons (name, description, requires_photos) VALUES
('Defeito de fabricação', 'Produto com defeito de fábrica', true),
('Produto diferente do anunciado', 'Produto não corresponde à descrição', true),
('Tamanho incorreto', 'Tamanho diferente do solicitado', false),
('Não gostei do produto', 'Produto não atendeu às expectativas', false),
('Chegou danificado', 'Produto danificado durante o transporte', true),
('Erro na compra', 'Compra realizada por engano', false)
ON CONFLICT (name) DO NOTHING;

-- Verificar criação das tabelas
SELECT 'Tabelas dos sistemas avançados criadas com sucesso!' as status;

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'notification_templates', 'notifications', 'notification_settings',
  'order_tracking', 'support_categories', 'support_tickets', 
  'support_messages', 'kb_articles', 'faqs',
  'return_reasons', 'returns', 'return_items', 'store_credits'
)
ORDER BY table_name; 