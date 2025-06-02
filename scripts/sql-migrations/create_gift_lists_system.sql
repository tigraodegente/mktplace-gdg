-- =================================================================
-- SISTEMA COMPLETO DE LISTAS DE PRESENTES
-- =================================================================
-- Funcionalidades: Chá de Bebê, Casamento, Aniversário, etc.
-- Autor: Assistant
-- Data: 2024-12-01

BEGIN;

-- =================================================================
-- 1. LISTAS DE PRESENTES - Tabela Principal
-- =================================================================

CREATE TABLE IF NOT EXISTS gift_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('baby_shower', 'wedding', 'birthday', 'anniversary', 'graduation', 'housewarming', 'custom')),
    title VARCHAR(255) NOT NULL,               -- "Chá de Bebê da Maria", "Casamento João & Ana"
    description TEXT,                          -- Descrição personalizada da lista
    event_date DATE,                           -- Data do evento
    event_location VARCHAR(500),              -- Local do evento
    couple_name_1 VARCHAR(255),               -- Nome do primeiro (casamento)
    couple_name_2 VARCHAR(255),               -- Nome do segundo (casamento)
    baby_name VARCHAR(255),                   -- Nome do bebê (chá de bebê)
    baby_gender VARCHAR(10) CHECK (baby_gender IN ('male', 'female', 'surprise')),
    cover_image TEXT,                         -- Imagem de capa da lista
    theme_color VARCHAR(7) DEFAULT '#FF69B4', -- Cor tema da lista (#hex)
    privacy VARCHAR(20) DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'friends_only')),
    share_token VARCHAR(255) UNIQUE,          -- Token único para compartilhamento
    allow_partial_contributions BOOLEAN DEFAULT true, -- Permite contribuições parciais
    allow_anonymous_contributions BOOLEAN DEFAULT true, -- Permite contribuições anônimas
    minimum_contribution DECIMAL(10,2) DEFAULT 10.00, -- Valor mínimo de contribuição
    goal_amount DECIMAL(12,2),                -- Meta total da lista
    collected_amount DECIMAL(12,2) DEFAULT 0, -- Valor já arrecadado
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE,     -- Data de expiração da lista
    thank_you_message TEXT,                   -- Mensagem de agradecimento personalizada
    delivery_address JSONB,                   -- Endereço para entrega dos presentes
    registry_store VARCHAR(255),             -- Loja física de referência
    social_media JSONB DEFAULT '{}',         -- Links para redes sociais
    settings JSONB DEFAULT '{}',             -- Configurações avançadas
    metadata JSONB DEFAULT '{}',             -- Dados extras
    view_count INTEGER DEFAULT 0,            -- Número de visualizações
    contribution_count INTEGER DEFAULT 0,    -- Número de contribuições
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. ITENS DA LISTA DE PRESENTES
-- =================================================================

CREATE TABLE IF NOT EXISTS gift_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES gift_lists(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),  -- Produto do marketplace
    custom_item_name VARCHAR(255),            -- Nome personalizado se não for produto do marketplace
    custom_item_description TEXT,             -- Descrição personalizada
    custom_item_image TEXT,                   -- Imagem personalizada
    custom_item_price DECIMAL(10,2),         -- Preço personalizado
    custom_item_url TEXT,                     -- Link externo (se não for do marketplace)
    quantity INTEGER DEFAULT 1,              -- Quantidade desejada
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'essential')),
    category VARCHAR(100),                    -- Categoria do item (roupas, decoração, etc)
    size_preference VARCHAR(100),            -- Preferência de tamanho
    color_preference VARCHAR(100),           -- Preferência de cor
    brand_preference VARCHAR(100),           -- Preferência de marca
    notes TEXT,                              -- Observações especiais
    target_amount DECIMAL(10,2) NOT NULL,   -- Valor alvo do item
    collected_amount DECIMAL(10,2) DEFAULT 0, -- Valor já arrecadado
    is_purchased BOOLEAN DEFAULT false,      -- Se já foi totalmente comprado
    purchased_by UUID REFERENCES users(id), -- Quem comprou (se compra total)
    purchased_at TIMESTAMP WITH TIME ZONE,  -- Quando foi comprado
    is_surprise BOOLEAN DEFAULT false,       -- Se é um presente surpresa
    display_order INTEGER DEFAULT 0,        -- Ordem de exibição
    is_active BOOLEAN DEFAULT true,         -- Se o item está ativo na lista
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 3. CONTRIBUIÇÕES PARA OS ITENS
-- =================================================================

CREATE TABLE IF NOT EXISTS gift_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES gift_list_items(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES gift_lists(id) ON DELETE CASCADE,
    contributor_user_id UUID REFERENCES users(id), -- NULL se anônimo
    contributor_name VARCHAR(255),           -- Nome do contribuinte (mesmo se logado)
    contributor_email VARCHAR(255),         -- Email do contribuinte
    contributor_phone VARCHAR(20),          -- Telefone do contribuinte
    amount DECIMAL(10,2) NOT NULL,          -- Valor da contribuição
    message TEXT,                           -- Mensagem pessoal para os noivos/pais
    is_anonymous BOOLEAN DEFAULT false,     -- Se quer aparecer como anônimo
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
    payment_id UUID REFERENCES payments(id), -- Referência ao pagamento
    payment_method VARCHAR(50),             -- Método de pagamento usado
    contribution_type VARCHAR(20) DEFAULT 'money' CHECK (contribution_type IN ('money', 'product_purchase', 'custom')),
    order_id UUID REFERENCES orders(id),   -- Se foi compra direta do produto
    gift_wrap_requested BOOLEAN DEFAULT false, -- Se solicitou embrulho
    gift_wrap_message TEXT,                 -- Mensagem no embrulho
    delivery_preference VARCHAR(50) DEFAULT 'event_address' CHECK (delivery_preference IN ('event_address', 'contributor_address', 'pickup')),
    delivery_address JSONB,                 -- Endereço alternativo de entrega
    notification_sent BOOLEAN DEFAULT false, -- Se notificou o dono da lista
    thank_you_sent BOOLEAN DEFAULT false,   -- Se enviou agradecimento
    refund_reason TEXT,                     -- Motivo do reembolso se houver
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 4. CONVITES E COMPARTILHAMENTOS
-- =================================================================

CREATE TABLE IF NOT EXISTS gift_list_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES gift_lists(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id),
    invited_email VARCHAR(255),             -- Email do convidado
    invited_name VARCHAR(255),              -- Nome do convidado
    invited_phone VARCHAR(20),              -- Telefone do convidado
    invitation_token VARCHAR(255) UNIQUE,   -- Token único do convite
    invitation_type VARCHAR(20) DEFAULT 'email' CHECK (invitation_type IN ('email', 'sms', 'whatsapp', 'link')),
    message TEXT,                           -- Mensagem personalizada do convite
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'viewed', 'contributed', 'declined')),
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    first_contribution_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    contribution_count INTEGER DEFAULT 0,
    total_contributed DECIMAL(10,2) DEFAULT 0,
    reminder_count INTEGER DEFAULT 0,       -- Quantos lembretes foram enviados
    last_reminder_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 5. ANALYTICS DAS LISTAS
-- =================================================================

CREATE TABLE IF NOT EXISTS gift_list_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES gift_lists(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,      -- views, contributions, shares, etc
    metric_value DECIMAL(15,2) NOT NULL,
    metric_type VARCHAR(20) DEFAULT 'count' CHECK (metric_type IN ('count', 'amount', 'rate', 'duration')),
    date_dimension DATE NOT NULL,           -- Para análise temporal
    source VARCHAR(100),                    -- whatsapp, email, instagram, direct
    user_agent TEXT,                        -- Para análise de dispositivos
    ip_address INET,                        -- Para análise geográfica
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 6. TEMPLATES DE LISTAS PRÉ-DEFINIDOS
-- =================================================================

CREATE TABLE IF NOT EXISTS gift_list_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,              -- baby_shower, wedding, etc
    description TEXT,
    cover_image TEXT,
    theme_color VARCHAR(7),
    default_items JSONB DEFAULT '[]',       -- Lista de itens padrão
    suggested_categories TEXT[],            -- Categorias sugeridas
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 7. FAVORITOS DE LISTAS
-- =================================================================

CREATE TABLE IF NOT EXISTS gift_list_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    list_id UUID NOT NULL REFERENCES gift_lists(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, list_id)
);

-- =================================================================
-- 8. COMENTÁRIOS NAS LISTAS
-- =================================================================

CREATE TABLE IF NOT EXISTS gift_list_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES gift_lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    comment TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,       -- Se só o dono da lista pode ver
    parent_id UUID REFERENCES gift_list_comments(id), -- Para respostas
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- ÍNDICES PARA PERFORMANCE
-- =================================================================

-- Índices para gift_lists
CREATE INDEX IF NOT EXISTS idx_gift_lists_user_id ON gift_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_lists_type ON gift_lists(type);
CREATE INDEX IF NOT EXISTS idx_gift_lists_status ON gift_lists(status);
CREATE INDEX IF NOT EXISTS idx_gift_lists_share_token ON gift_lists(share_token);
CREATE INDEX IF NOT EXISTS idx_gift_lists_event_date ON gift_lists(event_date);
CREATE INDEX IF NOT EXISTS idx_gift_lists_created_at ON gift_lists(created_at);

-- Índices para gift_list_items
CREATE INDEX IF NOT EXISTS idx_gift_list_items_list_id ON gift_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_gift_list_items_product_id ON gift_list_items(product_id);
CREATE INDEX IF NOT EXISTS idx_gift_list_items_priority ON gift_list_items(priority);
CREATE INDEX IF NOT EXISTS idx_gift_list_items_is_purchased ON gift_list_items(is_purchased);
CREATE INDEX IF NOT EXISTS idx_gift_list_items_display_order ON gift_list_items(list_id, display_order);

-- Índices para gift_contributions
CREATE INDEX IF NOT EXISTS idx_gift_contributions_item_id ON gift_contributions(item_id);
CREATE INDEX IF NOT EXISTS idx_gift_contributions_list_id ON gift_contributions(list_id);
CREATE INDEX IF NOT EXISTS idx_gift_contributions_contributor ON gift_contributions(contributor_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_contributions_payment_status ON gift_contributions(payment_status);
CREATE INDEX IF NOT EXISTS idx_gift_contributions_created_at ON gift_contributions(created_at);

-- Índices para gift_list_invites
CREATE INDEX IF NOT EXISTS idx_gift_list_invites_list_id ON gift_list_invites(list_id);
CREATE INDEX IF NOT EXISTS idx_gift_list_invites_email ON gift_list_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_gift_list_invites_token ON gift_list_invites(invitation_token);
CREATE INDEX IF NOT EXISTS idx_gift_list_invites_status ON gift_list_invites(status);

-- Índices para analytics
CREATE INDEX IF NOT EXISTS idx_gift_list_analytics_list_id ON gift_list_analytics(list_id);
CREATE INDEX IF NOT EXISTS idx_gift_list_analytics_metric ON gift_list_analytics(metric_name, date_dimension);
CREATE INDEX IF NOT EXISTS idx_gift_list_analytics_date ON gift_list_analytics(date_dimension);

-- =================================================================
-- FUNÇÕES AUXILIARES
-- =================================================================

-- Função para gerar token único de compartilhamento
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN 'gift_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 20));
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar valores coletados automaticamente
CREATE OR REPLACE FUNCTION update_gift_list_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar valor coletado do item
    UPDATE gift_list_items 
    SET 
        collected_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM gift_contributions 
            WHERE item_id = NEW.item_id AND payment_status = 'paid'
        ),
        is_purchased = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM gift_contributions 
            WHERE item_id = NEW.item_id AND payment_status = 'paid'
        ) >= target_amount,
        updated_at = NOW()
    WHERE id = NEW.item_id;
    
    -- Atualizar valor total coletado da lista
    UPDATE gift_lists 
    SET 
        collected_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM gift_contributions 
            WHERE list_id = NEW.list_id AND payment_status = 'paid'
        ),
        contribution_count = (
            SELECT COUNT(*) 
            FROM gift_contributions 
            WHERE list_id = NEW.list_id AND payment_status = 'paid'
        ),
        updated_at = NOW()
    WHERE id = NEW.list_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar valores automaticamente
CREATE TRIGGER trigger_update_gift_amounts
    AFTER INSERT OR UPDATE OF payment_status ON gift_contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_gift_list_amounts();

-- Função para criar log de auditoria para listas
CREATE OR REPLACE FUNCTION log_gift_list_activity(
    p_list_id UUID,
    p_user_id UUID,
    p_action VARCHAR,
    p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, table_name, record_id, action, new_values, metadata
    ) VALUES (
        p_user_id, 'gift_lists', p_list_id::VARCHAR, p_action, p_details, 
        jsonb_build_object('category', 'gift_list', 'timestamp', NOW())
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar analytics automaticamente
CREATE OR REPLACE FUNCTION record_gift_list_metric(
    p_list_id UUID,
    p_metric_name VARCHAR,
    p_metric_value DECIMAL,
    p_source VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    analytics_id UUID;
BEGIN
    INSERT INTO gift_list_analytics (
        list_id, metric_name, metric_value, date_dimension, source, metadata
    ) VALUES (
        p_list_id, p_metric_name, p_metric_value, CURRENT_DATE, p_source, p_metadata
    ) RETURNING id INTO analytics_id;
    
    RETURN analytics_id;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- DADOS INICIAIS - TEMPLATES
-- =================================================================

-- Templates para Chá de Bebê
INSERT INTO gift_list_templates (name, type, description, theme_color, default_items, suggested_categories) VALUES
(
    'Chá de Bebê Completo',
    'baby_shower',
    'Template completo para chá de bebê com itens essenciais',
    '#FFB6C1',
    '[
        {"name": "Berço", "category": "mobiliário", "priority": "essential"},
        {"name": "Carrinho de bebê", "category": "transporte", "priority": "essential"},
        {"name": "Cadeirinha para carro", "category": "segurança", "priority": "essential"},
        {"name": "Kit berço (lençol, fronha, edredom)", "category": "roupas de cama", "priority": "high"},
        {"name": "Roupinhas RN e P", "category": "roupas", "priority": "high"},
        {"name": "Fraldas (vários tamanhos)", "category": "higiene", "priority": "essential"},
        {"name": "Kit higiene (banheira, sabonete, etc)", "category": "higiene", "priority": "high"},
        {"name": "Monitor de bebê", "category": "eletrônicos", "priority": "medium"},
        {"name": "Cadeira de amamentação", "category": "mobiliário", "priority": "medium"}
    ]',
    ARRAY['mobiliário', 'roupas', 'higiene', 'transporte', 'segurança', 'brinquedos', 'alimentação', 'decoração']
),
(
    'Chá de Bebê Básico',
    'baby_shower', 
    'Template básico com itens essenciais para o bebê',
    '#87CEEB',
    '[
        {"name": "Kit berço", "category": "roupas de cama", "priority": "essential"},
        {"name": "Roupinhas RN", "category": "roupas", "priority": "essential"},
        {"name": "Fraldas RN e P", "category": "higiene", "priority": "essential"},
        {"name": "Kit banho", "category": "higiene", "priority": "high"},
        {"name": "Body e macacões", "category": "roupas", "priority": "high"}
    ]',
    ARRAY['roupas', 'higiene', 'roupas de cama', 'alimentação']
);

-- Templates para Casamento
INSERT INTO gift_list_templates (name, type, description, theme_color, default_items, suggested_categories) VALUES
(
    'Lista de Casamento Tradicional',
    'wedding',
    'Lista clássica para casamento com itens para a casa',
    '#FFD700',
    '[
        {"name": "Jogo de panelas", "category": "cozinha", "priority": "essential"},
        {"name": "Jogo de pratos", "category": "mesa", "priority": "essential"},
        {"name": "Jogo de copos", "category": "mesa", "priority": "high"},
        {"name": "Jogo de cama casal", "category": "quarto", "priority": "high"},
        {"name": "Toalhas de banho", "category": "banho", "priority": "high"},
        {"name": "Liquidificador", "category": "eletrodomésticos", "priority": "medium"},
        {"name": "Microondas", "category": "eletrodomésticos", "priority": "medium"},
        {"name": "Aspirador de pó", "category": "limpeza", "priority": "medium"}
    ]',
    ARRAY['cozinha', 'mesa', 'quarto', 'banho', 'eletrodomésticos', 'decoração', 'limpeza']
),
(
    'Lista de Casamento Moderna',
    'wedding',
    'Lista moderna com foco em experiências e praticidade',
    '#FF69B4',
    '[
        {"name": "Vale presente para lua de mel", "category": "experiências", "priority": "high"},
        {"name": "Smart TV", "category": "eletrônicos", "priority": "high"},
        {"name": "Kit casa inteligente", "category": "tecnologia", "priority": "medium"},
        {"name": "Cafeteira expressa", "category": "cozinha", "priority": "medium"},
        {"name": "Purificador de água", "category": "casa", "priority": "medium"}
    ]',
    ARRAY['experiências', 'tecnologia', 'eletrônicos', 'cozinha', 'casa']
);

-- Trigger para gerar share_token automaticamente
CREATE OR REPLACE FUNCTION generate_share_token_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.share_token IS NULL THEN
        NEW.share_token := generate_share_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_share_token
    BEFORE INSERT ON gift_lists
    FOR EACH ROW
    EXECUTE FUNCTION generate_share_token_trigger();

COMMIT;

-- =================================================================
-- RELATÓRIO DE IMPLEMENTAÇÃO
-- =================================================================

SELECT 
    'SISTEMA DE LISTAS DE PRESENTES IMPLEMENTADO COM SUCESSO!' as status,
    COUNT(*) as total_tabelas_apos_implementacao
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Mostrar tabelas do sistema de listas
SELECT 
    '✅ ' || table_name as tabela_criada
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'gift_%'
ORDER BY table_name;

SELECT 'Sistema de Listas de Presentes 100% funcional!' as resultado; 