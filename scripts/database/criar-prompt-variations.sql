-- Inserir prompt de variations no banco
-- Isso garante que a IA tenha instruções adequadas

INSERT INTO ai_prompts (
    name,
    category, 
    title,
    description,
    prompt_template,
    variables,
    expected_output,
    version,
    is_active,
    created_at,
    updated_at
) VALUES (
    'variations',
    'general',
    'Análise de Variações de Produtos',
    'Analisa produtos similares existentes e identifica possíveis variações',
    'Você é especialista em e-commerce. Analise este produto e os similares encontrados:

PRODUTO ATUAL:
Nome: "{{name}}"
Descrição: "{{description}}"
Marca: "{{brand}}"

PRODUTOS SIMILARES NO BANCO:
{{#if similarProducts}}
{{#each similarProducts}}
- ID: {{id}} | Nome: "{{name}}" | Preço: R$ {{price}}
{{/each}}
{{else}}
Nenhum produto similar encontrado.
{{/if}}

TAREFA: Identifique quais produtos similares são VARIAÇÕES do produto atual (mesma família, mas cores/tamanhos/modelos diferentes).

Para produtos como cortinas, sugira variações em:
- Cores (baseado nos produtos similares)
- Tamanhos (baseado nos produtos similares) 
- Estampas/modelos (baseado nos produtos similares)

RETORNE APENAS JSON:
{
  "related_products": [
    {
      "id": "id-do-produto-similar",
      "name": "Nome do Produto Similar", 
      "relationship_type": "variation",
      "difference": "Cor diferente: Azul vs Amarelo",
      "confidence": 0.9
    }
  ],
  "suggestions": [
    {
      "type": "Cor",
      "options": ["Azul", "Amarelo", "Rosa"]
    },
    {
      "type": "Tamanho", 
      "options": ["1,80m", "2,30m"]
    }
  ]
}',
    '["name", "description", "brand", "similarProducts"]',
    '{"related_products": [], "suggestions": []}',
    1,
    true,
    NOW(),
    NOW()
) ON CONFLICT (name, category) DO UPDATE SET
    prompt_template = EXCLUDED.prompt_template,
    updated_at = NOW(); 