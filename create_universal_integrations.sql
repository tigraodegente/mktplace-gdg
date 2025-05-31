-- =====================================================
-- SISTEMA UNIVERSAL DE INTEGRAÇÕES EXTERNAS
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PROVIDERS DE INTEGRAÇÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,        -- 'pagseguro', 'stripe', 'correios'
    display_name VARCHAR(100) NOT NULL,      -- 'PagSeguro', 'Stripe', 'Correios'
    type VARCHAR(20) NOT NULL CHECK (type IN ('payment', 'shipping', 'notification', 'analytics', 'webhook')),
    description TEXT,
    
    -- Configurações
    is_active BOOLEAN DEFAULT false,
    is_sandbox BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1,             -- 1 = maior prioridade
    
    -- Configurações específicas do provider
    config JSONB NOT NULL DEFAULT '{}',     -- API keys, URLs, etc
    retry_config JSONB NOT NULL DEFAULT '{
        "maxAttempts": 3,
        "backoffType": "exponential",
        "baseDelay": 1000,
        "maxDelay": 30000,
        "retryableErrors": ["timeout", "5xx", "network_error", "rate_limit"],
        "nonRetryableErrors": ["4xx", "invalid_credentials", "invalid_data"]
    }',
    
    -- Webhooks
    webhook_url TEXT,                       -- URL para receber webhooks
    webhook_secret TEXT,                    -- Chave para validar webhooks
    webhook_events JSONB DEFAULT '[]',      -- Eventos suportados
    
    -- Métricas
    success_rate DECIMAL(5,2) DEFAULT 0.00, -- Taxa de sucesso (%)
    avg_response_time INTEGER DEFAULT 0,     -- Tempo médio de resposta (ms)
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_integration_providers_type ON integration_providers(type);
CREATE INDEX IF NOT EXISTS idx_integration_providers_active ON integration_providers(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_integration_providers_name ON integration_providers(name);

-- =====================================================
-- 2. FILA UNIVERSAL DE RETRY
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    provider_id UUID NOT NULL REFERENCES integration_providers(id),
    integration_type VARCHAR(20) NOT NULL,  -- 'payment', 'shipping', etc
    operation VARCHAR(50) NOT NULL,         -- 'process_payment', 'create_shipment', etc
    reference_id UUID NOT NULL,             -- order_id, payment_id, etc
    reference_type VARCHAR(50) NOT NULL,    -- 'order', 'payment', 'shipment'
    
    -- Status da operação
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'retrying', 'success', 'failed', 'cancelled')),
    
    -- Dados da operação
    request_data JSONB NOT NULL,            -- Dados enviados para o provider
    response_data JSONB,                    -- Resposta recebida
    external_id VARCHAR(255),               -- ID retornado pelo provider
    
    -- Controle de retry
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    retry_strategy JSONB,                   -- Estratégia específica se diferente do provider
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Erros
    last_error TEXT,
    error_history JSONB DEFAULT '[]',       -- Histórico de erros
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    response_time_ms INTEGER,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 5,            -- 1 = alta, 10 = baixa
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance da fila
CREATE INDEX IF NOT EXISTS idx_retry_queue_status ON integration_retry_queue(status);
CREATE INDEX IF NOT EXISTS idx_retry_queue_next_retry ON integration_retry_queue(next_retry_at) WHERE status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_retry_queue_provider ON integration_retry_queue(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_retry_queue_reference ON integration_retry_queue(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_retry_queue_priority ON integration_retry_queue(priority, status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_retry_queue_created_at ON integration_retry_queue(created_at);

-- =====================================================
-- 3. LOGS DE INTEGRAÇÃO
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência
    provider_id UUID NOT NULL REFERENCES integration_providers(id),
    retry_queue_id UUID REFERENCES integration_retry_queue(id),
    
    -- Evento
    event_type VARCHAR(50) NOT NULL,        -- 'request', 'response', 'error', 'retry', 'timeout'
    level VARCHAR(10) NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
    message TEXT NOT NULL,
    
    -- Dados técnicos
    request_method VARCHAR(10),             -- GET, POST, etc
    request_url TEXT,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    response_time_ms INTEGER,
    
    -- Contexto
    operation VARCHAR(50),
    reference_id UUID,
    reference_type VARCHAR(50),
    user_id UUID,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    tags VARCHAR(255)[],                    -- Tags para categorização
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_integration_logs_provider ON integration_logs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_level ON integration_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_event_type ON integration_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_reference ON integration_logs(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at DESC);

-- =====================================================
-- 4. MÉTRICAS DE PERFORMANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência
    provider_id UUID NOT NULL REFERENCES integration_providers(id),
    operation VARCHAR(50) NOT NULL,
    
    -- Período da métrica
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('minute', 'hour', 'day', 'week', 'month')),
    
    -- Métricas de volume
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    timeout_requests INTEGER DEFAULT 0,
    
    -- Métricas de performance
    avg_response_time_ms INTEGER DEFAULT 0,
    min_response_time_ms INTEGER DEFAULT 0,
    max_response_time_ms INTEGER DEFAULT 0,
    p50_response_time_ms INTEGER DEFAULT 0,
    p95_response_time_ms INTEGER DEFAULT 0,
    p99_response_time_ms INTEGER DEFAULT 0,
    
    -- Métricas de retry
    total_retries INTEGER DEFAULT 0,
    successful_retries INTEGER DEFAULT 0,
    failed_retries INTEGER DEFAULT 0,
    
    -- Taxas calculadas
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    error_rate DECIMAL(5,2) DEFAULT 0.00,
    retry_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Erros mais comuns
    top_errors JSONB DEFAULT '[]',
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    UNIQUE(provider_id, operation, period_start, period_type)
);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_integration_metrics_provider ON integration_metrics(provider_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_integration_metrics_period ON integration_metrics(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_integration_metrics_operation ON integration_metrics(operation, period_start DESC);

-- =====================================================
-- 5. CONFIGURAÇÕES DE AMBIENTE
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    name VARCHAR(50) UNIQUE NOT NULL,       -- 'development', 'staging', 'production'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT false,
    is_current BOOLEAN DEFAULT false,       -- Apenas um pode ser current
    
    -- Configurações globais do ambiente
    config JSONB DEFAULT '{}',
    
    -- Timeouts padrão
    default_timeout_ms INTEGER DEFAULT 30000,
    default_retry_attempts INTEGER DEFAULT 3,
    
    -- Rate limiting
    rate_limit_requests INTEGER DEFAULT 1000,
    rate_limit_window_ms INTEGER DEFAULT 60000,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir que apenas um ambiente seja current
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_environments_current 
ON integration_environments(is_current) WHERE is_current = true;

-- =====================================================
-- 6. CONFIGURAÇÕES POR AMBIENTE
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_provider_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referências
    provider_id UUID NOT NULL REFERENCES integration_providers(id),
    environment_id UUID NOT NULL REFERENCES integration_environments(id),
    
    -- Configurações específicas do ambiente
    config JSONB NOT NULL DEFAULT '{}',     -- Override das configurações do provider
    is_active BOOLEAN DEFAULT false,
    
    -- Constraint para evitar duplicatas
    UNIQUE(provider_id, environment_id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. FUNCTIONS E TRIGGERS
-- =====================================================

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_integration_providers_updated_at 
    BEFORE UPDATE ON integration_providers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_retry_queue_updated_at 
    BEFORE UPDATE ON integration_retry_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_environments_updated_at 
    BEFORE UPDATE ON integration_environments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_provider_environments_updated_at 
    BEFORE UPDATE ON integration_provider_environments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. FUNÇÃO PARA PROCESSAR FILA DE RETRY
-- =====================================================

CREATE OR REPLACE FUNCTION process_integration_retry_queue()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    retry_record RECORD;
    retry_delay INTEGER;
    next_retry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar itens elegíveis para retry
    FOR retry_record IN 
        SELECT 
            irq.*,
            ip.retry_config,
            ip.name as provider_name
        FROM integration_retry_queue irq
        JOIN integration_providers ip ON irq.provider_id = ip.id
        WHERE irq.status IN ('pending', 'retrying')
        AND (irq.next_retry_at IS NULL OR irq.next_retry_at <= NOW())
        AND irq.attempts < irq.max_attempts
        ORDER BY irq.priority ASC, irq.created_at ASC
        LIMIT 100
    LOOP
        -- Calcular próximo retry baseado na estratégia
        retry_delay := CASE 
            WHEN (retry_record.retry_config->>'backoffType')::TEXT = 'exponential' THEN
                (retry_record.retry_config->>'baseDelay')::INTEGER * POWER(2, retry_record.attempts)
            WHEN (retry_record.retry_config->>'backoffType')::TEXT = 'linear' THEN
                (retry_record.retry_config->>'baseDelay')::INTEGER * (retry_record.attempts + 1)
            ELSE
                (retry_record.retry_config->>'baseDelay')::INTEGER
        END;
        
        -- Limitar delay máximo
        retry_delay := LEAST(retry_delay, COALESCE((retry_record.retry_config->>'maxDelay')::INTEGER, 300000));
        
        next_retry := NOW() + (retry_delay || ' milliseconds')::INTERVAL;
        
        -- Atualizar status para processing
        UPDATE integration_retry_queue 
        SET 
            status = 'processing',
            attempts = attempts + 1,
            next_retry_at = next_retry,
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = retry_record.id;
        
        -- Log do retry
        INSERT INTO integration_logs (
            provider_id,
            retry_queue_id,
            event_type,
            level,
            message,
            operation,
            reference_id,
            reference_type,
            metadata
        ) VALUES (
            retry_record.provider_id,
            retry_record.id,
            'retry_scheduled',
            'info',
            format('Retry %s/%s agendado para %s', 
                retry_record.attempts + 1, 
                retry_record.max_attempts,
                next_retry
            ),
            retry_record.operation,
            retry_record.reference_id,
            retry_record.reference_type,
            jsonb_build_object(
                'attempt', retry_record.attempts + 1,
                'next_retry_at', next_retry,
                'delay_ms', retry_delay
            )
        );
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. FUNÇÃO PARA CALCULAR MÉTRICAS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_integration_metrics(
    p_provider_id UUID DEFAULT NULL,
    p_period_type VARCHAR(20) DEFAULT 'hour'
)
RETURNS INTEGER AS $$
DECLARE
    metrics_count INTEGER := 0;
    provider_record RECORD;
    period_start TIMESTAMP WITH TIME ZONE;
    period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Definir período baseado no tipo
    CASE p_period_type
        WHEN 'minute' THEN
            period_start := date_trunc('minute', NOW() - INTERVAL '1 minute');
            period_end := date_trunc('minute', NOW());
        WHEN 'hour' THEN
            period_start := date_trunc('hour', NOW() - INTERVAL '1 hour');
            period_end := date_trunc('hour', NOW());
        WHEN 'day' THEN
            period_start := date_trunc('day', NOW() - INTERVAL '1 day');
            period_end := date_trunc('day', NOW());
        ELSE
            period_start := date_trunc('hour', NOW() - INTERVAL '1 hour');
            period_end := date_trunc('hour', NOW());
    END CASE;
    
    -- Loop pelos providers
    FOR provider_record IN
        SELECT id, name FROM integration_providers 
        WHERE (p_provider_id IS NULL OR id = p_provider_id)
        AND is_active = true
    LOOP
        -- Calcular métricas da fila de retry
        INSERT INTO integration_metrics (
            provider_id,
            operation,
            period_start,
            period_end,
            period_type,
            total_requests,
            successful_requests,
            failed_requests,
            avg_response_time_ms,
            success_rate,
            error_rate
        )
        SELECT 
            provider_record.id,
            'all_operations',
            period_start,
            period_end,
            p_period_type,
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'success'),
            COUNT(*) FILTER (WHERE status = 'failed'),
            AVG(response_time_ms)::INTEGER,
            ROUND(
                COUNT(*) FILTER (WHERE status = 'success') * 100.0 / NULLIF(COUNT(*), 0),
                2
            ),
            ROUND(
                COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / NULLIF(COUNT(*), 0),
                2
            )
        FROM integration_retry_queue
        WHERE provider_id = provider_record.id
        AND created_at >= period_start
        AND created_at < period_end
        HAVING COUNT(*) > 0
        ON CONFLICT (provider_id, operation, period_start, period_type) 
        DO UPDATE SET
            total_requests = EXCLUDED.total_requests,
            successful_requests = EXCLUDED.successful_requests,
            failed_requests = EXCLUDED.failed_requests,
            avg_response_time_ms = EXCLUDED.avg_response_time_ms,
            success_rate = EXCLUDED.success_rate,
            error_rate = EXCLUDED.error_rate;
        
        GET DIAGNOSTICS metrics_count = ROW_COUNT;
    END LOOP;
    
    RETURN metrics_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. DADOS INICIAIS
-- =====================================================

-- Ambientes padrão
INSERT INTO integration_environments (name, display_name, description, is_active, is_current) VALUES
('development', 'Desenvolvimento', 'Ambiente de desenvolvimento local', true, true),
('staging', 'Homologação', 'Ambiente de testes e homologação', true, false),
('production', 'Produção', 'Ambiente de produção', true, false)
ON CONFLICT (name) DO NOTHING;

-- Providers de pagamento
INSERT INTO integration_providers (
    name, display_name, type, description, is_active, priority, config, retry_config
) VALUES 
(
    'pagseguro',
    'PagSeguro',
    'payment',
    'Gateway de pagamento PagSeguro - PIX, Cartão, Boleto',
    true,
    1,
    '{
        "apiUrl": "https://ws.pagseguro.uol.com.br/v4",
        "sandboxUrl": "https://ws.sandbox.pagseguro.uol.com.br/v4",
        "supportedMethods": ["pix", "credit_card", "debit_card", "boleto"],
        "pixExpirationMinutes": 15,
        "boletoExpirationDays": 7
    }',
    '{
        "maxAttempts": 5,
        "backoffType": "exponential",
        "baseDelay": 1000,
        "maxDelay": 60000,
        "retryableErrors": ["timeout", "5xx", "network_error", "rate_limit"],
        "nonRetryableErrors": ["4xx", "invalid_card", "insufficient_funds", "invalid_credentials"]
    }'
),
(
    'stripe',
    'Stripe',
    'payment',
    'Gateway de pagamento Stripe - Cartões internacionais',
    false,
    2,
    '{
        "apiUrl": "https://api.stripe.com/v1",
        "supportedMethods": ["credit_card", "debit_card"],
        "supportedCurrencies": ["USD", "EUR", "BRL"]
    }',
    '{
        "maxAttempts": 3,
        "backoffType": "exponential",
        "baseDelay": 2000,
        "maxDelay": 30000,
        "retryableErrors": ["timeout", "5xx", "network_error"],
        "nonRetryableErrors": ["4xx", "card_declined", "invalid_card"]
    }'
)
ON CONFLICT (name) DO NOTHING;

-- Providers de frete
INSERT INTO integration_providers (
    name, display_name, type, description, is_active, priority, config, retry_config
) VALUES 
(
    'correios',
    'Correios',
    'shipping',
    'Empresa Brasileira de Correios e Telégrafos',
    true,
    1,
    '{
        "apiUrl": "https://api.correios.com.br/v1",
        "services": ["PAC", "SEDEX", "SEDEX10", "SEDEX12"],
        "contractNumber": "",
        "password": "",
        "trackingUrl": "https://www.correios.com.br/rastreamento"
    }',
    '{
        "maxAttempts": 3,
        "backoffType": "linear",
        "baseDelay": 5000,
        "maxDelay": 30000,
        "retryableErrors": ["timeout", "5xx", "network_error", "service_unavailable"],
        "nonRetryableErrors": ["4xx", "invalid_postal_code", "invalid_credentials"]
    }'
),
(
    'jadlog',
    'Jadlog',
    'shipping',
    'Transportadora Jadlog',
    false,
    2,
    '{
        "apiUrl": "https://api.jadlog.com.br/v1",
        "services": ["EXPRESSO", "PACKAGE", "RODOVIARIO"],
        "trackingUrl": "https://www.jadlog.com.br/rastreamento"
    }',
    '{
        "maxAttempts": 3,
        "backoffType": "exponential",
        "baseDelay": 2000,
        "maxDelay": 30000,
        "retryableErrors": ["timeout", "5xx", "network_error"],
        "nonRetryableErrors": ["4xx", "invalid_data", "unauthorized"]
    }'
)
ON CONFLICT (name) DO NOTHING;

-- Providers de notificação
INSERT INTO integration_providers (
    name, display_name, type, description, is_active, priority, config, retry_config
) VALUES 
(
    'sendgrid',
    'SendGrid',
    'notification',
    'Serviço de envio de emails SendGrid',
    false,
    1,
    '{
        "apiUrl": "https://api.sendgrid.com/v3",
        "fromEmail": "noreply@marketplace.com",
        "fromName": "Marketplace GDG",
        "templates": {
            "order_confirmation": "d-1234567890",
            "payment_confirmation": "d-0987654321",
            "shipping_notification": "d-1122334455"
        }
    }',
    '{
        "maxAttempts": 5,
        "backoffType": "exponential",
        "baseDelay": 1000,
        "maxDelay": 60000,
        "retryableErrors": ["timeout", "5xx", "rate_limit"],
        "nonRetryableErrors": ["4xx", "invalid_email", "bounced"]
    }'
),
(
    'whatsapp_business',
    'WhatsApp Business',
    'notification',
    'WhatsApp Business API para notificações',
    false,
    2,
    '{
        "apiUrl": "https://graph.facebook.com/v18.0",
        "phoneNumberId": "",
        "businessAccountId": "",
        "templates": {
            "order_confirmation": "order_confirmed",
            "shipping_update": "shipping_update"
        }
    }',
    '{
        "maxAttempts": 3,
        "backoffType": "exponential",
        "baseDelay": 2000,
        "maxDelay": 30000,
        "retryableErrors": ["timeout", "5xx", "rate_limit"],
        "nonRetryableErrors": ["4xx", "invalid_phone", "template_rejected"]
    }'
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 11. VIEWS PARA FACILITAR CONSULTAS
-- =====================================================

-- View para status atual dos providers
CREATE OR REPLACE VIEW integration_providers_status AS
SELECT 
    ip.id,
    ip.name,
    ip.display_name,
    ip.type,
    ip.is_active,
    ip.priority,
    ip.success_rate,
    ip.avg_response_time_ms,
    ip.last_success_at,
    ip.last_failure_at,
    
    -- Métricas das últimas 24h
    COALESCE(recent_metrics.total_requests_24h, 0) as requests_24h,
    COALESCE(recent_metrics.success_rate_24h, 0) as success_rate_24h,
    COALESCE(recent_metrics.avg_response_time_24h, 0) as avg_response_time_24h,
    
    -- Status da fila
    COALESCE(queue_status.pending_items, 0) as pending_retries,
    COALESCE(queue_status.processing_items, 0) as processing_items,
    COALESCE(queue_status.failed_items, 0) as failed_items
    
FROM integration_providers ip

LEFT JOIN (
    SELECT 
        provider_id,
        SUM(total_requests) as total_requests_24h,
        AVG(success_rate) as success_rate_24h,
        AVG(avg_response_time_ms) as avg_response_time_24h
    FROM integration_metrics
    WHERE period_start >= NOW() - INTERVAL '24 hours'
    GROUP BY provider_id
) recent_metrics ON ip.id = recent_metrics.provider_id

LEFT JOIN (
    SELECT 
        provider_id,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_items,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_items,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_items
    FROM integration_retry_queue
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY provider_id
) queue_status ON ip.id = queue_status.provider_id;

-- View para logs resumidos
CREATE OR REPLACE VIEW integration_logs_summary AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    provider_id,
    level,
    event_type,
    COUNT(*) as total_events,
    COUNT(DISTINCT reference_id) as unique_references
FROM integration_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), provider_id, level, event_type
ORDER BY hour DESC;

COMMIT;

-- =====================================================
-- RELATÓRIO DE IMPLEMENTAÇÃO
-- =====================================================

SELECT 
    'SISTEMA UNIVERSAL DE INTEGRAÇÕES IMPLEMENTADO!' as status,
    (SELECT COUNT(*) FROM integration_providers) as total_providers,
    (SELECT COUNT(*) FROM integration_providers WHERE is_active = true) as active_providers,
    (SELECT COUNT(*) FROM integration_environments) as environments; 