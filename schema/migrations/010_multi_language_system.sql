-- Migration: Sistema Multi-idioma Completo
-- Date: 2024-12-20
-- Description: Sistema para gerenciar conteúdo em múltiplos idiomas com suporte a IA

-- ==============================================
-- 1. CONFIGURAÇÃO DE IDIOMAS
-- ==============================================

CREATE TABLE languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE, -- 'pt-BR', 'en-US', 'es-ES'
  name VARCHAR(100) NOT NULL, -- 'Português (Brasil)', 'English (US)'
  native_name VARCHAR(100) NOT NULL, -- 'Português', 'English'
  flag_emoji VARCHAR(10), -- '🇧🇷', '🇺🇸'
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 2. TRADUÇÕES DE ENTIDADES
-- ==============================================

CREATE TABLE entity_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'products', 'categories', 'brands'
  entity_id UUID NOT NULL,
  language_code VARCHAR(10) REFERENCES languages(code),
  field_name VARCHAR(100) NOT NULL, -- 'name', 'description', 'meta_title'
  translated_value TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_confidence INTEGER, -- 0-100 se gerado por IA
  ai_provider VARCHAR(50), -- 'openai', 'google-translate'
  translator_notes TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'published'
  translated_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id, language_code, field_name)
);

-- ==============================================
-- 3. CONFIGURAÇÕES DE TRADUÇÃO POR ENTIDADE
-- ==============================================

CREATE TABLE translation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  is_translatable BOOLEAN DEFAULT true,
  ai_translation_enabled BOOLEAN DEFAULT true,
  requires_human_review BOOLEAN DEFAULT false,
  auto_publish BOOLEAN DEFAULT false,
  max_length INTEGER,
  validation_rules JSONB,
  priority INTEGER DEFAULT 0, -- Ordem de prioridade para tradução
  field_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(entity_type, field_name)
);

-- ==============================================
-- 4. TEMPLATES DE TRADUÇÃO IA
-- ==============================================

CREATE TABLE ai_translation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  field_name VARCHAR(100),
  source_language VARCHAR(10) REFERENCES languages(code),
  target_language VARCHAR(10) REFERENCES languages(code),
  prompt_template TEXT NOT NULL,
  /*
  Exemplo de prompt_template:
  "Traduza este {{field_type}} de produto do {{source_language}} para {{target_language}}. 
  Mantenha o tom {{tone}} e seja fiel ao significado original.
  Produto: {{product_name}}
  Campo: {{field_name}}
  Texto original: {{original_text}}
  
  Retorne APENAS a tradução sem explicações."
  */
  tone VARCHAR(50) DEFAULT 'professional', -- 'casual', 'professional', 'technical'
  preserve_formatting BOOLEAN DEFAULT true,
  max_tokens INTEGER DEFAULT 1000,
  temperature DECIMAL(3,2) DEFAULT 0.3,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 5. FILAS DE TRADUÇÃO
-- ==============================================

CREATE TABLE translation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  source_language VARCHAR(10) REFERENCES languages(code),
  target_language VARCHAR(10) REFERENCES languages(code),
  original_text TEXT NOT NULL,
  priority INTEGER DEFAULT 0, -- Maior = mais prioritário
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  translation_method VARCHAR(50), -- 'ai', 'human', 'hybrid'
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  estimated_cost DECIMAL(10,4), -- Custo estimado da tradução
  actual_cost DECIMAL(10,4), -- Custo real
  deadline TIMESTAMP,
  error_message TEXT,
  metadata JSONB, -- Dados adicionais sobre a tradução
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  UNIQUE(entity_type, entity_id, field_name, target_language)
);

-- ==============================================
-- 6. HISTÓRICO DE TRADUÇÕES
-- ==============================================

CREATE TABLE translation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id UUID REFERENCES entity_translations(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'reviewed', 'approved', 'rejected'
  old_value TEXT,
  new_value TEXT,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(200),
  notes TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 7. MÉTRICAS DE TRADUÇÃO
-- ==============================================

CREATE TABLE translation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  language_code VARCHAR(10) REFERENCES languages(code),
  entity_type VARCHAR(50),
  
  -- Contadores
  translations_created INTEGER DEFAULT 0,
  translations_completed INTEGER DEFAULT 0,
  ai_translations INTEGER DEFAULT 0,
  human_translations INTEGER DEFAULT 0,
  translations_reviewed INTEGER DEFAULT 0,
  translations_approved INTEGER DEFAULT 0,
  translations_rejected INTEGER DEFAULT 0,
  
  -- Qualidade
  avg_ai_confidence DECIMAL(5,2),
  avg_review_time_hours DECIMAL(8,2),
  avg_translation_time_minutes DECIMAL(8,2),
  
  -- Custos
  total_cost DECIMAL(10,4),
  avg_cost_per_word DECIMAL(8,6),
  
  -- Estatísticas de campo
  field_stats JSONB, -- {"name": {"count": 10, "avg_confidence": 85}, ...}
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(date, language_code, entity_type)
);

-- ==============================================
-- 8. CONFIGURAÇÕES DE USUÁRIO PARA IDIOMAS
-- ==============================================

CREATE TABLE user_language_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  preferred_language VARCHAR(10) REFERENCES languages(code),
  fallback_language VARCHAR(10) REFERENCES languages(code),
  can_translate_languages TEXT[], -- ['en-US', 'es-ES'] = idiomas que o usuário pode traduzir
  can_review_languages TEXT[], -- Idiomas que pode revisar
  auto_translate_enabled BOOLEAN DEFAULT false,
  notification_language VARCHAR(10) REFERENCES languages(code),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ==============================================
-- 9. ÍNDICES PARA PERFORMANCE
-- ==============================================

CREATE INDEX idx_entity_translations_entity ON entity_translations(entity_type, entity_id);
CREATE INDEX idx_entity_translations_language ON entity_translations(language_code);
CREATE INDEX idx_entity_translations_field ON entity_translations(field_name);
CREATE INDEX idx_entity_translations_status ON entity_translations(status);
CREATE INDEX idx_entity_translations_ai_generated ON entity_translations(is_ai_generated);

CREATE INDEX idx_translation_queue_status ON translation_queue(status);
CREATE INDEX idx_translation_queue_priority ON translation_queue(priority DESC);
CREATE INDEX idx_translation_queue_deadline ON translation_queue(deadline);
CREATE INDEX idx_translation_queue_assigned ON translation_queue(assigned_to);

CREATE INDEX idx_translation_history_translation_id ON translation_history(translation_id);
CREATE INDEX idx_translation_history_action ON translation_history(action);
CREATE INDEX idx_translation_history_created_at ON translation_history(created_at);

CREATE INDEX idx_translation_metrics_date ON translation_metrics(date);
CREATE INDEX idx_translation_metrics_language ON translation_metrics(language_code);

-- ==============================================
-- 10. TRIGGERS AUTOMÁTICOS
-- ==============================================

-- Trigger para histórico de traduções
CREATE OR REPLACE FUNCTION log_translation_changes() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO translation_history (
      translation_id, action, old_value, new_value, old_status, new_status,
      user_id, created_at
    ) VALUES (
      NEW.id, 'updated', OLD.translated_value, NEW.translated_value,
      OLD.status, NEW.status, NEW.translated_by, NOW()
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO translation_history (
      translation_id, action, new_value, new_status, user_id, created_at
    ) VALUES (
      NEW.id, 'created', NEW.translated_value, NEW.status, NEW.translated_by, NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_translations_history_trigger
  AFTER INSERT OR UPDATE ON entity_translations
  FOR EACH ROW EXECUTE FUNCTION log_translation_changes();

-- Trigger para atualizar métricas
CREATE OR REPLACE FUNCTION update_translation_metrics() RETURNS TRIGGER AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  entity_type_val VARCHAR(50) := NEW.entity_type;
  language_val VARCHAR(10) := NEW.language_code;
BEGIN
  -- Atualizar ou inserir métricas diárias
  INSERT INTO translation_metrics (
    date, language_code, entity_type, translations_created, ai_translations
  ) VALUES (
    current_date, language_val, entity_type_val, 1,
    CASE WHEN NEW.is_ai_generated THEN 1 ELSE 0 END
  )
  ON CONFLICT (date, language_code, entity_type)
  DO UPDATE SET
    translations_created = translation_metrics.translations_created + 1,
    ai_translations = translation_metrics.ai_translations + 
      CASE WHEN NEW.is_ai_generated THEN 1 ELSE 0 END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER translation_metrics_trigger
  AFTER INSERT ON entity_translations
  FOR EACH ROW EXECUTE FUNCTION update_translation_metrics();

-- Trigger para atualizar timestamps
CREATE OR REPLACE FUNCTION update_translation_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_translations_updated_at_trigger
  BEFORE UPDATE ON entity_translations
  FOR EACH ROW EXECUTE FUNCTION update_translation_timestamp();

-- ==============================================
-- 11. INSERIR DADOS INICIAIS
-- ==============================================

-- Idiomas suportados
INSERT INTO languages (code, name, native_name, flag_emoji, is_default, sort_order) VALUES
('pt-BR', 'Português (Brasil)', 'Português', '🇧🇷', true, 1),
('en-US', 'English (United States)', 'English', '🇺🇸', false, 2),
('es-ES', 'Español (España)', 'Español', '🇪🇸', false, 3),
('fr-FR', 'Français (France)', 'Français', '🇫🇷', false, 4),
('de-DE', 'Deutsch (Deutschland)', 'Deutsch', '🇩🇪', false, 5),
('it-IT', 'Italiano (Italia)', 'Italiano', '🇮🇹', false, 6),
('ja-JP', '日本語 (日本)', '日本語', '🇯🇵', false, 7),
('zh-CN', '中文 (简体)', '中文', '🇨🇳', false, 8);

-- Configurações de tradução para produtos
INSERT INTO translation_configs (entity_type, field_name, is_translatable, ai_translation_enabled, requires_human_review, priority, field_description) VALUES
-- Campos básicos (alta prioridade)
('products', 'name', true, true, false, 10, 'Nome do produto'),
('products', 'description', true, true, true, 9, 'Descrição completa do produto'),
('products', 'short_description', true, true, false, 8, 'Descrição resumida'),

-- Campos SEO (alta prioridade)
('products', 'meta_title', true, true, false, 7, 'Título SEO'),
('products', 'meta_description', true, true, false, 6, 'Descrição SEO'),
('products', 'meta_keywords', true, true, false, 5, 'Palavras-chave SEO'),

-- Open Graph
('products', 'og_title', true, true, false, 4, 'Título para redes sociais'),
('products', 'og_description', true, true, false, 3, 'Descrição para redes sociais'),

-- Outros campos
('products', 'tags', true, true, false, 2, 'Tags de busca'),
('products', 'care_instructions', true, true, true, 1, 'Instruções de cuidado');

-- Configurações para categorias
INSERT INTO translation_configs (entity_type, field_name, is_translatable, ai_translation_enabled, requires_human_review, priority, field_description) VALUES
('categories', 'name', true, true, false, 10, 'Nome da categoria'),
('categories', 'description', true, true, true, 9, 'Descrição da categoria'),
('categories', 'meta_title', true, true, false, 8, 'Título SEO da categoria'),
('categories', 'meta_description', true, true, false, 7, 'Descrição SEO da categoria');

-- Templates de IA para tradução
INSERT INTO ai_translation_templates (name, description, entity_type, source_language, target_language, prompt_template, tone, is_system) VALUES
('Tradução Geral PT->EN', 'Template geral para traduzir produtos do português para inglês', 'products', 'pt-BR', 'en-US', 
'Você é um especialista em tradução de e-commerce. Traduza este {{field_type}} de produto do português brasileiro para inglês americano.

CONTEXTO:
- Produto: {{product_name}}
- Campo: {{field_name}}
- Categoria: {{category_name}}

INSTRUÇÕES:
1. Mantenha o tom profissional e comercial
2. Preserve formatação (quebras de linha, listas, etc.)
3. Adapte medidas para o mercado americano quando relevante
4. Use terminologia de e-commerce padrão
5. Mantenha marcas e nomes próprios

TEXTO ORIGINAL:
{{original_text}}

RETORNE APENAS A TRADUÇÃO:', 'professional', true),

('Tradução Geral PT->ES', 'Template geral para traduzir produtos do português para espanhol', 'products', 'pt-BR', 'es-ES',
'Você é um especialista em tradução de e-commerce. Traduza este {{field_type}} de produto do português brasileiro para espanhol europeu.

CONTEXTO:
- Produto: {{product_name}}
- Campo: {{field_name}}
- Categoria: {{category_name}}

INSTRUÇÕES:
1. Use espanhol europeu (não latino-americano)
2. Mantenha o tom profissional e comercial
3. Preserve formatação
4. Adapte expressões brasileiras para equivalentes espanhóis
5. Mantenha marcas e nomes próprios

TEXTO ORIGINAL:
{{original_text}}

RETORNE APENAS A TRADUÇÃO:', 'professional', true);

-- ==============================================
-- 12. VIEWS ÚTEIS
-- ==============================================

-- View para estatísticas de tradução por idioma
CREATE VIEW translation_stats_by_language AS
SELECT 
  l.code,
  l.name,
  l.native_name,
  l.flag_emoji,
  COUNT(et.id) as total_translations,
  COUNT(CASE WHEN et.status = 'published' THEN 1 END) as published_translations,
  COUNT(CASE WHEN et.is_ai_generated THEN 1 END) as ai_translations,
  ROUND(AVG(CASE WHEN et.ai_confidence IS NOT NULL THEN et.ai_confidence END), 1) as avg_ai_confidence,
  COUNT(DISTINCT et.entity_id) as translated_entities
FROM languages l
LEFT JOIN entity_translations et ON l.code = et.language_code
WHERE l.is_active = true
GROUP BY l.code, l.name, l.native_name, l.flag_emoji, l.sort_order
ORDER BY l.sort_order;

-- View para progresso de tradução por entidade
CREATE VIEW translation_progress AS
SELECT 
  et.entity_type,
  et.entity_id,
  l.code as language_code,
  l.name as language_name,
  COUNT(tc.field_name) as total_translatable_fields,
  COUNT(et.field_name) as translated_fields,
  COUNT(CASE WHEN et.status = 'published' THEN 1 END) as published_fields,
  ROUND(
    (COUNT(et.field_name)::DECIMAL / NULLIF(COUNT(tc.field_name), 0)) * 100, 1
  ) as completion_percentage
FROM translation_configs tc
CROSS JOIN languages l
LEFT JOIN entity_translations et ON (
  tc.entity_type = et.entity_type AND
  tc.field_name = et.field_name AND
  l.code = et.language_code
)
WHERE l.is_active = true AND tc.is_translatable = true
GROUP BY et.entity_type, et.entity_id, l.code, l.name
ORDER BY completion_percentage DESC;

-- ==============================================
-- 13. FUNÇÕES UTILITÁRIAS
-- ==============================================

-- Função para obter tradução de um campo
CREATE OR REPLACE FUNCTION get_translation(
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_field_name VARCHAR(100),
  p_language_code VARCHAR(10),
  p_fallback_language VARCHAR(10) DEFAULT 'pt-BR'
) RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Tentar buscar tradução no idioma solicitado
  SELECT translated_value INTO result
  FROM entity_translations
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND field_name = p_field_name
    AND language_code = p_language_code
    AND status = 'published';
  
  -- Se não encontrou, tentar idioma de fallback
  IF result IS NULL THEN
    SELECT translated_value INTO result
    FROM entity_translations
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND field_name = p_field_name
      AND language_code = p_fallback_language
      AND status = 'published';
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 14. COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE languages IS 'Idiomas suportados pelo sistema';
COMMENT ON TABLE entity_translations IS 'Traduções de campos de entidades';
COMMENT ON TABLE translation_configs IS 'Configurações de quais campos são traduzíveis';
COMMENT ON TABLE ai_translation_templates IS 'Templates de prompt para tradução com IA';
COMMENT ON TABLE translation_queue IS 'Fila de traduções pendentes';
COMMENT ON TABLE translation_history IS 'Histórico de mudanças nas traduções';
COMMENT ON TABLE translation_metrics IS 'Métricas e estatísticas de tradução';
COMMENT ON TABLE user_language_preferences IS 'Preferências de idioma por usuário';

COMMENT ON COLUMN entity_translations.ai_confidence IS 'Confiança da IA na tradução (0-100)';
COMMENT ON COLUMN translation_queue.priority IS 'Prioridade da tradução (maior = mais prioritário)';
COMMENT ON COLUMN translation_configs.priority IS 'Prioridade do campo para tradução'; 