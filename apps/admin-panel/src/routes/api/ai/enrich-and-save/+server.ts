import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { getDatabase } from '$lib/db';
import { withAdminAuth, authUtils } from '@mktplace/utils';

// Inicializar OpenAI
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

// POST - Enriquecer produto E salvar no banco (para uso da GRID)
export const POST: RequestHandler = withAdminAuth(async ({ request, data, platform }) => {
	try {
		const user = authUtils.getUser({ data });
		console.log(`🔐 Admin ${user?.name} enriquecendo e salvando produto`);
		
		// Verificar se a API key está configurada
		if (!OPENAI_API_KEY) {
			return json({
				success: false,
				error: 'Chave da API OpenAI não configurada'
			}, { status: 500 });
		}
		
		const { productId, productData } = await request.json();
		
		if (!productId) {
			return json({
				success: false,
				error: 'ID do produto é obrigatório'
			}, { status: 400 });
		}
		
		console.log(`🚀 [GRID] Enriquecendo produto: ${productData.name} (ID: ${productId})`);
		
		// 1. ENRIQUECER com IA (mesmo código da API existente)
		const db = getDatabase(platform);
		const [categories, brands] = await Promise.all([
			db.query`SELECT id, name, slug FROM categories WHERE is_active = true`,
			db.query`SELECT id, name, slug FROM brands WHERE is_active = true`
		]);
		
		const prompt = `Você é um especialista em e-commerce brasileiro. Enriqueça este produto COMPLETAMENTE:

DADOS ATUAIS:
- Nome: "${productData.name || 'Produto sem nome'}"
- Preço: R$ ${productData.price || 0}
- Custo: R$ ${productData.cost || 0}
- Categoria atual: ${productData.category || 'Nenhuma'}
- Marca atual: ${productData.brand || 'Nenhuma'}
- Descrição atual: "${productData.description || 'Sem descrição'}"

CATEGORIAS DISPONÍVEIS:
${categories.map((c: any) => `- ${c.name} (ID: ${c.id})`).join('\n')}

MARCAS DISPONÍVEIS:
${brands.map((b: any) => `- ${b.name} (ID: ${b.id})`).join('\n')}

RETORNE EM JSON EXATO:

{
  "enhanced_name": "Nome otimizado para vendas",
  "slug": "url-amigavel-do-produto",
  "sku": "SKU único profissional",
  "description": "Descrição completa 350-450 palavras",
  "short_description": "Resumo atrativo 120-150 chars",
  "model": "Modelo específico do produto",
  "price": "Preço calculado com margem sobre custo",
  "cost": "Custo ajustado se necessário",
  "weight": "Peso em kg",
  "dimensions": {
    "height": "Altura em cm",
    "width": "Largura em cm", 
    "length": "Comprimento em cm"
  },
  "barcode": "Código EAN-13 brasileiro",
  "tags": ["tag1", "tag2", "tag3"],
  "meta_title": "Título SEO (máx 60 chars)",
  "meta_description": "Meta descrição (máx 160 chars)",
  "meta_keywords": ["keyword1", "keyword2"],
  "category_suggestion": {
    "primary_category_id": "ID UUID da categoria",
    "primary_category_name": "Nome da categoria"
  },
  "brand_suggestion": {
    "brand_id": "ID UUID ou null",
    "brand_name": "Nome da marca ou null"
  },
  "attributes": {
    "Material": "Material do produto",
    "Voltagem": "Voltagem se aplicável",
    "Potência": "Potência se aplicável",
    "Capacidade": "Capacidade se aplicável",
    "Cor": "Cor principal",
    "Idade Recomendada": "Se produto infantil"
  },
  "specifications": {
    "Voltagem": "110V/220V",
    "Potência": "1200W",
    "Dimensões": "45 x 35 x 25 cm",
    "Peso": "3,5 kg",
    "Material": "Material de fabricação",
    "Certificações": "INMETRO, ANATEL",
    "Garantia": "12 meses"
  },
  "warranty_period": "12 meses",
  "care_instructions": "Instruções detalhadas de cuidado",
  "age_group": "Faixa etária se infantil ou null",
  "safety_certifications": "INMETRO",
  "ncm_code": "Código NCM brasileiro",
  "manufacturing_country": "BR",
  "origin": "0"
}

IMPORTANTE: Retorne APENAS o JSON acima, sem explicações.`;

		// Chamada para IA
		const response = await openai.chat.completions.create({
			model: 'gpt-4-1106-preview',
			max_tokens: 4000,
			temperature: 0.8,
			messages: [{
				role: 'user',
				content: prompt
			}]
		});

		const aiResponse = response.choices[0].message.content?.trim();
		if (!aiResponse) throw new Error('Resposta vazia da IA');

		// Limpar resposta
		let cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
		const lastBraceIndex = cleanedResponse.lastIndexOf('}');
		if (lastBraceIndex !== -1) {
			cleanedResponse = cleanedResponse.substring(0, lastBraceIndex + 1);
		}

		let enrichedData;
		try {
			enrichedData = JSON.parse(cleanedResponse);
			console.log('✅ [GRID] JSON parseado com sucesso');
		} catch (parseError) {
			console.error('❌ [GRID] Erro ao parsear JSON:', parseError);
			throw new Error('Resposta da IA inválida');
		}

		// 2. SALVAR NO BANCO
		console.log('💾 [GRID] Salvando produto enriquecido no banco...');
		
		// Construir dados para atualização
		const updateData = {
			name: enrichedData.enhanced_name || enrichedData.name || productData.name,
			slug: enrichedData.slug,
			sku: enrichedData.sku || productData.sku,
			description: enrichedData.description,
			short_description: enrichedData.short_description,
			model: enrichedData.model,
			price: parseFloat(enrichedData.price) || productData.price,
			cost: parseFloat(enrichedData.cost) || productData.cost,
			weight: parseFloat(enrichedData.weight) || 1.0,
			height: parseFloat(enrichedData.dimensions?.height) || 10,
			width: parseFloat(enrichedData.dimensions?.width) || 10,
			length: parseFloat(enrichedData.dimensions?.length) || 10,
			barcode: enrichedData.barcode,
			tags: enrichedData.tags || [],
			meta_title: enrichedData.meta_title,
			meta_description: enrichedData.meta_description,
			meta_keywords: enrichedData.meta_keywords || [],
			warranty_period: enrichedData.warranty_period || '12 meses',
			care_instructions: enrichedData.care_instructions,
			age_group: enrichedData.age_group,
			safety_certifications: enrichedData.safety_certifications || 'INMETRO',
			ncm_code: enrichedData.ncm_code,
			manufacturing_country: enrichedData.manufacturing_country || 'BR',
			origin: enrichedData.origin || '0',
			updated_at: new Date().toISOString()
		};

		// Atualizar produto principal
		await db.query`
			UPDATE products SET
				name = ${updateData.name},
				slug = ${updateData.slug},
				sku = ${updateData.sku},
				description = ${updateData.description},
				short_description = ${updateData.short_description},
				model = ${updateData.model},
				price = ${updateData.price},
				cost = ${updateData.cost},
				weight = ${updateData.weight},
				height = ${updateData.height},
				width = ${updateData.width},
				length = ${updateData.length},
				barcode = ${updateData.barcode},
				tags = ${updateData.tags},
				meta_title = ${updateData.meta_title},
				meta_description = ${updateData.meta_description},
				meta_keywords = ${updateData.meta_keywords},
				warranty_period = ${updateData.warranty_period},
				care_instructions = ${updateData.care_instructions},
				age_group = ${updateData.age_group},
				safety_certifications = ${updateData.safety_certifications},
				ncm_code = ${updateData.ncm_code},
				manufacturing_country = ${updateData.manufacturing_country},
				origin = ${updateData.origin},
				updated_at = ${updateData.updated_at}
			WHERE id = ${productId}
		`;

		// 3. SALVAR ATRIBUTOS
		if (enrichedData.attributes && Object.keys(enrichedData.attributes).length > 0) {
			console.log('📋 [GRID] Salvando atributos...');
			
			// Remover atributos existentes
			await db.query`DELETE FROM product_attributes WHERE product_id = ${productId}`;
			
			// Inserir novos atributos
			for (const [name, value] of Object.entries(enrichedData.attributes)) {
				if (value && String(value).trim()) {
					await db.query`
						INSERT INTO product_attributes (product_id, name, value)
						VALUES (${productId}, ${name}, ${String(value)})
					`;
				}
			}
		}

		// 4. SALVAR ESPECIFICAÇÕES
		if (enrichedData.specifications && Object.keys(enrichedData.specifications).length > 0) {
			console.log('🔧 [GRID] Salvando especificações...');
			
			// Remover especificações existentes
			await db.query`DELETE FROM product_specifications WHERE product_id = ${productId}`;
			
			// Inserir novas especificações
			for (const [name, value] of Object.entries(enrichedData.specifications)) {
				if (value && String(value).trim()) {
					await db.query`
						INSERT INTO product_specifications (product_id, name, value)
						VALUES (${productId}, ${name}, ${String(value)})
					`;
				}
			}
		}

		// 5. ATUALIZAR CATEGORIA (se sugerida)
		if (enrichedData.category_suggestion?.primary_category_id) {
			console.log('🏷️ [GRID] Atualizando categoria...');
			
			// Remover categoria existente
			await db.query`DELETE FROM product_categories WHERE product_id = ${productId}`;
			
			// Adicionar nova categoria
			await db.query`
				INSERT INTO product_categories (product_id, category_id, is_primary)
				VALUES (${productId}, ${enrichedData.category_suggestion.primary_category_id}, true)
			`;
		}

		// 6. ATUALIZAR MARCA (se sugerida)
		if (enrichedData.brand_suggestion?.brand_id) {
			console.log('🏭 [GRID] Atualizando marca...');
			
			await db.query`
				UPDATE products SET brand_id = ${enrichedData.brand_suggestion.brand_id}
				WHERE id = ${productId}
			`;
		}

		await db.close();

		console.log(`✅ [GRID] Produto ${productData.name} enriquecido e salvo com sucesso!`);

		return json({
			success: true,
			data: {
				id: productId,
				...updateData,
				attributes: enrichedData.attributes || {},
				specifications: enrichedData.specifications || {},
				category: enrichedData.category_suggestion?.primary_category_name,
				brand: enrichedData.brand_suggestion?.brand_name
			}
		});

	} catch (error: any) {
		console.error('❌ [GRID] Erro no enriquecimento:', error);
		return json({
			success: false,
			error: error.message || 'Erro no enriquecimento'
		}, { status: 500 });
	}
}); 