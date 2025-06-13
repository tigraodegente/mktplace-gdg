-- Migration: Sistema Completo de Campos Virtuais
-- Date: 2024-12-20
-- Description: Campos calculados dinamicamente com suporte a IA

-- ==============================================
-- 1. TABELA DE CAMPOS VIRTUAIS
-- ==============================================

CREATE TABLE virtual_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  formula TEXT NOT NULL,
  dependencies JSONB NOT NULL DEFAULT '[]',
  ai_enabled BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  entity_type VARCHAR(50) DEFAULT 'products',
  field_type VARCHAR(50) DEFAULT 'text', -- 'text', 'number', 'boolean', 'currency', 'percentage'
  format_options JSONB DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 2. CONFIGURAÇÕES DE FÓRMULAS PRÉ-DEFINIDAS
-- ==============================================

CREATE TABLE formula_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  formula_template TEXT NOT NULL,
  required_fields JSONB NOT NULL DEFAULT '[]',
  category VARCHAR(100),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ==============================================

CREATE INDEX idx_virtual_fields_entity_type ON virtual_fields(entity_type);
CREATE INDEX idx_virtual_fields_active ON virtual_fields(is_active);
CREATE INDEX idx_virtual_fields_ai_enabled ON virtual_fields(ai_enabled);
CREATE INDEX idx_formula_templates_category ON formula_templates(category);

-- ==============================================
-- 4. FUNÇÕES UTILITÁRIAS
-- ==============================================

-- Função para validar dependências
CREATE OR REPLACE FUNCTION validate_virtual_field_dependencies(
  p_formula TEXT,
  p_dependencies JSONB,
  p_entity_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  dep TEXT;
  table_name TEXT;
  column_exists BOOLEAN;
BEGIN
  -- Determinar tabela baseada no entity_type
  table_name := CASE 
    WHEN p_entity_type = 'products' THEN 'products'
    WHEN p_entity_type = 'orders' THEN 'orders'
    WHEN p_entity_type = 'users' THEN 'users'
    ELSE 'products'
  END;

  -- Verificar se cada dependência existe na tabela
  FOR dep IN SELECT jsonb_array_elements_text(p_dependencies)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = table_name 
      AND column_name = dep
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE EXCEPTION 'Campo dependente % não existe na tabela %', dep, table_name;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular campo virtual
CREATE OR REPLACE FUNCTION calculate_virtual_field(
  p_field_id UUID,
  p_entity_data JSONB
) RETURNS TEXT AS $$
DECLARE
  field_config RECORD;
  result TEXT;
BEGIN
  -- Buscar configuração do campo
  SELECT * INTO field_config 
  FROM virtual_fields 
  WHERE id = p_field_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Aqui seria a lógica de cálculo baseada na fórmula
  -- Por simplicidade, retornamos um valor mock
  -- Em produção, implementaríamos um parser de fórmulas
  
  RETURN 'calculated_value';
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 5. TRIGGERS PARA AUDITORIA
-- ==============================================

CREATE OR REPLACE FUNCTION virtual_fields_audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER virtual_fields_updated_at_trigger
  BEFORE UPDATE ON virtual_fields
  FOR EACH ROW EXECUTE FUNCTION virtual_fields_audit_trigger();

-- ==============================================
-- 6. INSERIR TEMPLATES PRÉ-DEFINIDOS
-- ==============================================

INSERT INTO formula_templates (name, display_name, description, formula_template, required_fields, category, is_system) VALUES
-- Financeiro
('profit_margin', 'Margem de Lucro', 'Calcula margem de lucro: (preço - custo) / preço * 100', '(price - cost) / price * 100', '["price", "cost"]', 'financeiro', true),
('markup', 'Markup', 'Calcula markup: (preço - custo) / custo * 100', '(price - cost) / cost * 100', '["price", "cost"]', 'financeiro', true),
('revenue_potential', 'Potencial de Receita', 'Calcula receita potencial: preço * quantidade', 'price * quantity', '["price", "quantity"]', 'financeiro', true),

-- Performance
('conversion_score', 'Score de Conversão', 'Score baseado em preço, avaliação e reviews', 'calculateConversionScore(price, rating_average, rating_count)', '["price", "rating_average", "rating_count"]', 'performance', true),
('popularity_index', 'Índice de Popularidade', 'Baseado em visualizações e vendas', 'view_count * 0.1 + sales_count * 2', '["view_count", "sales_count"]', 'performance', true),
('stock_velocity', 'Velocidade de Estoque', 'Quantos dias para esgotar estoque', 'quantity / (sales_count / 30)', '["quantity", "sales_count"]', 'performance', true),

-- Logística
('shipping_efficiency', 'Eficiência de Frete', 'Relação peso/preço para otimização', 'weight / price', '["weight", "price"]', 'logistica', true),
('storage_cost', 'Custo de Armazenagem', 'Custo baseado em dimensões', '(height * width * length) * 0.001', '["height", "width", "length"]', 'logistica', true),

-- Marketing
('seo_score', 'Score SEO', 'Pontuação baseada em campos SEO preenchidos', 'calculateSEOScore(meta_title, meta_description, meta_keywords)', '["meta_title", "meta_description", "meta_keywords"]', 'marketing', true),
('content_completeness', 'Completude do Conteúdo', 'Percentual de campos preenchidos', 'calculateContentCompleteness(name, description, images)', '["name", "description"]', 'marketing', true);

-- ==============================================
-- 7. CAMPOS VIRTUAIS PRÉ-DEFINIDOS PARA PRODUTOS
-- ==============================================

INSERT INTO virtual_fields (name, display_name, description, formula, dependencies, ai_enabled, ai_prompt, entity_type, field_type, format_options) VALUES
('profit_margin', 'Margem de Lucro (%)', 'Percentual de lucro sobre o preço de venda', '(price - cost) / price * 100', '["price", "cost"]', true, 'Calcule a margem de lucro ideal para este produto considerando sua categoria e concorrência', 'products', 'percentage', '{"decimals": 2, "suffix": "%"}'),

('markup', 'Markup (%)', 'Percentual de markup sobre o custo', '(price - cost) / cost * 100', '["price", "cost"]', true, 'Sugira um markup competitivo baseado na categoria e valor percebido', 'products', 'percentage', '{"decimals": 2, "suffix": "%"}'),

('conversion_score', 'Score de Conversão', 'Pontuação de potencial de conversão', 'calculateConversionScore(price, rating_average, rating_count, view_count)', '["price", "rating_average", "rating_count", "view_count"]', true, 'Analise fatores que impactam conversão e sugira melhorias', 'products', 'number', '{"decimals": 1, "max": 10}'),

('seo_completeness', 'Completude SEO (%)', 'Percentual de otimização SEO', 'calculateSEOCompleteness(meta_title, meta_description, meta_keywords, slug)', '["meta_title", "meta_description", "meta_keywords", "slug"]', true, 'Avalie a otimização SEO e sugira melhorias', 'products', 'percentage', '{"decimals": 0, "suffix": "%"}'),

('content_quality', 'Qualidade do Conteúdo', 'Score de qualidade do conteúdo', 'calculateContentQuality(name, description, images, specifications)', '["name", "description"]', true, 'Avalie a qualidade do conteúdo e sugira melhorias', 'products', 'number', '{"decimals": 1, "min": 0, "max": 10}'),

('inventory_health', 'Saúde do Estoque', 'Indicador de saúde do estoque', 'calculateInventoryHealth(quantity, sales_count, low_stock_alert)', '["quantity", "sales_count", "low_stock_alert"]', true, 'Analise a saúde do estoque e sugira ações', 'products', 'text', '{}'),

('price_competitiveness', 'Competitividade de Preço', 'Avaliação da competitividade do preço', 'calculatePriceCompetitiveness(price, category_id)', '["price", "category_id"]', true, 'Avalie se o preço está competitivo no mercado', 'products', 'text', '{}');

-- ==============================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE virtual_fields IS 'Campos calculados dinamicamente com suporte a IA';
COMMENT ON TABLE formula_templates IS 'Templates de fórmulas pré-definidas para campos virtuais';

COMMENT ON COLUMN virtual_fields.formula IS 'Fórmula JavaScript ou expressão para calcular o valor';
COMMENT ON COLUMN virtual_fields.dependencies IS 'Array de campos necessários para o cálculo';
COMMENT ON COLUMN virtual_fields.ai_enabled IS 'Se o campo pode ser sugerido/melhorado pela IA';
COMMENT ON COLUMN virtual_fields.format_options IS 'Opções de formatação (decimais, prefixo, sufixo, etc.)';
COMMENT ON COLUMN virtual_fields.validation_rules IS 'Regras de validação do campo calculado'; 