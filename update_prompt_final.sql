-- ATUALIZAÇÃO FINAL DO PROMPT DE VARIAÇÕES
-- Execute este SQL diretamente no banco Neon

UPDATE ai_prompts 
SET prompt_text = '🧠 ANÁLISE INTELIGENTE DE VARIAÇÕES:

PRODUTO BASE: "{{name}}"
MARCA: "{{brand_name}}"
CATEGORIA: "{{category_name}}"

{{#if similarProducts}}
📦 PRODUTOS SIMILARES DISPONÍVEIS ({{similarProducts.length}}):
{{#each similarProducts}}
- ID: {{id}} | Nome: "{{name}}" | Preço: {{price}}
{{/each}}
{{else}}
📦 Nenhum produto similar encontrado.
{{/if}}

{{#if realVariations}}
✅ VARIAÇÕES REAIS IDENTIFICADAS ({{realVariations.length}}):
{{#each realVariations}}
- ID: {{id}} | Nome: "{{name}}" | SKU: {{sku}} | Preço: {{price}} | Diferenças: {{differences}} | Tipo: {{variation_type}}
{{/each}}
{{else}}
❌ Nenhuma variação real identificada.
{{/if}}

🎯 RETORNE APENAS JSON NO FORMATO:
{
  "related_products": [
    {
      "id": "produto-real-id",
      "name": "Nome do Produto Real",
      "sku": "sku-real", 
      "price": "122.62",
      "difference": "Diferença específica encontrada",
      "variation_type": "color",
      "confidence": 0.95
    }
  ],
  "analysis": {
    "total_variations_found": 0,
    "recommendation": "Usar produtos relacionados reais"
  }
}

🚨 IMPORTANTE: Use apenas produtos REAIS identificados nas variações, não invente.',
    updated_at = NOW()
WHERE field = 'variations';

-- Verificar se foi atualizado
SELECT field, LEFT(prompt_text, 100) as prompt_preview, updated_at
FROM ai_prompts 
WHERE field = 'variations'; 