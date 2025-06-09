import { getDatabase } from '$lib/db';
import Handlebars from 'handlebars';

// Interface para o prompt processado
export interface ProcessedPrompt {
	template: string;
	variables: string[];
	expectedOutput: string;
	found: boolean;
}

// Interface para variáveis do prompt
export interface PromptVariables {
	[key: string]: any;
}

/**
 * Busca um prompt específico no banco de dados
 */
export async function getPrompt(
	name: string, 
	category: string = 'general',
	platform: any
): Promise<ProcessedPrompt> {
	try {
		const db = getDatabase(platform);
		
		// Buscar prompt específico da categoria primeiro
		let prompt = await db.query`
			SELECT prompt_template, variables, expected_output
			FROM ai_prompts 
			WHERE name = ${name} 
			AND category = ${category}
			AND is_active = true
		`;
		
		// Se não encontrar, buscar prompt geral
		if (prompt.length === 0) {
			prompt = await db.query`
				SELECT prompt_template, variables, expected_output
				FROM ai_prompts 
				WHERE name = ${name} 
				AND category = 'general'
				AND is_active = true
			`;
		}
		
		await db.close();
		
		if (prompt.length === 0) {
			console.warn(`⚠️ Prompt não encontrado: ${name} (${category})`);
			return {
				template: '',
				variables: [],
				expectedOutput: '',
				found: false
			};
		}
		
		const promptData = prompt[0];
		
		return {
			template: promptData.prompt_template,
			variables: Array.isArray(promptData.variables) 
				? promptData.variables 
				: JSON.parse(promptData.variables || '[]'),
			expectedOutput: promptData.expected_output || '',
			found: true
		};
		
	} catch (error) {
		console.error('❌ Erro ao buscar prompt:', error);
		return {
			template: '',
			variables: [],
			expectedOutput: '',
			found: false
		};
	}
}

/**
 * Processa um template de prompt substituindo variáveis com HANDLEBARS REAL
 */
export function processPromptTemplate(
	template: string, 
	variables: PromptVariables
): string {
	try {
		// 🔧 USAR HANDLEBARS REAL para processar {{#if}}, {{#each}}, etc.
		const compiledTemplate = Handlebars.compile(template);
		const processedTemplate = compiledTemplate(variables);
		
		// Log para debug
		console.log('🔄 Template processado com Handlebars:', {
			variables: Object.keys(variables),
			template_length: template.length,
			processed_length: processedTemplate.length
		});
		
		return processedTemplate;
		
	} catch (error) {
		console.error('❌ Erro ao processar template Handlebars:', error);
		
		// ⚠️ FALLBACK: Se der erro, tentar replace simples
		console.warn('🔄 Usando fallback com replace simples');
		let fallbackTemplate = template;
		
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`{{${key}}}`, 'g');
			const stringValue = value !== null && value !== undefined ? String(value) : '';
			fallbackTemplate = fallbackTemplate.replace(regex, stringValue);
		}
		
		return fallbackTemplate;
	}
}

/**
 * Determina a categoria apropriada baseada no produto/contexto
 */
export function getCategoryForProduct(productData: any): string {
	const category = productData.category?.toLowerCase() || '';
	
	// Mapear categorias do produto para categorias de prompt
	if (category.includes('bebê') || category.includes('infantil') || category.includes('criança')) {
		return 'baby';
	}
	
	if (category.includes('eletrônico') || category.includes('tecnologia') || category.includes('smartphone')) {
		return 'electronics';
	}
	
	if (category.includes('casa') || category.includes('decoração') || category.includes('móvel')) {
		return 'home';
	}
	
	if (category.includes('roupa') || category.includes('vestuário') || category.includes('moda')) {
		return 'fashion';
	}
	
	return 'general';
}

/**
 * Busca e processa um prompt completo
 */
export async function getProcessedPrompt(
	name: string,
	productData: any,
	additionalVariables: PromptVariables = {},
	platform: any
): Promise<{ prompt: string; found: boolean; expectedOutput: string }> {
	try {
		// Determinar categoria
		const category = getCategoryForProduct(productData);
		
		// Buscar prompt
		const promptData = await getPrompt(name, category, platform);
		
		if (!promptData.found) {
			console.error(`❌ Prompt '${name}' não encontrado para categoria '${category}'`);
			return {
				prompt: '',
				found: false,
				expectedOutput: ''
			};
		}
		
		// Preparar variáveis básicas do produto
		const productVariables: PromptVariables = {
			name: productData.name || 'Produto sem nome',
			price: productData.price || 0,
			cost: productData.cost || 0,
			category: productData.category || 'Sem categoria',
			brand: productData.brand || 'Sem marca',
			description: productData.description || 'Sem descrição',
			sku: productData.sku || '',
			...additionalVariables
		};
		
		// Processar template
		const processedPrompt = processPromptTemplate(promptData.template, productVariables);
		
		console.log(`✅ Prompt '${name}' processado para categoria '${category}'`);
		
		return {
			prompt: processedPrompt,
			found: true,
			expectedOutput: promptData.expectedOutput
		};
		
	} catch (error) {
		console.error('❌ Erro ao processar prompt:', error);
		return {
			prompt: '',
			found: false,
			expectedOutput: ''
		};
	}
}

/**
 * Fallback para prompts hardcoded (caso não encontre no banco)
 */
export function getFallbackPrompt(name: string, productData: any): string {
	const fallbacks: Record<string, string> = {
		attributes: `Analise este produto e sugira ATRIBUTOS PARA FILTROS na loja:

Nome: "${productData.name}"
Categoria: ${productData.category}
Preço: R$ ${productData.price}

Retorne APENAS um JSON no formato:
{
  "Cor": ["Azul", "Verde", "Rosa"],
  "Tamanho": ["Pequeno", "Médio", "Grande"],
  "Material": ["Algodão", "Poliéster"]
}`,

		specifications: `Analise este produto e sugira ESPECIFICAÇÕES TÉCNICAS:

Nome: "${productData.name}"
Categoria: ${productData.category}
Preço: R$ ${productData.price}

Retorne APENAS um JSON no formato:
{
  "Dimensões": "45 x 35 x 25 cm",
  "Peso": "3,5 kg",
  "Material": "100% Algodão",
  "Garantia": "12 meses"
}`,

		description: `Crie uma descrição completa (300-400 palavras) para:

Nome: "${productData.name}"
Categoria: ${productData.category}
Preço: R$ ${productData.price}

Use linguagem natural brasileira e seja específico sobre características.`,

		tags: `Liste 15-20 tags relevantes para: "${productData.name}"

Retorne apenas array JSON: ["tag1", "tag2", "tag3"]`,

		complete_enrichment: `Analise este produto e enriqueça TODOS os dados necessários para uma loja online completa:

PRODUTO ATUAL:
Nome: "${productData.name}"
Descrição: "${productData.description || 'Não informado'}"
Categoria: "${productData.category || 'Não definida'}"
Preço: R$ ${productData.price || '0.00'}
Marca: "${productData.brand || 'Não definida'}"

INSTRUÇÕES:
1. Categorize o produto corretamente
2. Crie descrição completa e atrativa (350-500 palavras)
3. Crie descrição curta para resumos (80-120 caracteres)
4. Crie meta description para SEO (150-160 caracteres)
5. Crie meta title otimizado (50-60 caracteres)
6. Sugira meta keywords (8-12 palavras-chave)
7. Defina atributos para filtros da loja
8. Crie especificações técnicas detalhadas

RETORNE APENAS JSON no formato exato:
{
  "category_id": "uuid-da-categoria-se-identificada-ou-null",
  "description": "Descrição completa e atrativa do produto...",
  "short_description": "Descrição resumida em até 120 caracteres",
  "meta_description": "Meta description para SEO (150-160 chars)",
  "meta_title": "Meta title otimizado (50-60 chars)",
  "meta_keywords": ["palavra1", "palavra2", "palavra3", "palavra4"],
  "attributes": {
    "Cor": ["Azul", "Verde"],
    "Tamanho": ["P", "M", "G"],
    "Material": ["Algodão"]
  },
  "specifications": {
    "Material": "100% Algodão",
    "Dimensões": "45 x 35 x 25 cm",
    "Peso": "2,5 kg",
    "Garantia": "12 meses",
    "Origem": "Nacional"
  }
}`
	};
	
	return fallbacks[name] || 'Prompt não disponível';
} 