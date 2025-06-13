-- Migration: Popular tabela ai_prompts com prompts hardcoded
-- Date: 2024-12-20
-- Description: Extrair prompts do código e salvar no banco para permitir edição

-- Primeiro, limpar dados existentes (se houver)
TRUNCATE TABLE ai_prompts_history;
TRUNCATE TABLE ai_prompts;

-- 1. PROMPT: Enriquecimento de Conteúdo Básico
INSERT INTO ai_prompts (
  name, category, title, description, prompt_template, variables, expected_output, is_active
) VALUES (
  'enrich_basic_content',
  'general',
  'Enriquecimento de Conteúdo Básico',
  'Otimiza nome, descrição, SKU, modelo e tags do produto',
  'Você é um especialista em copywriting para e-commerce. Analise este produto e otimize APENAS os campos de conteúdo básico:

PRODUTO: {{name}}
DESCRIÇÃO ATUAL: {{description}}
DESCRIÇÃO CURTA: {{short_description}}
SKU ATUAL: {{sku}}
MODELO ATUAL: {{model}}
TAGS ATUAIS: {{tags}}

INSTRUÇÕES:
1. Otimize o NOME para SEO e conversão (inclua marca "Grão de Gente" se apropriado)
2. Crie DESCRIÇÃO completa (300-500 palavras) focada em benefícios
3. Crie DESCRIÇÃO CURTA comercial (até 120 caracteres)
4. Gere SKU profissional baseado na marca/categoria (ex: SAM-GAL-S24-128)
5. Extraia MODELO específico do produto (ex: "Galaxy S24", "Air Max 90")
6. Sugira TAGS estratégicas para busca

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "name",
      "label": "Nome do Produto",
      "currentValue": "{{name}}",
      "suggestedValue": "NOME OTIMIZADO",
      "confidence": 90,
      "reasoning": "Motivo da otimização",
      "source": "ai",
      "category": "basic"
    },
    {
      "field": "description", 
      "label": "Descrição Completa",
      "currentValue": "{{description}}",
      "suggestedValue": "DESCRIÇÃO OTIMIZADA",
      "confidence": 95,
      "reasoning": "Descrição focada em benefícios",
      "source": "ai",
      "category": "basic"
    },
    {
      "field": "short_description",
      "label": "Descrição Resumida", 
      "currentValue": "{{short_description}}",
      "suggestedValue": "DESCRIÇÃO CURTA",
      "confidence": 85,
      "reasoning": "Resumo comercial atrativo",
      "source": "ai",
      "category": "basic"
    },
    {
      "field": "sku",
      "label": "SKU/Código",
      "currentValue": "{{sku}}",
      "suggestedValue": "SKU-OTIMIZADO",
      "confidence": 80,
      "reasoning": "SKU profissional baseado na categoria",
      "source": "ai", 
      "category": "basic"
    },
    {
      "field": "model",
      "label": "Modelo do Produto",
      "currentValue": "{{model}}",
      "suggestedValue": "MODELO EXTRAÍDO",
      "confidence": 80,
      "reasoning": "Modelo específico identificado no nome do produto",
      "source": "ai",
      "category": "basic"
    },
    {
      "field": "tags",
      "label": "Tags de Busca",
      "currentValue": "{{tags}}",
      "suggestedValue": "tag1, tag2, tag3",
      "confidence": 90,
      "reasoning": "Tags estratégicas para melhorar descoberta do produto",
      "source": "ai",
      "category": "basic"
    }
  ]
}',
  '["name", "description", "short_description", "sku", "model", "tags"]'::jsonb,
  'JSON com array de suggestions para campos básicos: name, description, short_description, sku, model, tags',
  true
);

-- 2. PROMPT: Enriquecimento SEO
INSERT INTO ai_prompts (
  name, category, title, description, prompt_template, variables, expected_output, is_active
) VALUES (
  'enrich_seo_content',
  'general', 
  'Enriquecimento SEO Avançado',
  'Otimiza meta título, meta descrição, keywords, robots meta, Open Graph',
  'Você é um especialista em SEO para e-commerce. Otimize APENAS os campos SEO deste produto:

PRODUTO: {{name}}
META TÍTULO: {{meta_title}}
META DESCRIÇÃO: {{meta_description}}
META KEYWORDS: {{meta_keywords}}
ROBOTS: {{robots_meta}}

INSTRUÇÕES:
1. Meta título (50-60 caracteres) com palavra-chave principal
2. Meta descrição (150-160 caracteres) persuasiva
3. Meta keywords (8-12 palavras estratégicas OBRIGATÓRIO COMO STRING separada por vírgulas, NÃO array)
4. Robots meta tags (index,follow ou noindex,nofollow)
5. Structured Data JSON-LD completo para o produto
6. Open Graph título e descrição para redes sociais

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "meta_title",
      "label": "Meta Título",
      "currentValue": "{{meta_title}}",
      "suggestedValue": "TÍTULO SEO OTIMIZADO",
      "confidence": 95,
      "reasoning": "Otimizado para SEO",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "meta_description",
      "label": "Meta Descrição",
      "currentValue": "{{meta_description}}",
      "suggestedValue": "DESCRIÇÃO OTIMIZADA AQUI",
      "confidence": 95,
      "reasoning": "Descrição meta otimizada para SEO",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "meta_keywords",
      "label": "Meta Keywords",
      "currentValue": "{{meta_keywords}}",
      "suggestedValue": "palavra1, palavra2, palavra3, palavra4",
      "confidence": 85,
      "reasoning": "Keywords como STRING separada por vírgulas",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "robots_meta",
      "label": "Robots Meta",
      "currentValue": "{{robots_meta}}",
      "suggestedValue": "index,follow",
      "confidence": 95,
      "reasoning": "Permitir indexação para produtos ativos",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "structured_data",
      "label": "Dados Estruturados",
      "currentValue": "{{structured_data}}",
      "suggestedValue": "{\"@context\": \"https://schema.org\", \"@type\": \"Product\", \"name\": \"{{name}}\", \"description\": \"Descrição do produto\", \"brand\": \"Grão de Gente\"}",
      "confidence": 90,
      "reasoning": "JSON-LD Schema.org para rich snippets nos resultados de pesquisa",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "og_title",
      "label": "Open Graph Título",
      "currentValue": "{{og_title}}",
      "suggestedValue": "TÍTULO PARA REDES SOCIAIS",
      "confidence": 85,
      "reasoning": "Título otimizado para compartilhamento em redes sociais",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "og_description",
      "label": "Open Graph Descrição",
      "currentValue": "{{og_description}}",
      "suggestedValue": "DESCRIÇÃO PARA REDES SOCIAIS",
      "confidence": 85,
      "reasoning": "Descrição otimizada para compartilhamento em redes sociais",
      "source": "ai", 
      "category": "seo"
    }
  ]
}',
  '["name", "meta_title", "meta_description", "meta_keywords", "robots_meta", "structured_data", "og_title", "og_description"]'::jsonb,
  'JSON com array de suggestions para campos SEO: meta_title, meta_description, meta_keywords, robots_meta, structured_data, og_title, og_description',
  true
);

-- 3. PROMPT: Categorização Inteligente
INSERT INTO ai_prompts (
  name, category, title, description, prompt_template, variables, expected_output, is_active
) VALUES (
  'suggest_categories_intelligent',
  'general',
  'Categorização e Marcas Inteligente',
  'Sugere categoria e marca baseado no nome e descrição do produto',
  'Você é um especialista em categorização de produtos e análise de marcas. Analise este produto:

PRODUTO: {{name}}
DESCRIÇÃO: {{description}}

CATEGORIAS DISPONÍVEIS:
{{#each categories}}
- {{name}} (ID: {{id}})
{{/each}}

MARCAS DISPONÍVEIS:
{{#each brands}}
- {{name}} (ID: {{id}})
{{/each}}

INSTRUÇÕES PARA CATEGORIZAÇÃO:
1. Sugira 1-2 categorias mais adequadas (evite categorias muito específicas como "bebê" se não for claramente infantil)
2. Para categoria, prefira categorias gerais sobre específicas

INSTRUÇÕES PARA MARCA:
1. ANALISE o nome do produto cuidadosamente
2. SE reconhecer uma marca específica no nome (ex: "Nike", "Adidas", "Samsung"), sugira essa marca
3. SE não reconhecer nenhuma marca específica conhecida, NÃO sugira nada
4. NÃO force "Grão de Gente" a menos que seja realmente da marca Grão de Gente
5. Seja conservador - só sugira marca se tiver certeza

EXEMPLOS:
- "Tênis Nike Air Max" → Sugerir marca Nike
- "Cortina Petit Xadrez" → NÃO sugerir marca (produto genérico)
- "iPhone 13 Apple" → Sugerir marca Apple
- "Almofada Decorativa" → NÃO sugerir marca (produto genérico)

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "category_id",
      "label": "Categoria Principal",
      "currentValue": "",
      "suggestedValue": "ID_DA_CATEGORIA",
      "confidence": 90,
      "reasoning": "Motivo da categoria",
      "source": "ai",
      "category": "basic"
    }
  ]
}',
  '["name", "description", "categories", "brands"]'::jsonb,
  'JSON com suggestions para category_id e opcionalmente brand_id',
  true
);

-- 4. PROMPT: Atributos e Especificações
INSERT INTO ai_prompts (
  name, category, title, description, prompt_template, variables, expected_output, is_active
) VALUES (
  'enrich_attributes',
  'general',
  'Atributos e Especificações',
  'Cria atributos para filtros, especificações técnicas e campos personalizados',
  'Você é um especialista em estruturação de dados de produto. Crie atributos, especificações e campos personalizados:

PRODUTO: {{name}}
DESCRIÇÃO: {{description}}

INSTRUÇÕES:
1. Atributos para FILTROS da loja (Cor, Tamanho, Material, etc.)
2. Especificações TÉCNICAS detalhadas
3. Campos PERSONALIZADOS relevantes para este tipo de produto
4. Baseie-se no tipo de produto

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "attributes",
      "label": "Atributos para Filtros",
      "currentValue": {},
      "suggestedValue": {"Cor": ["Azul", "Rosa"], "Tamanho": ["Único"]},
      "confidence": 85,
      "reasoning": "Atributos para filtros da loja",
      "source": "ai",
      "category": "attributes"
    },
    {
      "field": "specifications",
      "label": "Especificações Técnicas",
      "currentValue": {},
      "suggestedValue": {"Dimensões": "20x30x10 cm", "Material": "Algodão 100%", "Peso": "500g"},
      "confidence": 90,
      "reasoning": "Especificações técnicas detalhadas para informar o consumidor",
      "source": "ai",
      "category": "attributes"
    }
  ]
}',
  '["name", "description"]'::jsonb,
  'JSON com suggestions para attributes e specifications',
  true
);

-- 5. PROMPT: Dimensões e Dados Avançados
INSERT INTO ai_prompts (
  name, category, title, description, prompt_template, variables, expected_output, is_active
) VALUES (
  'enrich_dimensions_advanced',
  'general',
  'Dimensões e Dados Avançados',
  'Estima peso, dimensões, origem e dados avançados do produto',
  'Você é um especialista em logística e dados avançados de produto. Estime dimensões e dados avançados:

PRODUTO: {{name}}
DESCRIÇÃO: {{description}}

INSTRUÇÕES:
1. Estime peso e dimensões baseado no tipo de produto
2. Sugira país de origem provável
3. Sugira instruções de cuidado
4. Sugira período de garantia padrão
5. Sugira país de fabricação
6. Sugira categoria fiscal geral (standard, food, books, etc.)

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "weight",
      "label": "Peso Estimado",
      "currentValue": "",
      "suggestedValue": "0.5",
      "confidence": 70,
      "reasoning": "Peso estimado baseado no tipo de produto",
      "source": "ai",
      "category": "shipping"
    },
    {
      "field": "height",
      "label": "Altura da Embalagem",
      "currentValue": "",
      "suggestedValue": "10",
      "confidence": 65,
      "reasoning": "Altura estimada da embalagem em cm",
      "source": "ai",
      "category": "shipping"
    },
    {
      "field": "width",
      "label": "Largura da Embalagem",
      "currentValue": "",
      "suggestedValue": "30",
      "confidence": 65,
      "reasoning": "Largura estimada da embalagem em cm",
      "source": "ai",
      "category": "shipping"
    },
    {
      "field": "length",
      "label": "Comprimento da Embalagem",
      "currentValue": "",
      "suggestedValue": "40",
      "confidence": 65,
      "reasoning": "Comprimento estimado da embalagem em cm",
      "source": "ai",
      "category": "shipping"
    },
    {
      "field": "origin",
      "label": "País de Origem",
      "currentValue": "",
      "suggestedValue": "Brasil",
      "confidence": 60,
      "reasoning": "País de origem provável baseado no produto",
      "source": "ai",
      "category": "advanced"
    }
  ]
}',
  '["name", "description"]'::jsonb,
  'JSON com suggestions para weight, height, width, length, origin',
  true
);

-- 6. PROMPT: Estoque e Inventário
INSERT INTO ai_prompts (
  name, category, title, description, prompt_template, variables, expected_output, is_active
) VALUES (
  'enrich_inventory',
  'general',
  'Estoque e Inventário',
  'Sugere quantidade inicial de estoque e alerta de estoque baixo',
  'Você é um especialista em gestão de estoque. Sugira valores iniciais de estoque:

PRODUTO: {{name}}
PREÇO: R$ {{price}}
CATEGORIA: {{category}}

INSTRUÇÕES:
1. Sugira quantidade inicial de estoque baseada no tipo e preço do produto
2. Sugira alerta de estoque baixo apropriado
3. Considere giro esperado do produto

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "quantity",
      "label": "Quantidade em Estoque",
      "currentValue": "",
      "suggestedValue": "50",
      "confidence": 60,
      "reasoning": "Quantidade inicial sugerida baseada no tipo de produto",
      "source": "ai",
      "category": "inventory"
    },
    {
      "field": "low_stock_alert",
      "label": "Alerta Estoque Baixo",
      "currentValue": "",
      "suggestedValue": "10",
      "confidence": 80,
      "reasoning": "Alerta quando estoque atingir este nível",
      "source": "ai",
      "category": "inventory"
    }
  ]
}',
  '["name", "price", "category"]'::jsonb,
  'JSON com suggestions para quantity e low_stock_alert',
  true
);

-- Comentário final
COMMENT ON TABLE ai_prompts IS 'Prompts de IA - Populado com prompts do sistema de enriquecimento de produtos'; 