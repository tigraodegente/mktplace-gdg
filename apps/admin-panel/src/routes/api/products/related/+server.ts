import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

export async function GET({ url, platform }) {
	try {
		const productId = url.searchParams.get('productId');
		const search = url.searchParams.get('search') || '';
		const limit = parseInt(url.searchParams.get('limit') || '50');

		return await withDatabase(platform, async (db) => {
			if (productId) {
				// Validar UUID
				const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
				if (!uuidRegex.test(productId)) {
					return json({
						success: false,
						error: 'Product ID deve ser um UUID válido'
					}, { status: 400 });
				}

				// Buscar produtos relacionados para um produto específico
				const query = `
					SELECT 
						pr.id,
						pr.related_product_id,
						pr.relation_type,
						p.name,
						p.slug,
						p.price,
						pi.url as image_url
					FROM product_related pr
					JOIN products p ON p.id = pr.related_product_id
					LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
					WHERE pr.product_id = $1
					ORDER BY pr.created_at DESC
				`;
				
				const relatedProducts = await db.query(query, [productId]);
				
				return json({
					success: true,
					data: relatedProducts
				});
			} else {
				// Buscar todos os produtos para seleção (excluindo o atual se fornecido)
				const excludeId = url.searchParams.get('exclude');
				
				let query = `
					SELECT 
						p.id,
						p.name,
						p.slug,
						p.price,
						pi.url as image_url,
						p.is_active
					FROM products p
					LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
					WHERE p.is_active = true
				`;
				
				const params: any[] = [];
				let paramCount = 0;
				
				if (search) {
					paramCount++;
					query += ` AND (p.name ILIKE $${paramCount} OR p.slug ILIKE $${paramCount})`;
					params.push(`%${search}%`);
				}
				
				if (excludeId) {
					paramCount++;
					query += ` AND p.id != $${paramCount}`;
					params.push(excludeId);
				}
				
				query += ` ORDER BY p.name ASC LIMIT $${paramCount + 1}`;
				params.push(limit);
				
				const products = await db.query(query, params);
				
				return json({
					success: true,
					data: products
				});
			}
		});
	} catch (error) {
		console.error('Erro ao buscar produtos relacionados:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

export async function POST({ request, platform }) {
	try {
		const { productId, relatedProductId, relationType = 'similar' } = await request.json();
		
		if (!productId || !relatedProductId) {
			return json({
				success: false,
				error: 'Product ID e Related Product ID são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			// Inserir relacionamento
			const query = `
				INSERT INTO product_related (product_id, related_product_id, relation_type)
				VALUES ($1, $2, $3)
				ON CONFLICT (product_id, related_product_id) 
				DO UPDATE SET relation_type = $3
				RETURNING *
			`;
			
			const result = await db.query(query, [productId, relatedProductId, relationType]);
			
			return json({
				success: true,
				data: result[0]
			});
		});
	} catch (error) {
		console.error('Erro ao criar produto relacionado:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

export async function DELETE({ url, platform }) {
	try {
		const productId = url.searchParams.get('productId');
		const relatedProductId = url.searchParams.get('relatedProductId');
		
		if (!productId || !relatedProductId) {
			return json({
				success: false,
				error: 'Product ID e Related Product ID são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			const query = `
				DELETE FROM product_related 
				WHERE product_id = $1 AND related_product_id = $2
			`;
			
			await db.query(query, [productId, relatedProductId]);
			
			return json({
				success: true,
				message: 'Relacionamento removido com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao remover produto relacionado:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 