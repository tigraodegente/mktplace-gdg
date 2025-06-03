# 🤖 CONFIGURAÇÃO DE IA PARA ENRIQUECIMENTO

## ⚠️ SEGURANÇA PRIMEIRO

### NUNCA FAÇA:
- ❌ Compartilhe API keys em código
- ❌ Commite keys no Git
- ❌ Exponha keys em logs
- ❌ Use keys no frontend

### SEMPRE FAÇA:
- ✅ Use variáveis de ambiente
- ✅ Armazene em `.env.local`
- ✅ Configure `.gitignore`
- ✅ Use rate limiting

## 🔧 CONFIGURAÇÃO OPENAI GPT-4

### 1. Setup Seguro
```bash
# .env.local (NUNCA commitar este arquivo)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

### 2. Cliente OpenAI
```javascript
// lib/ai/openai-client.js
import { Configuration, OpenAIApi } from 'openai';

// Validar que a key existe
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não configurada');
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openai = new OpenAIApi(configuration);
```

## 🎯 PROMPTS ANTI-DETECÇÃO

### Template Principal
```javascript
const MASTER_PROMPT = `
Você é um especialista em produtos infantis escrevendo para o e-commerce Grão de Gente.

REGRAS CRÍTICAS PARA CONTEÚDO NÃO DETECTÁVEL:

1. VARIAÇÃO OBRIGATÓRIA:
   - Nunca use a mesma estrutura duas vezes
   - Alterne entre frases curtas e longas
   - Varie início das frases (não comece sempre com "O produto...")

2. LINGUAGEM NATURAL:
   - Escreva como um brasileiro real falaria
   - Use expressões coloquiais ocasionalmente ("super macio", "uma gracinha")
   - Inclua detalhes específicos que humanos notariam

3. IMPERFEIÇÕES HUMANAS:
   - Ocasionalmente use reticências...
   - Varie uso de exclamações (!, ., sem pontuação)
   - Às vezes seja mais informal, outras mais profissional

4. EVITE SEMPRE:
   - Palavras muito rebuscadas ou técnicas demais
   - Estruturas perfeitas demais
   - Repetição de adjetivos
   - Padrões óbvios de template
`;
```

### Prompts Específicos por Tipo

#### SEO Title (max 60 chars)
```javascript
const seoTitlePrompt = (product) => `
${MASTER_PROMPT}

Crie um título SEO para:
Produto: ${product.name}
Categoria: ${product.category}

INSTRUÇÕES:
- Máximo 60 caracteres
- Inclua palavra-chave principal naturalmente
- Varie a estrutura (não sempre "Produto - Categoria | Loja")
- Às vezes comece com a categoria, às vezes com benefício

EXEMPLOS DE VARIAÇÃO:
- "Almofada Nuvem Rosa para Bebê | Grão de Gente"
- "Decoração Infantil - Almofada Estrela Azul"
- "Kit Berço Safari Completo 7 Peças - GDG"
- "Enxoval de Bebê: Kit Berço Floresta Encantada"

Gere 1 título único e natural.
`;
```

#### Meta Description (max 160 chars)
```javascript
const metaDescriptionPrompt = (product) => `
${MASTER_PROMPT}

Crie uma meta description para:
Produto: ${product.name}
Preço: R$ ${product.price}
Categoria: ${product.category}

VARIE ENTRE ESTES ESTILOS:
1. Começar com pergunta: "Procurando almofada para bebê?"
2. Começar com benefício: "Decore o quarto com nossa almofada..."
3. Começar com o produto: "Almofada Nuvem em algodão..."
4. Começar com ação: "Compre almofada decorativa..."

ELEMENTOS PARA INCLUIR (varie a ordem):
- Descrição do produto
- Material ou qualidade
- Benefício principal
- Menção a frete/parcelas (nem sempre)
- Call-to-action variado

NÃO use sempre 160 chars. Varie entre 145-160.
`;
```

#### Reviews Humanizadas
```javascript
const reviewPrompt = (product, persona) => `
${MASTER_PROMPT}

Escreva uma avaliação como: ${persona.description}

Produto: ${product.name}
Nota: ${persona.rating} estrelas

PERSONA:
- Estilo: ${persona.style}
- Foco em: ${persona.focus}
- Tom: ${persona.tone}

HUMANIZAÇÃO:
- Se for mãe jovem: use emojis ocasionalmente 😍
- Se for pai: seja mais direto e prático
- Se for avó: mencione netos, compare com antigamente
- Se for presente: mencione a reação de quem ganhou

IMPERFEIÇÕES NATURAIS:
- 20% chance: esquecer maiúscula após ponto
- 10% chance: usar "mto" em vez de "muito"
- 15% chance: vírgula fora do lugar
- 30% chance: reticências no final...

Escreva entre 50-200 palavras, variando bastante.
`;
```

## 📊 CONFIGURAÇÃO DE PROCESSAMENTO

### Batch Processing com Variação
```javascript
const enrichmentConfig = {
  // OpenAI Config
  model: "gpt-4-turbo-preview",
  
  // Processamento
  batchSize: 25, // Menor batch para mais controle
  delayBetweenBatches: 3000, // 3 segundos
  delayBetweenItems: 500, // 500ms entre items
  
  // Variação de temperatura por tipo
  temperatures: {
    seoTitle: 0.7,        // Criativo mas controlado
    metaDescription: 0.8, // Mais variação
    shortDescription: 0.9, // Máxima criatividade
    reviews: 0.85,        // Natural e variado
    tags: 0.3             // Mais consistente
  },
  
  // Anti-detecção
  antiDetection: {
    varyTemplates: true,
    addHumanErrors: true,
    mixProviders: false, // Usar só OpenAI por ora
    postProcessing: true
  }
};
```

### Personas para Reviews
```javascript
const reviewPersonas = [
  {
    id: "mae_primeira_viagem",
    description: "Mãe de primeira viagem, 28 anos, muito cuidadosa",
    style: "detalhista, menciona tudo que testou",
    focus: "segurança, qualidade, aparência",
    tone: "empolgada mas cautelosa",
    rating: [4, 5], // Geralmente notas altas
    typos: ["mto", "td", "!!!"],
    emojis: true
  },
  {
    id: "pai_pratico",
    description: "Pai objetivo, 35 anos, focado em funcionalidade",
    style: "direto ao ponto, sem floreios",
    focus: "durabilidade, custo-benefício, praticidade",
    tone: "objetivo e analítico",
    rating: [3, 4, 5],
    typos: minimal,
    emojis: false
  },
  {
    id: "avo_experiente",
    description: "Avó que já comprou para vários netos",
    style: "comparativa, conta histórias",
    focus: "qualidade, tradição, conforto",
    tone: "carinhosa e nostálgica",
    rating: [4, 5],
    typos: ["...", ","],
    emojis: occasional
  },
  {
    id: "tia_presenteadora",
    description: "Tia que adora dar presentes",
    style: "focada na reação e na embalagem",
    focus: "apresentação, originalidade, reação",
    tone: "alegre e generosa",
    rating: [4, 5],
    typos: normal,
    emojis: true
  },
  {
    id: "consumidor_critico",
    description: "Comprador exigente que pesquisa muito",
    style: "analítico, compara com concorrentes",
    focus: "defeitos, melhorias, comparações",
    tone: "crítico mas justo",
    rating: [2, 3, 4], // Notas mais baixas
    typos: minimal,
    emojis: false
  }
];
```

## 🔍 VALIDAÇÃO E PÓS-PROCESSAMENTO

### Humanização Final
```javascript
function humanizeContent(text, type) {
  // Detectar padrões muito perfeitos
  if (type === 'metaDescription') {
    // Nem sempre terminar com CTA
    if (Math.random() < 0.3) {
      text = text.replace(/[!.]+$/, '');
    }
    
    // Variar comprimento (145-160)
    const targetLength = 145 + Math.floor(Math.random() * 15);
    if (text.length > targetLength) {
      text = text.substring(0, targetLength).trim();
    }
  }
  
  // Adicionar variações regionais brasileiras
  const variations = {
    "bebê": ["bebê", "neném", "baby"],
    "criança": ["criança", "pequeno", "pequenino"],
    "bonito": ["bonito", "lindo", "fofo", "uma graça"],
    "comprar": ["comprar", "adquirir", "garantir o seu"]
  };
  
  // Aplicar variações aleatoriamente
  Object.keys(variations).forEach(key => {
    if (text.includes(key) && Math.random() < 0.3) {
      const options = variations[key];
      const replacement = options[Math.floor(Math.random() * options.length)];
      text = text.replace(key, replacement);
    }
  });
  
  return text;
}
```

### Checklist de Qualidade
```javascript
async function validateContent(content, type) {
  const validations = {
    // Comprimento adequado
    lengthCheck: () => {
      switch(type) {
        case 'seoTitle': return content.length <= 60;
        case 'metaDescription': return content.length >= 145 && content.length <= 160;
        default: return true;
      }
    },
    
    // Sem padrões repetitivos
    patternCheck: () => {
      const patterns = [
        /^Compre .+ \| Grão de Gente$/,
        /^.+ - .+ \| Grão de Gente$/,
        /\. Compre agora!$/,
        /\. Aproveite!$/
      ];
      return !patterns.some(p => p.test(content));
    },
    
    // Densidade de palavras-chave
    keywordDensity: () => {
      const words = content.toLowerCase().split(/\s+/);
      const keywordCount = words.filter(w => 
        w.includes(product.name.toLowerCase())
      ).length;
      return (keywordCount / words.length) < 0.03; // Máx 3%
    },
    
    // Naturalidade
    readability: () => {
      // Verificar se não está muito formal/robótico
      const formalWords = ['outrossim', 'destarte', 'porquanto'];
      return !formalWords.some(w => content.includes(w));
    }
  };
  
  const results = {};
  for (const [check, validator] of Object.entries(validations)) {
    results[check] = validator();
  }
  
  return results;
}
```

## 📈 MONITORAMENTO

### Métricas para Acompanhar
```javascript
const monitoringMetrics = {
  // Taxa de rejeição da API
  apiRejections: 0,
  
  // Padrões detectados
  patternDetections: 0,
  
  // Validações falhas
  validationFailures: {},
  
  // Distribuição de comprimentos
  lengthDistribution: {
    seoTitle: [],
    metaDescription: []
  },
  
  // Uso de personas
  personaUsage: {},
  
  // Performance
  averageProcessingTime: 0,
  costPerProduct: 0
};
```

## 💰 ESTIMATIVA DE CUSTOS GPT-4

### Por Produto:
- SEO Title: ~50 tokens = $0.0015
- Meta Description: ~100 tokens = $0.003
- Short Description: ~150 tokens = $0.0045
- Tags: ~80 tokens = $0.0024
- Specifications: ~200 tokens = $0.006
- **Total por produto: ~$0.02**

### Para 2.633 produtos:
- **Custo total estimado: ~$52.66**

### Para Reviews (7 por produto = 18.431):
- **~150 tokens por review = $0.0045**
- **Total reviews: ~$82.94**

### TOTAL GERAL: ~$135.60

## 🚀 SCRIPT DE EXECUÇÃO

```javascript
// enrich-products.js
import { openai } from './lib/ai/openai-client.js';
import { enrichmentConfig, reviewPersonas } from './config/enrichment.js';
import { humanizeContent, validateContent } from './lib/ai/humanizer.js';

async function enrichProduct(product) {
  try {
    // 1. Gerar SEO Title
    const titleResponse = await openai.createChatCompletion({
      model: enrichmentConfig.model,
      messages: [{
        role: 'user',
        content: seoTitlePrompt(product)
      }],
      temperature: enrichmentConfig.temperatures.seoTitle,
      max_tokens: 100
    });
    
    const seoTitle = humanizeContent(
      titleResponse.data.choices[0].message.content,
      'seoTitle'
    );
    
    // 2. Validar
    const validation = await validateContent(seoTitle, 'seoTitle');
    if (!validation.lengthCheck || !validation.patternCheck) {
      // Tentar novamente com temperatura diferente
      enrichmentConfig.temperatures.seoTitle += 0.1;
      return enrichProduct(product);
    }
    
    // 3. Continuar com outros campos...
    
    return {
      ...product,
      meta_title: seoTitle,
      // ... outros campos
    };
    
  } catch (error) {
    console.error('Erro ao enriquecer produto:', error);
    throw error;
  }
}
```

## ✅ CHECKLIST FINAL

- [ ] Configurar `.env.local` com API key
- [ ] Nunca commitar credenciais
- [ ] Implementar rate limiting
- [ ] Testar com 10 produtos primeiro
- [ ] Validar naturalidade do conteúdo
- [ ] Monitorar custos
- [ ] Fazer backup antes de aplicar
- [ ] Revisar amostra manualmente 