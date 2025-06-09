-- Script para adicionar prompt de análise de variações baseadas em produtos existentes
-- Este prompt permite que a IA identifique produtos relacionados que já existem no banco

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
    'Análise de Variações de Produtos Existentes',
    'Analisa um produto e identifica outros produtos similares no banco que podem ser considerados como variações',
    'Você é um especialista em análise de produtos de e-commerce.

PRODUTO ANALISADO:
- Nome: "{{name}}"
- Descrição: "{{description}}"
- Marca: "{{brand}}"
- Categoria: "{{category}}"
- Preço: R$ {{price}}

PRODUTOS SIMILARES ENCONTRADOS NO BANCO:
{{#if similarProducts}}
{{#each similarProducts}}
- ID: {{id}}
  Nome: "{{name}}"
  SKU: {{sku}}
  Preço: R$ {{price}}
  Relevância: {{brand_bonus}}
{{/each}}
{{else}}
Nenhum produto similar encontrado no banco de dados.
{{/if}}

TAREFA:
Analise o produto principal e os produtos similares encontrados. Identifique quais produtos similares podem ser considerados VARIAÇÕES do produto principal (mesma linha de produto, mas com diferenças como cor, tamanho, modelo, etc.).

CRITÉRIOS PARA SER UMA VARIAÇÃO:
✅ Mesmo tipo de produto (ex: ambos são cortinas)
✅ Mesma marca ou linha de produto
✅ Diferenças apenas em: cor, tamanho, modelo, padrão, material, voltagem
❌ NÃO considerar se forem produtos completamente diferentes

RETORNE APENAS um JSON no formato:
{
  "related_products": [
    {
      "id": "id-do-produto-relacionado",
      "name": "Nome do Produto",
      "relationship_type": "variation",
      "difference": "Cor diferente" | "Tamanho diferente" | "Modelo diferente",
      "confidence": 0.8
    }
  ],
  "suggestions": [
    {
      "variation_type": "Cor",
      "reason": "Produto disponível em outras cores na base"
    }
  ]
}

IMPORTANTE:
- Só inclua produtos que são REALMENTE variações 
- Confidence deve ser entre 0.1 e 1.0
- Se não há variações válidas, retorne arrays vazios
- Seja conservador nas sugestões',
    '["name", "description", "brand", "category", "price", "similarProducts"]',
    '{
  "related_products": [
    {
      "id": "string",
      "name": "string", 
      "relationship_type": "variation",
      "difference": "string",
      "confidence": "number"
    }
  ],
  "suggestions": [
    {
      "variation_type": "string",
      "reason": "string"
    }
  ]
}',
    1,
    true,
    NOW(),
    NOW()
);

-- Inserir também uma versão específica para produtos bebê
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
    'baby',
    'Análise de Variações - Produtos Bebê',
    'Analisa produtos para bebê e identifica variações comuns (cor, tamanho, padrão)',
    'Você é um especialista em produtos para bebê e análise de variações.

PRODUTO PARA BEBÊ ANALISADO:
- Nome: "{{name}}"
- Descrição: "{{description}}"
- Marca: "{{brand}}"
- Categoria: "{{category}}"
- Preço: R$ {{price}}

PRODUTOS SIMILARES ENCONTRADOS:
{{#if similarProducts}}
{{#each similarProducts}}
- ID: {{id}}
  Nome: "{{name}}"
  SKU: {{sku}}
  Preço: R$ {{price}}
{{/each}}
{{else}}
Nenhum produto similar encontrado.
{{/if}}

ANÁLISE PARA PRODUTOS BEBÊ:
Para produtos infantis, as variações mais comuns são:
- Cores: Rosa, Azul, Amarelo, Verde, Branco, Neutro
- Tamanhos: P, M, G (roupas) ou medidas específicas (móveis)
- Padrões: Liso, Estrelinha, Listrado, Floral, Animal
- Temas: Ursinhos, Princesas, Carros, Animais

Identifique quais produtos similares são variações válidas do produto principal.

RETORNE JSON:
{
  "related_products": [
    {
      "id": "id-do-produto",
      "name": "Nome",
      "relationship_type": "variation",
      "difference": "Descrição da diferença",
      "confidence": 0.9
    }
  ],
  "suggestions": [
    {
      "variation_type": "Cor",
      "reason": "Produto disponível em outras cores para combinar com decoração"
    }
  ]
}',
    '["name", "description", "brand", "category", "price", "similarProducts"]',
    '{"related_products": [], "suggestions": []}',
    1,
    true,
    NOW(),
    NOW()
); 