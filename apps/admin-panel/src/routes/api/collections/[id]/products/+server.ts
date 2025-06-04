import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Listar produtos de uma coleção específica
export async function GET({ params, url, platform }) {
	try {
		const { id: collectionId } = params;
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		if (!collectionId) {
			return json({
				success: false,
				error: 'ID da coleção é obrigatório'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const query = `
				SELECT 
					p.id,
					p.name,
					p.slug,
					p.price,
					p.original_price,
					p.is_active,
					pc.position,
					pc.created_at as added_at,
					pi.url as image_url
				FROM product_collections pc
				JOIN products p ON p.id = pc.product_id
				LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
				WHERE pc.collection_id = $1
				ORDER BY pc.position ASC, pc.created_at ASC
				LIMIT $2 OFFSET $3
			`;
			
			const products = await db.query(query, [collectionId, limit, offset]);
			
			// Buscar total de produtos na coleção
			const countQuery = `
				SELECT COUNT(*) as total 
				FROM product_collections 
				WHERE collection_id = $1
			`;
			const totalResult = await db.query(countQuery, [collectionId]);
			const total = parseInt(totalResult[0].total);
			
			return json({
				success: true,
				data: products,
				meta: {
					total,
					limit,
					offset,
					hasMore: offset + limit < total
				}
			});
		});
	} catch (error) {
		console.error('Erro ao buscar produtos da coleção:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Adicionar produto à coleção
export async function POST({ params, request, platform }) {
	try {
		const { id: collectionId } = params;
		const { product_id, position = 999 } = await request.json();

		if (!collectionId || !product_id) {
			return json({
				success: false,
				error: 'ID da coleção e ID do produto são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			// Verificar se a associação já existe
			const existingQuery = `
				SELECT id FROM product_collections 
				WHERE collection_id = $1 AND product_id = $2
			`;
			const existing = await db.query(existingQuery, [collectionId, product_id]);
			
			if (existing.length > 0) {
				return json({
					success: false,
					error: 'Produto já está nesta coleção'
				}, { status: 400 });
			}

			// Adicionar produto à coleção
			const insertQuery = `
				INSERT INTO product_collections (collection_id, product_id, position)
				VALUES ($1, $2, $3)
				RETURNING *
			`;
			
			const result = await db.query(insertQuery, [collectionId, product_id, position]);
			
			return json({
				success: true,
				data: result[0],
				message: 'Produto adicionado à coleção com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao adicionar produto à coleção:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// DELETE - Remover produto da coleção
export async function DELETE({ params, url, platform }) {
	try {
		const { id: collectionId } = params;
		const productId = url.searchParams.get('productId');

		if (!collectionId || !productId) {
			return json({
				success: false,
				error: 'ID da coleção e ID do produto são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const query = `
				DELETE FROM product_collections 
				WHERE collection_id = $1 AND product_id = $2
			`;
			
			const result = await db.query(query, [collectionId, productId]);
			
			return json({
				success: true,
				message: 'Produto removido da coleção com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao remover produto da coleção:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// PUT - Atualizar posição do produto na coleção
export async function PUT({ params, request, platform }) {
	try {
		const { id: collectionId } = params;
		const { product_id, position } = await request.json();

		if (!collectionId || !product_id || position === undefined) {
			return json({
				success: false,
				error: 'ID da coleção, ID do produto e posição são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const query = `
				UPDATE product_collections 
				SET position = $3, updated_at = NOW()
				WHERE collection_id = $1 AND product_id = $2
				RETURNING *
			`;
			
			const result = await db.query(query, [collectionId, product_id, position]);
			
			if (!result[0]) {
				return json({
					success: false,
					error: 'Produto não encontrado na coleção'
				}, { status: 404 });
			}
			
			return json({
				success: true,
				data: result[0],
				message: 'Posição do produto atualizada com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar posição do produto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 