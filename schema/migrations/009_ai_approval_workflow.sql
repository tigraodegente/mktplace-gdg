-- Migration: Sistema de Workflow de Aprovação para IA
-- Date: 2024-12-20
-- Description: Sistema completo para aprovar/rejeitar sugestões de IA com histórico

-- ==============================================
-- 1. TABELA DE SESSÕES DE ANÁLISE IA
-- ==============================================

CREATE TABLE ai_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'products', 'orders', etc
  entity_id UUID NOT NULL,
  total_suggestions INTEGER DEFAULT 0,
  approved_suggestions INTEGER DEFAULT 0,
  rejected_suggestions INTEGER DEFAULT 0,
  pending_suggestions INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partially_approved', 'completed', 'cancelled'
  analysis_data JSONB, -- Dados originais da análise
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 2. TABELA DE SUGESTÕES INDIVIDUAIS
-- ==============================================

CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_analysis_sessions(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(200) NOT NULL,
  current_value TEXT,
  suggested_value TEXT,
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT,
  source VARCHAR(50) DEFAULT 'ai', -- 'ai', 'similar_products', 'category_template'
  category VARCHAR(50), -- 'basic', 'seo', 'pricing', etc
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'applied'
  extra_info JSONB,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  applied_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 3. HISTÓRICO DE AÇÕES DE APROVAÇÃO
-- ==============================================

CREATE TABLE ai_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_analysis_sessions(id),
  suggestion_id UUID REFERENCES ai_suggestions(id),
  action VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'applied', 'bulk_approved'
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  user_email VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- ==============================================
-- 4. CONFIGURAÇÕES DE APROVAÇÃO POR USUÁRIO/ROLE
-- ==============================================

CREATE TABLE ai_approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  role VARCHAR(100), -- Se aplicável a uma role específica
  entity_type VARCHAR(50) DEFAULT 'products',
  
  -- Configurações de auto-aprovação
  auto_approve_enabled BOOLEAN DEFAULT false,
  auto_approve_confidence_threshold INTEGER DEFAULT 95,
  auto_approve_categories TEXT[], -- ['basic', 'seo'] = só auto-aprovar essas categorias
  auto_approve_fields TEXT[], -- Campos específicos para auto-aprovar
  
  -- Configurações de notificação
  email_notifications BOOLEAN DEFAULT true,
  notification_types TEXT[] DEFAULT ARRAY['high_confidence', 'completed_session'],
  
  -- Configurações de interface
  default_view VARCHAR(50) DEFAULT 'by_category', -- 'by_category', 'by_confidence', 'chronological'
  show_low_confidence BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, entity_type)
);

-- ==============================================
-- 5. TEMPLATES DE APROVAÇÃO POR CATEGORIA
-- ==============================================

CREATE TABLE ai_approval_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  entity_type VARCHAR(50) DEFAULT 'products',
  
  -- Regras automáticas
  rules JSONB NOT NULL, -- Regras de aprovação automática
  /*
  Exemplo de rules:
  {
    "auto_approve_if": {
      "confidence_above": 90,
      "fields": ["meta_title", "meta_description"],
      "exclude_if_empty_current": true
    },
    "auto_reject_if": {
      "confidence_below": 30,
      "contains_words": ["test", "lorem"]
    },
    "require_manual_review": {
      "fields": ["price", "cost"],
      "confidence_below": 80
    }
  }
  */
  
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 6. NOTIFICAÇÕES DE APROVAÇÃO
-- ==============================================

CREATE TABLE ai_approval_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_analysis_sessions(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(100) NOT NULL, -- 'new_session', 'high_confidence', 'completed', 'needs_review'
  title VARCHAR(300) NOT NULL,
  message TEXT,
  data JSONB, -- Dados específicos da notificação
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- ==============================================
-- 7. MÉTRICAS E ESTATÍSTICAS
-- ==============================================

CREATE TABLE ai_approval_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID REFERENCES users(id),
  entity_type VARCHAR(50) DEFAULT 'products',
  
  -- Contadores diários
  total_sessions INTEGER DEFAULT 0,
  total_suggestions INTEGER DEFAULT 0,
  approved_suggestions INTEGER DEFAULT 0,
  rejected_suggestions INTEGER DEFAULT 0,
  auto_approved_suggestions INTEGER DEFAULT 0,
  
  -- Métricas de performance
  avg_confidence DECIMAL(5,2),
  avg_approval_time_minutes INTEGER,
  most_approved_category VARCHAR(50),
  most_rejected_category VARCHAR(50),
  
  -- Breakdown por categoria
  category_stats JSONB, -- {"basic": {"approved": 10, "rejected": 2}, ...}
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(date, user_id, entity_type)
);

-- ==============================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ==============================================

CREATE INDEX idx_ai_analysis_sessions_entity ON ai_analysis_sessions(entity_type, entity_id);
CREATE INDEX idx_ai_analysis_sessions_status ON ai_analysis_sessions(status);
CREATE INDEX idx_ai_analysis_sessions_created_by ON ai_analysis_sessions(created_by);
CREATE INDEX idx_ai_analysis_sessions_created_at ON ai_analysis_sessions(created_at);

CREATE INDEX idx_ai_suggestions_session_id ON ai_suggestions(session_id);
CREATE INDEX idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX idx_ai_suggestions_category ON ai_suggestions(category);
CREATE INDEX idx_ai_suggestions_confidence ON ai_suggestions(confidence);
CREATE INDEX idx_ai_suggestions_field_name ON ai_suggestions(field_name);

CREATE INDEX idx_ai_approval_history_session_id ON ai_approval_history(session_id);
CREATE INDEX idx_ai_approval_history_user_id ON ai_approval_history(user_id);
CREATE INDEX idx_ai_approval_history_action ON ai_approval_history(action);
CREATE INDEX idx_ai_approval_history_created_at ON ai_approval_history(created_at);

CREATE INDEX idx_ai_approval_notifications_user_id ON ai_approval_notifications(user_id);
CREATE INDEX idx_ai_approval_notifications_is_read ON ai_approval_notifications(is_read);
CREATE INDEX idx_ai_approval_notifications_type ON ai_approval_notifications(type);

CREATE INDEX idx_ai_approval_metrics_date ON ai_approval_metrics(date);
CREATE INDEX idx_ai_approval_metrics_user_id ON ai_approval_metrics(user_id);

-- ==============================================
-- 9. TRIGGERS E FUNÇÕES AUTOMÁTICAS
-- ==============================================

-- Trigger para atualizar contadores da sessão
CREATE OR REPLACE FUNCTION update_session_counters() RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar contadores na sessão
  UPDATE ai_analysis_sessions 
  SET 
    approved_suggestions = (
      SELECT COUNT(*) FROM ai_suggestions 
      WHERE session_id = NEW.session_id AND status = 'approved'
    ),
    rejected_suggestions = (
      SELECT COUNT(*) FROM ai_suggestions 
      WHERE session_id = NEW.session_id AND status = 'rejected'
    ),
    pending_suggestions = (
      SELECT COUNT(*) FROM ai_suggestions 
      WHERE session_id = NEW.session_id AND status = 'pending'
    ),
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  -- Atualizar status da sessão se necessário
  UPDATE ai_analysis_sessions 
  SET status = CASE 
    WHEN pending_suggestions = 0 THEN 'completed'
    WHEN approved_suggestions > 0 OR rejected_suggestions > 0 THEN 'partially_approved'
    ELSE 'pending'
  END,
  completed_at = CASE 
    WHEN pending_suggestions = 0 THEN NOW()
    ELSE completed_at
  END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_suggestions_status_trigger
  AFTER UPDATE OF status ON ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_counters();

-- Trigger para inserir no histórico
CREATE OR REPLACE FUNCTION log_approval_action() RETURNS TRIGGER AS $$
BEGIN
  -- Se status mudou, registrar no histórico
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO ai_approval_history (
      session_id, suggestion_id, action, previous_status, new_status,
      user_id, created_at
    ) VALUES (
      NEW.session_id, NEW.id, NEW.status, OLD.status, NEW.status,
      NEW.approved_by, NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_suggestions_history_trigger
  AFTER UPDATE ON ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION log_approval_action();

-- Trigger para métricas diárias
CREATE OR REPLACE FUNCTION update_daily_metrics() RETURNS TRIGGER AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  user_id_val UUID := NEW.approved_by;
BEGIN
  -- Inserir ou atualizar métricas diárias
  INSERT INTO ai_approval_metrics (
    date, user_id, entity_type, approved_suggestions, rejected_suggestions
  ) VALUES (
    current_date, user_id_val, 'products', 
    CASE WHEN NEW.status = 'approved' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'rejected' THEN 1 ELSE 0 END
  )
  ON CONFLICT (date, user_id, entity_type) 
  DO UPDATE SET
    approved_suggestions = ai_approval_metrics.approved_suggestions + 
      CASE WHEN NEW.status = 'approved' THEN 1 ELSE 0 END,
    rejected_suggestions = ai_approval_metrics.rejected_suggestions + 
      CASE WHEN NEW.status = 'rejected' THEN 1 ELSE 0 END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_suggestions_metrics_trigger
  AFTER UPDATE OF status ON ai_suggestions
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION update_daily_metrics();

-- ==============================================
-- 10. INSERIR TEMPLATES PADRÃO
-- ==============================================

INSERT INTO ai_approval_templates (name, description, category, rules, is_system) VALUES
('Auto-Aprovar SEO Alto Confidence', 'Aprova automaticamente sugestões SEO com alta confiança', 'seo', 
'{"auto_approve_if": {"confidence_above": 85, "fields": ["meta_title", "meta_description", "meta_keywords"]}, "auto_reject_if": {"confidence_below": 40}}', true),

('Revisar Preços Manualmente', 'Sempre requer revisão manual para campos de preço', 'pricing',
'{"require_manual_review": {"fields": ["price", "sale_price", "cost_price"], "always": true}}', true),

('Auto-Aprovar Conteúdo Básico', 'Aprova automaticamente melhorias de conteúdo básico', 'basic',
'{"auto_approve_if": {"confidence_above": 80, "exclude_if_empty_current": false}, "auto_reject_if": {"confidence_below": 30}}', true),

('Aprovar Atributos Seguros', 'Aprova automaticamente atributos e especificações', 'attributes',
'{"auto_approve_if": {"confidence_above": 75, "fields": ["attributes", "specifications"]}}', true);

-- ==============================================
-- 11. CONFIGURAÇÕES PADRÃO
-- ==============================================

-- Inserir configurações padrão para administradores
INSERT INTO ai_approval_settings (
  user_id, entity_type, auto_approve_enabled, auto_approve_confidence_threshold,
  auto_approve_categories, email_notifications, notification_types
) 
SELECT 
  id, 'products', true, 90,
  ARRAY['seo', 'attributes'], true,
  ARRAY['high_confidence', 'completed_session']
FROM users 
WHERE role = 'admin' OR email LIKE '%admin%'
ON CONFLICT (user_id, entity_type) DO NOTHING;

-- ==============================================
-- 12. VIEWS ÚTEIS
-- ==============================================

-- View para sessões com estatísticas
CREATE VIEW ai_sessions_with_stats AS
SELECT 
  s.*,
  u.name as created_by_name,
  u.email as created_by_email,
  CASE 
    WHEN s.total_suggestions = 0 THEN 0
    ELSE ROUND((s.approved_suggestions::DECIMAL / s.total_suggestions) * 100, 1)
  END as approval_rate,
  CASE 
    WHEN s.completed_at IS NOT NULL AND s.created_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (s.completed_at - s.created_at))/60
    ELSE NULL
  END as completion_time_minutes
FROM ai_analysis_sessions s
LEFT JOIN users u ON s.created_by = u.id;

-- View para sugestões com detalhes
CREATE VIEW ai_suggestions_detailed AS
SELECT 
  sug.*,
  sess.entity_type,
  sess.entity_id,
  sess.status as session_status,
  approved_user.name as approved_by_name,
  approved_user.email as approved_by_email
FROM ai_suggestions sug
JOIN ai_analysis_sessions sess ON sug.session_id = sess.id
LEFT JOIN users approved_user ON sug.approved_by = approved_user.id;

-- ==============================================
-- 13. COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE ai_analysis_sessions IS 'Sessões de análise IA com controle de aprovação';
COMMENT ON TABLE ai_suggestions IS 'Sugestões individuais da IA com status de aprovação';
COMMENT ON TABLE ai_approval_history IS 'Histórico completo de ações de aprovação';
COMMENT ON TABLE ai_approval_settings IS 'Configurações personalizadas de aprovação por usuário';
COMMENT ON TABLE ai_approval_templates IS 'Templates de regras de aprovação automática';
COMMENT ON TABLE ai_approval_notifications IS 'Sistema de notificações para aprovações';
COMMENT ON TABLE ai_approval_metrics IS 'Métricas e estatísticas de aprovação';

COMMENT ON COLUMN ai_suggestions.confidence IS 'Confidence da IA de 0-100';
COMMENT ON COLUMN ai_approval_settings.auto_approve_confidence_threshold IS 'Threshold mínimo para auto-aprovação';
COMMENT ON COLUMN ai_approval_templates.rules IS 'Regras JSON para aprovação automática'; 