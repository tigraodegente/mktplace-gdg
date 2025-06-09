-- Script para popular a tabela ai_prompts com prompts padrão
-- Executar após criar a tabela ai_prompts

-- 1. PROMPT PRINCIPAL - Enriquecimento Completo
INSERT INTO ai_prompts (name, category, title, description, prompt_template, variables, expected_output) VALUES 
(
  'complete_enrichment',
  'general',
  'Enriquecimento Completo de Produtos',
  'Prompt principal que enriquece todos os campos do produto de uma vez',
  'Você é um especialista em e-commerce brasileiro especializado em produtos eletrônicos, eletrodomésticos, produtos infantis e decoração. Crie um produto COMPLETO e PROFISSIONAL baseado nos dados básicos fornecidos.

DADOS ATUAIS:
- Nome: "{{name}}"
- Preço: R$ {{price}}
- Custo: R$ {{cost}}
- Categoria atual: {{category}}
- Marca atual: {{brand}}
- Descrição atual: "{{description}}"

CATEGORIAS DISPONÍVEIS:
{{categories_list}}

MARCAS DISPONÍVEIS:
{{brands_list}}

🎯 INSTRUÇÕES ESPECÍFICAS PARA ATRIBUTOS vs ESPECIFICAÇÕES:

📊 suggested_attributes = FILTROS DA LOJA (múltiplas opções para que clientes filtrem produtos similares)
- "Cor": ["Azul", "Verde", "Rosa", "Branco"] (várias cores possíveis)
- "Tamanho": ["Pequeno", "Médio", "Grande"] (vários tamanhos possíveis)
- "Material": ["Algodão", "Poliéster", "Madeira"] (vários materiais possíveis)

🔧 suggested_specifications = DETALHES TÉCNICOS (valores únicos específicos deste produto)
- "Potência": "1200W" (valor específico deste produto)
- "Peso": "2,5 kg" (peso específico deste produto)
- "Garantia": "12 meses" (garantia específica)

RETORNE EM JSON EXATO com TODOS os campos preenchidos:

{
  "enhanced_name": "Nome otimizado para vendas (máx 80 chars)",
  "slug": "url-amigavel-do-produto",
  "sku": "SKU único profissional",
  "description": "Descrição completa 350-450 palavras",
  "short_description": "Resumo atrativo 120-150 chars",
  "model": "Modelo específico do produto",
  "price": "Preço calculado com margem sobre custo",
  "suggested_attributes": [
    {
      "name": "Cor",
      "values": ["Azul", "Verde", "Rosa", "Branco", "Preto"]
    },
    {
      "name": "Tamanho", 
      "values": ["Pequeno", "Médio", "Grande", "Extra Grande"]
    }
  ],
  "suggested_specifications": {
    "Potência": "1200W",
    "Peso": "2,5 kg",
    "Garantia": "12 meses"
  }
}',
  '["name", "price", "cost", "category", "brand", "description", "categories_list", "brands_list"]',
  'JSON com campos: enhanced_name, slug, sku, description, short_description, model, price, suggested_attributes (array), suggested_specifications (object)'
);

-- 2. PROMPT - Atributos para Filtros (Geral)
INSERT INTO ai_prompts (name, category, title, description, prompt_template, variables, expected_output) VALUES 
(
  'attributes',
  'general',
  'Atributos para Filtros - Geral',
  'Gera atributos com múltiplas opções para filtros da loja',
  'Analise este produto e sugira ATRIBUTOS PARA FILTROS na loja:

Nome: "{{name}}"
Descrição: "{{description}}"
Categoria: {{category}}
Preço: R$ {{price}}

🎯 OBJETIVO: Gerar atributos que CLIENTES USAM PARA FILTRAR/BUSCAR produtos similares

REGRAS IMPORTANTES:
1. Cada atributo deve ter MÚLTIPLAS OPÇÕES possíveis (não apenas uma)
2. Pense em outros produtos similares que poderiam ter valores diferentes
3. Máximo 5-8 atributos principais para filtros
4. Use apenas valores que fazem diferença na escolha do cliente

EXEMPLOS CORRETOS:
- "Cor": ["Azul", "Verde", "Rosa", "Multicolorido"]
- "Tamanho": ["Pequeno", "Médio", "Grande"]
- "Material": ["Algodão", "Poliéster", "Tecido Misto"]

❌ EVITAR:
- Especificações técnicas detalhadas (isso vai em specifications)
- Valores únicos que não têm variação
- Informações muito específicas do produto individual

Retorne APENAS um JSON no formato:
{
  "Cor": ["Azul", "Verde", "Rosa", "Multicolorido"],
  "Tamanho": ["Pequeno", "Médio", "Grande"],
  "Material": ["Algodão", "Poliéster", "Tecido Misto"]
}',
  '["name", "description", "category", "price"]',
  'JSON com atributos como chaves e arrays de opções como valores'
);

-- 3. PROMPT - Atributos para Produtos Infantis
INSERT INTO ai_prompts (name, category, title, description, prompt_template, variables, expected_output) VALUES 
(
  'attributes',
  'baby',
  'Atributos para Filtros - Produtos Infantis',
  'Atributos específicos para produtos infantis/bebê',
  'Analise este produto INFANTIL e sugira ATRIBUTOS PARA FILTROS:

Nome: "{{name}}"
Descrição: "{{description}}"
Categoria: {{category}}
Preço: R$ {{price}}

🧸 FOCO EM PRODUTOS INFANTIS:

ATRIBUTOS ESSENCIAIS:
- "Cor": ["Azul", "Rosa", "Verde", "Multicolorido", "Neutro"]
- "Idade": ["0-6 meses", "6-12 meses", "1-3 anos", "3-6 anos", "6+ anos"]
- "Tamanho": ["Pequeno", "Médio", "Grande", "Extra Grande"]
- "Material": ["Algodão", "Poliéster", "Plástico Atóxico", "Madeira", "Tecido"]
- "Gênero": ["Menino", "Menina", "Unissex"]
- "Tema": ["Animais", "Carros", "Princesas", "Natureza", "Personagens"]
- "Tipo": ["Educativo", "Decorativo", "Funcional", "Brinquedo"]

CARACTERÍSTICAS IMPORTANTES:
- Segurança (certificações)
- Facilidade de limpeza
- Desenvolvimento (motor, cognitivo)
- Interatividade

Retorne APENAS JSON com 5-8 atributos mais relevantes:
{
  "Cor": ["Azul", "Rosa", "Verde", "Multicolorido"],
  "Idade": ["0-3 anos", "3-6 anos", "6+ anos"],
  "Material": ["Algodão", "Poliéster", "Plástico Atóxico"],
  "Gênero": ["Menino", "Menina", "Unissex"]
}',
  '["name", "description", "category", "price"]',
  'JSON com atributos específicos para produtos infantis'
);

-- 4. PROMPT - Especificações Técnicas
INSERT INTO ai_prompts (name, category, title, description, prompt_template, variables, expected_output) VALUES 
(
  'specifications',
  'general',
  'Especificações Técnicas - Geral',
  'Gera especificações técnicas detalhadas do produto',
  'Analise este produto e sugira ESPECIFICAÇÕES TÉCNICAS DETALHADAS:

Nome: "{{name}}"
Descrição: "{{description}}"
Categoria: {{category}}
Preço: R$ {{price}}

🎯 OBJETIVO: Gerar especificações técnicas ESPECÍFICAS deste produto (valores únicos)

IMPORTANTE:
- Especificações são VALORES ÚNICOS específicos deste produto
- NÃO são filtros (isso são os attributes)
- Seja técnico e preciso com unidades brasileiras
- Entre 8-15 especificações relevantes

EXEMPLOS CORRETOS:
- "Dimensões": "45 x 35 x 25 cm"
- "Peso": "3,5 kg"
- "Material": "100% Algodão hipoalergênico"
- "Garantia": "12 meses"
- "Certificações": "INMETRO"

❌ EVITAR:
- Listas de opções (isso são attributes)
- Valores genéricos como "varia conforme modelo"

Retorne APENAS um JSON:
{
  "Dimensões": "45 x 35 x 25 cm",
  "Peso": "3,5 kg",
  "Material": "100% Algodão",
  "Garantia": "12 meses"
}',
  '["name", "description", "category", "price"]',
  'JSON com especificações como chaves e valores únicos específicos'
);

-- 5. PROMPT - Especificações para Eletrônicos
INSERT INTO ai_prompts (name, category, title, description, prompt_template, variables, expected_output) VALUES 
(
  'specifications',
  'electronics',
  'Especificações Técnicas - Eletrônicos',
  'Especificações específicas para produtos eletrônicos',
  'Analise este produto ELETRÔNICO e sugira especificações técnicas:

Nome: "{{name}}"
Descrição: "{{description}}"
Categoria: {{category}}
Preço: R$ {{price}}

⚡ FOCO EM ELETRÔNICOS:

ESPECIFICAÇÕES ESSENCIAIS:
- "Voltagem": "110V/220V Bivolt"
- "Potência": "1200W"
- "Consumo": "1,2 kWh"
- "Dimensões": "45 x 35 x 25 cm"
- "Peso": "3,5 kg"
- "Conectividade": "Wi-Fi, Bluetooth, USB"
- "Certificações": "INMETRO, ANATEL"
- "Garantia": "12 meses"
- "Eficiência Energética": "Classe A"
- "Compatibilidade": "Android 8+, iOS 14+"

Seja específico com:
- Voltagens brasileiras (110V, 220V, Bivolt)
- Certificações nacionais (INMETRO, ANATEL)
- Consumo energético real
- Conectividade atual

Retorne JSON com 10-15 especificações relevantes:
{
  "Voltagem": "110V/220V Bivolt",
  "Potência": "1200W",
  "Consumo": "1,2 kWh/mês",
  "Dimensões": "45 x 35 x 25 cm"
}',
  '["name", "description", "category", "price"]',
  'JSON com especificações técnicas específicas para eletrônicos'
);

-- 6. PROMPT - Descrição Completa
INSERT INTO ai_prompts (name, category, title, description, prompt_template, variables, expected_output) VALUES 
(
  'description',
  'general',
  'Descrição Completa do Produto',
  'Gera descrição detalhada e persuasiva do produto',
  'Crie uma descrição completa e persuasiva (300-400 palavras) para:

Nome: "{{name}}"
Categoria: {{category}}
Marca: {{brand}}
Preço: R$ {{price}}

ESTRUTURA:
1. Primeiro parágrafo: Benefício principal (sem clichês)
2. Segundo parágrafo: Características específicas
3. Terceiro parágrafo: Especificações técnicas
4. Quarto parágrafo: Call to action natural

DIRETRIZES:
- Use linguagem natural brasileira
- EVITE clichês como "destaca-se", "além disso", "ideal para"
- Seja específico sobre materiais, dimensões, funcionalidades
- Para produtos infantis: enfatize segurança e desenvolvimento
- Para decoração: foque em ambiente e praticidade
- Use parágrafos curtos e objetivos

Retorne apenas a descrição, sem explicações.',
  '["name", "category", "brand", "price"]',
  'Texto descritivo de 300-400 palavras'
);

-- 7. PROMPT - Tags SEO
INSERT INTO ai_prompts (name, category, title, description, prompt_template, variables, expected_output) VALUES 
(
  'tags',
  'general',
  'Tags SEO e Busca',
  'Gera tags relevantes para SEO e busca interna',
  'Liste 15-20 tags relevantes para este produto:

Nome: "{{name}}"
Categoria: {{category}}
Preço: R$ {{price}}

DIRETRIZES:
- Use termos que brasileiros pesquisam
- Inclua sinônimos e variações
- Misture termos gerais e específicos
- Inclua long-tail keywords
- Evite repetições
- Pense em como o cliente buscaria este produto

EXEMPLOS:
Para "Cortina Xadrez": ["cortina", "xadrez", "quarto bebê", "decoração", "infantil", "menino", "menina", "varão", "blackout", "tecido"]

Retorne apenas array JSON: ["tag1", "tag2", "tag3"]',
  '["name", "category", "price"]',
  'Array JSON com 15-20 tags relevantes'
);

-- Confirmar inserção
SELECT name, category, title FROM ai_prompts ORDER BY name, category; 