import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { field, prompt, currentData, category, action } = await request.json();
		
		// Verificar se é ação de enriquecimento completo
		if (action === 'enrich_all') {
			return await enrichCompleteProduct(currentData, category);
		}
		
		// Enriquecimento de campo específico
		return await enrichSpecificField(field, prompt, currentData, category);
		
	} catch (error) {
		console.error('Erro no enriquecimento IA:', error);
		return json({
			success: false,
			error: 'Erro ao processar solicitação de IA'
		}, { status: 500 });
	}
};

async function enrichCompleteProduct(currentData: any, category?: string) {
	try {
		const prompt = `Você é um especialista em e-commerce brasileiro. Crie um produto COMPLETO e PROFISSIONAL baseado nos dados básicos fornecidos.

DADOS ATUAIS:
- Nome: "${currentData.name || 'Produto sem nome'}"
- Preço: R$ ${currentData.price || 0}
- Categoria: ${category || 'Geral'}
- Marca: ${currentData.brand || 'Genérica'}
- Descrição atual: "${currentData.description || 'Sem descrição'}"

IMPORTANTE:
- Seja NATURAL e PROFISSIONAL
- EVITE clichês como "destaca-se", "além disso", "portanto"
- Varie o vocabulário e estrutura
- Use dados REALISTAS e específicos
- Pense como um vendedor experiente

RETORNE EM JSON EXATO com:

{
  "enhanced_name": "Nome otimizado para vendas",
  "slug": "url-amigavel-do-produto",
  "sku": "SKU único profissional",
  "description": "Descrição completa 300-400 palavras",
  "short_description": "Resumo atrativo 150 chars",
  "brand_suggestion": "Marca sugerida se não fornecida",
  "model": "Modelo específico do produto",
  "condition": "new",
  "cost": "Custo sugerido (70% do preço)",
  "weight": "Peso em kg",
  "dimensions": {
    "height": "Altura em cm",
    "width": "Largura em cm", 
    "length": "Comprimento em cm"
  },
  "barcode": "Código de barras falso mas realista",
  "tags": ["array", "de", "tags", "relevantes"],
  "meta_title": "Título SEO (máx 60 chars)",
  "meta_description": "Meta descrição SEO (máx 160 chars)",
  "meta_keywords": ["palavra", "chave", "seo"],
  "attributes": {
    "cor": "Cor principal",
    "material": "Material predominante",
    "garantia": "Tempo de garantia",
    "origem": "País/região de origem"
  },
  "specifications": {
    "tecnicas": {
      "especificacao1": "valor1",
      "especificacao2": "valor2"
    },
    "gerais": {
      "peso_bruto": "valor",
      "dimensoes_embalagem": "valor"
    }
  },
  "delivery_days": "Prazo médio",
  "delivery_days_min": "Prazo mínimo",
  "delivery_days_max": "Prazo máximo",
  "has_free_shipping": true,
  "featured": false,
  "stock_location": "Local sugerido",
  "track_inventory": true,
  "allow_backorder": false
}`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4-turbo-preview',
			max_tokens: 2000,
			temperature: 0.7,
			messages: [{
				role: 'user',
				content: prompt
			}]
		});

		const aiResponse = response.choices[0].message.content;
		if (!aiResponse) throw new Error('Resposta vazia da IA');

		// Limpar e parsear JSON
		const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
		const enrichedData = JSON.parse(cleanedResponse);

		// Validar e ajustar dados
		const validatedData = validateAndAdjustData(enrichedData, currentData);

		return json({
			success: true,
			data: validatedData
		});

	} catch (error) {
		console.error('Erro no enriquecimento completo:', error);
		return json({
			success: false,
			error: 'Erro ao enriquecer produto completo'
		}, { status: 500 });
	}
}

async function enrichSpecificField(field: string, prompt: string, currentData: any, category?: string) {
	try {
		let specificPrompt = '';
		
		switch (field) {
			case 'name':
				specificPrompt = `Melhore este nome de produto para ser mais atrativo e vendável: "${currentData.name}". Categoria: ${category}. Seja direto e objetivo, sem explicações. Retorne apenas o nome melhorado.`;
				break;
				
			case 'description':
				specificPrompt = `Crie uma descrição completa e persuasiva (300-400 palavras) para este produto:
Nome: "${currentData.name}"
Categoria: ${category}
Marca: ${currentData.brand}
Preço: R$ ${currentData.price}

Estruture com:
1. Benefício principal no primeiro parágrafo
2. Características específicas
3. Especificações técnicas
4. Call to action natural

Evite clichês e seja natural. Retorne apenas a descrição.`;
				break;
				
			case 'meta_title':
				specificPrompt = `Crie um título SEO otimizado (máximo 60 caracteres) para: "${currentData.name}". Inclua palavras-chave relevantes. Retorne apenas o título.`;
				break;
				
			case 'meta_description':
				specificPrompt = `Crie uma meta descrição SEO (máximo 160 caracteres) para: "${currentData.name}". Seja persuasivo e inclua call to action. Retorne apenas a meta descrição.`;
				break;
				
			case 'tags':
				specificPrompt = `Liste 15-20 tags relevantes para este produto: "${currentData.name}". Categoria: ${category}. Inclua sinônimos e long-tail keywords. Retorne apenas array JSON: ["tag1", "tag2", ...]`;
				break;
				
			case 'sku':
				specificPrompt = `Gere um SKU único e profissional para: "${currentData.name}". Categoria: ${category}. Use formato: CategoriaCode + DescriçãoCode + Números. Retorne apenas o SKU.`;
				break;
				
			case 'slug':
				specificPrompt = `Crie uma URL amigável (slug) para: "${currentData.name}". Use apenas letras minúsculas, números e hífens. Seja conciso. Retorne apenas o slug.`;
				break;
				
			case 'short_description':
				specificPrompt = `Crie uma descrição curta (máximo 150 caracteres) atrativa para: "${currentData.name}". Foque no principal benefício. Retorne apenas a descrição curta.`;
				break;
				
			default:
				throw new Error('Campo não suportado');
		}

		const response = await openai.chat.completions.create({
			model: 'gpt-4-turbo-preview',
			max_tokens: 1000,
			temperature: 0.8,
			messages: [{
				role: 'user',
				content: specificPrompt
			}]
		});

		const aiResponse = response.choices[0].message.content?.trim();
		if (!aiResponse) throw new Error('Resposta vazia da IA');

		// Processar resposta específica por campo
		let processedData: any = aiResponse;
		
		if (field === 'tags') {
			try {
				processedData = JSON.parse(aiResponse);
			} catch {
				// Se não for JSON válido, dividir por vírgula
				processedData = aiResponse.split(',').map(tag => tag.trim().replace(/"/g, ''));
			}
		}

		return json({
			success: true,
			data: processedData
		});

	} catch (error) {
		console.error(`Erro no enriquecimento do campo ${field}:`, error);
		return json({
			success: false,
			error: `Erro ao enriquecer campo ${field}`
		}, { status: 500 });
	}
}

function validateAndAdjustData(enrichedData: any, currentData: any) {
	// Validar e ajustar dados baseado na estrutura real do banco
	const validated = {
		...enrichedData,
		// Garantir tipos corretos
		cost: parseFloat(enrichedData.cost) || (currentData.price * 0.7),
		weight: parseFloat(enrichedData.weight) || 1.0,
		dimensions: {
			height: parseFloat(enrichedData.dimensions?.height) || 10,
			width: parseFloat(enrichedData.dimensions?.width) || 10,
			length: parseFloat(enrichedData.dimensions?.length) || 10
		},
		delivery_days: parseInt(enrichedData.delivery_days) || 7,
		delivery_days_min: parseInt(enrichedData.delivery_days_min) || 3,
		delivery_days_max: parseInt(enrichedData.delivery_days_max) || 15,
		// Garantir booleans
		has_free_shipping: Boolean(enrichedData.has_free_shipping),
		featured: Boolean(enrichedData.featured),
		track_inventory: Boolean(enrichedData.track_inventory),
		allow_backorder: Boolean(enrichedData.allow_backorder),
		// Garantir arrays
		tags: Array.isArray(enrichedData.tags) ? enrichedData.tags : [],
		meta_keywords: Array.isArray(enrichedData.meta_keywords) ? enrichedData.meta_keywords : [],
		// Garantir objetos
		attributes: enrichedData.attributes || {},
		specifications: enrichedData.specifications || {}
	};

	// Gerar slug se não fornecido
	if (!validated.slug && validated.enhanced_name) {
		validated.slug = validated.enhanced_name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	// Gerar barcode realista se não fornecido
	if (!validated.barcode) {
		validated.barcode = '789' + Math.floor(Math.random() * 1000000000000).toString().padStart(10, '0');
	}

	// Limitar tamanhos de string
	if (validated.meta_title && validated.meta_title.length > 60) {
		validated.meta_title = validated.meta_title.substring(0, 57) + '...';
	}
	
	if (validated.meta_description && validated.meta_description.length > 160) {
		validated.meta_description = validated.meta_description.substring(0, 157) + '...';
	}

	if (validated.short_description && validated.short_description.length > 150) {
		validated.short_description = validated.short_description.substring(0, 147) + '...';
	}

	return validated;
} 