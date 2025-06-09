-- MIGRAÇÃO MANUAL: Sistema de Prompts IA
-- Execute este script diretamente no banco de dados

-- 1. Criar tabela principal
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    expected_output TEXT,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON ai_prompts(name);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active);

-- 3. Adicionar constraint único
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_prompts_name_category_key'
    ) THEN
        ALTER TABLE ai_prompts ADD CONSTRAINT ai_prompts_name_category_key UNIQUE (name, category);
    END IF;
END $$;

-- 4. Criar tabela de histórico
CREATE TABLE IF NOT EXISTS ai_prompts_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID,
    version INTEGER NOT NULL,
    prompt_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    change_notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT now()
);

-- 5. Inserir prompts padrão
INSERT INTO ai_prompts (name, category, title, description, prompt_template, variables, expected_output) VALUES
(
    'complete_enrichment',
    'general',
    'Enriquecimento Completo de Produto',
    'Prompt para enriquecimento completo com todos os campos do produto',
    'Você é um especialista em e-commerce. Analise este produto e complete todas as informações faltantes:

Produto: {{name}}
Preço: {{price}}
Categoria: {{category}}

IMPORTANTE: Para o campo "attributes", gere SEMPRE arrays com múltiplas opções para permitir filtros. Não use valores únicos em string.

Exemplo correto:
"attributes": {
  "Material": ["Algodão", "Poliéster", "Tecido Misto"],
  "Cor": ["Azul", "Vermelho", "Verde", "Preto"],
  "Tamanho": ["P", "M", "G", "GG"]
}

Exemplo INCORRETO:
"attributes": {
  "Material": "Tecido de alta qualidade"
}

Responda em JSON válido com:
{
  "name": "nome otimizado",
  "description": "descrição completa",
  "short_description": "descrição resumida",
  "attributes": {},
  "specifications": {},
  "tags": [],
  "seo_title": "título SEO",
  "seo_description": "meta description",
  "category_suggestions": []
}',
    '["name", "price", "category"]',
    'JSON com todos os campos do produto preenchidos'
),
(
    'attributes',
    'general',
    'Geração de Atributos para Filtros',
    'Gera atributos específicos para filtros do produto',
    'Gere atributos para filtros do produto: {{name}} ({{category}})

REGRA FUNDAMENTAL: Atributos devem sempre ser arrays com múltiplas opções para permitir filtros.

Para {{category}}, gere atributos relevantes como:
- Material, Cor, Tamanho, Marca, etc.

Responda apenas em JSON:
{
  "Material": ["opcao1", "opcao2", "opcao3"],
  "Cor": ["cor1", "cor2", "cor3"],
  "Tamanho": ["P", "M", "G"]
}',
    '["name", "category"]',
    'JSON com atributos em formato de array para filtros'
);

-- 6. Verificar se tudo foi criado
SELECT 
    'ai_prompts' as tabela,
    COUNT(*) as registros
FROM ai_prompts
UNION ALL
SELECT 
    'ai_prompts_history' as tabela,
    COUNT(*) as registros
FROM ai_prompts_history;

-- 7. Mostrar prompts criados
SELECT name, category, title FROM ai_prompts WHERE is_active = true; 