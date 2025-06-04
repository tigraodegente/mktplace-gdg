import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

export async function GET({ url, platform }) {
	try {
		const productId = url.searchParams.get('productId');
		
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
					name as file_name,
					file_url,
					file_size,
					mime_type as file_type,
					download_limit,
					is_active,
					created_at
				FROM product_downloads
				WHERE product_id = $1 AND is_active = true
				ORDER BY created_at DESC
			`;
			
			const downloads = await db.query(query, [productId]);
			
			return json({
				success: true,
				data: downloads
			});
		});
	} catch (error) {
		console.error('Erro ao buscar downloads:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

export async function POST({ request, platform }) {
	try {
		const { productId, fileName, fileUrl, fileSize, fileType, downloadLimit = -1 } = await request.json();
		
		if (!productId || !fileName || !fileUrl) {
			return json({
				success: false,
				error: 'Product ID, nome do arquivo e URL são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			const query = `
				INSERT INTO product_downloads (product_id, name, file_url, file_size, mime_type, download_limit)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *
			`;
			
			const result = await db.query(query, [productId, fileName, fileUrl, fileSize, fileType, downloadLimit]);
			
			return json({
				success: true,
				data: result[0]
			});
		});
	} catch (error) {
		console.error('Erro ao criar download:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

export async function DELETE({ url, platform }) {
	try {
		const downloadId = url.searchParams.get('id');
		
		if (!downloadId) {
			return json({
				success: false,
				error: 'Download ID é obrigatório'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			const query = `
				UPDATE product_downloads 
				SET is_active = false
				WHERE id = $1
			`;
			
			await db.query(query, [downloadId]);
			
			return json({
				success: true,
				message: 'Download removido com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao remover download:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 