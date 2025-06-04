import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// DELETE - Remover produto específico da coleção
export async function DELETE({ params, platform }) {
	try {
		const { id: collectionId, productId } = params;

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
			
			await db.query(query, [collectionId, productId]);
			
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