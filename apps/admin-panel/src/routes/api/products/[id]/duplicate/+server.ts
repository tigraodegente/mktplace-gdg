import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { withAdminAuth, authUtils } from '@mktplace/utils/auth/middleware';

// POST - Duplicar produto
export const POST: RequestHandler = withAdminAuth(async ({ params, request, data, platform }: any) => {
	try {
		const user = authUtils.getUser({ data });
		const db = getDatabase(platform);
		const { id: originalProductId } = params;
		const body = await request.json();
		
		console.log(`🔄 Admin ${user?.name} duplicando produto ${originalProductId}`);
		
		// Buscar produto original
		const originalProductQuery = `
			SELECT * FROM products WHERE id = $1
		`;
		
		const originalProduct = await db.query(originalProductQuery, [originalProductId]);
		
		if (!originalProduct[0]) {
			await db.close();
			return json({
				success: false,
				error: 'Produto original não encontrado'
			}, { status: 404 });
		}
		
		const product = originalProduct[0];
		
		// Gerar novos valores únicos
		const timestamp = Date.now();
		const newName = body.name || `${product.name} - Cópia`;
		const newSku = body.sku || `${product.sku}-COPY-${timestamp}`;
		const newSlug = body.slug || `${product.slug}-copy-${timestamp}`;
		
		// Opções de duplicação
		const options = body.options || {};
		const includeImages = options.includeImages !== false;
		const includeVariants = options.includeVariants !== false;
		const includeCategories = options.includeCategories !== false;
		const includeAttributes = options.includeAttributes !== false;
		const includeSpecifications = options.includeSpecifications !== false;
		const includeSeo = options.includeSeo === true;
		const resetStock = options.resetStock !== false;
		const setAsDraft = options.setAsDraft !== false;
		
		// Criar produto duplicado
		const newProductQuery = `
			INSERT INTO products (
				name, slug, sku, description, short_description,
				price, original_price, cost, quantity, 
				brand_id, seller_id, 
				status, is_active, featured,
				attributes, specifications, tags,
				meta_title, meta_description, meta_keywords,
				created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5,
				$6, $7, $8, $9,
				$10, $11,
				$12, $13, $14,
				$15, $16, $17,
				$18, $19, $20,
				NOW(), NOW()
			) RETURNING *
		`;
		
		const newProduct = await db.query(newProductQuery, [
			newName, newSlug, newSku, product.description, product.short_description,
			product.price, product.original_price, product.cost, resetStock ? 0 : product.quantity,
			product.brand_id, product.seller_id,
			setAsDraft ? 'draft' : product.status, setAsDraft ? false : product.is_active, false,
			JSON.stringify(includeAttributes ? (product.attributes || {}) : {}), 
			JSON.stringify(includeSpecifications ? (product.specifications || {}) : {}), 
			Array.isArray(product.tags) ? product.tags : (product.tags ? JSON.parse(product.tags) : []),
			includeSeo ? product.meta_title : null, 
			includeSeo ? product.meta_description : null, 
			includeSeo ? (Array.isArray(product.meta_keywords) ? product.meta_keywords : (product.meta_keywords ? JSON.parse(product.meta_keywords) : [])) : []
		]);
		
		const duplicatedProduct = newProduct[0];
		console.log(`✅ Produto duplicado criado: ${duplicatedProduct.id}`);
		
		// Duplicar categorias (se habilitado)
		if (includeCategories) {
			const categoriesQuery = `
				INSERT INTO product_categories (product_id, category_id, is_primary)
				SELECT $1, category_id, is_primary 
				FROM product_categories 
				WHERE product_id = $2
			`;
			await db.query(categoriesQuery, [duplicatedProduct.id, originalProductId]);
			console.log('✅ Categorias duplicadas');
		}
		
		// Duplicar imagens (se habilitado)
		if (includeImages) {
			const imagesQuery = `
				INSERT INTO product_images (product_id, url, position, is_primary, alt_text)
				SELECT $1, url, position, is_primary, alt_text
				FROM product_images 
				WHERE product_id = $2
			`;
			await db.query(imagesQuery, [duplicatedProduct.id, originalProductId]);
			console.log('✅ Imagens duplicadas');
		}
		
		// Duplicar opções de variação (se habilitado)
		if (includeVariants) {
			// Duplicar opções de variação
			const optionsQuery = `
				SELECT * FROM product_options WHERE product_id = $1 ORDER BY position
			`;
			const originalOptions = await db.query(optionsQuery, [originalProductId]);
			
			const optionIdMap: Record<string, string> = {};
			
			for (const option of originalOptions) {
				const newOptionQuery = `
					INSERT INTO product_options (product_id, name, position)
					VALUES ($1, $2, $3) RETURNING *
				`;
				const newOption = await db.query(newOptionQuery, [
					duplicatedProduct.id, option.name, option.position
				]);
				
				optionIdMap[option.id] = newOption[0].id;
				
				// Duplicar valores da opção
				const valuesQuery = `
					SELECT * FROM product_option_values WHERE option_id = $1 ORDER BY position
				`;
				const originalValues = await db.query(valuesQuery, [option.id]);
				
				for (const value of originalValues) {
					const newValueQuery = `
						INSERT INTO product_option_values (option_id, value, position)
						VALUES ($1, $2, $3) RETURNING *
					`;
					await db.query(newValueQuery, [
						newOption[0].id, value.value, value.position
					]);
				}
			}
			
			// Duplicar variantes (zerar estoque)
			const variantsQuery = `
				SELECT * FROM product_variants WHERE product_id = $1
			`;
			const originalVariants = await db.query(variantsQuery, [originalProductId]);
			
			for (const variant of originalVariants) {
				const newVariantQuery = `
					INSERT INTO product_variants (
						product_id, sku, price, original_price, cost, 
						quantity, weight, barcode, is_active
					) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
				`;
				const newVariant = await db.query(newVariantQuery, [
					duplicatedProduct.id,
					`${variant.sku}-COPY-${timestamp}`,
					variant.price,
					variant.original_price,
					variant.cost,
					0, // Zerar estoque da variante
					variant.weight,
					variant.barcode ? `${variant.barcode}-COPY` : null,
					false // Variante inativa
				]);
				
				// Duplicar relações de valores de opção da variante
				const variantOptionsQuery = `
					SELECT vov.*, pov.option_id, pov.value 
					FROM variant_option_values vov
					JOIN product_option_values pov ON pov.id = vov.option_value_id
					WHERE vov.variant_id = $1
				`;
				const variantOptions = await db.query(variantOptionsQuery, [variant.id]);
				
				for (const variantOption of variantOptions) {
					// Encontrar o novo option_value_id baseado no novo option_id
					const newOptionId = optionIdMap[variantOption.option_id];
					if (newOptionId) {
						const newValueQuery = `
							SELECT id FROM product_option_values 
							WHERE option_id = $1 AND value = $2
						`;
						const newValueResult = await db.query(newValueQuery, [newOptionId, variantOption.value]);
						
						if (newValueResult[0]) {
							const insertVariantOptionQuery = `
								INSERT INTO variant_option_values (variant_id, option_value_id)
								VALUES ($1, $2)
							`;
							await db.query(insertVariantOptionQuery, [newVariant[0].id, newValueResult[0].id]);
						}
					}
				}
			}
			console.log('✅ Variantes duplicadas');
		}
		
		// Duplicar produtos relacionados (se habilitado)
		if (includeCategories) {
			try {
				const relatedQuery = `
					INSERT INTO product_related (product_id, related_product_id, relation_type, position)
					SELECT $1, related_product_id, relation_type, position
					FROM product_related 
					WHERE product_id = $2
				`;
				await db.query(relatedQuery, [duplicatedProduct.id, originalProductId]);
				console.log('✅ Produtos relacionados duplicados');
			} catch (error) {
				console.warn('⚠️ Erro ao duplicar produtos relacionados (tabela pode não existir):', error);
			}
		}
		
		// Duplicar upsells/cross-sells (se habilitado)
		if (includeCategories) {
			try {
				const upsellsQuery = `
					INSERT INTO product_upsells (product_id, upsell_product_id, upsell_type, position)
					SELECT $1, upsell_product_id, upsell_type, position
					FROM product_upsells 
					WHERE product_id = $2
				`;
				await db.query(upsellsQuery, [duplicatedProduct.id, originalProductId]);
				console.log('✅ Upsells duplicados');
			} catch (error) {
				console.warn('⚠️ Erro ao duplicar upsells (tabela pode não existir):', error);
			}
		}
		
		// Registrar no histórico
		try {
			await fetch(`/api/products/${duplicatedProduct.id}/history`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'created',
					changes: {
						duplicated_from: {
							old: null,
							new: originalProductId
						}
					}
				})
			});
		} catch (historyError) {
			console.warn('Erro ao registrar histórico:', historyError);
		}
		
		await db.close();
		
		// Gerar resumo das opções utilizadas
		const optionsUsed = [];
		if (includeImages) optionsUsed.push('imagens');
		if (includeVariants) optionsUsed.push('variações');
		if (includeCategories) optionsUsed.push('categorias');
		if (includeAttributes) optionsUsed.push('atributos');
		if (includeSpecifications) optionsUsed.push('especificações');
		if (includeSeo) optionsUsed.push('SEO');
		
		const optionsText = optionsUsed.length > 0 
			? ` Incluindo: ${optionsUsed.join(', ')}.`
			: ' Apenas dados básicos duplicados.';
		
		const stockText = resetStock ? ' Estoque zerado.' : ' Estoque mantido.';
		const statusText = setAsDraft ? ' Status: rascunho.' : ' Status: ativo.';
		
		return json({
			success: true,
			data: duplicatedProduct,
			message: `Produto "${newName}" duplicado com sucesso!${optionsText}${stockText}${statusText}`,
			meta: {
				original_product_id: originalProductId,
				duplicated_product_id: duplicatedProduct.id,
				options_used: optionsUsed,
				stock_reset: resetStock,
				set_as_draft: setAsDraft,
				timestamp: new Date().toISOString()
			}
		});
		
	} catch (error) {
		console.error('❌ Erro ao duplicar produto:', error);
		return json({
			success: false,
			error: 'Erro interno ao duplicar produto'
		}, { status: 500 });
	}
}); 