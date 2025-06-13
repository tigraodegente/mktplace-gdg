-- Migration: Sistema de Administração de Prompts por Seller
-- Date: 2024-12-20
-- Description: Sistema para sellers gerenciarem seus próprios prompts de IA

-- ==============================================
-- 1. TABELA DE SELLERS (se não existir)
-- ==============================================

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 2. PROMPTS PERSONALIZADOS POR SELLER
-- ==============================================

CREATE TABLE seller_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  display_name VARCHAR(300) NOT NULL,
  description TEXT,
  
  -- Configurações do prompt
  prompt_text TEXT NOT NULL,
  category VARCHAR(100), -- 'basic', 'seo', 'pricing', 'description', etc
  field_targets TEXT[], -- Campos específicos: ['name', 'description', 'meta_title']
  entity_types TEXT[] DEFAULT ARRAY['products'], -- ['products', 'categories']
  
  -- Configurações de IA
  model VARCHAR(100) DEFAULT 'gpt-4-turbo',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  top_p DECIMAL(3,2) DEFAULT 1.0,
  frequency_penalty DECIMAL(3,2) DEFAULT 0.0,
  presence_penalty DECIMAL(3,2) DEFAULT 0.0,
  
  -- Configurações de uso
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Se é o prompt padrão para a categoria
  priority INTEGER DEFAULT 0, -- Ordem de prioridade
  
  -- Configurações de aplicação
  auto_apply_enabled BOOLEAN DEFAULT false,
  auto_apply_confidence_threshold INTEGER DEFAULT 90,
  requires_approval BOOLEAN DEFAULT true,
  
  -- Filtros e condições
  filters JSONB, -- Condições para quando aplicar o prompt
  /*
  Exemplo de filters:
  {
    "product_conditions": {
      "price_range": {"min": 0, "max": 1000},
      "categories": ["electronics", "clothing"],
      "exclude_brands": ["brand1", "brand2"]
    },
    "content_conditions": {
      "min_description_length": 100,
      "exclude_if_contains": ["lorem", "test"]
    }
  }
  */
  
  -- Variáveis customizadas
  custom_variables JSONB, -- Variáveis específicas do seller
  /*
  Exemplo de custom_variables:
  {
    "brand_voice": "friendly and professional",
    "target_audience": "young adults",
    "store_name": "My Amazing Store",
    "special_offers": "free shipping on orders over $50"
  }
  */
  
  -- Estatísticas de uso
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_confidence DECIMAL(5,2),
  last_used_at TIMESTAMP,
  
  -- Metadados
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(seller_id, name)
);

-- ==============================================
-- 3. HISTÓRICO DE USO DE PROMPTS
-- ==============================================

CREATE TABLE seller_prompt_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES seller_ai_prompts(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES sellers(id),
  
  -- Contexto do uso
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  
  -- Input e output
  input_data JSONB NOT NULL,
  prompt_rendered TEXT NOT NULL, -- Prompt após substituição de variáveis
  ai_response TEXT,
  confidence INTEGER,
  
  -- Resultado
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'rejected'
  error_message TEXT,
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  estimated_cost DECIMAL(10,6),
  
  -- Aprovação
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  applied_at TIMESTAMP,
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 4. TEMPLATES DE PROMPTS PRÉ-DEFINIDOS
-- ==============================================

CREATE TABLE prompt_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  display_name VARCHAR(300) NOT NULL,
  description TEXT,
  
  -- Conteúdo do template
  prompt_template TEXT NOT NULL,
  category VARCHAR(100),
  field_targets TEXT[],
  entity_types TEXT[] DEFAULT ARRAY['products'],
  
  -- Configurações sugeridas
  suggested_model VARCHAR(100) DEFAULT 'gpt-4-turbo',
  suggested_temperature DECIMAL(3,2) DEFAULT 0.7,
  suggested_max_tokens INTEGER DEFAULT 2000,
  
  -- Marketplace info
  is_public BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0.00, -- Preço para usar o template
  
  -- Ratings e reviews
  rating_average DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  
  -- Criador
  created_by UUID REFERENCES users(id),
  seller_id UUID REFERENCES sellers(id), -- Se foi criado por um seller
  
  -- Tags
  tags TEXT[],
  
  -- Aprovação
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 5. REVIEWS DE TEMPLATES DO MARKETPLACE
-- ==============================================

CREATE TABLE prompt_marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES prompt_marketplace(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES sellers(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  pros TEXT,
  cons TEXT,
  recommended BOOLEAN,
  usage_context TEXT, -- Como/onde usou o template
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(template_id, seller_id)
);

-- ==============================================
-- 6. CONFIGURAÇÕES DE IA POR SELLER
-- ==============================================

CREATE TABLE seller_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) UNIQUE,
  
  -- Preferências de modelo
  preferred_model VARCHAR(100) DEFAULT 'gpt-4-turbo',
  backup_model VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
  
  -- Configurações globais
  default_temperature DECIMAL(3,2) DEFAULT 0.7,
  default_max_tokens INTEGER DEFAULT 2000,
  default_confidence_threshold INTEGER DEFAULT 80,
  
  -- Budget e limites
  monthly_budget DECIMAL(10,2),
  current_monthly_spend DECIMAL(10,2) DEFAULT 0.00,
  daily_usage_limit INTEGER DEFAULT 1000, -- Número de requests por dia
  current_daily_usage INTEGER DEFAULT 0,
  
  -- Configurações de aprovação
  auto_approve_high_confidence BOOLEAN DEFAULT true,
  auto_approve_threshold INTEGER DEFAULT 95,
  require_approval_for_pricing BOOLEAN DEFAULT true,
  require_approval_for_sensitive_fields BOOLEAN DEFAULT true,
  sensitive_fields TEXT[] DEFAULT ARRAY['price', 'cost', 'sale_price'],
  
  -- Notificações
  email_notifications BOOLEAN DEFAULT true,
  budget_alert_threshold DECIMAL(5,2) DEFAULT 0.8, -- 80% do budget
  usage_alert_threshold DECIMAL(5,2) DEFAULT 0.9, -- 90% do limite diário
  
  -- Backup e fallback
  enable_fallback_to_default BOOLEAN DEFAULT true,
  fallback_on_budget_exceeded BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 7. ESTATÍSTICAS DE USO POR SELLER
-- ==============================================

CREATE TABLE seller_ai_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
  date DATE NOT NULL,
  
  -- Contadores de uso
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  
  -- Por categoria
  basic_content_requests INTEGER DEFAULT 0,
  seo_requests INTEGER DEFAULT 0,
  pricing_requests INTEGER DEFAULT 0,
  description_requests INTEGER DEFAULT 0,
  other_requests INTEGER DEFAULT 0,
  
  -- Tokens e custos
  total_tokens_used INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0.0000,
  
  -- Performance
  avg_confidence DECIMAL(5,2),
  avg_processing_time_ms INTEGER,
  
  -- Aprovações
  auto_approved_count INTEGER DEFAULT 0,
  manual_approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  
  -- Prompts mais usados
  top_prompts JSONB, -- {"prompt_id": usage_count, ...}
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(seller_id, date)
);

-- ==============================================
-- 8. PERMISSÕES DE PROMPTS
-- ==============================================

CREATE TABLE seller_prompt_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
  user_id UUID REFERENCES users(id),
  
  -- Permissões
  can_create_prompts BOOLEAN DEFAULT false,
  can_edit_prompts BOOLEAN DEFAULT false,
  can_delete_prompts BOOLEAN DEFAULT false,
  can_approve_suggestions BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  can_view_usage_stats BOOLEAN DEFAULT true,
  
  -- Limitações
  allowed_categories TEXT[], -- Categorias que pode gerenciar
  max_prompts_per_category INTEGER,
  
  -- Metadados
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  UNIQUE(seller_id, user_id)
);

-- ==============================================
-- 9. ÍNDICES PARA PERFORMANCE
-- ==============================================

CREATE INDEX idx_seller_ai_prompts_seller_id ON seller_ai_prompts(seller_id);
CREATE INDEX idx_seller_ai_prompts_category ON seller_ai_prompts(category);
CREATE INDEX idx_seller_ai_prompts_active ON seller_ai_prompts(is_active);
CREATE INDEX idx_seller_ai_prompts_field_targets ON seller_ai_prompts USING GIN(field_targets);

CREATE INDEX idx_seller_prompt_usage_log_prompt_id ON seller_prompt_usage_log(prompt_id);
CREATE INDEX idx_seller_prompt_usage_log_seller_id ON seller_prompt_usage_log(seller_id);
CREATE INDEX idx_seller_prompt_usage_log_entity ON seller_prompt_usage_log(entity_type, entity_id);
CREATE INDEX idx_seller_prompt_usage_log_status ON seller_prompt_usage_log(status);
CREATE INDEX idx_seller_prompt_usage_log_created_at ON seller_prompt_usage_log(created_at);

CREATE INDEX idx_prompt_marketplace_category ON prompt_marketplace(category);
CREATE INDEX idx_prompt_marketplace_public ON prompt_marketplace(is_public);
CREATE INDEX idx_prompt_marketplace_verified ON prompt_marketplace(is_verified);
CREATE INDEX idx_prompt_marketplace_tags ON prompt_marketplace USING GIN(tags);
CREATE INDEX idx_prompt_marketplace_rating ON prompt_marketplace(rating_average DESC);

CREATE INDEX idx_seller_ai_usage_stats_seller_date ON seller_ai_usage_stats(seller_id, date);
CREATE INDEX idx_seller_ai_usage_stats_date ON seller_ai_usage_stats(date);

-- ==============================================
-- 10. TRIGGERS E FUNÇÕES
-- ==============================================

-- Trigger para atualizar estatísticas de uso
CREATE OR REPLACE FUNCTION update_seller_ai_stats() RETURNS TRIGGER AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  seller_id_val UUID := NEW.seller_id;
  category_val VARCHAR(100);
BEGIN
  -- Buscar categoria do prompt
  SELECT category INTO category_val
  FROM seller_ai_prompts
  WHERE id = NEW.prompt_id;
  
  -- Atualizar estatísticas diárias
  INSERT INTO seller_ai_usage_stats (
    seller_id, date, total_requests,
    successful_requests, failed_requests, total_tokens_used, total_cost
  ) VALUES (
    seller_id_val, current_date, 1,
    CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    COALESCE(NEW.tokens_used, 0),
    COALESCE(NEW.estimated_cost, 0)
  )
  ON CONFLICT (seller_id, date)
  DO UPDATE SET
    total_requests = seller_ai_usage_stats.total_requests + 1,
    successful_requests = seller_ai_usage_stats.successful_requests + 
      CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
    failed_requests = seller_ai_usage_stats.failed_requests + 
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    total_tokens_used = seller_ai_usage_stats.total_tokens_used + COALESCE(NEW.tokens_used, 0),
    total_cost = seller_ai_usage_stats.total_cost + COALESCE(NEW.estimated_cost, 0);
  
  -- Atualizar contadores do prompt
  UPDATE seller_ai_prompts
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = NEW.prompt_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seller_prompt_usage_stats_trigger
  AFTER INSERT ON seller_prompt_usage_log
  FOR EACH ROW EXECUTE FUNCTION update_seller_ai_stats();

-- Trigger para resetar contadores diários
CREATE OR REPLACE FUNCTION reset_daily_ai_usage() RETURNS TRIGGER AS $$
BEGIN
  -- Resetar uso diário se mudou de dia
  IF OLD.updated_at::date != NEW.updated_at::date THEN
    NEW.current_daily_usage = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seller_ai_settings_daily_reset_trigger
  BEFORE UPDATE ON seller_ai_settings
  FOR EACH ROW EXECUTE FUNCTION reset_daily_ai_usage();

-- Função para processar variáveis no prompt
CREATE OR REPLACE FUNCTION render_seller_prompt(
  p_prompt_text TEXT,
  p_custom_variables JSONB,
  p_entity_data JSONB
) RETURNS TEXT AS $$
DECLARE
  rendered_prompt TEXT := p_prompt_text;
  var_key TEXT;
  var_value TEXT;
BEGIN
  -- Substituir variáveis customizadas do seller
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_custom_variables)
  LOOP
    rendered_prompt := replace(rendered_prompt, '{{' || var_key || '}}', var_value);
  END LOOP;
  
  -- Substituir variáveis da entidade
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_entity_data)
  LOOP
    rendered_prompt := replace(rendered_prompt, '{{entity.' || var_key || '}}', var_value);
  END LOOP;
  
  -- Substituir variáveis de sistema
  rendered_prompt := replace(rendered_prompt, '{{timestamp}}', NOW()::text);
  rendered_prompt := replace(rendered_prompt, '{{date}}', CURRENT_DATE::text);
  
  RETURN rendered_prompt;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 11. INSERIR DADOS INICIAIS
-- ==============================================

-- Templates de marketplace
INSERT INTO prompt_marketplace (name, display_name, description, prompt_template, category, field_targets, is_public, is_verified, tags) VALUES
('Descrição Comercial Persuasiva', 'Descrição de Produto Comercial e Persuasiva', 'Cria descrições de produto focadas em conversão e vendas', 
'Você é um copywriter especialista em e-commerce. Crie uma descrição comercial persuasiva para este produto:

PRODUTO: {{entity.name}}
CATEGORIA: {{entity.category}}
PREÇO: R$ {{entity.price}}
MARCA: {{brand_voice}}
PÚBLICO-ALVO: {{target_audience}}

INSTRUÇÕES:
1. Use um tom {{brand_voice}}
2. Foque nos benefícios para {{target_audience}}
3. Inclua call-to-action convincente
4. Destaque diferenciais competitivos
5. Use técnicas de persuasão
6. Máximo 300 palavras

DESCRIÇÃO PERSUASIVA:', 'basic', ARRAY['description'], true, true, ARRAY['descrição', 'comercial', 'persuasiva', 'conversão']),

('SEO Otimizado Completo', 'Kit Completo de SEO para Produtos', 'Gera título, descrição e keywords otimizados para SEO',
'Você é um especialista em SEO para e-commerce. Otimize este produto para mecanismos de busca:

PRODUTO: {{entity.name}}
CATEGORIA: {{entity.category}}
DESCRIÇÃO ATUAL: {{entity.description}}

INSTRUÇÕES SEO:
1. Meta título (50-60 caracteres) com palavra-chave principal
2. Meta descrição (150-160 caracteres) persuasiva
3. 8-12 keywords relevantes
4. Foque em intenção de compra
5. Use variações de palavra-chave

FORMATO DE RESPOSTA:
Meta Título: [título aqui]
Meta Descrição: [descrição aqui]
Keywords: [keywords separadas por vírgula]', 'seo', ARRAY['meta_title', 'meta_description', 'meta_keywords'], true, true, ARRAY['seo', 'otimização', 'meta', 'keywords']),

('Precificação Inteligente', 'Análise e Sugestão de Preços', 'Analisa e sugere preços baseado em fatores de mercado',
'Você é um especialista em precificação para e-commerce. Analise este produto e sugira preços:

PRODUTO: {{entity.name}}
CATEGORIA: {{entity.category}}
CUSTO ATUAL: R$ {{entity.cost}}
PREÇO ATUAL: R$ {{entity.price}}
CONCORRÊNCIA: {{competition_analysis}}

INSTRUÇÕES:
1. Analise margem de lucro atual
2. Considere posicionamento de mercado
3. Sugira preço competitivo
4. Justifique a sugestão
5. Inclua estratégias de preço (promoções, bundles)

ANÁLISE DE PREÇO:', 'pricing', ARRAY['price', 'sale_price'], true, true, ARRAY['preço', 'precificação', 'margem', 'competitivo']);

-- ==============================================
-- 12. VIEWS ÚTEIS
-- ==============================================

-- View para dashboard do seller
CREATE VIEW seller_ai_dashboard AS
SELECT 
  s.id as seller_id,
  s.name as seller_name,
  COUNT(sap.id) as total_prompts,
  COUNT(CASE WHEN sap.is_active THEN 1 END) as active_prompts,
  SUM(sap.usage_count) as total_usage,
  AVG(sap.success_rate) as avg_success_rate,
  sas.current_monthly_spend,
  sas.monthly_budget,
  CASE 
    WHEN sas.monthly_budget > 0 THEN 
      ROUND((sas.current_monthly_spend / sas.monthly_budget) * 100, 1)
    ELSE 0 
  END as budget_usage_percentage,
  sas.current_daily_usage,
  sas.daily_usage_limit
FROM sellers s
LEFT JOIN seller_ai_prompts sap ON s.id = sap.seller_id
LEFT JOIN seller_ai_settings sas ON s.id = sas.seller_id
GROUP BY s.id, s.name, sas.current_monthly_spend, sas.monthly_budget, 
         sas.current_daily_usage, sas.daily_usage_limit;

-- View para prompts mais populares
CREATE VIEW popular_seller_prompts AS
SELECT 
  sap.*,
  s.name as seller_name,
  ROW_NUMBER() OVER (PARTITION BY sap.category ORDER BY sap.usage_count DESC) as rank_in_category
FROM seller_ai_prompts sap
JOIN sellers s ON sap.seller_id = s.id
WHERE sap.is_active = true
ORDER BY sap.usage_count DESC;

-- ==============================================
-- 13. COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE seller_ai_prompts IS 'Prompts de IA personalizados por seller';
COMMENT ON TABLE seller_prompt_usage_log IS 'Log de uso de prompts por seller';
COMMENT ON TABLE prompt_marketplace IS 'Marketplace de templates de prompts';
COMMENT ON TABLE prompt_marketplace_reviews IS 'Reviews de templates do marketplace';
COMMENT ON TABLE seller_ai_settings IS 'Configurações de IA por seller';
COMMENT ON TABLE seller_ai_usage_stats IS 'Estatísticas de uso de IA por seller';
COMMENT ON TABLE seller_prompt_permissions IS 'Permissões de usuários para gerenciar prompts';

COMMENT ON COLUMN seller_ai_prompts.filters IS 'Condições JSON para quando aplicar o prompt';
COMMENT ON COLUMN seller_ai_prompts.custom_variables IS 'Variáveis personalizadas do seller para o prompt';
COMMENT ON COLUMN seller_ai_settings.monthly_budget IS 'Budget mensal em reais para uso de IA';
COMMENT ON COLUMN seller_ai_usage_stats.top_prompts IS 'JSON com os prompts mais usados e contadores'; 