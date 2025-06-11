import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { getDatabase } from '$lib/db';
import { getProcessedPrompt, getFallbackPrompt } from '$lib/services/aiPromptService';

// Inicializar OpenAI com a chave do ambiente
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

interface Suggestion {
	field: string;
	label: string;
	currentValue: any;
	suggestedValue: any;
	confidence: number;
	reasoning: string;
	source: 'ai' | 'similar_products' | 'category_template';
	category: 'basic' | 'pricing' | 'attributes' | 'variants' | 'media' | 'shipping' | 'seo' | 'inventory' | 'advanced';
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
3. Meta keywords (8-12 palavras estratégicas SEPARADAS POR VÍRGULAS como STRING)
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
		return [];
	}
}

// 📦 7. ENRIQUECIMENTO DE ESTOQUE
async function enrichInventory(currentData: any, openai: OpenAI): Promise<Suggestion[]> {
	try {
		const prompt = `Você é um especialista em gestão de estoque. Analise APENAS os dados de estoque deste produto:

PRODUTO: ${currentData.name}
ESTOQUE ATUAL: ${currentData.quantity || 'Não informado'}
ALERTA BAIXO: ${currentData.low_stock_alert || 'Não informado'}

INSTRUÇÕES:
1. Sugira quantidade inicial de estoque baseada no tipo de produto
2. Sugira nível de alerta de estoque baixo
3. Baseie-se no tipo e demanda esperada do produto

RETORNE APENAS JSON:
{
  "suggestions": [
    {
      "field": "quantity",
      "label": "Quantidade em Estoque",
      "currentValue": "${currentData.quantity || ''}",
      "suggestedValue": "50",
      "confidence": 70,
      "reasoning": "Quantidade inicial adequada para o tipo de produto",
      "source": "ai",
      "category": "inventory"
    }
  ]
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 1000,
			temperature: 0.7,
			messages: [{ role: 'user', content: prompt }]
		});

		const result = parseAIResponse(response.choices[0].message.content);
		console.log(`📦 Estoque: ${result.length} sugestões`);
		return result;
	} catch (error) {
		console.error('❌ Erro no estoque:', error);
		return [];
	}
}

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

// 🔧 FUNÇÃO AUXILIAR: Parse das respostas da IA
function parseAIResponse(content: string | null): Suggestion[] {
	if (!content) return [];
	
	try {
		// Limpar markdown
		let cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
		
		// Remover caracteres de controle
		cleaned = cleaned
			.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n')
			.replace(/\t/g, ' ');
		
		// Encontrar JSON válido
		const lastBraceIndex = cleaned.lastIndexOf('}');
		if (lastBraceIndex !== -1) {
			cleaned = cleaned.substring(0, lastBraceIndex + 1);
		}
		
		const parsed = JSON.parse(cleaned);
		const suggestions = parsed.suggestions || [];
		
		// 🔧 MAPEAR CATEGORIAS PARA AS ABAS CORRETAS
		return suggestions.map((suggestion: any) => {
			// Mapear categorias incorretas para as abas existentes
			let category = suggestion.category;
			
			// Mapeamentos de correção
			const categoryMap: Record<string, string> = {
				'cost_estimation': 'pricing',
				'technicalSpecifications': 'attributes',
				'manufacturing': 'advanced',
				'product_info': 'advanced', 
				'tax': 'advanced',
				'category': 'basic'
			};
			
			if (categoryMap[category]) {
				category = categoryMap[category];
			}
			
			// Garantir que só existem categorias válidas
			const validCategories = ['basic', 'pricing', 'attributes', 'variants', 'media', 'shipping', 'seo', 'inventory', 'advanced'];
			if (!validCategories.includes(category)) {
				category = 'advanced'; // Default fallback
			}
			
			return {
				...suggestion,
				category
			};
		});
	} catch (error) {
		console.error('❌ Erro ao fazer parse:', error);
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

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { currentData } = await request.json();
		
		if (!currentData) {
			return Response.json({ 
				success: false, 
				error: 'Dados do produto não fornecidos' 
			});
		}

		console.log('🤖 Iniciando análise IA completa...');
		
		// Carregar dados necessários
		const db = getDatabase(platform);
		const [categories, brands] = await Promise.all([
			db.query`SELECT id, name, slug FROM categories WHERE is_active = true`,
			db.query`SELECT id, name, slug FROM brands WHERE is_active = true`
		]);
		await db.close();
		
		// ✅ EXECUTAR TODAS AS ANÁLISES EM PARALELO
		const [
			basicSuggestions,
			seoSuggestions,
			categorySuggestions,
			attributesSuggestions,
			dimensionsSuggestions,
			variationsSuggestions,
			similarProductsSuggestions
		] = await Promise.all([
			enrichBasicContent(currentData, openai),
			enrichSEOContent(currentData, openai),
			suggestCategoriesIntelligent(currentData, categories, brands, openai),
			enrichAttributes(currentData, openai),
			enrichDimensionsAndAdvanced(currentData, openai),
			suggestProductVariations(currentData, openai),
			suggestVariationsFromSimilarProducts(currentData, platform)
		]);

		// Combinar todas as sugestões
		const allSuggestions = [
			...basicSuggestions,
			...seoSuggestions,
			...categorySuggestions,
			...attributesSuggestions,
			...dimensionsSuggestions,
			...variationsSuggestions,
			...similarProductsSuggestions
		];

		// 🔧 ENRIQUECER AS SUGESTÕES COM NOMES
		allSuggestions.forEach((suggestion: any) => {
			if (suggestion.field === 'category_id' && suggestion.suggestedValue) {
				const category = categories.find((c: any) => c.id === suggestion.suggestedValue);
				if (category) {
					suggestion.displayValue = `✅ ${category.name}`;
					suggestion.extra_info = {
						category_name: category.name,
						category_id: category.id
					};
				}
			}
			
			if (suggestion.field === 'brand_id' && suggestion.suggestedValue) {
				const brand = brands.find((b: any) => b.id === suggestion.suggestedValue);
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

		console.log(`✅ Análise completa: ${allSuggestions.length} sugestões geradas`);

		return Response.json({
			success: true,
			suggestions: allSuggestions,
			metadata: {
				totalSuggestions: allSuggestions.length,
				categoriesByType: allSuggestions.reduce((acc: any, s: any) => {
					acc[s.category] = (acc[s.category] || 0) + 1;
					return acc;
				}, {}),
				processingTime: Date.now(),
				// 🚫 REMOVIDAS as análises de preço e estoque
				excludedAnalysis: ['pricing', 'inventory']
			}
		});

	} catch (error: any) {
		console.error('❌ Erro na análise IA:', error);
		return Response.json({ 
			success: false, 
			error: error.message || 'Erro interno na análise IA' 
		});
	}
}; 