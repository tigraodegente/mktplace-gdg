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
	console.log('🚀 IA: Iniciando enriquecimento completo do produto:', currentData.name);
	console.log('📦 IA: Dados de entrada:', {
		name: currentData.name,
		description: currentData.description,
		category: category,
		price: currentData.price,
		brand: currentData.brand
	});
	
	try {
		// Verificar se foi cancelado
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

		const prompt = `Você é um especialista em e-commerce brasileiro especializado em produtos eletrônicos, eletrodomésticos, produtos infantis e decoração. Crie um produto COMPLETO e PROFISSIONAL baseado nos dados básicos fornecidos.

DADOS ATUAIS:
- Nome: "${currentData.name || 'Produto sem nome'}"
- Preço: R$ ${currentData.price || 0}
- Custo: R$ ${currentData.cost || 0}
- Categoria atual: ${category || 'Nenhuma'}
- Marca atual: ${currentData.brand || 'Nenhuma'}
- Descrição atual: "${currentData.description || 'Sem descrição'}"

CATEGORIAS DISPONÍVEIS:
${categories.map((c: any) => `- ${c.name} (ID: ${c.id})`).join('\n')}

MARCAS DISPONÍVEIS:
${brands.map((b: any) => `- ${b.name} (ID: ${b.id})`).join('\n')}

INSTRUÇÕES CRÍTICAS:
1. SEMPRE calcule um preço realista baseado no custo fornecido (margem de 40-60%)
2. SEMPRE preencha care_instructions com instruções específicas e detalhadas
3. SEMPRE preencha warranty_period com garantia apropriada para o tipo de produto
4. Para eletrodomésticos: inclua especificações técnicas completas
5. Para produtos infantis: sempre definir age_group
6. Use linguagem natural brasileira sem clichês
7. Seja específico e técnico quando necessário

RETORNE EM JSON EXATO com TODOS os campos preenchidos:

{
  "enhanced_name": "Nome otimizado para vendas (máx 80 chars)",
  "slug": "url-amigavel-do-produto",
  "sku": "SKU único profissional (formato específico por categoria)",
  "description": "Descrição completa 350-450 palavras com especificações técnicas",
  "short_description": "Resumo atrativo 120-150 chars",
  "model": "Modelo específico e técnico do produto",
  "condition": "new",
  "price": "Preço de venda calculado com margem sobre o custo (OBRIGATÓRIO)",
  "cost": "Custo ajustado se necessário",
  "weight": "Peso realista em kg com embalagem",
  "dimensions": {
    "height": "Altura em cm com embalagem",
    "width": "Largura em cm com embalagem", 
    "length": "Comprimento em cm com embalagem"
  },
  "barcode": "Código EAN-13 brasileiro (789XXXXXXXXXX)",
  "tags": ["tags", "específicas", "e", "relevantes", "para", "busca"],
  "meta_title": "Título SEO otimizado (máx 60 chars)",
  "meta_description": "Meta descrição persuasiva (máx 160 chars)",
  "meta_keywords": ["keywords", "seo", "específicas"],
  "category_suggestion": {
    "primary_category_id": "ID UUID da categoria mais específica e apropriada",
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
    "brand_id": "ID UUID se marca existe na lista ou null",
    "brand_name": "Nome exato da marca ou null",
    "confidence": 0.90
  },
  "suggested_variations": [
    {
      "type": "Voltagem",
      "options": ["110V", "220V", "Bivolt"]
    },
    {
      "type": "Cor",
      "options": ["Cores disponíveis do produto"]
    }
  ],
  "suggested_attributes": [
    {
      "name": "Voltagem",
      "values": ["110V", "220V", "Bivolt"]
    },
    {
      "name": "Potência",
      "values": ["Potência em Watts"]
    },
    {
      "name": "Capacidade",
      "values": ["Capacidade em litros ou especificação"]
    }
  ],
  "suggested_specifications": {
    "Potência": "Potência em Watts",
    "Tensão": "Voltagem de funcionamento",
    "Capacidade": "Capacidade do produto",
    "Consumo": "Consumo energético",
    "Dimensões do produto": "Dimensões sem embalagem",
    "Material": "Material de fabricação",
    "Certificações": "Certificações brasileiras (INMETRO, etc)"
  },
  "delivery_days_min": 3,
  "delivery_days_max": 15,
  "has_free_shipping": false,
  "stock_location": "Centro de Distribuição adequado",
  "ncm_code": "Código NCM brasileiro específico do produto",
  "warranty_period": "Período de garantia realista (12 meses, 24 meses, etc) - OBRIGATÓRIO",
  "care_instructions": "Instruções detalhadas de instalação, uso, limpeza e manutenção - OBRIGATÓRIO",
  "age_group": "Faixa etária se infantil ou null se adulto",
  "safety_certifications": "INMETRO e outras certificações brasileiras",
  "is_digital": false,
  "requires_shipping": true,
  "manufacturing_country": "Código ISO do país de fabricação (2 letras: BR, US, CN, KR, etc)",
  "origin": "0"
}

REGRAS OBRIGATÓRIAS:
1. NUNCA deixe price como 0 - sempre calcule baseado no custo
2. SEMPRE preencha warranty_period com garantia realista
3. SEMPRE preencha care_instructions com instruções específicas
4. Para eletrodomésticos: inclua especificações técnicas detalhadas
5. Para produtos eletrônicos: inclua voltagem, potência, consumo
6. Use category_suggestion com a categoria mais específica possível
7. Se marca não existir na lista, retorne null mas mantenha o nome em brand_name`;

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

		const aiResponse = response.choices[0].message.content?.trim();
		if (!aiResponse) throw new Error('Resposta vazia da IA');

		console.log('🤖 IA: Resposta completa recebida:', aiResponse.substring(0, 200) + '...');

		// Limpar markdown e tentar parsear JSON
		const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
		
		let enrichedData;
		try {
			enrichedData = JSON.parse(cleanedResponse);
			console.log('✅ IA: JSON parseado com sucesso');
		} catch (parseError) {
			console.error('❌ IA: Erro ao fazer parse do JSON:', parseError);
			console.log('Resposta original:', cleanedResponse);
			throw new Error('Resposta da IA não é um JSON válido');
		}

		// Validar e ajustar dados
		const validatedData = validateAndAdjustData(enrichedData, currentData);
		console.log('🎉 IA: Produto enriquecido completamente com sucesso!');

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
				console.log('🤖 IA: Analisando categorias para:', currentData.name);
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
				console.log('🤖 IA: Prompt categorias preparado, enviando para OpenAI...');
				break;
				
			case 'brand':
				console.log('🤖 IA: Analisando marca para:', currentData.name);
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
				console.log('🤖 IA: Prompt marca preparado, enviando para OpenAI...');
				break;
				
			case 'name':
				console.log('🤖 IA: Melhorando nome para:', currentData.name);
				specificPrompt = `Melhore este nome de produto para ser mais atrativo e vendável: "${currentData.name}". 

Categoria: ${category}
Preço: R$ ${currentData.price || 0}

DIRETRIZES:
- Use linguagem natural brasileira
- Evite clichês como "ideal para", "perfeito para"
- Seja específico sobre o produto
- Máximo 80 caracteres
- Foque no benefício principal

Retorne apenas o nome melhorado, sem explicações.`;
				console.log('🤖 IA: Prompt nome preparado, enviando para OpenAI...');
				break;
				
			case 'model':
				console.log('🤖 IA: Identificando modelo para:', currentData.name);
				specificPrompt = `Identifique o modelo específico deste produto: "${currentData.name}"

Categoria: ${category}
Descrição: "${currentData.description || 'N/A'}"

DIRETRIZES:
- Extraia apenas o modelo/versão específica
- Remova marca e categoria do resultado
- Seja conciso e técnico
- Se não identificar modelo claro, sugira baseado no produto
- Para produtos sem modelo específico, use características principais

Exemplos:
- "Smartphone Samsung Galaxy S24" → "Galaxy S24"
- "Notebook Dell Inspiron 15 3000" → "Inspiron 15 3000"
- "Cesto Organizador Listrado" → "Listrado"
- "Mesa de Jantar 4 Lugares" → "4 Lugares"

Retorne apenas o modelo identificado.`;
				console.log('🤖 IA: Prompt modelo preparado, enviando para OpenAI...');
				break;
				
			case 'description':
				console.log('🤖 IA: Gerando descrição completa para:', currentData.name);
				specificPrompt = `Crie uma descrição completa e persuasiva (300-400 palavras) para este produto:

Nome: "${currentData.name}"
Categoria: ${category}
Marca: ${currentData.brand}
Preço: R$ ${currentData.price}

ESTRUTURA:
1. Primeiro parágrafo: Benefício principal (sem clichês)
2. Segundo parágrafo: Características específicas
3. Terceiro parágrafo: Especificações técnicas
4. Quarto parágrafo: Call to action natural

DIRETRIZES:
- Use linguagem natural brasileira
- EVITE clichês como "destaca-se", "além disso", "portanto", "ideal para"
- Seja específico sobre materiais, dimensões, funcionalidades
- Para produtos infantis: enfatize segurança e desenvolvimento
- Para decoração: foque em ambiente e praticidade
- Use parágrafos curtos e objetivos

Retorne apenas a descrição, sem explicações.`;
				console.log('🤖 IA: Prompt descrição preparado, enviando para OpenAI...');
				break;
				
			case 'meta_title':
				console.log('🤖 IA: Gerando meta title para:', currentData.name);
				specificPrompt = `Crie um título SEO otimizado para: "${currentData.name}"

DIRETRIZES:
- Máximo 60 caracteres
- Inclua palavra-chave principal
- Use linguagem natural brasileira
- Evite clichês
- Seja atrativo para cliques

Retorne apenas o título.`;
				console.log('🤖 IA: Prompt meta title preparado, enviando para OpenAI...');
				break;
				
			case 'meta_description':
				console.log('🤖 IA: Gerando meta description para:', currentData.name);
				specificPrompt = `Crie uma meta descrição SEO para: "${currentData.name}"

Preço: R$ ${currentData.price || 0}
Categoria: ${category}

DIRETRIZES:
- Entre 145-160 caracteres
- Seja persuasivo
- Inclua call to action natural
- Use linguagem brasileira
- Mencione benefício principal

Retorne apenas a meta descrição.`;
				console.log('🤖 IA: Prompt meta description preparado, enviando para OpenAI...');
				break;
				
			case 'tags':
				console.log('🤖 IA: Gerando tags para:', currentData.name);
				specificPrompt = `Liste 15-20 tags relevantes para este produto: "${currentData.name}"

Categoria: ${category}
Preço: R$ ${currentData.price || 0}

DIRETRIZES:
- Use termos que brasileiros pesquisam
- Inclua sinônimos e variações
- Misture termos gerais e específicos
- Inclua long-tail keywords
- Evite repetições

Retorne apenas array JSON: ["tag1", "tag2", ...]`;
				console.log('🤖 IA: Prompt tags preparado, enviando para OpenAI...');
				break;
				
			case 'sku':
				console.log('🤖 IA: Gerando SKU para:', currentData.name);
				specificPrompt = `Gere um SKU único e profissional para: "${currentData.name}"

Categoria: ${category}

FORMATO SUGERIDO: 
- 3 letras da categoria + hífen + 3-4 letras do produto + hífen + 3 números
- Exemplo: DEC-ALM-001, INF-BRI-002

Retorne apenas o SKU.`;
				console.log('🤖 IA: Prompt SKU preparado, enviando para OpenAI...');
				break;
				
			case 'short_description':
				console.log('🤖 IA: Gerando descrição curta para:', currentData.name);
				specificPrompt = `Crie uma descrição curta (120-150 caracteres) atrativa para: "${currentData.name}"

DIRETRIZES:
- Foque no principal benefício
- Use linguagem natural brasileira
- Seja persuasivo mas não exagerado
- Evite clichês

Retorne apenas a descrição curta.`;
				console.log('🤖 IA: Prompt descrição curta preparado, enviando para OpenAI...');
				break;
				
			case 'weight':
				specificPrompt = `Estime o peso em kg para este produto: "${currentData.name}"

Categoria: ${category}
Preço: R$ ${currentData.price || 0}

CONSIDERAÇÕES:
- Inclua peso da embalagem
- Seja realista baseado no tipo de produto
- Para produtos infantis: considere materiais seguros
- Para decoração: considere materiais típicos

Retorne apenas o número (ex: 0.5).`;
				break;
				
			case 'dimensions':
				specificPrompt = `Estime as dimensões (altura, largura, comprimento em cm) para: "${currentData.name}"

Categoria: ${category}
Preço: R$ ${currentData.price || 0}

CONSIDERAÇÕES:
- Dimensões com embalagem para frete
- Seja realista baseado no produto
- Considere padrões brasileiros
- Para produtos infantis: considere ergonomia

Retorne JSON: {"height": 10, "width": 20, "length": 30}`;
				break;
				
			case 'barcode':
				specificPrompt = `Para o produto "${currentData.name}" na categoria ${category}, gere um código de barras EAN-13 realista.

PADRÃO BRASILEIRO:
- Deve começar com 789 (código do Brasil)
- Deve ter exatamente 13 dígitos
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
Preço: R$ ${currentData.price || 0}

IMPORTANTE:
- Sugira APENAS variações que fazem sentido para este produto específico
- Seja realista e prático
- Máximo 3 tipos de variação
- Entre 2-8 opções por variação

Exemplos por categoria:
- Produtos infantis: Cor, Tamanho, Personagem
- Decoração: Cor, Material, Tamanho
- Eletrônicos: Voltagem, Capacidade, Cor
- Roupas: Tamanho, Cor, Material

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
Preço: R$ ${currentData.price || 0}

IMPORTANTE:
- Sugira APENAS atributos que fazem sentido para este produto
- Seja técnico e específico
- Use unidades de medida brasileiras
- Entre 5-15 atributos relevantes

Exemplos por categoria:
- Produtos infantis: Material, Idade recomendada, Certificações, Dimensões
- Decoração: Material, Dimensões, Peso suportado, Estilo
- Eletrônicos: Voltagem, Potência, Conectividade, Garantia

Retorne APENAS um JSON no formato:
{
  "Material": "100% Algodão",
  "Idade Recomendada": "3+ anos",
  "Certificações": "INMETRO",
  "Dimensões": "30x20x15 cm"
}`;
				break;
				
			case 'specifications':
				specificPrompt = `Analise este produto e sugira especificações técnicas detalhadas:

Nome: "${currentData.name}"
Descrição: "${currentData.description || 'N/A'}"
Categoria: ${currentData.category || 'N/A'}
Preço: R$ ${currentData.price || 0}
Atributos existentes: ${JSON.stringify(currentData.attributes || {})}

IMPORTANTE:
- Sugira especificações técnicas DETALHADAS e PRECISAS
- Seja específico com unidades de medida brasileiras
- Inclua informações técnicas relevantes
- Entre 8-20 especificações dependendo do produto

Exemplos por categoria:
- Eletrônicos: Voltagem, Potência, Consumo, Dimensões, Peso, Conectividade, Certificações
- Produtos infantis: Material, Dimensões, Peso, Idade recomendada, Certificações, Cuidados
- Decoração: Material, Dimensões, Peso suportado, Capacidade, Acabamento
- Eletrodomésticos: Voltagem, Potência, Capacidade, Consumo, Eficiência energética

Retorne APENAS um JSON no formato:
{
  "Voltagem": "110V/220V Bivolt",
  "Potência": "1200W",
  "Consumo": "1,2 kWh",
  "Dimensões": "45 x 35 x 25 cm",
  "Peso": "3,5 kg",
  "Certificações": "INMETRO, ANATEL",
  "Garantia": "12 meses"
}`;
				break;
				
			case 'care_instructions':
				specificPrompt = `Crie instruções de cuidado específicas para: "${currentData.name}"

Categoria: ${category}

DIRETRIZES:
- Seja específico para o tipo de produto
- Use linguagem clara e objetiva
- Inclua cuidados de limpeza, manutenção e armazenamento
- Para produtos infantis: enfatize segurança
- Para eletrônicos: inclua cuidados técnicos

Retorne apenas as instruções, separadas por ponto.`;
				break;
				
			case 'age_group':
				specificPrompt = `Determine a faixa etária apropriada para: "${currentData.name}"

Categoria: ${category}
Descrição: "${currentData.description || 'N/A'}"

OPÇÕES PADRÃO:
- "0-6 meses", "6-12 meses", "1-2 anos", "3-5 anos", "6-8 anos", "9-12 anos", "13+ anos"
- "Todas as idades" (se apropriado)

Considere:
- Segurança e desenvolvimento
- Complexidade do produto
- Tamanho e materiais

Retorne apenas a faixa etária.`;
				break;
				
			default:
				throw new Error('Campo não suportado para enriquecimento');
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

		console.log(`🤖 IA: Resposta recebida para ${field}:`, aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''));

		// Limpar markdown se presente (igual ao enriquecimento completo)
		const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();

		// Processar resposta específica por campo
		let processedData: any = cleanedResponse;
		
		if (field === 'tags') {
			try {
				processedData = JSON.parse(cleanedResponse);
				console.log(`✅ IA: Tags processadas com sucesso:`, processedData.slice(0, 5), '...');
			} catch {
				// Se não for JSON válido, dividir por vírgula
				processedData = cleanedResponse.split(',').map(tag => tag.trim().replace(/"/g, ''));
				console.log(`✅ IA: Tags processadas (fallback):`, processedData.slice(0, 5), '...');
			}
		} else if (field === 'category' || field === 'brand' || field === 'dimensions' || field === 'variations' || field === 'attributes') {
			try {
				processedData = JSON.parse(cleanedResponse);
				console.log(`✅ IA: Campo ${field} processado como JSON:`, processedData);
			} catch (error) {
				console.error(`❌ IA: Erro ao processar JSON para ${field}:`, error);
				throw new Error(`Resposta da IA inválida para ${field}`);
			}
		} else {
			console.log(`✅ IA: Campo ${field} processado como texto:`, processedData.substring(0, 50) + (processedData.length > 50 ? '...' : ''));
		}

		console.log(`🎉 IA: Campo ${field} enriquecido com sucesso!`);

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
		// Garantir que price nunca seja 0
		price: parseFloat(enrichedData.price) || (currentData.cost ? currentData.cost * 1.5 : 100),
		// Garantir tipos corretos
		cost: parseFloat(enrichedData.cost) || parseFloat(currentData.cost) || (parseFloat(enrichedData.price) * 0.7),
		weight: parseFloat(enrichedData.weight) || 1.0,
		dimensions: {
			height: parseFloat(enrichedData.dimensions?.height) || 10,
			width: parseFloat(enrichedData.dimensions?.width) || 10,
			length: parseFloat(enrichedData.dimensions?.length) || 10
		},
		delivery_days_min: parseInt(enrichedData.delivery_days_min) || 3,
		delivery_days_max: parseInt(enrichedData.delivery_days_max) || 15,
		// Garantir booleans
		has_free_shipping: Boolean(enrichedData.has_free_shipping),
		featured: Boolean(enrichedData.featured),
		track_inventory: Boolean(enrichedData.track_inventory),
		allow_backorder: Boolean(enrichedData.allow_backorder),
		is_digital: Boolean(enrichedData.is_digital),
		requires_shipping: Boolean(enrichedData.requires_shipping),
		// Garantir arrays
		tags: Array.isArray(enrichedData.tags) ? enrichedData.tags : [],
		meta_keywords: Array.isArray(enrichedData.meta_keywords) ? enrichedData.meta_keywords : [],
		// Garantir objetos
		attributes: enrichedData.attributes || {},
		specifications: enrichedData.specifications || enrichedData.suggested_specifications || {},
		// Novos campos obrigatórios
		warranty_period: enrichedData.warranty_period || '12 meses',
		care_instructions: enrichedData.care_instructions || 'Siga as instruções do fabricante.',
		manufacturing_country: getCountryCode(enrichedData.manufacturing_country) || 'BR',
		safety_certifications: enrichedData.safety_certifications || 'INMETRO',
		ncm_code: enrichedData.ncm_code || null,
		origin: enrichedData.origin || '0'
	};

	// Processar atributos sugeridos
	if (enrichedData.suggested_attributes && Array.isArray(enrichedData.suggested_attributes)) {
		validated._suggested_attributes = enrichedData.suggested_attributes;
	}

	// Processar especificações sugeridas
	if (enrichedData.suggested_specifications) {
		validated.specifications = {
			...validated.specifications,
			...enrichedData.suggested_specifications
		};
	}

	// Processar variações sugeridas
	if (enrichedData.suggested_variations && Array.isArray(enrichedData.suggested_variations)) {
		validated._suggested_variations = enrichedData.suggested_variations;
	}

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

	// Garantir que enhanced_name seja usado como name
	if (validated.enhanced_name) {
		validated.name = validated.enhanced_name;
		delete validated.enhanced_name;
	}

	return validated;
}

function getCountryCode(country: string | undefined): string {
	if (!country) return 'BR';
	
	const countryCodes: Record<string, string> = {
		'Brasil': 'BR',
		'Estados Unidos': 'US',
		'China': 'CN',
		'Coreia do Sul': 'KR'
	};
	return countryCodes[country] || 'BR';
}