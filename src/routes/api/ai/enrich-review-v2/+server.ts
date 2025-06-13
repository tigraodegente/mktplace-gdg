import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { getDatabase } from '$lib/db';

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

// 🔄 FUNÇÃO PARA BUSCAR E PROCESSAR PROMPTS DO BANCO
async function getPromptFromDatabase(promptName: string, currentData: any, categories: any[] = [], brands: any[] = []): Promise<string | null> {
	try {
		const db = getDatabase();
		
		// Buscar prompt específico da categoria geral
		const prompt = await db.query`
			SELECT prompt_template, variables
			FROM ai_prompts 
			WHERE name = ${promptName} 
			AND category = 'general'
			AND is_active = true
		`;
		
		if (prompt.length === 0) {
			console.warn(`⚠️ Prompt '${promptName}' não encontrado no banco`);
			return null;
		}
		
		const promptData = prompt[0];
		let processedTemplate = promptData.prompt_template;
		
		// 🔧 PROCESSAMENTO SIMPLES DE VARIÁVEIS (substituição básica)
		processedTemplate = processedTemplate.replace(/\{\{name\}\}/g, currentData.name || '');
		processedTemplate = processedTemplate.replace(/\{\{description\}\}/g, currentData.description || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{short_description\}\}/g, currentData.short_description || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{sku\}\}/g, currentData.sku || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{model\}\}/g, currentData.model || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{tags\}\}/g, Array.isArray(currentData.tags) ? currentData.tags.join(', ') : currentData.tags || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{meta_title\}\}/g, currentData.meta_title || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{meta_description\}\}/g, currentData.meta_description || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{meta_keywords\}\}/g, currentData.meta_keywords || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{robots_meta\}\}/g, currentData.robots_meta || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{og_title\}\}/g, currentData.og_title || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{og_description\}\}/g, currentData.og_description || 'Não informado');
		processedTemplate = processedTemplate.replace(/\{\{price\}\}/g, currentData.price || currentData.sale_price || '0');
		processedTemplate = processedTemplate.replace(/\{\{category\}\}/g, currentData.category || 'Sem categoria');
		
		// 🔧 PROCESSAMENTO ESPECIAL PARA LISTAS (categories e brands)
		if (categories.length > 0) {
			const categoriesList = categories.slice(0, 50).map(c => `- ${c.name} (ID: ${c.id})`).join('\n');
			processedTemplate = processedTemplate.replace(/\{\{#each categories\}\}[\s\S]*?\{\{\/each\}\}/g, categoriesList);
		}
		
		if (brands.length > 0) {
			const brandsList = brands.slice(0, 20).map(b => `- ${b.name} (ID: ${b.id})`).join('\n');
			processedTemplate = processedTemplate.replace(/\{\{#each brands\}\}[\s\S]*?\{\{\/each\}\}/g, brandsList);
		}
		
		console.log(`✅ Prompt '${promptName}' carregado do banco com sucesso`);
		return processedTemplate;
		
	} catch (error) {
		console.error(`❌ Erro ao buscar prompt '${promptName}' do banco:`, error);
		return null;
	}
}

// 🔍 FUNÇÃO PARA PARSEAR RESPOSTA DA IA
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
		
		return suggestions.map((suggestion: any) => ({
			field: suggestion.field,
			label: suggestion.label,
			currentValue: suggestion.currentValue,
			suggestedValue: suggestion.suggestedValue,
			confidence: suggestion.confidence || 70,
			reasoning: suggestion.reasoning || '',
			source: suggestion.source || 'ai',
			category: suggestion.category || 'basic',
			displayValue: suggestion.displayValue,
			extra_info: suggestion.extra_info
		}));
		
	} catch (error) {
		console.error('❌ Erro ao parsear resposta da IA:', error);
		return [];
	}
}

// 🚀 NOVA FUNÇÃO PRINCIPAL QUE USA PROMPTS DO BANCO
async function generateAISuggestionsFromDatabase(currentData: any, categories: any[], brands: any[]): Promise<Suggestion[]> {
	const allSuggestions: Suggestion[] = [];
	
	console.log('🤖 Iniciando geração de sugestões usando prompts do banco...');
	
	try {
		// 1. 📝 ENRIQUECIMENTO DE CONTEÚDO BÁSICO
		console.log('📝 Processando: enrich_basic_content');
		const basicPrompt = await getPromptFromDatabase('enrich_basic_content', currentData);
		if (basicPrompt) {
			const basicResponse = await openai.chat.completions.create({
				model: 'gpt-4-1106-preview',
				max_tokens: 2000,
				temperature: 0.7,
				messages: [{ role: 'user', content: basicPrompt }]
			});
			const basicSuggestions = parseAIResponse(basicResponse.choices[0].message.content);
			allSuggestions.push(...basicSuggestions);
			console.log(`✅ Basic: ${basicSuggestions.length} sugestões`);
		}
		
		// 2. 🔍 ENRIQUECIMENTO SEO
		console.log('🔍 Processando: enrich_seo_content');
		const seoPrompt = await getPromptFromDatabase('enrich_seo_content', currentData);
		if (seoPrompt) {
			const seoResponse = await openai.chat.completions.create({
				model: 'gpt-4-1106-preview',
				max_tokens: 2000,
				temperature: 0.3,
				messages: [{ role: 'user', content: seoPrompt }]
			});
			const seoSuggestions = parseAIResponse(seoResponse.choices[0].message.content);
			allSuggestions.push(...seoSuggestions);
			console.log(`✅ SEO: ${seoSuggestions.length} sugestões`);
		}
		
		// 3. 📂 CATEGORIZAÇÃO INTELIGENTE
		console.log('📂 Processando: suggest_categories_intelligent');
		const categoryPrompt = await getPromptFromDatabase('suggest_categories_intelligent', currentData, categories, brands);
		if (categoryPrompt) {
			const categoryResponse = await openai.chat.completions.create({
				model: 'gpt-4-1106-preview',
				max_tokens: 1000,
				temperature: 0.7,
				messages: [{ role: 'user', content: categoryPrompt }]
			});
			const categorySuggestions = parseAIResponse(categoryResponse.choices[0].message.content);
			
			// 🔧 ENRIQUECER SUGESTÕES COM NOMES
			categorySuggestions.forEach((suggestion: any) => {
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
					}
				}
			});
			
			allSuggestions.push(...categorySuggestions);
			console.log(`✅ Categorização: ${categorySuggestions.length} sugestões`);
		}
		
		// 4. ⚙️ ATRIBUTOS E ESPECIFICAÇÕES
		console.log('⚙️ Processando: enrich_attributes');
		const attributesPrompt = await getPromptFromDatabase('enrich_attributes', currentData);
		if (attributesPrompt) {
			const attributesResponse = await openai.chat.completions.create({
				model: 'gpt-4-1106-preview',
				max_tokens: 1500,
				temperature: 0.7,
				messages: [{ role: 'user', content: attributesPrompt }]
			});
			const attributesSuggestions = parseAIResponse(attributesResponse.choices[0].message.content);
			allSuggestions.push(...attributesSuggestions);
			console.log(`✅ Atributos: ${attributesSuggestions.length} sugestões`);
		}
		
		// 5. 📏 DIMENSÕES E DADOS AVANÇADOS
		console.log('📏 Processando: enrich_dimensions_advanced');
		const dimensionsPrompt = await getPromptFromDatabase('enrich_dimensions_advanced', currentData);
		if (dimensionsPrompt) {
			const dimensionsResponse = await openai.chat.completions.create({
				model: 'gpt-4-1106-preview',
				max_tokens: 1500,
				temperature: 0.7,
				messages: [{ role: 'user', content: dimensionsPrompt }]
			});
			const dimensionsSuggestions = parseAIResponse(dimensionsResponse.choices[0].message.content);
			allSuggestions.push(...dimensionsSuggestions);
			console.log(`✅ Dimensões: ${dimensionsSuggestions.length} sugestões`);
		}
		
		// 6. 📦 ESTOQUE E INVENTÁRIO
		console.log('📦 Processando: enrich_inventory');
		const inventoryPrompt = await getPromptFromDatabase('enrich_inventory', currentData);
		if (inventoryPrompt) {
			const inventoryResponse = await openai.chat.completions.create({
				model: 'gpt-4-1106-preview',
				max_tokens: 1000,
				temperature: 0.7,
				messages: [{ role: 'user', content: inventoryPrompt }]
			});
			const inventorySuggestions = parseAIResponse(inventoryResponse.choices[0].message.content);
			allSuggestions.push(...inventorySuggestions);
			console.log(`✅ Inventário: ${inventorySuggestions.length} sugestões`);
		}
		
		console.log(`🎯 Total de sugestões geradas: ${allSuggestions.length}`);
		
		// 📊 LOG DA DISTRIBUIÇÃO POR CATEGORIA
		console.log('📊 Distribuição por categoria:', {
			basic: allSuggestions.filter((s: Suggestion) => s.category === 'basic').length,
			seo: allSuggestions.filter((s: Suggestion) => s.category === 'seo').length,
			attributes: allSuggestions.filter((s: Suggestion) => s.category === 'attributes').length,
			shipping: allSuggestions.filter((s: Suggestion) => s.category === 'shipping').length,
			inventory: allSuggestions.filter((s: Suggestion) => s.category === 'inventory').length,
			advanced: allSuggestions.filter((s: Suggestion) => s.category === 'advanced').length
		});
		
		return allSuggestions;
		
	} catch (error) {
		console.error('❌ Erro na geração de sugestões:', error);
		return [];
	}
}

// 🎯 ENDPOINT PRINCIPAL
export const POST: RequestHandler = async ({ request }) => {
	try {
		console.log('🤖 V2: Iniciando análise com IA usando prompts do banco...');
		const { currentData } = await request.json();
		
		// Buscar dados necessários do banco
		const db = getDatabase();
		
		// Buscar categorias e marcas para enriquecimento
		const [categoriesResult, brandsResult] = await Promise.all([
			db.query`SELECT id, name FROM categories WHERE is_active = true ORDER BY name LIMIT 100`,
			db.query`SELECT id, name FROM brands WHERE is_active = true ORDER BY name LIMIT 50`
		]);
		
		console.log(`📊 Dados carregados: ${categoriesResult.length} categorias, ${brandsResult.length} marcas`);
		
		// 🔄 USAR PROMPTS DO BANCO PARA GERAR SUGESTÕES
		const suggestions = await generateAISuggestionsFromDatabase(currentData, categoriesResult, brandsResult);
		
		console.log(`✅ Análise IA V2 concluída: ${suggestions.length} sugestões geradas`);
		
		return json({
			success: true,
			suggestions,
			version: 'v2-database',
			prompts_source: 'database'
		});
		
	} catch (error: any) {
		console.error('❌ Erro na análise IA V2:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor',
			details: error?.message || String(error)
		}, { status: 500 });
	}
}; 