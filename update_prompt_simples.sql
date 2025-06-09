UPDATE ai_prompts 
SET prompt_text = 'ANALISE INTELIGENTE DE VARIACOES BASEADA EM PRODUTOS REAIS:

PRODUTO BASE: "{{name}}"
MARCA: "{{brand_name}}" 
CATEGORIA: "{{category_name}}"

VARIACOES REAIS IDENTIFICADAS:
{{#each realVariations}}
- ID: {{id}} | Nome: "{{name}}" | Diferenças: {{differences}} | Tipo: {{variation_type}}
{{/each}}

PRODUTOS SIMILARES DISPONIVEIS:
{{#each similarProducts}}  
- ID: {{id}} | Nome: "{{name}}" | Preço: {{price}}
{{/each}}

RETORNE APENAS JSON NO FORMATO:
{
  "related_products": [
    {
      "id": "produto-real-id",
      "name": "Nome do Produto Real", 
      "sku": "sku-real",
      "price": "259.10",
      "slug": "slug-produto",
      "relationship_type": "variation",
      "difference": "Descricao especifica da diferenca",
      "variation_type": "color",
      "confidence": 0.95,
      "image_url": "url-da-imagem"
    }
  ],
  "analysis": {
    "total_variations_found": 0,
    "main_variation_types": ["color", "size"],
    "recommendation": "Usar produtos relacionados reais"
  }
}

IMPORTANTE: Use dados REAIS dos produtos identificados. Se nao ha variacoes reais, retorne arrays vazios.'
WHERE field = 'variations'; 