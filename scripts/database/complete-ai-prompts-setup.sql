-- Script completo para finalizar setup dos prompts IA
-- Execute este script manualmente no Neon Console

-- 1. Adicionar colunas que podem estar faltando
ALTER TABLE ai_prompts 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS expected_output TEXT,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON ai_prompts(name);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active);

-- 3. Inserir prompts básicos
INSERT INTO ai_prompts (name, category, title, description, prompt_template, expected_output) VALUES 

-- Prompt principal
('complete_enrichment', 'general', 'Enriquecimento Completo', 'Prompt principal que enriquece todos os campos do produto', 
'Você é especialista em e-commerce brasileiro. Enriqueça este produto:

Nome: "{{name}}"
Preço: R$ {{price}}
Categoria: {{category}}
Descrição: "{{description}}"

RETORNE JSON:
{
  "enhanced_name": "Nome otimizado",
  "description": "Descrição completa 300-400 palavras",
  "suggested_attributes": [
    {"name": "Cor", "values": ["Azul", "Verde", "Rosa"]},
    {"name": "Tamanho", "values": ["P", "M", "G"]}
  ],
  "suggested_specifications": {
    "Material": "Algodão 100%",
    "Garantia": "12 meses"
  }
}', 'JSON com campos enhanced_name, description, suggested_attributes, suggested_specifications'),

-- Atributos para filtros
('attributes', 'general', 'Atributos para Filtros', 'Gera atributos para filtros da loja',
'Analise este produto e sugira ATRIBUTOS PARA FILTROS:

Nome: "{{name}}"
Categoria: {{category}}
Preço: R$ {{price}}

Retorne JSON com atributos que clientes usam para filtrar:
{
  "Cor": ["Azul", "Verde", "Rosa"],
  "Tamanho": ["Pequeno", "Médio", "Grande"],
  "Material": ["Algodão", "Poliéster"]
}', 'JSON com atributos como chaves e arrays de opções'),

-- Especificações técnicas
('specifications', 'general', 'Especificações Técnicas', 'Gera especificações técnicas detalhadas',
'Analise este produto e sugira ESPECIFICAÇÕES TÉCNICAS:

Nome: "{{name}}"
Categoria: {{category}}
Preço: R$ {{price}}

Retorne JSON com especificações específicas:
{
  "Dimensões": "45 x 35 x 25 cm",
  "Peso": "3,5 kg",
  "Material": "100% Algodão",
  "Garantia": "12 meses"
}', 'JSON com especificações técnicas específicas'),

-- Descrição
('description', 'general', 'Descrição do Produto', 'Gera descrição completa e persuasiva',
'Crie descrição completa (300-400 palavras) para:

Nome: "{{name}}"
Categoria: {{category}}
Preço: R$ {{price}}

Use linguagem natural brasileira, seja específico sobre características.', 'Texto descritivo de 300-400 palavras'),

-- Tags SEO
('tags', 'general', 'Tags SEO', 'Gera tags para SEO e busca',
'Liste 15-20 tags relevantes para:

Nome: "{{name}}"
Categoria: {{category}}

Retorne array JSON: ["tag1", "tag2", "tag3"]', 'Array JSON com tags relevantes');

-- 4. Verificar inserção
SELECT 
    name,
    category, 
    title,
    CASE WHEN is_active THEN '✅ Ativo' ELSE '❌ Inativo' END as status
FROM ai_prompts 
ORDER BY name, category;

-- 5. Contar prompts inseridos
SELECT 
    COUNT(*) as total_prompts,
    COUNT(CASE WHEN is_active THEN 1 END) as ativos
FROM ai_prompts; 