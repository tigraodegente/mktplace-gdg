import { json } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform }) => {
	try {
		const db = getDatabase(platform);
		const { id } = params;

		console.log(`🔍 Buscando variações reais para produto ID: ${id}`);

		// Primeiro verificar se este produto já tem variações estruturadas
		const existingVariationsQuery = `
			SELECT 
				pv.*,
				COALESCE(
					json_object_agg(po.name, pov.value) FILTER (WHERE po.name IS NOT NULL),
					'{}'::json
				) as option_values
			FROM product_variants pv
			LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
			LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
			LEFT JOIN product_options po ON po.id = pov.option_id
			WHERE pv.product_id = $1::uuid
			GROUP BY pv.id
			ORDER BY pv.id
		`;

		const existingVariations = await db.query(existingVariationsQuery, [id]);
		
		if (existingVariations && existingVariations.length > 0) {
			console.log(`✅ Produto já possui ${existingVariations.length} variações estruturadas!`);
			
			// Processar variações existentes
			const processedExisting = existingVariations.map((variant: any) => ({
				id: variant.id,
				name: Object.values(variant.option_values || {}).join(' / ') || `Variação ${variant.sku}`,
				sku: variant.sku,
				price: variant.price,
				image_url: '', // Será preenchido pela API principal
				difference: Object.entries(variant.option_values || {})
					.map(([key, value]) => `${key}: ${value}`)
					.join(', ') || 'Variação estruturada',
				variation_type: 'estruturada',
				confidence: 1.0,
				is_structured: true
			}));

			await db.close();
			return json({
				success: true,
				variations: processedExisting,
				count: processedExisting.length,
				type: 'structured'
			});
		}

		// Se não tem variações estruturadas, buscar produtos relacionados que podem ser variações
		// Baseado na lógica usada na IA, mas direto do banco
		const query = `
			WITH base_product AS (
				SELECT 
					p.name, 
					p.sku, 
					p.brand_id, 
					p.price, 
					p.description,
					pc_primary.category_id as primary_category_id
				FROM products p
				LEFT JOIN product_categories pc_primary ON pc_primary.product_id = p.id AND pc_primary.is_primary = true
				WHERE p.id = $1::uuid
			),
			similar_products AS (
				SELECT DISTINCT p.*,
					pc_p.category_id as product_category_id,
					-- Calcular score de similaridade mais inclusivo
					CASE 
						WHEN p.name ILIKE '%' || (SELECT name FROM base_product) || '%' THEN 50
						WHEN similarity(p.name, (SELECT name FROM base_product)) > 0.2 THEN 25
						-- Buscar por palavras-chave do nome
						WHEN p.name ILIKE '%kit%' AND (SELECT name FROM base_product) ILIKE '%kit%' THEN 30
						WHEN p.name ILIKE '%berço%' AND (SELECT name FROM base_product) ILIKE '%berço%' THEN 30
						WHEN p.name ILIKE '%berco%' AND (SELECT name FROM base_product) ILIKE '%berco%' THEN 30
						ELSE 0
					END +
					CASE 
						WHEN pc_p.category_id = (SELECT primary_category_id FROM base_product) THEN 15
						ELSE 0
					END +
					CASE 
						WHEN p.brand_id = (SELECT brand_id FROM base_product) THEN 20
						ELSE 0
					END +
					CASE 
						WHEN ABS(p.price - (SELECT price FROM base_product)) < 100 THEN 5
						ELSE 0
					END as similarity_score
				FROM products p
				LEFT JOIN product_categories pc_p ON pc_p.product_id = p.id AND pc_p.is_primary = true
				CROSS JOIN base_product bp
				WHERE p.id != $1::uuid
				AND p.is_active = true
				AND p.status = 'active'
				AND (
					-- Nome similar (mais inclusivo)
					p.name ILIKE '%' || bp.name || '%' OR
					similarity(p.name, bp.name) > 0.2 OR
					-- Palavras-chave importantes
					(p.name ILIKE '%kit%' AND bp.name ILIKE '%kit%') OR
					(p.name ILIKE '%berço%' AND bp.name ILIKE '%berço%') OR
					(p.name ILIKE '%berco%' AND bp.name ILIKE '%berco%') OR
					-- Mesma categoria primária
					pc_p.category_id = bp.primary_category_id OR
					-- Mesma marca  
					p.brand_id = bp.brand_id OR
					-- SKU similar (prefixos diferentes)
					LEFT(p.sku, 3) = LEFT(bp.sku, 3) OR
					LEFT(p.sku, 4) = LEFT(bp.sku, 4) OR
					LEFT(p.sku, 5) = LEFT(bp.sku, 5)
				)
			)
			SELECT 
				sp.*,
				COALESCE(pi.url, '') as image_url,
				bp.name as base_product_name,
				bp.sku as base_sku
			FROM similar_products sp
			CROSS JOIN base_product bp
			LEFT JOIN product_images pi ON pi.product_id = sp.id AND pi.is_primary = true
			WHERE sp.similarity_score > 5
			ORDER BY sp.similarity_score DESC, sp.name
			LIMIT 20
		`;

		const variations = await db.query(query, [id]);
		
		// Se não encontrou nada, fazer busca mais ampla
		if (variations.length === 0) {
			console.log('🔍 Primeira busca não encontrou resultados. Tentando busca mais ampla...');
			
			const fallbackQuery = `
				SELECT DISTINCT p.*,
					COALESCE(pi.url, '') as image_url,
					bp.name as base_product_name,
					bp.sku as base_sku,
					10 as similarity_score
				FROM products p
				CROSS JOIN (
					SELECT name, sku FROM products WHERE id = $1::uuid
				) bp
				LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
				WHERE p.id != $1::uuid
				AND p.is_active = true
				AND p.status = 'active'
				AND (
					p.name ILIKE '%kit%' OR
					p.name ILIKE '%berço%' OR
					p.name ILIKE '%berco%' OR
					p.name ILIKE '%conjunto%'
				)
				ORDER BY p.name
				LIMIT 10
			`;
			
			const fallbackVariations = await db.query(fallbackQuery, [id]);
			console.log(`🔍 Busca ampla encontrou ${fallbackVariations.length} produtos`);
			
			// Se ainda não encontrou, usar os resultados da busca ampla
			if (fallbackVariations.length > 0) {
				variations.push(...fallbackVariations);
			}
		}

		// Processar e analisar diferenças
		const processedVariations = variations.map((variation: any) => {
			// Analisar diferenças entre o produto base e a variação
			const differences = [];
			
			// Extrair possíveis diferenças do nome
			const baseName = variation.base_product_name?.toLowerCase() || '';
			const variantName = variation.name?.toLowerCase() || '';
			
			// Detectar diferenças de cor (expandido para kits de berço)
			const colors = ['azul', 'rosa', 'amarelo', 'verde', 'branco', 'preto', 'vermelho', 'roxo', 'dourado', 'prata', 'realeza', 'princesa', 'safari', 'urso', 'elefante', 'borboleta'];
			const baseColor = colors.find(color => baseName.includes(color));
			const variantColor = colors.find(color => variantName.includes(color));
			
			if (baseColor !== variantColor && variantColor) {
				differences.push(`Tema: ${variantColor.charAt(0).toUpperCase() + variantColor.slice(1)}`);
			}
			
			// Detectar diferenças de tamanho
			const sizes = ['pp', 'p', 'm', 'g', 'gg', 'xg', 'xxg', 'pequeno', 'médio', 'grande'];
			const baseSize = sizes.find(size => baseName.includes(size));
			const variantSize = sizes.find(size => variantName.includes(size));
			
			if (baseSize !== variantSize && variantSize) {
				differences.push(`Tamanho: ${variantSize.toUpperCase()}`);
			}
			
			// Detectar outras diferenças comuns
			if (variantName.includes('bivolt') && !baseName.includes('bivolt')) {
				differences.push('Voltagem: Bivolt');
			} else if (variantName.includes('110v') && !baseName.includes('110v')) {
				differences.push('Voltagem: 110V');
			} else if (variantName.includes('220v') && !baseName.includes('220v')) {
				differences.push('Voltagem: 220V');
			}
			
			// Detectar temas específicos de bebês/crianças
			const themes = ['amiguinhas', 'realeza', 'safari', 'borboletas', 'ursinhos', 'elefantinhos', 'passarinhos'];
			const baseTheme = themes.find(theme => baseName.includes(theme));
			const variantTheme = themes.find(theme => variantName.includes(theme));
			
			if (baseTheme !== variantTheme && variantTheme) {
				differences.push(`Tema: ${variantTheme.charAt(0).toUpperCase() + variantTheme.slice(1)}`);
			}
			
			return {
				id: variation.id,
				name: variation.name,
				sku: variation.sku,
				price: variation.price,
				image_url: variation.image_url,
				difference: differences.length > 0 ? differences.join(', ') : 'Produto relacionado',
				variation_type: differences.length > 0 ? differences[0].split(':')[0].toLowerCase() : 'outros',
				confidence: Math.min(0.95, variation.similarity_score / 100),
				similarity_score: variation.similarity_score
			};
		});

		// Debug detalhado
		console.log(`🔍 Base product:`, variations.length > 0 ? {
			base_name: variations[0]?.base_product_name,
			base_sku: variations[0]?.base_sku,
			total_found: variations.length
		} : 'Nenhum resultado');
		
		if (variations.length > 0) {
			console.log(`🔍 Primeiros 3 produtos encontrados:`);
			variations.slice(0, 3).forEach((v: any, i: number) => {
				console.log(`  ${i + 1}. "${v.name}" (${v.sku}) - Score: ${v.similarity_score}`);
			});
		}
		
		console.log(`✅ Encontradas ${processedVariations.length} possíveis variações reais`);

		await db.close();

		return json({
			success: true,
			variations: processedVariations,
			count: processedVariations.length,
			type: 'similar_products'
		});

	} catch (error) {
		console.error('❌ Erro ao buscar variações reais:', error);
		return json({
			success: false,
			error: 'Erro ao buscar variações reais',
			variations: []
		}, { status: 500 });
	}
}; 