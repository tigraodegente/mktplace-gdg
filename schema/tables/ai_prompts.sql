-- Tabela para armazenar prompts de IA editáveis
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- Nome interno: 'complete_enrichment', 'attributes', etc
  category VARCHAR(50), -- Categoria: 'general', 'electronics', 'baby', 'home', 'fashion'
  title VARCHAR(200) NOT NULL, -- Título amigável para o admin
  description TEXT, -- Descrição do que o prompt faz
  prompt_template TEXT NOT NULL, -- Template do prompt com variáveis {{name}}, {{price}}
  variables JSONB DEFAULT '[]', -- Array de variáveis disponíveis
  expected_output TEXT, -- Descrição do formato esperado de saída
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id), -- Quem criou/editou por último
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Índices para busca
  UNIQUE(name, category)
);

-- Índices para performance
CREATE INDEX idx_ai_prompts_name ON ai_prompts(name);
CREATE INDEX idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX idx_ai_prompts_active ON ai_prompts(is_active);

-- Tabela para histórico de versões dos prompts
CREATE TABLE ai_prompts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  change_notes TEXT, -- Notas sobre o que foi alterado
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Comentários nas tabelas
COMMENT ON TABLE ai_prompts IS 'Prompts de IA editáveis pelo usuário';
COMMENT ON COLUMN ai_prompts.name IS 'Nome interno do prompt (chave única)';
COMMENT ON COLUMN ai_prompts.category IS 'Categoria de produtos que usa este prompt';
COMMENT ON COLUMN ai_prompts.prompt_template IS 'Template do prompt com variáveis {{variavel}}';
COMMENT ON COLUMN ai_prompts.variables IS 'Array de variáveis disponíveis no template';
COMMENT ON COLUMN ai_prompts.expected_output IS 'Formato esperado da resposta da IA';

COMMENT ON TABLE ai_prompts_history IS 'Histórico de versões dos prompts de IA'; 