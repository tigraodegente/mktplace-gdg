-- Migration: Sistema de Webhooks e Eventos
-- Date: 2024-12-20
-- Description: Sistema completo para gerenciar webhooks e eventos do sistema

-- ==============================================
-- 1. CONFIGURAÇÃO DE ENDPOINTS DE WEBHOOK
-- ==============================================

CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  
  -- Configurações de autenticação
  auth_type VARCHAR(50) DEFAULT 'none', -- 'none', 'bearer', 'api_key', 'basic', 'signature'
  auth_config JSONB, -- Configurações específicas por tipo de auth
  
  -- Configurações de request
  http_method VARCHAR(10) DEFAULT 'POST',
  headers JSONB, -- Headers customizados
  timeout_seconds INTEGER DEFAULT 30,
  
  -- Configurações de retry
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  retry_backoff_multiplier DECIMAL(3,2) DEFAULT 2.0,
  
  -- Filtros de eventos
  event_types TEXT[], -- Tipos de eventos que este endpoint quer receber
  entity_filters JSONB, -- Filtros específicos por entidade
  
  -- Status e monitoramento
  is_active BOOLEAN DEFAULT true,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  -- Configurações avançadas
  batch_enabled BOOLEAN DEFAULT false,
  batch_size INTEGER DEFAULT 10,
  batch_timeout_seconds INTEGER DEFAULT 300,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 2. TIPOS DE EVENTOS DISPONÍVEIS
-- ==============================================

CREATE TABLE webhook_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL, -- 'product.created', 'order.status_changed'
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'products', 'orders', 'users', 'ai', 'system'
  
  -- Schema do payload
  payload_schema JSONB, -- JSON Schema do payload enviado
  example_payload JSONB, -- Exemplo de payload
  
  -- Configurações
  is_active BOOLEAN DEFAULT true,
  requires_permission VARCHAR(100), -- Permissão necessária para receber
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 3. EVENTOS EXECUTADOS
-- ==============================================

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- 'products', 'orders', etc
  entity_id UUID,
  
  -- Dados do evento
  payload JSONB NOT NULL,
  metadata JSONB, -- Metadados adicionais
  
  -- Contexto
  triggered_by UUID REFERENCES users(id), -- Quem triggou o evento
  trigger_source VARCHAR(50) DEFAULT 'system', -- 'user_action', 'system', 'api', 'cron'
  
  -- Status de processamento
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 4. DELIVERIES DE WEBHOOK
-- ==============================================

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_id UUID REFERENCES webhook_events(id) ON DELETE CASCADE,
  
  -- Request details
  request_url TEXT NOT NULL,
  request_method VARCHAR(10) NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  
  -- Response details
  response_status INTEGER,
  response_headers JSONB,
  response_body TEXT,
  response_time_ms INTEGER,
  
  -- Status de delivery
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'retrying'
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  
  -- Retry information
  next_retry_at TIMESTAMP,
  retry_reason TEXT,
  final_failure_reason TEXT,
  
  -- Timestamps
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 5. TEMPLATES DE PAYLOAD
-- ==============================================

CREATE TABLE webhook_payload_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Template configuration
  template_format VARCHAR(50) DEFAULT 'json', -- 'json', 'xml', 'form_data'
  template_content TEXT NOT NULL, -- Template com variáveis {{}}
  
  -- Template variables
  available_variables JSONB, -- Lista de variáveis disponíveis
  required_variables TEXT[], -- Variáveis obrigatórias
  
  -- Settings
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 6. CONFIGURAÇÕES DE ROUTING
-- ==============================================

CREATE TABLE webhook_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Rule conditions
  conditions JSONB NOT NULL, -- Condições para aplicar a regra
  /*
  Exemplo:
  {
    "event_type": ["product.created", "product.updated"],
    "entity_conditions": {
      "price": {"$gt": 100},
      "category": {"$in": ["electronics", "computers"]}
    },
    "user_conditions": {
      "role": "admin"
    }
  }
  */
  
  -- Actions
  target_endpoints UUID[], -- Endpoints para enviar
  transform_payload BOOLEAN DEFAULT false,
  payload_template_id UUID REFERENCES webhook_payload_templates(id),
  
  -- Additional settings
  priority INTEGER DEFAULT 0, -- Ordem de execução
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 7. ESTATÍSTICAS DE WEBHOOK
-- ==============================================

CREATE TABLE webhook_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES webhook_endpoints(id),
  date DATE NOT NULL,
  
  -- Contadores
  total_events INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  retried_deliveries INTEGER DEFAULT 0,
  
  -- Performance
  avg_response_time_ms INTEGER DEFAULT 0,
  min_response_time_ms INTEGER DEFAULT 0,
  max_response_time_ms INTEGER DEFAULT 0,
  
  -- Error analysis
  error_types JSONB, -- {"timeout": 5, "404": 3, "500": 2}
  top_errors TEXT[],
  
  -- Success rate
  success_rate DECIMAL(5,2),
  uptime_percentage DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(endpoint_id, date)
);

-- ==============================================
-- 8. HISTÓRICO DE CONFIGURAÇÕES
-- ==============================================

CREATE TABLE webhook_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES webhook_endpoints(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'activated', 'deactivated', 'deleted'
  
  -- Change details
  old_config JSONB,
  new_config JSONB,
  changes_summary TEXT,
  
  -- User context
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 9. ÍNDICES PARA PERFORMANCE
-- ==============================================

CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active);
CREATE INDEX idx_webhook_endpoints_event_types ON webhook_endpoints USING GIN(event_types);

CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_entity ON webhook_events(entity_type, entity_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);

CREATE INDEX idx_webhook_stats_endpoint_date ON webhook_stats(endpoint_id, date);
CREATE INDEX idx_webhook_stats_date ON webhook_stats(date);

-- ==============================================
-- 10. TRIGGERS E FUNÇÕES
-- ==============================================

-- Função para processar templates de payload
CREATE OR REPLACE FUNCTION render_webhook_payload(
  p_template TEXT,
  p_event_data JSONB,
  p_variables JSONB DEFAULT '{}'::jsonb
) RETURNS TEXT AS $$
DECLARE
  rendered_payload TEXT := p_template;
  var_key TEXT;
  var_value TEXT;
BEGIN
  -- Substituir variáveis do evento
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_event_data)
  LOOP
    rendered_payload := replace(rendered_payload, '{{event.' || var_key || '}}', var_value);
  END LOOP;
  
  -- Substituir variáveis customizadas
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    rendered_payload := replace(rendered_payload, '{{' || var_key || '}}', var_value);
  END LOOP;
  
  -- Substituir variáveis de sistema
  rendered_payload := replace(rendered_payload, '{{timestamp}}', extract(epoch from NOW())::text);
  rendered_payload := replace(rendered_payload, '{{iso_timestamp}}', NOW()::text);
  rendered_payload := replace(rendered_payload, '{{uuid}}', gen_random_uuid()::text);
  
  RETURN rendered_payload;
END;
$$ LANGUAGE plpgsql;

-- Função para criar evento de webhook
CREATE OR REPLACE FUNCTION create_webhook_event(
  p_event_type VARCHAR(100),
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_triggered_by UUID DEFAULT NULL,
  p_trigger_source VARCHAR(50) DEFAULT 'system'
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
  endpoint_record RECORD;
  should_send BOOLEAN;
BEGIN
  -- Criar o evento
  INSERT INTO webhook_events (
    event_type, entity_type, entity_id, payload, 
    triggered_by, trigger_source
  ) VALUES (
    p_event_type, p_entity_type, p_entity_id, p_payload,
    p_triggered_by, p_trigger_source
  ) RETURNING id INTO event_id;
  
  -- Encontrar endpoints que devem receber este evento
  FOR endpoint_record IN
    SELECT * FROM webhook_endpoints 
    WHERE is_active = true 
    AND (event_types IS NULL OR p_event_type = ANY(event_types))
  LOOP
    -- Verificar filtros específicos (implementação simplificada)
    should_send := true;
    
    -- Se deve enviar, criar delivery
    IF should_send THEN
      INSERT INTO webhook_deliveries (
        endpoint_id, event_id, request_url, request_method,
        max_attempts, status
      ) VALUES (
        endpoint_record.id, event_id, endpoint_record.url, 
        endpoint_record.http_method, endpoint_record.max_retries,
        'pending'
      );
    END IF;
  END LOOP;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estatísticas
CREATE OR REPLACE FUNCTION update_webhook_stats() RETURNS TRIGGER AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  endpoint_id_val UUID := NEW.endpoint_id;
BEGIN
  INSERT INTO webhook_stats (
    endpoint_id, date, total_events,
    successful_deliveries, failed_deliveries
  ) VALUES (
    endpoint_id_val, current_date, 1,
    CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END
  )
  ON CONFLICT (endpoint_id, date)
  DO UPDATE SET
    total_events = webhook_stats.total_events + 1,
    successful_deliveries = webhook_stats.successful_deliveries + 
      CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
    failed_deliveries = webhook_stats.failed_deliveries + 
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_delivery_stats_trigger
  AFTER UPDATE OF status ON webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_webhook_stats();

-- ==============================================
-- 11. INSERIR DADOS INICIAIS
-- ==============================================

-- Tipos de eventos pré-definidos
INSERT INTO webhook_event_types (name, display_name, description, category) VALUES
-- Produtos
('product.created', 'Produto Criado', 'Disparado quando um novo produto é criado', 'products'),
('product.updated', 'Produto Atualizado', 'Disparado quando um produto é modificado', 'products'),
('product.deleted', 'Produto Deletado', 'Disparado quando um produto é removido', 'products'),
('product.stock_low', 'Estoque Baixo', 'Disparado quando estoque fica abaixo do limite', 'products'),
('product.stock_out', 'Estoque Zerado', 'Disparado quando produto fica sem estoque', 'products'),

-- Pedidos
('order.created', 'Pedido Criado', 'Disparado quando um novo pedido é criado', 'orders'),
('order.status_changed', 'Status do Pedido Alterado', 'Disparado quando status do pedido muda', 'orders'),
('order.paid', 'Pedido Pago', 'Disparado quando pagamento é confirmado', 'orders'),
('order.shipped', 'Pedido Enviado', 'Disparado quando pedido é despachado', 'orders'),
('order.delivered', 'Pedido Entregue', 'Disparado quando entrega é confirmada', 'orders'),
('order.cancelled', 'Pedido Cancelado', 'Disparado quando pedido é cancelado', 'orders'),

-- Usuários
('user.registered', 'Usuário Registrado', 'Disparado quando novo usuário se cadastra', 'users'),
('user.login', 'Login Realizado', 'Disparado quando usuário faz login', 'users'),
('user.profile_updated', 'Perfil Atualizado', 'Disparado quando dados do usuário são alterados', 'users'),

-- IA
('ai.analysis.completed', 'Análise IA Concluída', 'Disparado quando análise de IA é finalizada', 'ai'),
('ai.approval.required', 'Aprovação IA Necessária', 'Disparado quando sugestão IA precisa aprovação', 'ai'),
('ai.suggestion.applied', 'Sugestão IA Aplicada', 'Disparado quando sugestão IA é aplicada', 'ai'),

-- Sistema
('system.backup.completed', 'Backup Concluído', 'Disparado quando backup é finalizado', 'system'),
('system.maintenance.started', 'Manutenção Iniciada', 'Disparado quando sistema entra em manutenção', 'system'),
('system.error.critical', 'Erro Crítico', 'Disparado quando erro crítico ocorre', 'system');

-- Templates de payload básicos
INSERT INTO webhook_payload_templates (name, event_type, description, template_content) VALUES
('Payload Padrão - Produto', 'product.created', 'Template padrão para eventos de produto', 
'{
  "event": "{{event_type}}",
  "timestamp": "{{iso_timestamp}}",
  "data": {
    "product": {{event.entity_data}},
    "user": {{event.user_data}}
  },
  "metadata": {
    "source": "{{event.trigger_source}}",
    "event_id": "{{event.id}}"
  }
}'),

('Payload Padrão - Pedido', 'order.created', 'Template padrão para eventos de pedido',
'{
  "event": "{{event_type}}",
  "timestamp": "{{iso_timestamp}}",
  "data": {
    "order": {{event.entity_data}},
    "customer": {{event.customer_data}}
  },
  "metadata": {
    "source": "{{event.trigger_source}}",
    "event_id": "{{event.id}}"
  }
}');

-- ==============================================
-- 12. VIEWS ÚTEIS
-- ==============================================

-- View de estatísticas de webhook por endpoint
CREATE VIEW webhook_endpoint_stats AS
SELECT 
  e.id,
  e.name,
  e.url,
  e.is_active,
  e.success_count,
  e.failure_count,
  CASE 
    WHEN (e.success_count + e.failure_count) > 0 
    THEN ROUND((e.success_count * 100.0) / (e.success_count + e.failure_count), 2)
    ELSE 0 
  END as success_rate,
  e.last_success_at,
  e.last_failure_at,
  COUNT(d.id) as total_deliveries_today,
  COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as successful_deliveries_today
FROM webhook_endpoints e
LEFT JOIN webhook_deliveries d ON e.id = d.endpoint_id 
  AND d.created_at::date = CURRENT_DATE
GROUP BY e.id, e.name, e.url, e.is_active, e.success_count, 
  e.failure_count, e.last_success_at, e.last_failure_at;

-- View de eventos recentes
CREATE VIEW recent_webhook_events AS
SELECT 
  e.id,
  e.event_type,
  e.entity_type,
  e.entity_id,
  e.status,
  e.created_at,
  u.name as triggered_by_name,
  COUNT(d.id) as delivery_count,
  COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as successful_deliveries
FROM webhook_events e
LEFT JOIN users u ON e.triggered_by = u.id
LEFT JOIN webhook_deliveries d ON e.id = d.event_id
WHERE e.created_at > NOW() - INTERVAL '24 hours'
GROUP BY e.id, e.event_type, e.entity_type, e.entity_id, 
  e.status, e.created_at, u.name
ORDER BY e.created_at DESC;

-- ==============================================
-- 13. COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE webhook_endpoints IS 'Endpoints de webhook configurados';
COMMENT ON TABLE webhook_event_types IS 'Tipos de eventos disponíveis no sistema';
COMMENT ON TABLE webhook_events IS 'Eventos que foram disparados';
COMMENT ON TABLE webhook_deliveries IS 'Tentativas de entrega de webhook';
COMMENT ON TABLE webhook_payload_templates IS 'Templates para customizar payload dos webhooks';
COMMENT ON TABLE webhook_routing_rules IS 'Regras para roteamento inteligente de webhooks';
COMMENT ON TABLE webhook_stats IS 'Estatísticas de performance dos webhooks';

COMMENT ON FUNCTION create_webhook_event IS 'Função para criar e processar eventos de webhook';
COMMENT ON FUNCTION render_webhook_payload IS 'Função para renderizar templates de payload com variáveis'; 