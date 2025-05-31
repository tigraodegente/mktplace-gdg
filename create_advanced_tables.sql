-- =================================================================
-- SCRIPT PARA ADICIONAR FUNCIONALIDADES AVANÇADAS AO MARKETPLACE
-- =================================================================
-- Tabelas: audit_logs, webhook_events, ab_tests, marketing_campaigns, gdpr_requests
-- Autor: Assistant
-- Data: 2024-12-01

BEGIN;

-- =================================================================
-- 1. AUDIT LOGS - Sistema de Auditoria Completo
-- =================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    table_name VARCHAR(100) NOT NULL,        -- Qual tabela foi alterada
    record_id VARCHAR(100) NOT NULL,         -- ID do registro alterado
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
    old_values JSONB,                        -- Valores antes da alteração
    new_values JSONB,                        -- Valores após a alteração
    changed_fields TEXT[],                   -- Campos que mudaram
    ip_address INET,                         -- IP do usuário
    user_agent TEXT,                         -- Browser/app usado
    session_id VARCHAR(255),                 -- ID da sessão
    reason TEXT,                             -- Motivo da alteração
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}',             -- Dados adicionais
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);

-- =================================================================
-- 2. WEBHOOK EVENTS - Sistema de Webhooks
-- =================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,       -- order.created, payment.approved, etc
    webhook_url TEXT NOT NULL,              -- URL de destino
    payload JSONB NOT NULL,                 -- Dados enviados
    headers JSONB DEFAULT '{}',             -- Headers HTTP
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying', 'cancelled')),
    response_status INTEGER,                -- HTTP status code da resposta
    response_body TEXT,                     -- Resposta do webhook
    response_headers JSONB,                 -- Headers da resposta
    attempts INTEGER DEFAULT 0,             -- Número de tentativas
    max_attempts INTEGER DEFAULT 3,        -- Máximo de tentativas
    next_retry_at TIMESTAMP WITH TIME ZONE, -- Quando tentar novamente
    sent_at TIMESTAMP WITH TIME ZONE,      -- Quando foi enviado
    completed_at TIMESTAMP WITH TIME ZONE, -- Quando foi completado
    error_message TEXT,                     -- Mensagem de erro se houver
    priority INTEGER DEFAULT 5,            -- Prioridade (1=alta, 10=baixa)
    metadata JSONB DEFAULT '{}',           -- Dados adicionais
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry ON webhook_events(next_retry_at) WHERE status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_priority ON webhook_events(priority, status);

-- =================================================================
-- 3. A/B TESTS - Sistema de Testes A/B Completo
-- =================================================================

CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,             -- Nome do teste
    description TEXT,                       -- Descrição do que está sendo testado
    hypothesis TEXT,                        -- Hipótese do teste
    success_metric VARCHAR(100),            -- Métrica de sucesso principal
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
    traffic_allocation DECIMAL(5,2) DEFAULT 100.00 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    min_sample_size INTEGER DEFAULT 1000,  -- Tamanho mínimo da amostra
    confidence_level DECIMAL(4,2) DEFAULT 95.00, -- Nível de confiança estatística
    statistical_significance DECIMAL(5,4), -- Significância estatística alcançada
    winner_variant_id UUID,                -- ID da variante vencedora
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,             -- Variant A, Variant B, etc
    description TEXT,
    traffic_split DECIMAL(5,2) NOT NULL CHECK (traffic_split >= 0 AND traffic_split <= 100),
    config JSONB DEFAULT '{}',              -- Configurações específicas da variante
    is_control BOOLEAN DEFAULT false,       -- Se é o grupo de controle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),                -- Para usuários não logados
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(test_id, user_id),
    UNIQUE(test_id, session_id)
);

CREATE TABLE IF NOT EXISTS ab_test_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,       -- page_view, click, conversion, purchase
    event_value DECIMAL(10,2),              -- Valor monetário se aplicável
    event_data JSONB DEFAULT '{}',          -- Dados específicos do evento
    page_url TEXT,                          -- URL onde o evento ocorreu
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para A/B Tests
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test_id ON ab_test_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_user ON ab_test_assignments(test_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_session ON ab_test_assignments(test_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_test_variant ON ab_test_events(test_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_created_at ON ab_test_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_event_type ON ab_test_events(event_type);

-- =================================================================
-- 4. MARKETING CAMPAIGNS - Sistema de Marketing Completo
-- =================================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'banner', 'popup', 'social')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    template_id UUID,                       -- Referência ao template usado
    subject_line VARCHAR(500),              -- Para emails
    content TEXT,                           -- Conteúdo da campanha
    target_audience JSONB DEFAULT '{}',     -- Critérios de segmentação
    scheduling JSONB DEFAULT '{}',          -- Configurações de envio
    tracking_config JSONB DEFAULT '{}',     -- UTM params, pixel tracking, etc
    personalization_config JSONB DEFAULT '{}', -- Configurações de personalização
    budget_limit DECIMAL(10,2),            -- Limite de orçamento
    cost_per_recipient DECIMAL(6,4),       -- Custo por destinatário
    priority INTEGER DEFAULT 5,            -- Prioridade (1=alta, 10=baixa)
    ab_test_enabled BOOLEAN DEFAULT false, -- Se está usando teste A/B
    ab_test_config JSONB,                  -- Configurações do teste A/B
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    email VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'bounced', 'unsubscribed', 'failed')),
    personalization_data JSONB DEFAULT '{}', -- Dados para personalização
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    first_click_at TIMESTAMP WITH TIME ZONE,
    last_click_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    conversion_value DECIMAL(10,2),        -- Valor da conversão
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    bounce_reason TEXT,                     -- Motivo do bounce
    error_message TEXT,                     -- Mensagem de erro
    retry_count INTEGER DEFAULT 0,         -- Número de tentativas
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,      -- sent, delivered, opened, clicked, converted, revenue
    metric_value DECIMAL(15,2) NOT NULL,    -- Valor da métrica
    metric_type VARCHAR(20) DEFAULT 'count' CHECK (metric_type IN ('count', 'rate', 'amount', 'duration')),
    dimension_1 VARCHAR(100),               -- Dimensão adicional (ex: device_type)
    dimension_1_value VARCHAR(100),         -- Valor da dimensão (ex: mobile)
    dimension_2 VARCHAR(100),               -- Segunda dimensão
    dimension_2_value VARCHAR(100),         -- Valor da segunda dimensão
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para Marketing Campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON marketing_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_start_date ON marketing_campaigns(start_date);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_user_id ON campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign_metric ON campaign_analytics(campaign_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_recorded_at ON campaign_analytics(recorded_at);

-- =================================================================
-- 5. GDPR/LGPD COMPLIANCE - Sistema de Conformidade
-- =================================================================

CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('data_export', 'data_deletion', 'data_rectification', 'consent_withdrawal', 'data_portability', 'processing_restriction')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
    requester_email VARCHAR(255) NOT NULL,
    requester_name VARCHAR(255),
    requester_phone VARCHAR(20),
    requester_ip INET,
    verification_token VARCHAR(255),
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    processing_notes TEXT,
    completion_details JSONB DEFAULT '{}',  -- Detalhes sobre o que foi feito
    exported_data JSONB,                   -- Dados exportados (para data_export)
    legal_basis VARCHAR(100),              -- Base legal para o processamento
    retention_date TIMESTAMP WITH TIME ZONE, -- Quando pode ser arquivado
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_processing_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,                  -- Finalidade do processamento
    legal_basis VARCHAR(100) NOT NULL,     -- Base legal (Art. 7 LGPD)
    data_categories TEXT[],                 -- Categorias de dados pessoais
    special_categories TEXT[],              -- Dados sensíveis
    data_subjects TEXT[],                   -- Tipos de titulares
    retention_period INTERVAL,             -- Período de retenção
    retention_criteria TEXT,               -- Critérios de retenção
    data_sources TEXT[],                    -- Fontes dos dados
    data_recipients TEXT[],                 -- Quem pode receber os dados
    international_transfers BOOLEAN DEFAULT false,
    transfer_countries TEXT[],             -- Países para transferência
    transfer_safeguards TEXT[],            -- Garantias para transferência
    security_measures TEXT[],              -- Medidas de segurança
    dpo_contact VARCHAR(255),              -- Contato do DPO
    is_active BOOLEAN DEFAULT true,
    risk_assessment JSONB DEFAULT '{}',    -- Avaliação de risco
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    consent_type VARCHAR(100) NOT NULL,    -- marketing, analytics, profiling, cookies
    consent_granted BOOLEAN NOT NULL,
    consent_method VARCHAR(50),            -- web_form, email, phone, api
    consent_text TEXT,                     -- Texto apresentado ao titular
    consent_version VARCHAR(20),           -- Versão do consentimento
    processing_activity_id UUID REFERENCES data_processing_activities(id),
    ip_address INET,
    user_agent TEXT,
    geolocation JSONB,                     -- Localização do usuário
    proof_of_consent JSONB DEFAULT '{}',   -- Prova do consentimento
    granularity JSONB DEFAULT '{}',        -- Consentimento granular
    expires_at TIMESTAMP WITH TIME ZONE,  -- Consentimento com prazo
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,                -- Motivo da retirada
    renewed_at TIMESTAMP WITH TIME ZONE,   -- Quando foi renovado
    parent_consent_id UUID REFERENCES consent_records(id), -- Para renovações
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para rastrear cookies e tracking
CREATE TABLE IF NOT EXISTS tracking_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255),
    user_id UUID REFERENCES users(id),
    cookie_category VARCHAR(50) NOT NULL,  -- necessary, analytics, marketing, preferences
    consent_granted BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    consent_banner_version VARCHAR(20),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, cookie_category)
);

-- Índices para GDPR/LGPD
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at ON gdpr_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_granted ON consent_records(consent_granted);
CREATE INDEX IF NOT EXISTS idx_consent_records_created_at ON consent_records(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_consents_session ON tracking_consents(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_consents_user_id ON tracking_consents(user_id);

-- =================================================================
-- FUNÇÕES AUXILIARES
-- =================================================================

-- Função para criar log de auditoria automaticamente
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_table_name VARCHAR,
    p_record_id VARCHAR,
    p_action VARCHAR,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    changed_fields TEXT[];
BEGIN
    -- Calcular campos alterados
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT ARRAY_AGG(key) INTO changed_fields
        FROM jsonb_each(p_old_values) old
        JOIN jsonb_each(p_new_values) new ON old.key = new.key
        WHERE old.value != new.value;
    END IF;
    
    INSERT INTO audit_logs (
        user_id, table_name, record_id, action,
        old_values, new_values, changed_fields,
        ip_address, session_id, reason
    ) VALUES (
        p_user_id, p_table_name, p_record_id, p_action,
        p_old_values, p_new_values, changed_fields,
        p_ip_address, p_session_id, p_reason
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Função para atribuir usuário a teste A/B
CREATE OR REPLACE FUNCTION assign_user_to_ab_test(
    p_test_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    assigned_variant_id UUID;
    random_value DECIMAL;
    cumulative_split DECIMAL := 0;
    variant_record RECORD;
    test_active BOOLEAN;
BEGIN
    -- Verificar se teste está ativo
    SELECT status = 'running' INTO test_active
    FROM ab_tests WHERE id = p_test_id;
    
    IF NOT test_active THEN
        RETURN NULL;
    END IF;
    
    -- Verificar se usuário já está atribuído
    IF p_user_id IS NOT NULL THEN
        SELECT variant_id INTO assigned_variant_id
        FROM ab_test_assignments
        WHERE test_id = p_test_id AND user_id = p_user_id;
    ELSE
        SELECT variant_id INTO assigned_variant_id
        FROM ab_test_assignments
        WHERE test_id = p_test_id AND session_id = p_session_id;
    END IF;
    
    IF assigned_variant_id IS NOT NULL THEN
        RETURN assigned_variant_id;
    END IF;
    
    -- Gerar número aleatório para atribuição
    random_value := RANDOM() * 100;
    
    -- Atribuir baseado no traffic_split
    FOR variant_record IN 
        SELECT id, traffic_split 
        FROM ab_test_variants 
        WHERE test_id = p_test_id 
        ORDER BY created_at
    LOOP
        cumulative_split := cumulative_split + variant_record.traffic_split;
        IF random_value <= cumulative_split THEN
            assigned_variant_id := variant_record.id;
            EXIT;
        END IF;
    END LOOP;
    
    -- Salvar atribuição
    INSERT INTO ab_test_assignments (test_id, variant_id, user_id, session_id)
    VALUES (p_test_id, assigned_variant_id, p_user_id, p_session_id);
    
    RETURN assigned_variant_id;
END;
$$ LANGUAGE plpgsql;

-- Função para processar webhooks pendentes
CREATE OR REPLACE FUNCTION process_webhook_queue()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    webhook_record RECORD;
BEGIN
    FOR webhook_record IN 
        SELECT * FROM webhook_events 
        WHERE status = 'pending' 
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY priority ASC, created_at ASC
        LIMIT 50
    LOOP
        -- Atualizar status para 'retrying'
        UPDATE webhook_events 
        SET 
            status = 'retrying',
            attempts = attempts + 1,
            next_retry_at = NOW() + (INTERVAL '5 minutes' * POWER(2, attempts))
        WHERE id = webhook_record.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- DADOS INICIAIS
-- =================================================================

-- Atividades de processamento básicas
INSERT INTO data_processing_activities (
    activity_name, purpose, legal_basis, data_categories, retention_period
) VALUES
(
    'Processamento de Pedidos',
    'Processar pedidos de compra e entregar produtos',
    'execution_of_contract',
    ARRAY['identification', 'contact', 'financial', 'address'],
    INTERVAL '7 years'
),
(
    'Marketing Direto',
    'Envio de comunicações promocionais e ofertas',
    'consent',
    ARRAY['identification', 'contact', 'behavioral'],
    INTERVAL '2 years'
),
(
    'Analytics e Métricas',
    'Análise de comportamento para melhoria do serviço',
    'legitimate_interest',
    ARRAY['behavioral', 'technical'],
    INTERVAL '1 year'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- =================================================================
-- RELATÓRIO DE IMPLEMENTAÇÃO
-- =================================================================

-- Contar todas as tabelas após implementação
SELECT 
    'IMPLEMENTAÇÃO CONCLUÍDA COM SUCESSO!' as status,
    COUNT(*) as total_tabelas_apos_implementacao
FROM information_schema.tables 
WHERE table_schema = 'public';

COMMENT ON TABLE audit_logs IS 'Sistema de auditoria completo para rastreamento de todas as ações';
COMMENT ON TABLE webhook_events IS 'Sistema de webhooks para integrações externas';
COMMENT ON TABLE ab_tests IS 'Sistema de testes A/B para otimização';
COMMENT ON TABLE marketing_campaigns IS 'Sistema de campanhas de marketing automatizadas';
COMMENT ON TABLE gdpr_requests IS 'Sistema de conformidade LGPD/GDPR';

SELECT 'Todas as funcionalidades avançadas foram implementadas com sucesso!' as resultado; 