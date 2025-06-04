import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Buscar imagens de um produto específico
export async function GET({ url, platform }) {
	try {
		const productId = url.searchParams.get('productId');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		if (!productId) {
			return json({
				success: false,
				error: 'Product ID é obrigatório'
			}, { status: 400 });
		}

		// Validar UUID
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(productId)) {
			return json({
				success: false,
				error: 'Product ID deve ser um UUID válido'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const query = `
				SELECT 
					id,
					product_id,
					url,
					alt_text,
					position,
					is_primary,
					created_at
				FROM product_images 
				WHERE product_id = $1
				ORDER BY is_primary DESC, position ASC, created_at ASC
				LIMIT $2 OFFSET $3
			`;
			
			const images = await db.query(query, [productId, limit, offset]);
			
			// Buscar total de imagens
			const countQuery = `
				SELECT COUNT(*) as total 
				FROM product_images 
				WHERE product_id = $1
			`;
			const totalResult = await db.query(countQuery, [productId]);
			const total = parseInt(totalResult[0].total);
			
			return json({
				success: true,
				data: images,
				meta: {
					total,
					limit,
					offset,
					hasMore: offset + limit < total
				}
			});
		});
	} catch (error) {
		console.error('Erro ao buscar imagens do produto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Adicionar nova imagem ao produto
export async function POST({ request, platform }) {
	try {
		const {
			product_id,
			url,
			alt_text,
			position = 0,
			is_primary = false
		} = await request.json();

		if (!product_id || !url) {
			return json({
				success: false,
				error: 'Product ID e URL da imagem são obrigatórios'
			}, { status: 400 });
		}

		// Validar UUID
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(product_id)) {
			return json({
				success: false,
				error: 'Product ID deve ser um UUID válido'
			}, { status: 400 });
		}

		// Validar URL da imagem
		try {
			new URL(url);
		} catch {
			return json({
				success: false,
				error: 'URL da imagem inválida'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			// Se é imagem primária, remover flag das outras
			if (is_primary) {
				await db.query(`
					UPDATE product_images 
					SET is_primary = false 
					WHERE product_id = $1
				`, [product_id]);
			}

			// Inserir nova imagem
			const insertQuery = `
				INSERT INTO product_images (product_id, url, alt_text, position, is_primary)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING *
			`;
			
			const result = await db.query(insertQuery, [
				product_id, url, alt_text, position, is_primary
			]);
			
			return json({
				success: true,
				data: result[0],
				message: 'Imagem adicionada com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao adicionar imagem:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// PUT - Atualizar imagem existente
export async function PUT({ request, platform }) {
	try {
		const {
			id,
			url,
			alt_text,
			position,
			is_primary
		} = await request.json();

		if (!id) {
			return json({
				success: false,
				error: 'ID da imagem é obrigatório'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			// Se está definindo como primária, remover flag das outras do mesmo produto
			if (is_primary) {
				// Primeiro buscar o product_id desta imagem
				const imageQuery = `SELECT product_id FROM product_images WHERE id = $1`;
				const imageResult = await db.query(imageQuery, [id]);
				
				if (imageResult.length > 0) {
					await db.query(`
						UPDATE product_images 
						SET is_primary = false 
						WHERE product_id = $1 AND id != $2
					`, [imageResult[0].product_id, id]);
				}
			}

			// Atualizar a imagem
			const updateQuery = `
				UPDATE product_images 
				SET url = COALESCE($2, url),
				    alt_text = COALESCE($3, alt_text),
				    position = COALESCE($4, position),
				    is_primary = COALESCE($5, is_primary)
				WHERE id = $1
				RETURNING *
			`;
			
			const result = await db.query(updateQuery, [
				id, url, alt_text, position, is_primary
			]);
			
			if (!result[0]) {
				return json({
					success: false,
					error: 'Imagem não encontrada'
				}, { status: 404 });
			}
			
			return json({
				success: true,
				data: result[0],
				message: 'Imagem atualizada com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar imagem:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// DELETE - Remover imagens
export async function DELETE({ request, platform }) {
	try {
		const { ids } = await request.json();
		
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return json({
				success: false,
				error: 'IDs das imagens são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			// Verificar se alguma das imagens é primária
			const primaryCheck = await db.query(`
				SELECT product_id, COUNT(*) as primary_count
				FROM product_images 
				WHERE id = ANY($1) AND is_primary = true
				GROUP BY product_id
			`, [ids]);
			
			// Remover as imagens
			const deleteQuery = `DELETE FROM product_images WHERE id = ANY($1)`;
			await db.query(deleteQuery, [ids]);
			
			// Se removemos uma imagem primária, definir a primeira imagem restante como primária
			for (const check of primaryCheck) {
				const newPrimary = await db.query(`
					SELECT id FROM product_images 
					WHERE product_id = $1 
					ORDER BY position ASC, created_at ASC 
					LIMIT 1
				`, [check.product_id]);
				
				if (newPrimary.length > 0) {
					await db.query(`
						UPDATE product_images 
						SET is_primary = true 
						WHERE id = $1
					`, [newPrimary[0].id]);
				}
			}
			
			return json({
				success: true,
				message: `${ids.length} imagem(ns) removida(s) com sucesso`
			});
		});
	} catch (error) {
		console.error('Erro ao remover imagens:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 