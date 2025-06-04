import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { getDatabase } from '$lib/db';

// Inicializar OpenAI com a chave do ambiente
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		// Verificar se a API key está configurada
		if (!OPENAI_API_KEY) {
			return json({
				success: false,
				error: 'Chave da API OpenAI não configurada. Configure OPENAI_API_KEY no arquivo .env'
			}, { status: 500 });
		}
		
		// Testar conexão com a API (apenas em desenvolvimento)
		if (process.env.NODE_ENV === 'development') {
			try {
				console.log('Testando conexão com OpenAI...');
				const testResponse = await openai.models.list();
				console.log('Conexão com OpenAI OK');
			} catch (apiError: any) {
				console.error('Erro ao conectar com OpenAI:', apiError.message);
				return json({
					success: false,
					error: 'Erro ao conectar com OpenAI. Verifique sua API key.'
				}, { status: 500 });
			}
		}
		
		// Obter o signal do AbortController se enviado
		const signal = request.signal;
		
		// Verificar se a requisição já foi cancelada
		if (signal?.aborted) {
			return json({
				success: false,
				error: 'Requisição cancelada'
			}, { status: 499 }); // 499 = Client Closed Request
		}
		
		const requestData = await request.json();
		
		// Para requisições que vêm do EnrichmentProgress, o formato é diferente
		if (requestData.fetchCategories || requestData.fetchBrands) {
			// Enriquecimento completo
			return await enrichCompleteProduct(requestData, requestData.category, platform, signal);
		}
		
		// Para requisições de campo específico
		const { field, prompt, currentData, category, action } = requestData;
		
		// Verificar se é ação de enriquecimento completo
		if (action === 'enrich_all') {
			return await enrichCompleteProduct(currentData, category, platform, signal);
		}
		
		// Enriquecimento de campo específico
		return await enrichSpecificField(field, prompt, currentData, category, platform, signal);
		
	} catch (error) {
		console.error('Erro no enriquecimento IA:', error);
		return json({
			success: false,
			error: 'Erro ao processar solicitação de IA'
		}, { status: 500 });
	}
};

async function enrichCompleteProduct(currentData: any, category?: string, platform?: any, signal?: AbortSignal) {
	try {
		// Verificar se foi cancelado antes de começar
		if (signal?.aborted) {
			throw new Error('Requisição cancelada');
		}
		
		// Buscar categorias e marcas disponíveis
		const db = getDatabase(platform);
		const [categories, brands] = await Promise.all([
			db.query`SELECT id, name, slug FROM categories WHERE is_active = true`,
			db.query`SELECT id, name, slug FROM brands WHERE is_active = true`
		]);
		await db.close();
		
		// Verificar novamente se foi cancelado
		if (signal?.aborted) {
			throw new Error('Requisição cancelada');
		}

		const prompt = `Você é um especialista em e-commerce brasileiro. Crie um produto COMPLETO e PROFISSIONAL baseado nos dados básicos fornecidos.

DADOS ATUAIS:
- Nome: "${currentData.name || 'Produto sem nome'}"
- Preço: R$ ${currentData.price || 0}
- Categoria atual: ${category || 'Nenhuma'}
- Marca atual: ${currentData.brand || 'Nenhuma'}
- Descrição atual: "${currentData.description || 'Sem descrição'}"

CATEGORIAS DISPONÍVEIS:
${categories.map((c: any) => `- ${c.name} (ID: ${c.id})`).join('\n')}

MARCAS DISPONÍVEIS:
${brands.map((b: any) => `- ${b.name} (ID: ${b.id})`).join('\n')}

IMPORTANTE:
- Seja NATURAL e PROFISSIONAL
- EVITE clichês como "destaca-se", "além disso", "portanto"
- Varie o vocabulário e estrutura
- Use dados REALISTAS e específicos
- Identifique a categoria e marca mais apropriadas
- Sugira variações se o produto normalmente as tem (cores, tamanhos, etc)

RETORNE EM JSON EXATO com:

{
  "enhanced_name": "Nome otimizado para vendas",
  "slug": "url-amigavel-do-produto",
  "sku": "SKU único profissional",
  "description": "Descrição completa 300-400 palavras",
  "short_description": "Resumo atrativo 150 chars",
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
  "category_suggestion": {
    "primary_category_id": "ID UUID da categoria principal mais apropriada (APENAS o ID, não o nome)",
    "primary_category_name": "Nome da categoria principal",
    "related_categories": [
      {
        "category_id": "ID UUID de categoria relacionada",
        "category_name": "Nome da categoria",
        "relevance": 0.9
      }
    ],
    "confidence": 0.95
  },
  "brand_suggestion": {
    "brand_id": "ID UUID da marca se identificada (APENAS o ID, não o nome) ou null",
    "brand_name": "Nome da marca",
    "confidence": 0.90
  },
  "has_variations": true,
  "suggested_variations": [
    {
      "type": "Cor",
      "options": ["Preto", "Branco", "Azul"]
    },
    {
      "type": "Tamanho",
      "options": ["P", "M", "G", "GG"]
    }
  ],
  "delivery_days": "Prazo médio",
  "delivery_days_min": "Prazo mínimo",
  "delivery_days_max": "Prazo máximo",
  "has_free_shipping": false,
  "stock_location": "Local sugerido no estoque",
  "ncm_code": "Código NCM se aplicável",
  "warranty_period": "Período de garantia",
  "care_instructions": "Instruções de cuidado/uso"
}

IMPORTANTE: Para category_suggestion e brand_suggestion, retorne APENAS os IDs UUID exatos que foram fornecidos na lista acima, NUNCA retorne slugs ou nomes como IDs.`;

		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			max_tokens: 2500,
			temperature: 0.7,
			messages: [{
				role: 'user',
				content: prompt
			}]
		}, {
			// Passar o signal para a OpenAI SDK cancelar a requisição
			signal: signal
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

	} catch (error: any) {
		// Se foi cancelado, retornar status específico
		if (error.message === 'Requisição cancelada' || error.name === 'AbortError' || signal?.aborted) {
			console.log('Enriquecimento cancelado pelo usuário');
			return json({
				success: false,
				error: 'Enriquecimento cancelado',
				cancelled: true
			}, { status: 499 });
		}
		
		console.error('Erro no enriquecimento completo:', error);
		return json({
			success: false,
			error: 'Erro ao enriquecer produto completo'
		}, { status: 500 });
	}
}

async function enrichSpecificField(field: string, prompt: string, currentData: any, category?: string, platform?: any, signal?: AbortSignal) {
	try {
		// Verificar se foi cancelado
		if (signal?.aborted) {
			throw new Error('Requisição cancelada');
		}
		
		let specificPrompt = '';
		
		switch (field) {
			case 'category':
				const db = getDatabase(platform);
				const categories = await db.query`SELECT id, name, slug FROM categories WHERE is_active = true`;
				await db.close();
				
				specificPrompt = `Analise este produto e sugira MÚLTIPLAS categorias apropriadas:
Nome: "${currentData.name}"
Descrição: "${currentData.description || 'N/A'}"
Tags: ${currentData.tags?.join(', ') || 'N/A'}

CATEGORIAS DISPONÍVEIS:
${categories.map((c: any) => `- ${c.name} (ID: ${c.id})`).join('\n')}

IMPORTANTE:
1. Identifique a categoria PRINCIPAL mais apropriada
2. Sugira até 3 categorias RELACIONADAS onde o produto também se encaixa
3. Ordene por relevância (mais relevante primeiro)
4. Considere categorias pai e subcategorias quando apropriado

Retorne APENAS um JSON no formato:
{
  "primary_category_id": "id-da-categoria-principal",
  "primary_category_name": "Nome da Categoria Principal",
  "related_categories": [
    {
      "category_id": "id-categoria-relacionada-1",
      "category_name": "Nome Categoria Relacionada 1",
      "relevance": 0.9
    },
    {
      "category_id": "id-categoria-relacionada-2",
      "category_name": "Nome Categoria Relacionada 2",
      "relevance": 0.7
    }
  ],
  "confidence": 0.95
}`;
				break;
				
			case 'brand':
				const db2 = getDatabase(platform);
				const brands = await db2.query`SELECT id, name, slug FROM brands WHERE is_active = true`;
				await db2.close();
				
				specificPrompt = `Identifique a marca deste produto:
Nome: "${currentData.name}"
Descrição: "${currentData.description || 'N/A'}"
SKU: "${currentData.sku || 'N/A'}"

MARCAS DISPONÍVEIS:
${brands.map((b: any) => `- ${b.name} (ID: ${b.id})`).join('\n')}

Se não identificar nenhuma marca conhecida, retorne null.
Retorne APENAS um JSON: {"brand_id": "id-ou-null", "brand_name": "nome-ou-null", "confidence": 0.90}`;
				break;
				
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
				
			case 'short_description':
				specificPrompt = `Crie uma descrição curta (máximo 150 caracteres) atrativa para: "${currentData.name}". Foque no principal benefício. Retorne apenas a descrição curta.`;
				break;
				
			case 'weight':
				specificPrompt = `Estime o peso em kg para este produto: "${currentData.name}". Categoria: ${category}. Considere embalagem. Retorne apenas o número (ex: 0.5).`;
				break;
				
			case 'dimensions':
				specificPrompt = `Estime as dimensões (altura, largura, comprimento em cm) para: "${currentData.name}". Retorne JSON: {"height": 10, "width": 20, "length": 30}`;
				break;
				
			case 'barcode':
				specificPrompt = `Para o produto "${currentData.name}" na categoria ${category}, gere um código de barras EAN-13 realista.

IMPORTANTE:
- Use o padrão brasileiro que começa com 789 
- Deve ter exatamente 13 dígitos
- O último dígito é verificador
- Formato: 789XXXXXXXXXX

Se o produto parece ser importado, use:
- USA: 0-1 no início
- Europa: 3-4 no início  
- China: 69 no início

Retorne APENAS o número do código de barras (13 dígitos).`;
				break;
				
			case 'variations':
				specificPrompt = `Analise este produto e sugira variações apropriadas:
Nome: "${currentData.name}"
Descrição: "${currentData.description || 'N/A'}"
Categoria: ${currentData.category || 'N/A'}

IMPORTANTE:
- Sugira APENAS variações que fazem sentido para este produto específico
- Seja realista e prático
- Máximo 3 tipos de variação
- Entre 2-8 opções por variação

Exemplos de variações comuns:
- Eletrônicos: Voltagem, Capacidade, Cor
- Roupas: Tamanho, Cor, Material
- Móveis: Cor, Material, Tamanho
- Alimentos: Sabor, Peso, Embalagem

Retorne APENAS um JSON no formato:
[
  {
    "type": "Cor",
    "options": ["Preto", "Branco", "Azul"]
  },
  {
    "type": "Tamanho",
    "options": ["P", "M", "G", "GG"]
  }
]`;
				break;
				
			case 'attributes':
				specificPrompt = `Analise este produto e sugira especificações técnicas/atributos apropriados:
Nome: "${currentData.name}"
Descrição: "${currentData.description || 'N/A'}"
Categoria: ${currentData.category || 'N/A'}

IMPORTANTE:
- Sugira APENAS atributos que fazem sentido para este produto
- Seja técnico e específico
- Use unidades de medida apropriadas
- Entre 5-15 atributos relevantes

Exemplos por categoria:
- Eletrônicos: Processador, RAM, Armazenamento, Tela, Bateria
- Roupas: Composição, Cuidados, Modelagem, Detalhes
- Móveis: Material, Dimensões, Peso suportado, Montagem
- Alimentos: Ingredientes, Validade, Informação nutricional

Retorne APENAS um JSON no formato:
{
  "Marca": "Samsung",
  "Modelo": "Galaxy S21",
  "Tela": "6.2 polegadas AMOLED",
  "Processador": "Exynos 2100",
  "RAM": "8GB",
  "Armazenamento": "128GB"
}`;
				break;
				
			default:
				throw new Error('Campo não suportado');
		}

		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			max_tokens: 1000,
			temperature: 0.8,
			messages: [{
				role: 'user',
				content: specificPrompt
			}]
		}, {
			signal: signal
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
		} else if (field === 'category' || field === 'brand' || field === 'dimensions' || field === 'variations' || field === 'attributes') {
			processedData = JSON.parse(aiResponse);
		}

		return json({
			success: true,
			data: processedData
		});

	} catch (error: any) {
		// Se foi cancelado, retornar status específico
		if (error.message === 'Requisição cancelada' || error.name === 'AbortError' || signal?.aborted) {
			console.log(`Enriquecimento do campo ${field} cancelado pelo usuário`);
			return json({
				success: false,
				error: 'Enriquecimento cancelado',
				cancelled: true
			}, { status: 499 });
		}
		
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