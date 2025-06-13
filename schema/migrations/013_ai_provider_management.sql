-- Migration: Sistema de Gerenciamento de Provedores de IA
-- Date: 2024-12-20
-- Description: Sistema para escolher e gerenciar diferentes provedores de IA

-- ==============================================
-- 1. PROVEDORES DE IA DISPONÍVEIS
-- ==============================================

CREATE TABLE ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  provider_type VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google', 'azure', 'local'
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  
  -- Configurações técnicas
  api_base_url VARCHAR(500),
  api_version VARCHAR(50),
  requires_api_key BOOLEAN DEFAULT true,
  supports_streaming BOOLEAN DEFAULT false,
  supports_functions BOOLEAN DEFAULT false,
  supports_vision BOOLEAN DEFAULT false,
  
  -- Limites e custos
  max_context_length INTEGER,
  default_cost_per_1k_tokens DECIMAL(10,6),
  cost_currency VARCHAR(10) DEFAULT 'USD',
  rate_limit_per_minute INTEGER,
  rate_limit_per_day INTEGER,
  
  -- Disponibilidade
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  
  -- Configurações padrão
  default_temperature DECIMAL(3,2) DEFAULT 0.7,
  default_max_tokens INTEGER DEFAULT 2000,
  default_top_p DECIMAL(3,2) DEFAULT 1.0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 2. MODELOS DE IA POR PROVEDOR
-- ==============================================

CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES ai_providers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  model_id VARCHAR(200) NOT NULL, -- ID usado na API do provedor
  
  -- Capacidades
  supports_chat BOOLEAN DEFAULT true,
  supports_completion BOOLEAN DEFAULT true,
  supports_embedding BOOLEAN DEFAULT false,
  supports_image_input BOOLEAN DEFAULT false,
  supports_image_output BOOLEAN DEFAULT false,
  supports_code BOOLEAN DEFAULT false,
  
  -- Configurações técnicas
  context_length INTEGER,
  max_output_tokens INTEGER,
  training_data_cutoff DATE,
  
  -- Custos
  cost_per_1k_input_tokens DECIMAL(10,6),
  cost_per_1k_output_tokens DECIMAL(10,6),
  cost_per_image DECIMAL(10,6),
  
  -- Performance e qualidade
  performance_score DECIMAL(3,1), -- 1-10
  quality_score DECIMAL(3,1), -- 1-10
  speed_score DECIMAL(3,1), -- 1-10
  
  -- Uso recomendado
  recommended_for TEXT[], -- ['creative_writing', 'code', 'analysis', 'translation']
  best_use_cases TEXT[],
  
  -- Disponibilidade
  is_active BOOLEAN DEFAULT true,
  is_beta BOOLEAN DEFAULT false,
  requires_special_access BOOLEAN DEFAULT false,
  
  -- Configurações padrão específicas do modelo
  default_temperature DECIMAL(3,2),
  default_max_tokens INTEGER,
  default_top_p DECIMAL(3,2),
  default_frequency_penalty DECIMAL(3,2) DEFAULT 0.0,
  default_presence_penalty DECIMAL(3,2) DEFAULT 0.0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider_id, model_id)
);

-- ==============================================
-- 3. CONFIGURAÇÕES DE PROVEDOR POR USUÁRIO/SELLER
-- ==============================================

CREATE TABLE user_ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES sellers(id),
  provider_id UUID REFERENCES ai_providers(id),
  
  -- Chaves de API
  api_key_encrypted TEXT, -- Chave criptografada
  api_endpoint VARCHAR(500), -- Endpoint customizado se necessário
  organization_id VARCHAR(200), -- Para OpenAI e similares
  
  -- Preferências
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Ordem de preferência
  
  -- Configurações de uso
  monthly_budget DECIMAL(10,2),
  current_monthly_spend DECIMAL(10,2) DEFAULT 0.00,
  daily_usage_limit INTEGER,
  current_daily_usage INTEGER DEFAULT 0,
  
  -- Configurações de modelo padrão
  default_model_id UUID REFERENCES ai_models(id),
  fallback_model_id UUID REFERENCES ai_models(id),
  
  -- Configurações avançadas
  custom_parameters JSONB, -- Parâmetros específicos do provedor
  rate_limit_buffer DECIMAL(3,2) DEFAULT 0.1, -- 10% de buffer no rate limit
  
  -- Metadados
  nickname VARCHAR(100), -- Nome amigável para o usuário
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  
  CHECK ((user_id IS NOT NULL) != (seller_id IS NOT NULL)) -- XOR: ou user_id ou seller_id
);

-- ==============================================
-- 4. ESTRATÉGIAS DE ROTEAMENTO DE IA
-- ==============================================

CREATE TABLE ai_routing_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Configuração da estratégia
  strategy_type VARCHAR(50) NOT NULL, -- 'round_robin', 'cost_optimized', 'performance_based', 'fallback_chain'
  strategy_config JSONB NOT NULL,
  /*
  Exemplos de strategy_config:
  
  cost_optimized:
  {
    "primary_criteria": "cost",
    "quality_threshold": 7,
    "fallback_on_failure": true
  }
  
  performance_based:
  {
    "primary_criteria": "speed",
    "quality_threshold": 8,
    "load_balance": true
  }
  
  fallback_chain:
  {
    "chain": [
      {"provider": "openai", "model": "gpt-4"},
      {"provider": "anthropic", "model": "claude-3"},
      {"provider": "local", "model": "llama2"}
    ]
  }
  */
  
  -- Aplicabilidade
  applies_to_categories TEXT[], -- Categorias de prompts
  applies_to_users TEXT[], -- Tipos de usuário
  applies_to_use_cases TEXT[], -- Casos de uso específicos
  
  -- Configurações
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 5. LOG DE USO POR PROVEDOR
-- ==============================================

CREATE TABLE ai_provider_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES ai_providers(id),
  model_id UUID REFERENCES ai_models(id),
  user_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES sellers(id),
  
  -- Contexto da requisição
  request_type VARCHAR(50), -- 'chat', 'completion', 'embedding'
  use_case VARCHAR(100), -- 'product_description', 'seo_optimization'
  category VARCHAR(50),
  
  -- Input
  input_tokens INTEGER,
  input_length INTEGER, -- Caracteres
  prompt_template_id UUID, -- Se veio de um template
  
  -- Configurações usadas
  temperature DECIMAL(3,2),
  max_tokens INTEGER,
  top_p DECIMAL(3,2),
  other_parameters JSONB,
  
  -- Output
  output_tokens INTEGER,
  output_length INTEGER,
  finish_reason VARCHAR(50),
  
  -- Performance
  latency_ms INTEGER,
  first_token_latency_ms INTEGER,
  tokens_per_second DECIMAL(8,2),
  
  -- Custo
  estimated_cost DECIMAL(10,6),
  actual_cost DECIMAL(10,6),
  
  -- Qualidade (se avaliada)
  quality_score INTEGER, -- 1-10
  user_feedback VARCHAR(50), -- 'thumbs_up', 'thumbs_down', 'neutral'
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'failed', 'timeout', 'cancelled'
  error_code VARCHAR(100),
  error_message TEXT,
  
  -- Contexto técnico
  request_id VARCHAR(200), -- ID da requisição no provedor
  api_version VARCHAR(50),
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 6. ESTATÍSTICAS POR PROVEDOR
-- ==============================================

CREATE TABLE ai_provider_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES ai_providers(id),
  model_id UUID REFERENCES ai_models(id),
  date DATE NOT NULL,
  
  -- Contadores de uso
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  timeout_requests INTEGER DEFAULT 0,
  
  -- Tokens
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  avg_input_tokens INTEGER,
  avg_output_tokens INTEGER,
  
  -- Performance
  avg_latency_ms INTEGER,
  p95_latency_ms INTEGER,
  avg_tokens_per_second DECIMAL(8,2),
  
  -- Custos
  total_cost DECIMAL(10,4) DEFAULT 0.0000,
  avg_cost_per_request DECIMAL(10,6),
  
  -- Qualidade
  avg_quality_score DECIMAL(3,1),
  positive_feedback_ratio DECIMAL(5,4),
  
  -- Por categoria de uso
  category_breakdown JSONB, -- {"seo": {"requests": 100, "cost": 2.50}, ...}
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider_id, model_id, date)
);

-- ==============================================
-- 7. ALERTAS E MONITORAMENTO
-- ==============================================

CREATE TABLE ai_provider_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES ai_providers(id),
  model_id UUID REFERENCES ai_models(id),
  user_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES sellers(id),
  
  -- Tipo de alerta
  alert_type VARCHAR(100) NOT NULL, -- 'budget_exceeded', 'rate_limit_hit', 'high_error_rate', 'poor_performance'
  severity VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Detalhes
  title VARCHAR(300) NOT NULL,
  message TEXT,
  threshold_value DECIMAL(10,4),
  current_value DECIMAL(10,4),
  
  -- Contexto
  time_period VARCHAR(50), -- 'last_hour', 'today', 'this_month'
  metadata JSONB,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ==============================================

CREATE INDEX idx_ai_models_provider_id ON ai_models(provider_id);
CREATE INDEX idx_ai_models_active ON ai_models(is_active);
CREATE INDEX idx_ai_models_recommended_for ON ai_models USING GIN(recommended_for);

CREATE INDEX idx_user_ai_provider_configs_user_id ON user_ai_provider_configs(user_id);
CREATE INDEX idx_user_ai_provider_configs_seller_id ON user_ai_provider_configs(seller_id);
CREATE INDEX idx_user_ai_provider_configs_provider_id ON user_ai_provider_configs(provider_id);
CREATE INDEX idx_user_ai_provider_configs_primary ON user_ai_provider_configs(is_primary) WHERE is_primary = true;

CREATE INDEX idx_ai_provider_usage_log_provider_model ON ai_provider_usage_log(provider_id, model_id);
CREATE INDEX idx_ai_provider_usage_log_user_id ON ai_provider_usage_log(user_id);
CREATE INDEX idx_ai_provider_usage_log_seller_id ON ai_provider_usage_log(seller_id);
CREATE INDEX idx_ai_provider_usage_log_created_at ON ai_provider_usage_log(created_at);
CREATE INDEX idx_ai_provider_usage_log_use_case ON ai_provider_usage_log(use_case);

CREATE INDEX idx_ai_provider_stats_provider_model_date ON ai_provider_stats(provider_id, model_id, date);
CREATE INDEX idx_ai_provider_stats_date ON ai_provider_stats(date);

CREATE INDEX idx_ai_provider_alerts_provider_id ON ai_provider_alerts(provider_id);
CREATE INDEX idx_ai_provider_alerts_status ON ai_provider_alerts(status);
CREATE INDEX idx_ai_provider_alerts_severity ON ai_provider_alerts(severity);

-- ==============================================
-- 9. TRIGGERS E FUNÇÕES
-- ==============================================

-- Trigger para atualizar estatísticas de uso
CREATE OR REPLACE FUNCTION update_ai_provider_stats() RETURNS TRIGGER AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
BEGIN
  INSERT INTO ai_provider_stats (
    provider_id, model_id, date, total_requests,
    successful_requests, failed_requests, timeout_requests,
    total_input_tokens, total_output_tokens, total_cost
  ) VALUES (
    NEW.provider_id, NEW.model_id, current_date, 1,
    CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'timeout' THEN 1 ELSE 0 END,
    COALESCE(NEW.input_tokens, 0),
    COALESCE(NEW.output_tokens, 0),
    COALESCE(NEW.estimated_cost, 0)
  )
  ON CONFLICT (provider_id, model_id, date)
  DO UPDATE SET
    total_requests = ai_provider_stats.total_requests + 1,
    successful_requests = ai_provider_stats.successful_requests + 
      CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    failed_requests = ai_provider_stats.failed_requests + 
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    timeout_requests = ai_provider_stats.timeout_requests + 
      CASE WHEN NEW.status = 'timeout' THEN 1 ELSE 0 END,
    total_input_tokens = ai_provider_stats.total_input_tokens + COALESCE(NEW.input_tokens, 0),
    total_output_tokens = ai_provider_stats.total_output_tokens + COALESCE(NEW.output_tokens, 0),
    total_cost = ai_provider_stats.total_cost + COALESCE(NEW.estimated_cost, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_provider_usage_stats_trigger
  AFTER INSERT ON ai_provider_usage_log
  FOR EACH ROW EXECUTE FUNCTION update_ai_provider_stats();

-- Função para selecionar melhor provedor baseado em estratégia
CREATE OR REPLACE FUNCTION select_best_ai_provider(
  p_user_id UUID,
  p_seller_id UUID,
  p_use_case VARCHAR(100),
  p_category VARCHAR(50)
) RETURNS TABLE(provider_id UUID, model_id UUID) AS $$
DECLARE
  strategy RECORD;
  config JSONB;
BEGIN
  -- Buscar estratégia aplicável
  SELECT * INTO strategy
  FROM ai_routing_strategies 
  WHERE is_active = true
    AND (applies_to_use_cases IS NULL OR p_use_case = ANY(applies_to_use_cases))
    AND (applies_to_categories IS NULL OR p_category = ANY(applies_to_categories))
  ORDER BY priority DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Fallback para provedor primário do usuário
    RETURN QUERY
    SELECT uapc.provider_id, uapc.default_model_id
    FROM user_ai_provider_configs uapc
    WHERE (uapc.user_id = p_user_id OR uapc.seller_id = p_seller_id)
      AND uapc.is_primary = true
      AND uapc.is_active = true
    LIMIT 1;
    RETURN;
  END IF;
  
  config := strategy.strategy_config;
  
  -- Implementar lógica baseada no tipo de estratégia
  IF strategy.strategy_type = 'cost_optimized' THEN
    RETURN QUERY
    SELECT am.provider_id, am.id
    FROM ai_models am
    JOIN ai_providers ap ON am.provider_id = ap.id
    WHERE ap.is_active = true 
      AND am.is_active = true
      AND am.quality_score >= (config->>'quality_threshold')::decimal
    ORDER BY am.cost_per_1k_input_tokens ASC
    LIMIT 1;
    
  ELSIF strategy.strategy_type = 'performance_based' THEN
    RETURN QUERY
    SELECT am.provider_id, am.id
    FROM ai_models am
    JOIN ai_providers ap ON am.provider_id = ap.id
    WHERE ap.is_active = true 
      AND am.is_active = true
      AND am.quality_score >= (config->>'quality_threshold')::decimal
    ORDER BY am.speed_score DESC
    LIMIT 1;
    
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 10. INSERIR PROVEDORES PADRÃO
-- ==============================================

-- OpenAI
INSERT INTO ai_providers (name, display_name, description, provider_type, api_base_url, logo_url, website_url, requires_api_key, supports_streaming, supports_functions, max_context_length, default_cost_per_1k_tokens) VALUES
('openai', 'OpenAI', 'Provedor líder em modelos de linguagem', 'openai', 'https://api.openai.com/v1', 'https://openai.com/logo.png', 'https://openai.com', true, true, true, 128000, 0.002);

-- Anthropic
INSERT INTO ai_providers (name, display_name, description, provider_type, api_base_url, logo_url, website_url, requires_api_key, supports_streaming, max_context_length, default_cost_per_1k_tokens) VALUES
('anthropic', 'Anthropic (Claude)', 'Modelos Claude focados em segurança', 'anthropic', 'https://api.anthropic.com/v1', 'https://anthropic.com/logo.png', 'https://anthropic.com', true, true, 200000, 0.0015);

-- Google
INSERT INTO ai_providers (name, display_name, description, provider_type, api_base_url, logo_url, website_url, requires_api_key, max_context_length, default_cost_per_1k_tokens) VALUES
('google', 'Google AI (Gemini)', 'Modelos Gemini do Google', 'google', 'https://generativelanguage.googleapis.com/v1', 'https://google.com/logo.png', 'https://ai.google', true, 1000000, 0.001);

-- Inserir modelos para cada provedor
-- OpenAI Models
INSERT INTO ai_models (provider_id, name, display_name, model_id, context_length, cost_per_1k_input_tokens, cost_per_1k_output_tokens, performance_score, quality_score, speed_score, recommended_for) VALUES
((SELECT id FROM ai_providers WHERE name = 'openai'), 'gpt-4-turbo', 'GPT-4 Turbo', 'gpt-4-0125-preview', 128000, 0.01, 0.03, 9.0, 9.5, 7.0, ARRAY['creative_writing', 'analysis', 'complex_reasoning']),
((SELECT id FROM ai_providers WHERE name = 'openai'), 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'gpt-3.5-turbo-0125', 16385, 0.0005, 0.0015, 8.0, 8.0, 9.0, ARRAY['general_purpose', 'fast_responses']),
((SELECT id FROM ai_providers WHERE name = 'openai'), 'gpt-4', 'GPT-4', 'gpt-4', 8192, 0.03, 0.06, 8.5, 9.5, 6.0, ARRAY['complex_analysis', 'creative_writing']);

-- Anthropic Models  
INSERT INTO ai_models (provider_id, name, display_name, model_id, context_length, cost_per_1k_input_tokens, cost_per_1k_output_tokens, performance_score, quality_score, speed_score, recommended_for) VALUES
((SELECT id FROM ai_providers WHERE name = 'anthropic'), 'claude-3-opus', 'Claude 3 Opus', 'claude-3-opus-20240229', 200000, 0.015, 0.075, 9.5, 9.8, 6.5, ARRAY['creative_writing', 'complex_reasoning', 'long_context']),
((SELECT id FROM ai_providers WHERE name = 'anthropic'), 'claude-3-sonnet', 'Claude 3 Sonnet', 'claude-3-sonnet-20240229', 200000, 0.003, 0.015, 8.5, 9.0, 8.0, ARRAY['balanced_performance', 'analysis']),
((SELECT id FROM ai_providers WHERE name = 'anthropic'), 'claude-3-haiku', 'Claude 3 Haiku', 'claude-3-haiku-20240307', 200000, 0.00025, 0.00125, 7.5, 8.0, 9.5, ARRAY['fast_responses', 'simple_tasks']);

-- Google Models
INSERT INTO ai_models (provider_id, name, display_name, model_id, context_length, cost_per_1k_input_tokens, cost_per_1k_output_tokens, performance_score, quality_score, speed_score, recommended_for) VALUES
((SELECT id FROM ai_providers WHERE name = 'google'), 'gemini-pro', 'Gemini Pro', 'gemini-pro', 30720, 0.0005, 0.0015, 8.0, 8.5, 8.5, ARRAY['general_purpose', 'multimodal']),
((SELECT id FROM ai_providers WHERE name = 'google'), 'gemini-ultra', 'Gemini Ultra', 'gemini-ultra', 30720, 0.002, 0.006, 9.0, 9.0, 7.0, ARRAY['complex_reasoning', 'high_quality']);

-- ==============================================
-- 11. ESTRATÉGIAS DE ROTEAMENTO PADRÃO
-- ==============================================

INSERT INTO ai_routing_strategies (name, display_name, description, strategy_type, strategy_config, is_system) VALUES
('Custo Otimizado', 'Roteamento Baseado em Custo', 'Seleciona o provedor mais barato que atende aos critérios de qualidade', 'cost_optimized', 
'{"primary_criteria": "cost", "quality_threshold": 8.0, "fallback_on_failure": true}', true),

('Performance Máxima', 'Roteamento Baseado em Performance', 'Seleciona o provedor mais rápido e de melhor qualidade', 'performance_based',
'{"primary_criteria": "speed", "quality_threshold": 8.5, "load_balance": true}', true),

('Fallback Inteligente', 'Chain de Fallback', 'Usa uma sequência de provedores em caso de falha', 'fallback_chain',
'{"chain": [{"provider": "openai", "model": "gpt-4-turbo"}, {"provider": "anthropic", "model": "claude-3-sonnet"}, {"provider": "google", "model": "gemini-pro"}]}', true);

-- ==============================================
-- 12. VIEWS ÚTEIS
-- ==============================================

-- View para comparação de provedores
CREATE VIEW ai_provider_comparison AS
SELECT 
  ap.name,
  ap.display_name,
  COUNT(am.id) as total_models,
  MIN(am.cost_per_1k_input_tokens) as min_cost,
  MAX(am.cost_per_1k_input_tokens) as max_cost,
  AVG(am.performance_score) as avg_performance,
  AVG(am.quality_score) as avg_quality,
  AVG(am.speed_score) as avg_speed,
  ap.is_active,
  ap.max_context_length
FROM ai_providers ap
LEFT JOIN ai_models am ON ap.id = am.provider_id AND am.is_active = true
GROUP BY ap.id, ap.name, ap.display_name, ap.is_active, ap.max_context_length
ORDER BY avg_quality DESC;

-- View para dashboard de uso
CREATE VIEW ai_usage_dashboard AS
SELECT 
  ap.display_name as provider_name,
  am.display_name as model_name,
  COUNT(aul.id) as total_requests,
  AVG(aul.latency_ms) as avg_latency,
  SUM(aul.estimated_cost) as total_cost,
  AVG(aul.quality_score) as avg_quality,
  COUNT(CASE WHEN aul.status = 'completed' THEN 1 END)::DECIMAL / COUNT(aul.id) * 100 as success_rate
FROM ai_provider_usage_log aul
JOIN ai_providers ap ON aul.provider_id = ap.id
JOIN ai_models am ON aul.model_id = am.id
WHERE aul.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ap.id, ap.display_name, am.id, am.display_name
ORDER BY total_requests DESC;

-- ==============================================
-- 13. COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE ai_providers IS 'Provedores de IA disponíveis no sistema';
COMMENT ON TABLE ai_models IS 'Modelos específicos de cada provedor de IA';
COMMENT ON TABLE user_ai_provider_configs IS 'Configurações de provedor por usuário/seller';
COMMENT ON TABLE ai_routing_strategies IS 'Estratégias para escolher provedor automaticamente';
COMMENT ON TABLE ai_provider_usage_log IS 'Log detalhado de uso de cada provedor';
COMMENT ON TABLE ai_provider_stats IS 'Estatísticas agregadas por provedor';
COMMENT ON TABLE ai_provider_alerts IS 'Alertas e monitoramento de provedores';

COMMENT ON COLUMN ai_models.cost_per_1k_input_tokens IS 'Custo por 1000 tokens de entrada em USD';
COMMENT ON COLUMN ai_models.cost_per_1k_output_tokens IS 'Custo por 1000 tokens de saída em USD';
COMMENT ON COLUMN user_ai_provider_configs.api_key_encrypted IS 'Chave de API criptografada com AES-256';
COMMENT ON COLUMN ai_routing_strategies.strategy_config IS 'Configuração JSON específica da estratégia'; 