import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { getDatabase } from '$lib/db';
import { getProcessedPrompt, getFallbackPrompt } from '$lib/services/aiPromptService';
import { virtualFieldService } from '$lib/services/virtualFieldService';
import { aiApprovalService } from '$lib/services/aiApprovalService';

// Inicializar OpenAI com a chave do ambiente
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

// Classe de erro específica para quando não há saldo na IA
class AIQuotaExceededError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AIQuotaExceededError';
	}
}

// Função para verificar se é erro de quota
function isQuotaExceededError(error: any): boolean {
	return error.status === 429 || 
		   error.code === 'insufficient_quota' || 
		   error.type === 'insufficient_quota' ||
		   (error.message && error.message.includes('quota')) ||
		   (error.message && error.message.includes('billing'));
}

interface Suggestion {
	field: string;
	label: string;
	currentValue: any;
	suggestedValue: any;
	confidence: number;
	reasoning: string;
	source: 'ai' | 'similar_products' | 'category_template';
	category: 'basic' | 'pricing' | 'attributes' | 'variants' | 'media' | 'shipping' | 'seo' | 'inventory' | 'advanced' | 'virtual';
	displayValue?: string;
	extra_info?: any;
}

// Função para fallback expandido quando não encontra prompt no banco
function getExpandedReviewFallback(currentData: any, categories: any[], brands: any[]): string {
	return `Você é um especialista em e-commerce e marketing digital da Grão de Gente. Analise o produto abaixo e sugira melhorias específicas para TODOS os campos, mesmo que já estejam preenchidos.

PRODUTO ATUAL:
Nome: ${currentData.name}
Descrição: ${currentData.description || 'Não informado'}
Descrição Resumida: ${currentData.short_description || 'Não informado'}
SKU: ${currentData.sku || 'Não informado'}
Tags: ${Array.isArray(currentData.tags) ? currentData.tags.join(', ') : currentData.tags || 'Não informado'}
Preço: R$ ${currentData.price || currentData.sale_price || 'Não informado'}
Preço Original: R$ ${currentData.regular_price || currentData.original_price || 'Não informado'}
Custo: R$ ${currentData.cost || currentData.cost_price || 'Não informado'}
Meta Título: ${currentData.meta_title || 'Não informado'}
Meta Descrição: ${currentData.meta_description || 'Não informado'}
Meta Keywords: ${Array.isArray(currentData.meta_keywords) ? currentData.meta_keywords.join(', ') : currentData.meta_keywords || 'Não informado'}
Peso: ${currentData.weight || 'Não informado'}
Dimensões: ${currentData.height}x${currentData.width}x${currentData.length} cm
Estoque: ${currentData.quantity || 'Não informado'} unidades
Alerta Estoque Baixo: ${currentData.low_stock_alert || 'Não informado'}

CATEGORIAS DISPONÍVEIS:
${categories.map((c: any) => `- ${c.name} (ID: ${c.id})`).join('\n')}

MARCAS DISPONÍVEIS:
${brands.map((b: any) => `- ${b.name} (ID: ${b.id})`).join('\n')}

INSTRUÇÕES IMPORTANTES:
1. Sugira melhorias para TODOS os campos listados abaixo - pelo menos 20 sugestões
2. Foque em SEO, conversão e experiência do cliente
3. Use a marca "Grão de Gente" nas sugestões quando apropriado
4. Mantenha o tom brasileiro e profissional
5. Seja específico e relevante para o produto analisado
6. Considere a categoria e público-alvo do produto
7. Retorne APENAS um JSON válido no formato especificado

FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
{
  "suggestions": [
    {
      "field": "name",
      "label": "Nome do Produto",
      "currentValue": "${currentData.name}",
      "suggestedValue": "SUGESTÃO MELHORADA ESPECÍFICA",
      "confidence": 85,
      "reasoning": "Explicação clara do motivo da melhoria",
      "source": "ai",
      "category": "basic"
    }
  ]
}

GERE SUGESTÕES PARA ESTES CAMPOS (MÍNIMO 20):

ABA BÁSICO (category: "basic"):
- name: Nome do Produto  
- description: Descrição Completa
- short_description: Descrição Resumida
- sku: SKU/Código do Produto
- tags: Tags de Busca

ABA PREÇOS (category: "pricing"):
- price/sale_price: Preço de Venda
- regular_price: Preço Original (De/Por)
- cost_price: Custo do Produto

ABA SEO (category: "seo"):
- meta_title: Meta Título
- meta_description: Meta Descrição
- meta_keywords: Palavras-chave SEO

ABA ATRIBUTOS (category: "attributes"):
- attributes: Atributos para Filtros
- specifications: Especificações Técnicas

ABA ESTOQUE (category: "inventory"):
- quantity: Quantidade em Estoque
- low_stock_alert: Alerta de Estoque Baixo

ABA FRETE (category: "shipping"):
- weight: Peso do Produto
- dimensions: Dimensões da Embalagem

ABA MÍDIA (category: "media"):
- images_suggestion: Sugestões de Fotos

ABA AVANÇADO (category: "advanced"):
- origin: País de Origem
- care_instructions: Instruções de Cuidado

RETORNE O JSON COM PELO MENOS 20 SUGESTÕES ESPECÍFICAS E INTELIGENTES!`;
}

// 🚀 NOVAS FUNÇÕES ESPECÍFICAS DE ALTA QUALIDADE

// 📝 1. ENRIQUECIMENTO DE CONTEÚDO BÁSICO
async function enrichBasicContent(currentData: any, openai: OpenAI): Promise<Suggestion[]> {
	try {
		const prompt = `Você é um especialista em copywriting para e-commerce. Analise este produto e otimize APENAS os campos de conteúdo básico:

PRODUTO: ${currentData.name}
DESCRIÇÃO ATUAL: ${currentData.description || 'Não informado'}
DESCRIÇÃO CURTA: ${currentData.short_description || 'Não informado'}
SKU ATUAL: ${currentData.sku || 'Não informado'}
MODELO ATUAL: ${currentData.model || 'Não informado'}
TAGS ATUAIS: ${Array.isArray(currentData.tags) ? currentData.tags.join(', ') : currentData.tags || 'Não informado'}

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
      "currentValue": "${currentData.name}",
      "suggestedValue": "NOME OTIMIZADO",
      "confidence": 90,
      "reasoning": "Motivo da otimização",
      "source": "ai",
      "category": "basic"
    },

    {
      "field": "model",
      "label": "Modelo do Produto",
      "currentValue": "${currentData.model || ''}",
      "suggestedValue": "MODELO EXTRAÍDO",
      "confidence": 80,
      "reasoning": "Modelo específico identificado no nome do produto",
      "source": "ai",
      "category": "basic"
    }
  ]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 2000,
			temperature: 0.7,
			messages: [{ role: 'user', content: prompt }]
		});

		const result = parseAIResponse(response.choices[0].message.content);
		console.log(`📝 Conteúdo básico: ${result.length} sugestões`);
		return result;
	} catch (error) {
		console.error('❌ Erro no conteúdo básico:', error);
		
		// Verificar se é erro de quota/saldo
		if (isQuotaExceededError(error)) {
			throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
		}
		
		return [];
	}
}

// 🔍 2. ENRIQUECIMENTO SEO + ROBOTS + STRUCTURED DATA
async function enrichSEOContent(currentData: any, openai: OpenAI): Promise<Suggestion[]> {
	try {
		const prompt = `Você é um especialista em SEO para e-commerce. Otimize APENAS os campos SEO deste produto:

PRODUTO: ${currentData.name}
META TÍTULO: ${currentData.meta_title || 'Não informado'}
META DESCRIÇÃO: ${currentData.meta_description || 'Não informado'}
META KEYWORDS: ${Array.isArray(currentData.meta_keywords) ? currentData.meta_keywords.join(', ') : currentData.meta_keywords || 'Não informado'}
ROBOTS: ${currentData.robots_meta || 'Não informado'}

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
      "currentValue": "${currentData.meta_title || ''}",
      "suggestedValue": "TÍTULO SEO OTIMIZADO",
      "confidence": 95,
      "reasoning": "Otimizado para SEO",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "meta_description",
      "label": "Meta Descrição",
      "currentValue": "${currentData.meta_description || ''}",
      "suggestedValue": "DESCRIÇÃO OTIMIZADA AQUI",
      "confidence": 95,
      "reasoning": "Descrição meta otimizada para SEO",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "meta_keywords",
      "label": "Meta Keywords",
      "currentValue": "${currentData.meta_keywords || ''}",
      "suggestedValue": "palavra1, palavra2, palavra3, palavra4",
      "confidence": 85,
      "reasoning": "Keywords como STRING separada por vírgulas",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "robots_meta",
      "label": "Robots Meta",
      "currentValue": "${currentData.robots_meta || ''}",
      "suggestedValue": "index,follow",
      "confidence": 95,
      "reasoning": "Permitir indexação para produtos ativos",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "structured_data",
      "label": "Dados Estruturados",
      "currentValue": "${currentData.structured_data || ''}",
      "suggestedValue": "{\\"@context\\": \\"https://schema.org\\", \\"@type\\": \\"Product\\", \\"name\\": \\"${currentData.name}\\", \\"description\\": \\"Descrição do produto\\", \\"brand\\": \\"Grão de Gente\\"}",
      "confidence": 90,
      "reasoning": "JSON-LD Schema.org para rich snippets nos resultados de pesquisa",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "og_title",
      "label": "Open Graph Título",
      "currentValue": "${currentData.og_title || ''}",
      "suggestedValue": "TÍTULO PARA REDES SOCIAIS",
      "confidence": 85,
      "reasoning": "Título otimizado para compartilhamento em redes sociais",
      "source": "ai",
      "category": "seo"
    },
    {
      "field": "og_description",
      "label": "Open Graph Descrição",
      "currentValue": "${currentData.og_description || ''}",
      "suggestedValue": "DESCRIÇÃO PARA REDES SOCIAIS",
      "confidence": 85,
      "reasoning": "Descrição otimizada para compartilhamento em redes sociais",
      "source": "ai",
      "category": "seo"
    }
  ]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 2000,
			temperature: 0.3,
			messages: [{ role: 'user', content: prompt }]
		});

		const result = parseAIResponse(response.choices[0].message.content);
		console.log(`🔍 SEO Avançado: ${result.length} sugestões`);
		return result;
	} catch (error) {
		console.error('❌ Erro no SEO:', error);
		
		// Verificar se é erro de quota/saldo
		if (isQuotaExceededError(error)) {
			throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
		}
		
		return [];
	}
}

// 📂 3. CATEGORIZAÇÃO INTELIGENTE (irá para aba BASIC)
async function suggestCategoriesIntelligent(currentData: any, categories: any[], brands: any[], openai: OpenAI): Promise<Suggestion[]> {
	try {
		const categoriesList = categories.slice(0, 50).map(c => `- ${c.name} (ID: ${c.id})`).join('\n');
		const brandsList = brands.slice(0, 20).map(b => `- ${b.name} (ID: ${b.id})`).join('\n');

		const prompt = `Você é um especialista em categorização de produtos e análise de marcas. Analise este produto:

PRODUTO: ${currentData.name}
DESCRIÇÃO: ${currentData.description || 'Não informado'}

CATEGORIAS DISPONÍVEIS (primeiras 50):
${categoriesList}

MARCAS DISPONÍVEIS (primeiras 20):
${brandsList}

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
    // SÓ inclua brand_id se realmente identificar uma marca específica:
    // {
    //   "field": "brand_id", 
    //   "label": "Marca do Produto",
    //   "currentValue": "",
    //   "suggestedValue": "ID_DA_MARCA",
    //   "confidence": 85,
    //   "reasoning": "Marca identificada no nome do produto",
    //   "source": "ai",
    //   "category": "basic"
    // }
  ]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 1000,
			temperature: 0.7,
			messages: [{ role: 'user', content: prompt }]
		});

		const result = parseAIResponse(response.choices[0].message.content);
		
		// 🔧 ENRIQUECER AS SUGESTÕES COM NOMES
		result.forEach((suggestion: any) => {
			if (suggestion.field === 'category_id' && suggestion.suggestedValue) {
				const category = categories.find(c => c.id === suggestion.suggestedValue);
				if (category) {
					suggestion.displayValue = `✅ ${category.name}`;
					suggestion.extra_info = {
						category_name: category.name,
						category_id: category.id
					};
				}
			}
			
			if (suggestion.field === 'brand_id' && suggestion.suggestedValue) {
				const brand = brands.find(b => b.id === suggestion.suggestedValue);
				if (brand) {
					suggestion.displayValue = `✅ ${brand.name}`;
					suggestion.extra_info = {
						brand_name: brand.name,
						brand_id: brand.id
					};
					console.log(`🏷️ Marca identificada pela IA: ${brand.name}`);
				}
			}
		});
		
		console.log(`📂 Categorização: ${result.length} sugestões`);
		return result;
	} catch (error) {
		console.error('❌ Erro na categorização:', error);
		
		// Verificar se é erro de quota/saldo
		if (isQuotaExceededError(error)) {
			throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
		}
		
		return [];
	}
}

// ⚙️ 4. ATRIBUTOS E ESPECIFICAÇÕES + CAMPOS PERSONALIZADOS
async function enrichAttributes(currentData: any, openai: OpenAI): Promise<Suggestion[]> {
	try {
		const prompt = `Você é um especialista em estruturação de dados de produto. Crie atributos, especificações e campos personalizados:

PRODUTO: ${currentData.name}
DESCRIÇÃO: ${currentData.description || 'Não informado'}

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
    },
    {
      "field": "custom_fields",
      "label": "Campos Personalizados",
      "currentValue": {},
      "suggestedValue": {"Voltagem": "110V/220V", "Idade Recomendada": "0-3 anos"},
      "confidence": 80,
      "reasoning": "Campos específicos importantes para este tipo de produto",
      "source": "ai",
      "category": "attributes"
    }
  ]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 1500,
			temperature: 0.7,
			messages: [{ role: 'user', content: prompt }]
		});

		const result = parseAIResponse(response.choices[0].message.content);
		console.log(`⚙️ Atributos + Campos: ${result.length} sugestões`);
		return result;
	} catch (error) {
		console.error('❌ Erro nos atributos:', error);
		
		// Verificar se é erro de quota/saldo
		if (isQuotaExceededError(error)) {
			throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
		}
		
		return [];
	}
}

// 📏 5. DIMENSÕES E AVANÇADO
async function enrichDimensionsAndAdvanced(currentData: any, openai: OpenAI): Promise<Suggestion[]> {
	try {
		const prompt = `Você é um especialista em logística e dados avançados de produto. Estime dimensões e dados avançados:

PRODUTO: ${currentData.name}
DESCRIÇÃO: ${currentData.description || 'Não informado'}

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
      "field": "dimensions",
      "label": "Dimensões da Embalagem",
      "currentValue": "",
      "suggestedValue": "30x40x5",
      "confidence": 65,
      "reasoning": "Dimensões estimadas da embalagem (LxAxP em cm)",
      "source": "ai",
      "category": "shipping"
    },
    {
      "field": "length",
      "label": "Comprimento (cm)",
      "currentValue": "",
      "suggestedValue": "30",
      "confidence": 65,
      "reasoning": "Comprimento estimado da embalagem em centímetros",
      "source": "ai",
      "category": "shipping"
    },
    {
      "field": "width",
      "label": "Largura (cm)", 
      "currentValue": "",
      "suggestedValue": "40",
      "confidence": 65,
      "reasoning": "Largura estimada da embalagem em centímetros",
      "source": "ai",
      "category": "shipping"
    },
    {
      "field": "height",
      "label": "Altura (cm)",
      "currentValue": "",
      "suggestedValue": "5",
      "confidence": 65,
      "reasoning": "Altura estimada da embalagem em centímetros",
      "source": "ai",
      "category": "shipping"
    }
  ]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 1500,
			temperature: 0.7,
			messages: [{ role: 'user', content: prompt }]
		});

		const result = parseAIResponse(response.choices[0].message.content);
		console.log(`📏 Dimensões/Avançado: ${result.length} sugestões`);
		return result;
	} catch (error) {
		console.error('❌ Erro nas dimensões:', error);
		
		// Verificar se é erro de quota/saldo
		if (isQuotaExceededError(error)) {
			throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
		}
		
		return [];
	}
}

// 💰 6. ENRIQUECIMENTO DE PREÇOS
async function enrichPricing(currentData: any, openai: OpenAI): Promise<Suggestion[]> {
	try {
		const prompt = `Você é um especialista em precificação e estratégia comercial. Analise APENAS os preços deste produto:

PRODUTO: ${currentData.name}
PREÇO ATUAL: R$ ${currentData.price || currentData.sale_price || 'Não informado'}
PREÇO ORIGINAL: R$ ${currentData.original_price || currentData.regular_price || 'Não informado'}
CUSTO: R$ ${currentData.cost || currentData.cost_price || 'Não informado'}

INSTRUÇÕES:
1. Sugira preço competitivo baseado no tipo de produto
2. Sugira preço "De/Por" se aplicável
3. Sugira estimativa de custo se não informado
4. Foque em rentabilidade e competitividade

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "price",
      "label": "Preço de Venda",
      "currentValue": "${currentData.price || ''}",
      "suggestedValue": "49.90",
      "confidence": 75,
      "reasoning": "Preço competitivo para o tipo de produto",
      "source": "ai",
      "category": "pricing"
    }
  ]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 1500,
			temperature: 0.7,
			messages: [{ role: 'user', content: prompt }]
		});

		const result = parseAIResponse(response.choices[0].message.content);
		console.log(`💰 Preços: ${result.length} sugestões`);
		return result;
	} catch (error) {
		console.error('❌ Erro nos preços:', error);
		
		// Verificar se é erro de quota/saldo
		if (isQuotaExceededError(error)) {
			throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
		}
		
		return [];
	}
}

// 📦 7. ENRIQUECIMENTO DE ESTOQUE - REMOVIDO
// Campos de estoque (quantity, low_stock_alert) são operacionais e não devem ter IA
// Apenas stock_location mantém IA para sugerir localização no galpão

// 🖼️ 8. MÍDIA NÃO UTILIZA IA - REMOVIDA INTENCIONALMENTE

// 🎨 9. VARIAÇÕES INTELIGENTES
async function suggestProductVariations(currentData: any, openai: OpenAI): Promise<Suggestion[]> {
	try {
		const prompt = `Você é um especialista em estruturação de variações de produtos para e-commerce. Analise este produto e determine se deveria ter variações:

PRODUTO: ${currentData.name}
DESCRIÇÃO: ${currentData.description || 'Não informado'}

INSTRUÇÕES:
1. Determine se o produto DEVERIA ter variações (has_variants: true/false)
2. Se SIM, sugira as OPÇÕES (cor, tamanho, etc.)
3. Se SIM, sugira exemplos de VARIANTES específicas
4. Seja realista baseado no tipo de produto

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "has_variants",
      "label": "Produto com Variações",
      "currentValue": ${currentData.has_variants || false},
      "suggestedValue": true,
      "confidence": 85,
      "reasoning": "Este tipo de produto costuma ter variações",
      "source": "ai",
      "category": "variants"
    },
    {
      "field": "product_options",
      "label": "Opções do Produto",
      "currentValue": {},
      "suggestedValue": {"Cor": ["Azul", "Rosa", "Branco"], "Tamanho": ["P", "M", "G"]},
      "confidence": 80,
      "reasoning": "Opções típicas para este tipo de produto",
      "source": "ai",
      "category": "variants"
    },
    {
      "field": "product_variants",
      "label": "Variantes do Produto",
      "currentValue": [],
      "suggestedValue": [{"sku": "PROD-AZ-P", "options": {"Cor": "Azul", "Tamanho": "P"}, "price": 49.90}],
      "confidence": 75,
      "reasoning": "Exemplo de variantes baseado nas opções",
      "source": "ai",
      "category": "variants"
    }
  ]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 1500,
			temperature: 0.7,
			messages: [{ role: 'user', content: prompt }]
		});

		const result = parseAIResponse(response.choices[0].message.content);
		console.log(`🎨 Variações: ${result.length} sugestões`);
		return result;
	} catch (error) {
		console.error('❌ Erro nas variações:', error);
		
		// Verificar se é erro de quota/saldo
		if (isQuotaExceededError(error)) {
			throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
		}
		
		return [];
	}
}

// 🔍 10. BUSCA DE PRODUTOS SIMILARES  
async function suggestVariationsFromSimilarProducts(currentData: any, platform: any): Promise<Suggestion[]> {
	try {
		if (!currentData.id) {
			console.log('ℹ️ Produto sem ID, pulando busca de variações');
			return [];
		}

		console.log('🔍 Buscando produtos similares para variações...');
		
		// Usar sistema existente otimizado
		const db = getDatabase(platform);
		const similarProductsResult = await findSimilarProductsOptimized(currentData, db);
		await db.close();

		if (!similarProductsResult || similarProductsResult.length === 0) {
			console.log('ℹ️ Nenhum produto similar encontrado');
			return [];
		}

		// Se encontrou produtos similares, criar sugestão
		const suggestion: Suggestion = {
			field: 'similar_products_suggestion',
			label: 'Produtos Similares',
			currentValue: currentData.related_products || [],
			suggestedValue: similarProductsResult.slice(0, 5).map((p: any) => ({
				id: p.id,
				name: p.name,
				sku: p.sku,
				price: p.price,
				difference: 'Produto similar identificado'
			})),
			confidence: 80,
			reasoning: `Encontrados ${similarProductsResult.length} produtos similares que podem ser relacionados`,
			source: 'similar_products',
			category: 'variants'
		};

		console.log(`🎨 Variações: 1 sugestão com ${similarProductsResult.length} produtos`);
		return [suggestion];
	} catch (error) {
		console.error('❌ Erro nas variações:', error);
		return [];
	}
}

// 🧮 8. ENRIQUECIMENTO DE CAMPOS VIRTUAIS
async function enrichVirtualFields(currentData: any, openai: OpenAI): Promise<Suggestion[]> {
	try {
		// Buscar campos virtuais habilitados para IA
		const virtualFields = await virtualFieldService.getVirtualFields({
			entity_type: 'products',
			ai_enabled: true,
			is_active: true
		});

		if (virtualFields.length === 0) {
			console.log('📊 Nenhum campo virtual com IA encontrado');
			return [];
		}

		console.log(`📊 Analisando ${virtualFields.length} campos virtuais com IA`);
		
		const suggestions: Suggestion[] = [];
		
		// Processar cada campo virtual
		for (const virtualField of virtualFields) {
			try {
				// Calcular valor atual do campo virtual
				const currentResult = await virtualFieldService.calculateVirtualField(
					virtualField.name,
					currentData
				);

				// Se não conseguiu calcular ou prompt não existe, pular
				if (!virtualField.ai_prompt || !virtualField.ai_prompt.trim()) {
					continue;
				}

				// Criar prompt específico para este campo virtual
				const prompt = `${virtualField.ai_prompt}

PRODUTO ATUAL:
Nome: ${currentData.name}
Descrição: ${currentData.description || 'Não informado'}
Preço: R$ ${currentData.price || 'Não informado'}
Custo: R$ ${currentData.cost || 'Não informado'}
Estoque: ${currentData.quantity || 'Não informado'}
Categoria: ${currentData.category_name || 'Não informado'}

DADOS PARA CÁLCULO:
${Object.entries(currentData).map(([key, value]) => `${key}: ${value}`).join('\n')}

VALOR ATUAL CALCULADO: ${currentResult.formatted_value || 'Erro no cálculo'}

INSTRUÇÕES:
1. Analise o produto e os dados disponíveis
2. Sugira um valor otimizado para o campo "${virtualField.display_name}"
3. Explique claramente o raciocínio da sugestão
4. Considere as melhores práticas de e-commerce

RETORNE APENAS JSON:
{
  "field": "${virtualField.name}",
  "label": "${virtualField.display_name}",
  "currentValue": "${currentResult.value || ''}",
  "suggestedValue": "VALOR_SUGERIDO_AQUI",
  "confidence": 85,
  "reasoning": "Explicação detalhada da sugestão",
  "source": "ai",
  "category": "virtual"
}`;

				const response = await openai.chat.completions.create({
					model: 'gpt-4-1106-preview',
					max_tokens: 500,
					temperature: 0.7,
					messages: [{ role: 'user', content: prompt }]
				});

				const content = response.choices[0].message.content;
				if (content) {
					try {
						const aiSuggestion = JSON.parse(content);
						
						// Validar e formatar a sugestão
						if (aiSuggestion.field && aiSuggestion.suggestedValue !== undefined) {
							suggestions.push({
								field: aiSuggestion.field,
								label: aiSuggestion.label || virtualField.display_name,
								currentValue: currentResult.formatted_value || currentResult.value,
								suggestedValue: aiSuggestion.suggestedValue,
								confidence: aiSuggestion.confidence || 75,
								reasoning: aiSuggestion.reasoning || 'Sugestão da IA para campo virtual',
								source: 'ai',
								category: 'virtual'
							});
						}
					} catch (parseError) {
						console.error(`❌ Erro ao parsear resposta IA para ${virtualField.name}:`, parseError);
					}
				}

			} catch (fieldError) {
				console.error(`❌ Erro ao processar campo virtual ${virtualField.name}:`, fieldError);
				
				// Verificar se é erro de quota/saldo
				if (isQuotaExceededError(fieldError)) {
					throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
				}
			}
		}

		console.log(`📊 Campos virtuais: ${suggestions.length} sugestões geradas`);
		return suggestions;

	} catch (error) {
		console.error('❌ Erro geral nos campos virtuais:', error);
		
		// Verificar se é erro de quota/saldo
		if (isQuotaExceededError(error)) {
			throw new AIQuotaExceededError('Não há saldo suficiente na conta da IA para processar esta solicitação. Verifique seu plano e dados de cobrança.');
		}
		
		return [];
	}
}

// 🔧 FUNÇÃO AUXILIAR: Parse das respostas da IA
function parseAIResponse(content: string | null): Suggestion[] {
	if (!content) {
		console.log('⚠️ Resposta vazia do ChatGPT');
		return [];
	}
	
	console.log('📝 Resposta bruta do ChatGPT:', content.substring(0, 500) + '...');
	
	try {
		// Limpar markdown e caracteres extras
		let cleaned = content
			.replace(/```json\n?|\n?```/g, '')
			.replace(/```\n?|\n?```/g, '')
			.trim();
		
		// Remover caracteres de controle
		cleaned = cleaned
			.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n')
			.replace(/\t/g, ' ');
		
		// Procurar por JSON válido na resposta
		let jsonStart = cleaned.indexOf('{');
		let jsonEnd = cleaned.lastIndexOf('}');
		
		if (jsonStart === -1 || jsonEnd === -1) {
			console.log('❌ JSON não encontrado na resposta');
			return [];
		}
		
		cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
		console.log('🔧 JSON limpo:', cleaned.substring(0, 300) + '...');
		
		const parsed = JSON.parse(cleaned);
		const suggestions = parsed.suggestions || [];
		
		console.log(`✅ Parse realizado: ${suggestions.length} sugestões encontradas`);
		
		// 🔧 MAPEAR CATEGORIAS PARA AS ABAS CORRETAS
		const mappedSuggestions = suggestions.map((suggestion: any) => {
			// Mapear categorias incorretas para as abas existentes
			let category = suggestion.category;
			
			// Mapeamentos de correção
			const categoryMap: Record<string, string> = {
				'cost_estimation': 'pricing',
				'technicalSpecifications': 'attributes',
				'manufacturing': 'advanced',
				'product_info': 'advanced', 
				'tax': 'advanced',
				'category': 'basic',
				'advanced': 'advanced'
			};
			
			if (categoryMap[category]) {
				category = categoryMap[category];
			}
			
			// Garantir que só existem categorias válidas
			const validCategories = ['basic', 'pricing', 'attributes', 'variants', 'media', 'shipping', 'seo', 'inventory', 'advanced'];
			if (!validCategories.includes(category)) {
				console.log(`⚠️ Categoria inválida "${category}" - usando "advanced"`);
				category = 'advanced'; // Default fallback
			}
			
			return {
				...suggestion,
				category,
				source: 'ai'
			};
		});
		
		console.log('📊 Sugestões por categoria:', {
			basic: mappedSuggestions.filter((s: Suggestion) => s.category === 'basic').length,
			seo: mappedSuggestions.filter((s: Suggestion) => s.category === 'seo').length,
			pricing: mappedSuggestions.filter((s: Suggestion) => s.category === 'pricing').length,
			attributes: mappedSuggestions.filter((s: Suggestion) => s.category === 'attributes').length,
			shipping: mappedSuggestions.filter((s: Suggestion) => s.category === 'shipping').length,
			inventory: mappedSuggestions.filter((s: Suggestion) => s.category === 'inventory').length,
			advanced: mappedSuggestions.filter((s: Suggestion) => s.category === 'advanced').length
		});
		
		return mappedSuggestions;
	} catch (error) {
		console.error('❌ Erro ao fazer parse da resposta IA:', error);
		console.error('📝 Conteúdo que causou erro:', content.substring(0, 1000));
		return [];
	}
}

// 🔍 BUSCA OTIMIZADA DE PRODUTOS SIMILARES (critérios rigorosos)
async function findSimilarProductsOptimized(currentProduct: any, db: any) {
	try {
		// Implementar busca rigorosa baseada nos critérios definidos
		const query = `
			WITH base_product AS (
				SELECT name, brand_id, price, weight, height, width, length, 
					   (SELECT category_id FROM product_categories WHERE product_id = $1 AND is_primary = true LIMIT 1) as category_id
				FROM products WHERE id = $1::uuid
			),
			similar_candidates AS (
				SELECT p.id, p.name, p.sku, p.price, p.brand_id,
					-- Score rigoroso baseado nos critérios definidos
					CASE 
						WHEN similarity(p.name, bp.name) > 0.7 THEN 40
						WHEN p.name ILIKE '%' || bp.name || '%' THEN 30
						ELSE 0
					END +
					CASE WHEN p.brand_id = bp.brand_id THEN 30 ELSE -50 END +
					CASE WHEN (SELECT category_id FROM product_categories WHERE product_id = p.id AND is_primary = true LIMIT 1) = bp.category_id THEN 20 ELSE -30 END +
					CASE 
						WHEN bp.price > 0 AND ABS(p.price - bp.price) / bp.price <= 0.10 THEN 15
						ELSE -20 
					END as total_score
				FROM products p
				CROSS JOIN base_product bp
				WHERE p.id != $1::uuid 
					AND p.is_active = true
					AND p.brand_id = bp.brand_id  -- Marca obrigatória igual
			)
			SELECT * FROM similar_candidates 
			WHERE total_score >= 50  -- Score mínimo rigoroso
			ORDER BY total_score DESC
			LIMIT 10`;
		
		const result = await db.query(query, [currentProduct.id]);
		console.log(`🔍 Busca otimizada encontrou ${result?.length || 0} produtos similares`);
		return result || [];
	} catch (error) {
		console.error('❌ Erro na busca otimizada:', error);
		return [];
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		console.log('🤖 Iniciando análise com IA...');
		const { currentData } = await request.json();
		
		// Buscar dados necessários do banco
		const db = getDatabase();
		
		// Buscar categorias e marcas para enriquecimento
		const [categoriesResult, brandsResult] = await Promise.all([
			db.query('SELECT id, name, slug FROM categories WHERE is_active = true ORDER BY name LIMIT 100'),
			db.query('SELECT id, name, slug FROM brands WHERE is_active = true ORDER BY name LIMIT 50')
		]);
		
		const categories = categoriesResult || [];
		const brands = brandsResult || [];
		
		console.log(`📊 Dados carregados: ${categories.length} categorias, ${brands.length} marcas`);
		
		// FAZER CHAMADAS REAIS PARA O CHATGPT
		console.log('🔄 Fazendo chamadas para ChatGPT...');
		
		const allSuggestions = await Promise.all([
			enrichBasicContent(currentData, openai),
			enrichSEOContent(currentData, openai),
			suggestCategoriesIntelligent(currentData, categories, brands, openai),
			enrichAttributes(currentData, openai),
			enrichDimensionsAndAdvanced(currentData, openai),
			enrichPricing(currentData, openai),
			suggestProductVariations(currentData, openai),
			suggestVariationsFromSimilarProducts(currentData, null),
			enrichVirtualFields(currentData, openai)
			// enrichInventory removido - campos de estoque não devem ter IA
		]);

		// Combinar todas as sugestões
		const suggestions = allSuggestions.flat();
		
		console.log(`✅ Análise IA concluída: ${suggestions.length} sugestões geradas`);
		console.log(`📝 Distribuição por categoria:`, {
			basic: suggestions.filter((s: Suggestion) => s.category === 'basic').length,
			seo: suggestions.filter((s: Suggestion) => s.category === 'seo').length,
			pricing: suggestions.filter((s: Suggestion) => s.category === 'pricing').length,
			attributes: suggestions.filter((s: Suggestion) => s.category === 'attributes').length,
			shipping: suggestions.filter((s: Suggestion) => s.category === 'shipping').length,
			variants: suggestions.filter((s: Suggestion) => s.category === 'variants').length,
			inventory: suggestions.filter((s: Suggestion) => s.category === 'inventory').length,
			advanced: suggestions.filter((s: Suggestion) => s.category === 'advanced').length,
			virtual: suggestions.filter((s: Suggestion) => s.category === 'virtual').length
		});
		
		// 🆕 CRIAR SESSÃO DE APROVAÇÃO
		console.log('📋 Criando sessão de aprovação...');
		
		try {
			// Converter suggestions para formato de criação
			const suggestionData = suggestions.map(s => ({
				field_name: s.field,
				field_label: s.label,
				current_value: s.currentValue,
				suggested_value: s.suggestedValue,
				confidence: s.confidence,
				reasoning: s.reasoning,
				source: s.source,
				category: s.category,
				extra_info: s.extra_info || {}
			}));
			
			// TODO: Buscar userId do contexto de autenticação
			const userId = 'current-user-id'; // Placeholder
			
			const session = await aiApprovalService.createSession({
				entity_type: 'products',
				entity_id: currentData.id || 'unknown',
				suggestions: suggestionData,
				analysis_data: {
					product_name: currentData.name,
					analysis_timestamp: new Date().toISOString(),
					total_suggestions: suggestions.length
				}
			}, userId);
			
			console.log(`✅ Sessão de aprovação criada: ${session.id}`);
			
			return json({
				success: true,
				suggestions,
				approval_session: {
					id: session.id,
					status: session.status,
					total_suggestions: session.total_suggestions,
					pending_suggestions: session.pending_suggestions,
					auto_approved: session.approved_suggestions
				}
			});
			
		} catch (approvalError) {
			console.error('❌ Erro ao criar sessão de aprovação:', approvalError);
			
			// Retornar sugestões normalmente mesmo se aprovação falhar
			return json({
				success: true,
				suggestions,
				approval_session: null,
				warning: 'Sugestões geradas mas sistema de aprovação falhou'
			});
		}
		
	} catch (error) {
		console.error('❌ Erro na análise IA:', error);
		
		// Verificar se é erro de quota/saldo da IA
		if (error instanceof AIQuotaExceededError) {
			return json({
				success: false,
				error: 'Saldo insuficiente na IA',
				message: error.message,
				userMessage: '💳 Não há saldo suficiente na conta da IA para processar esta solicitação. Entre em contato com o administrador para verificar o plano e dados de cobrança da OpenAI.'
			}, { status: 429 });
		}
		
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
};

async function generateAISuggestions(data: any) {
	// Simular delay da IA
	await new Promise(resolve => setTimeout(resolve, 1000));
	
	const suggestions = [];
	
	// 1. SUGESTÕES BÁSICAS (basic)
	if (data.name) {
		// Otimizar nome
		const optimizedName = `${data.name} - Premium Quality`;
		suggestions.push({
			field: 'name',
			label: 'Nome do Produto',
			currentValue: data.name,
			suggestedValue: optimizedName,
			confidence: 85,
			reasoning: 'Adicionado "Premium Quality" para melhorar percepção de valor',
			category: 'basic'
		});
		
		// SKU profissional
		const sku = generateSKU(data.name);
		suggestions.push({
			field: 'sku',
			label: 'SKU do Produto',
			currentValue: data.sku || '',
			suggestedValue: sku,
			confidence: 80,
			reasoning: 'SKU gerado baseado no nome do produto para organização do estoque',
			category: 'basic'
		});
		
		// Modelo específico
		const model = extractModel(data.name);
		if (model) {
			suggestions.push({
				field: 'model',
				label: 'Modelo do Produto',
				currentValue: data.model || '',
				suggestedValue: model,
				confidence: 75,
				reasoning: 'Modelo específico extraído do nome do produto',
				category: 'basic'
			});
		}
	}
	
	// Sugestões de descrição expandida
	if (data.description && data.description.length < 200) {
		const enhancedDescription = `${data.description}\n\n✅ Produto de alta qualidade\n✅ Entrega rápida e segura\n✅ Garantia estendida\n✅ Suporte técnico especializado\n✅ Satisfação garantida ou dinheiro de volta`;
		suggestions.push({
			field: 'description',
			label: 'Descrição Completa',
			currentValue: data.description,
			suggestedValue: enhancedDescription,
			confidence: 85,
			reasoning: 'Descrição expandida com benefícios e características destacadas para aumentar conversão',
			category: 'basic'
		});
	}
	
	// Descrição curta comercial
	if (!data.short_description || data.short_description.length < 50) {
		const shortDesc = generateShortDescription(data.name);
		suggestions.push({
			field: 'short_description',
			label: 'Descrição Resumida',
			currentValue: data.short_description || '',
			suggestedValue: shortDesc,
			confidence: 80,
			reasoning: 'Descrição resumida comercial para listagens de produtos',
			category: 'basic'
		});
	}
	
	// Tags para busca
	const suggestedTags = generateTags(data.name);
	suggestions.push({
		field: 'tags',
		label: 'Tags de Busca',
		currentValue: data.tags || '',
		suggestedValue: suggestedTags,
		confidence: 75,
		reasoning: 'Tags estratégicas para melhorar encontrabilidade do produto',
		category: 'basic'
	});
	
	// 2. SUGESTÕES SEO (seo)
	if (data.name) {
		// Meta title
		const metaTitle = `${data.name} | Compre Online com Frete Grátis - Grão de Gente`;
		suggestions.push({
			field: 'meta_title',
			label: 'Título SEO',
			currentValue: data.meta_title || '',
			suggestedValue: metaTitle,
			confidence: 90,
			reasoning: 'Título otimizado para SEO com palavras-chave relevantes e marca',
			category: 'seo'
		});
		
		// Meta description
		const metaDescription = `Compre ${data.name} com os melhores preços e frete grátis. Qualidade garantida, entrega rápida e atendimento especializado. Aproveite!`;
		suggestions.push({
			field: 'meta_description',
			label: 'Descrição SEO',
			currentValue: data.meta_description || '',
			suggestedValue: metaDescription,
			confidence: 88,
			reasoning: 'Descrição otimizada para mecanismos de busca com call-to-action',
			category: 'seo'
		});
		
		// Meta keywords
		const keywords = generateMetaKeywords(data.name);
		suggestions.push({
			field: 'meta_keywords',
			label: 'Palavras-chave SEO',
			currentValue: data.meta_keywords || '',
			suggestedValue: keywords,
			confidence: 75,
			reasoning: 'Palavras-chave estratégicas para SEO e busca orgânica',
			category: 'seo'
		});
		
		// Robots meta
		suggestions.push({
			field: 'robots_meta',
			label: 'Robots Meta',
			currentValue: data.robots_meta || '',
			suggestedValue: 'index,follow',
			confidence: 95,
			reasoning: 'Permitir indexação do produto pelos mecanismos de busca',
			category: 'seo'
		});
		
		// Open Graph title
		const ogTitle = `${data.name} - Grão de Gente`;
		suggestions.push({
			field: 'og_title',
			label: 'Open Graph Título',
			currentValue: data.og_title || '',
			suggestedValue: ogTitle,
			confidence: 85,
			reasoning: 'Título otimizado para compartilhamento em redes sociais',
			category: 'seo'
		});
		
		// Open Graph description
		const ogDescription = `Descubra o ${data.name} na Grão de Gente. Qualidade premium, preços justos e entrega garantida.`;
		suggestions.push({
			field: 'og_description',
			label: 'Open Graph Descrição',
			currentValue: data.og_description || '',
			suggestedValue: ogDescription,
			confidence: 85,
			reasoning: 'Descrição otimizada para compartilhamento em redes sociais',
			category: 'seo'
		});
	}
	
	// 3. SUGESTÕES DE PREÇOS (pricing)
	if (data.price && !data.sale_price) {
		const salePrice = Math.round(data.price * 0.9 * 100) / 100;
		suggestions.push({
			field: 'sale_price',
			label: 'Preço Promocional',
			currentValue: data.sale_price || null,
			suggestedValue: salePrice,
			confidence: 70,
			reasoning: 'Preço promocional de 10% de desconto para aumentar conversões',
			category: 'pricing'
		});
	}
	
	if (data.price && !data.cost_price) {
		const costPrice = Math.round(data.price * 0.6 * 100) / 100;
		suggestions.push({
			field: 'cost_price',
			label: 'Preço de Custo',
			currentValue: data.cost_price || null,
			suggestedValue: costPrice,
			confidence: 60,
			reasoning: 'Preço de custo estimado em 60% do preço de venda para controle de margem',
			category: 'pricing'
		});
	}
	
	// 4. SUGESTÕES DE ATRIBUTOS (attributes)
	if (!data.attributes || Object.keys(data.attributes).length < 3) {
		const suggestedAttributes = generateAttributes(data.name);
		suggestions.push({
			field: 'attributes',
			label: 'Atributos para Filtros',
			currentValue: data.attributes || {},
			suggestedValue: { ...data.attributes, ...suggestedAttributes },
			confidence: 80,
			reasoning: 'Atributos essenciais para melhorar filtros da loja e informações do produto',
			category: 'attributes'
		});
	}
	
	// Especificações técnicas
	const specifications = generateSpecifications(data.name);
	suggestions.push({
		field: 'specifications',
		label: 'Especificações Técnicas',
		currentValue: data.specifications || {},
		suggestedValue: specifications,
		confidence: 75,
		reasoning: 'Especificações técnicas detalhadas para informar melhor o consumidor',
		category: 'attributes'
	});
	
	// 5. SUGESTÕES DE ESTOQUE (inventory) - REMOVIDO: quantity e low_stock_alert não devem ter IA
	// Campos de estoque são operacionais e devem ser definidos pelo lojista
	
	// 6. SUGESTÕES DE FRETE (shipping)
	if (!data.weight || data.weight === 0) {
		const estimatedWeight = estimateWeight(data.name);
		suggestions.push({
			field: 'weight',
			label: 'Peso do Produto',
			currentValue: data.weight || 0,
			suggestedValue: estimatedWeight,
			confidence: 60,
			reasoning: 'Peso estimado baseado no tipo de produto para cálculo de frete',
			category: 'shipping'
		});
	}
	
	if (!data.height || data.height === 0) {
		const dimensions = estimateDimensions(data.name);
		suggestions.push({
			field: 'height',
			label: 'Altura da Embalagem',
			currentValue: data.height || 0,
			suggestedValue: dimensions.height,
			confidence: 55,
			reasoning: 'Altura estimada da embalagem para cálculo de frete',
			category: 'shipping'
		});
		
		suggestions.push({
			field: 'width',
			label: 'Largura da Embalagem',
			currentValue: data.width || 0,
			suggestedValue: dimensions.width,
			confidence: 55,
			reasoning: 'Largura estimada da embalagem para cálculo de frete',
			category: 'shipping'
		});
		
		suggestions.push({
			field: 'length',
			label: 'Comprimento da Embalagem',
			currentValue: data.length || 0,
			suggestedValue: dimensions.length,
			confidence: 55,
			reasoning: 'Comprimento estimado da embalagem para cálculo de frete',
			category: 'shipping'
		});
	}
	
	// 7. SUGESTÕES DE CATEGORIA (basic)
	if (!data.category_id && data.name) {
		const categoryGuess = guessCategory(data.name);
		if (categoryGuess) {
			suggestions.push({
				field: 'category_id',
				label: 'Categoria Principal',
				currentValue: data.category_id || null,
				suggestedValue: categoryGuess.id,
				confidence: 65,
				reasoning: `Categoria sugerida baseada no nome do produto: ${categoryGuess.name}`,
				category: 'basic'
			});
		}
	}
	
	return suggestions;
}

// Funções auxiliares para geração de sugestões
function generateSKU(productName: string): string {
	const cleanName = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
	const prefix = cleanName.substring(0, 3);
	const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
	return `${prefix}-${suffix}`;
}

function extractModel(productName: string): string | null {
	const name = productName.toLowerCase();
	
	// Padrões comuns de modelos
	const patterns = [
		/(\w+\s+\w+\s+\w+)(?:\s|$)/,  // Três palavras
		/(\w+\s+\w+)(?:\s|$)/,        // Duas palavras
		/(galaxy\s+s\d+)/i,           // Galaxy S24, etc.
		/(iphone\s+\d+)/i,            // iPhone 13, etc.
		/(air\s+max\s+\d+)/i          // Air Max 90, etc.
	];
	
	for (const pattern of patterns) {
		const match = name.match(pattern);
		if (match) {
			return match[1].trim();
		}
	}
	
	return null;
}

function generateShortDescription(productName: string): string {
	return `${productName} com qualidade premium e entrega garantida. Aproveite!`;
}

function generateTags(productName: string): string {
	const name = productName.toLowerCase();
	const tags = [];
	
	// Tags baseadas no nome
	const words = name.split(' ').filter(word => word.length > 2);
	tags.push(...words.slice(0, 3));
	
	// Tags genéricas
	tags.push('qualidade', 'premium', 'oferta', 'entrega rápida');
	
	return tags.join(', ');
}

function generateMetaKeywords(productName: string): string {
	const name = productName.toLowerCase();
	const keywords = [];
	
	// Palavras do produto
	const words = name.split(' ').filter(word => word.length > 2);
	keywords.push(...words.slice(0, 4));
	
	// Keywords SEO
	keywords.push('comprar', 'online', 'frete grátis', 'promoção', 'desconto', 'qualidade');
	
	return keywords.join(', ');
}

function generateAttributes(productName: string): any {
	const name = productName.toLowerCase();
	const attributes: any = {};
	
	// Atributos baseados no tipo de produto
	if (name.includes('notebook') || name.includes('computador')) {
		attributes['Tipo'] = 'Eletrônico';
		attributes['Categoria'] = 'Informática';
		attributes['Garantia'] = '12 meses';
	} else if (name.includes('roupa') || name.includes('camisa')) {
		attributes['Tipo'] = 'Vestuário';
		attributes['Material'] = 'Algodão';
		attributes['Tamanho'] = 'Único';
	} else {
		attributes['Material'] = 'Premium';
		attributes['Garantia'] = '12 meses';
		attributes['Origem'] = 'Nacional';
	}
	
	return attributes;
}

function generateSpecifications(productName: string): any {
	const name = productName.toLowerCase();
	const specs: any = {};
	
	// Especificações baseadas no tipo
	if (name.includes('notebook')) {
		specs['Processador'] = 'Intel Core i5';
		specs['Memória RAM'] = '8GB';
		specs['Armazenamento'] = '256GB SSD';
		specs['Tela'] = '15.6 polegadas';
	} else {
		specs['Dimensões'] = '30 x 20 x 10 cm';
		specs['Peso'] = '500g';
		specs['Material'] = 'Material premium';
		specs['Cor'] = 'Variada';
	}
	
	return specs;
}

function estimateWeight(productName: string): number {
	const name = productName.toLowerCase();
	
	if (name.includes('notebook') || name.includes('laptop')) return 2.5;
	if (name.includes('livro')) return 0.3;
	if (name.includes('roupa') || name.includes('camisa')) return 0.2;
	if (name.includes('brinquedo')) return 0.8;
	
	return 0.5; // Peso padrão
}

function estimateDimensions(productName: string): { height: number, width: number, length: number } {
	const name = productName.toLowerCase();
	
	if (name.includes('notebook') || name.includes('laptop')) {
		return { height: 5, width: 35, length: 25 };
	}
	if (name.includes('livro')) {
		return { height: 2, width: 15, length: 20 };
	}
	if (name.includes('roupa')) {
		return { height: 3, width: 30, length: 20 };
	}
	
	return { height: 10, width: 20, length: 15 }; // Dimensões padrão
}

function guessCategory(productName: string) {
	const name = productName.toLowerCase();
	
	const categoryMapping = [
		{ keywords: ['notebook', 'laptop', 'computador'], id: 'electronics', name: 'Eletrônicos' },
		{ keywords: ['camisa', 'camiseta', 'blusa', 'roupa'], id: 'clothing', name: 'Roupas' },
		{ keywords: ['livro', 'revista', 'literatura'], id: 'books', name: 'Livros' },
		{ keywords: ['jogo', 'brinquedo', 'toy'], id: 'toys', name: 'Brinquedos' },
		{ keywords: ['casa', 'decoração', 'móvel'], id: 'home', name: 'Casa e Decoração' }
	];
	
	for (const category of categoryMapping) {
		if (category.keywords.some(keyword => name.includes(keyword))) {
			return category;
		}
	}
	
	return null;
} 