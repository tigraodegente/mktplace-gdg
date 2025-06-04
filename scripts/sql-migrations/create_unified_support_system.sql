-- SISTEMA DE ATENDIMENTO UNIFICADO - CRIADO EM 2025-06-04
-- Estrutura para FAQ + Categorias de Suporte integradas com Chat existente

-- 1. CATEGORIAS DE SUPORTE (renomear se existir)
CREATE TABLE IF NOT EXISTS support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'help-circle',
  color VARCHAR(7) DEFAULT '#6366f1',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CATEGORIAS FAQ  
CREATE TABLE IF NOT EXISTS faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'question-mark-circle',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ITENS FAQ
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. FEEDBACK FAQ (para coletar se foi útil)
CREATE TABLE IF NOT EXISTS faq_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_item_id UUID NOT NULL REFERENCES faq_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CONEXÃO CHAT-TICKET (já existe chat_conversations, vamos conectar)
-- Adicionar coluna para conectar tickets com conversas de chat
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL;

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_support_categories_active ON support_categories(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_faq_categories_active ON faq_categories(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category_id, is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_faq_items_tags ON faq_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_item ON faq_feedback(faq_item_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_conversation ON support_tickets(conversation_id);

-- TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_support_categories_updated_at 
  BEFORE UPDATE ON support_categories FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_categories_updated_at 
  BEFORE UPDATE ON faq_categories FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at 
  BEFORE UPDATE ON faq_items FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- DADOS INICIAIS

-- Categorias de Suporte
INSERT INTO support_categories (name, description, icon, color, order_index) VALUES
('Pedidos', 'Dúvidas sobre status, entrega e acompanhamento de pedidos', 'shopping-bag', '#10b981', 1),
('Produtos', 'Informações sobre produtos, estoque e especificações', 'cube', '#6366f1', 2),
('Pagamentos', 'Problemas com pagamento, reembolso e faturamento', 'credit-card', '#f59e0b', 3),
('Técnico', 'Problemas no site, app ou questões técnicas', 'cog', '#ef4444', 4),
('Outros', 'Outras dúvidas e sugestões gerais', 'chat-bubble-left-right', '#8b5cf6', 5)
ON CONFLICT DO NOTHING;

-- Categorias FAQ
INSERT INTO faq_categories (name, description, order_index) VALUES
('Pedidos e Entrega', 'Perguntas sobre como fazer pedidos e prazos de entrega', 1),
('Pagamentos e Preços', 'Dúvidas sobre formas de pagamento e política de preços', 2),
('Produtos e Estoque', 'Informações sobre produtos e disponibilidade', 3),
('Trocas e Devoluções', 'Política de trocas, devoluções e garantia', 4),
('Conta e Perfil', 'Gerenciamento de conta, cadastro e dados pessoais', 5),
('Frete e Localização', 'Cálculo de frete, áreas de entrega e logística', 6)
ON CONFLICT DO NOTHING;

-- FAQ Items Iniciais
INSERT INTO faq_items (category_id, question, answer, order_index) VALUES
-- Pedidos e Entrega
((SELECT id FROM faq_categories WHERE name = 'Pedidos e Entrega' LIMIT 1),
 'Como posso acompanhar meu pedido?', 
 'Você pode acompanhar seu pedido através da seção "Meus Pedidos" no seu perfil. Também enviamos atualizações por email e SMS conforme o pedido progride.', 
 1),

((SELECT id FROM faq_categories WHERE name = 'Pedidos e Entrega' LIMIT 1),
 'Qual o prazo de entrega?', 
 'O prazo de entrega varia de acordo com sua localização e o produto escolhido. Geralmente é de 3 a 7 dias úteis para a região Sudeste e de 5 a 12 dias úteis para outras regiões.', 
 2),

-- Pagamentos
((SELECT id FROM faq_categories WHERE name = 'Pagamentos e Preços' LIMIT 1),
 'Quais formas de pagamento vocês aceitam?', 
 'Aceitamos cartões de crédito (Visa, Mastercard, Elo), cartões de débito, PIX, boleto bancário e parcelamento em até 12x sem juros em produtos selecionados.', 
 1),

((SELECT id FROM faq_categories WHERE name = 'Pagamentos e Preços' LIMIT 1),
 'É seguro comprar no site?', 
 'Sim! Nosso site possui certificado SSL e seguimos todos os protocolos de segurança. Seus dados pessoais e de pagamento são criptografados e protegidos.', 
 2),

-- Produtos
((SELECT id FROM faq_categories WHERE name = 'Produtos e Estoque' LIMIT 1),
 'Como sei se um produto está em estoque?', 
 'A disponibilidade do produto é mostrada na página do produto. Se estiver "Em estoque", você pode comprar normalmente. Se estiver "Fora de estoque", você pode se cadastrar para ser avisado quando chegar.', 
 1)

ON CONFLICT DO NOTHING;

-- Log de sucesso
SELECT 'Sistema de Atendimento Unificado criado com sucesso!' as status;

-- Verificar tabelas criadas
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t 
WHERE table_schema = 'public' 
  AND table_name IN ('support_categories', 'faq_categories', 'faq_items', 'faq_feedback')
ORDER BY table_name; 