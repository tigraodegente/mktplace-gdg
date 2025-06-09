INSERT INTO ai_prompts (
    name,
    category,
    title,
    description,
    prompt_template,
    variables,
    expected_output,
    version,
    is_active
) VALUES (
    'variations',
    'general',
    'Análise de Variações de Produtos Existentes',
    'Analisa um produto e identifica produtos similares que podem ser variações',
    'Você é especialista em e-commerce. Analise este produto:

PRODUTO: "{{name}}"
DESCRIÇÃO: "{{description}}"
MARCA: "{{brand}}"
PREÇO: R$ {{price}}

PRODUTOS SIMILARES NO BANCO:
{{#if similarProducts}}
{{#each similarProducts}}
- ID: {{id}} | Nome: "{{name}}" | SKU: {{sku}} | Preço: R$ {{price}}
{{/each}}
{{else}}
Nenhum produto similar encontrado.
{{/if}}

TAREFA: Identifique quais produtos similares são VARIAÇÕES do produto principal (mesma linha, mas cores/tamanhos diferentes).

CRITÉRIOS:
✅ Mesmo tipo de produto
✅ Mesma marca/linha
✅ Diferenças: cor, tamanho, modelo, padrão
❌ Produtos completamente diferentes

RETORNE JSON:
{
  "related_products": [
    {
      "id": "id-produto",
      "name": "Nome",
      "relationship_type": "variation",
      "difference": "Cor diferente",
      "confidence": 0.8
    }
  ],
  "suggestions": [
    {
      "variation_type": "Cor",
      "reason": "Disponível em outras cores"
    }
  ]
}

Se não há variações, retorne arrays vazios.',
    '["name", "description", "brand", "price", "similarProducts"]',
    '{"related_products": [], "suggestions": []}',
    1,
    true
); 