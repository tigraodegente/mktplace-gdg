-- Script SIMPLES para criar tabela de prompts IA

-- Deletar se existe (para recriação limpa)
DROP TABLE IF EXISTS ai_prompts_history;
DROP TABLE IF EXISTS ai_prompts;

-- Criar tabela principal
CREATE TABLE ai_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    prompt_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

-- Inserir apenas os prompts essenciais
INSERT INTO ai_prompts (name, category, title, prompt_template) VALUES
('complete_enrichment', 'general', 'Enriquecimento Completo', 
'Analise este produto e complete as informações:

Produto: {{name}}
Preço: {{price}}
Categoria: {{category}}

IMPORTANTE: Para "attributes", use SEMPRE arrays:
"attributes": {
  "Material": ["Algodão", "Poliéster"],
  "Cor": ["Azul", "Vermelho"],
  "Tamanho": ["P", "M", "G"]
}

Responda em JSON:
{
  "name": "nome otimizado",
  "description": "descrição completa",
  "attributes": {},
  "specifications": {},
  "tags": []
}'),

('attributes', 'general', 'Atributos para Filtros',
'Gere atributos para: {{name}} ({{category}})

Use SEMPRE arrays:
{
  "Material": ["opcao1", "opcao2"],
  "Cor": ["cor1", "cor2"],
  "Tamanho": ["P", "M", "G"]
}');

-- Verificar
SELECT COUNT(*) as prompts_criados FROM ai_prompts;
SELECT name, title FROM ai_prompts; 