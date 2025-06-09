-- Atualizar prompt de variations para usar sistema inteligente
UPDATE ai_prompts 
SET prompt_text = '🧠 ANÁLISE INTELIGENTE DE VARIAÇÕES BASEADA EM PRODUTOS REAIS:

PRODUTO BASE: "{{name}}"
MARCA: "{{brand_name}}"
CATEGORIA: "{{category_name}}"

{{#if realVariations}}
✅ VARIAÇÕES REAIS IDENTIFICADAS NO BANCO ({{realVariations.length}}):
{{#each realVariations}}
- ID: {{id}} | Nome: "{{name}}" | Diferenças: {{differences}} | Tipo: {{variation_type}} | Similaridade: {{similarity_score}}%
{{/each}}
{{else}}
❌ Nenhuma variação real identificada no banco.
{{/if}}

{{#if similarProducts}}
📦 PRODUTOS SIMILARES DISPONÍVEIS ({{similarProducts.length}}):
{{#each similarProducts}}
- ID: {{id}} | Nome: "{{name}}" | Preço: {{price}}
{{/each}}
{{else}}
📦 Nenhum produto similar encontrado.
{{/if}}

🎯 RETORNE APENAS JSON NO FORMATO:
{
  "related_products": [
    {
      "id": "produto-real-id",
      "name": "Nome do Produto Real",
      "sku": "sku-real", 
      "price": "259.10",
      "slug": "slug-produto",
      "relationship_type": "variation",
      "difference": "Descrição específica da diferença",
      "variation_type": "color|size|dimension|other",
      "confidence": 0.95,
      "image_url": "url-da-imagem-se-disponivel"
    }
  ],
  "analysis": {
    "total_variations_found": {{realVariations.length}},
    "main_variation_types": ["color", "size"],
    "recommendation": "Usar produtos relacionados reais ao invés de variações artificiais"
  }
}

🚨 IMPORTANTE: 
- APENAS inclua produtos que são REALMENTE variações (mesma linha de produto)
- Use os dados REAIS dos produtos identificados
- NÃO invente variações que não existem no banco
- Se não há variações reais, retorne arrays vazios',
    updated_at = NOW()
WHERE field = 'variations' AND is_active = true; 