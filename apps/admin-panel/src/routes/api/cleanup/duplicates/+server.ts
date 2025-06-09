import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { productId } = await request.json();
		
		if (!productId) {
			return json({ success: false, error: 'Product ID required' }, { status: 400 });
		}

		console.log(`🧹 Iniciando limpeza de duplicatas para produto: ${productId}`);
		
		const db = getDatabase(platform);
		
		// 1. Verificar quantas imagens existem
		const countResult = await db.query`
			SELECT COUNT(*) as total 
			FROM product_images 
			WHERE product_id = ${productId}::uuid
		`;
		
		const totalImages = parseInt(countResult[0]?.total || '0');
		console.log(`📊 Total de imagens encontradas: ${totalImages}`);
		
		if (totalImages <= 1) {
			await db.close();
			return json({ 
				success: true, 
				message: 'Produto já está limpo',
				removed: 0,
				remaining: totalImages
			});
		}
		
		// 2. Manter apenas a primeira imagem
		const firstImageResult = await db.query`
			SELECT id, url 
			FROM product_images 
			WHERE product_id = ${productId}::uuid
			ORDER BY created_at
			LIMIT 1
		`;
		
		if (!firstImageResult[0]) {
			await db.close();
			return json({ success: false, error: 'Nenhuma imagem encontrada' }, { status: 404 });
		}
		
		const firstImageId = firstImageResult[0].id;
		console.log(`✅ Mantendo imagem: ${firstImageId}`);
		
		// 3. Remover duplicatas em lotes de 500
		let totalRemoved = 0;
		let batchCount = 0;
		
		while (true) {
			// Pegar IDs para deletar
			const idsToDelete = await db.query`
				SELECT id 
				FROM product_images 
				WHERE product_id = ${productId}::uuid
				AND id != ${firstImageId}::uuid
				LIMIT 500
			`;
			
			if (idsToDelete.length === 0) {
				break; // Não há mais duplicatas
			}
			
			// Extrair array de IDs
			const idArray = idsToDelete.map((row: any) => row.id);
			
			// Deletar este lote
			for (const id of idArray) {
				await db.query`DELETE FROM product_images WHERE id = ${id}::uuid`;
			}
			
			totalRemoved += idArray.length;
			batchCount++;
			
			console.log(`🗑️ Lote ${batchCount}: ${idArray.length} imagens removidas`);
			
			// Pausa pequena entre lotes
			await new Promise(resolve => setTimeout(resolve, 50));
		}
		
		// 4. Verificar resultado final
		const finalCountResult = await db.query`
			SELECT COUNT(*) as remaining 
			FROM product_images 
			WHERE product_id = ${productId}::uuid
		`;
		
		const remainingImages = parseInt(finalCountResult[0]?.remaining || '0');
		
		await db.close();
		
		console.log(`✅ Limpeza concluída: ${totalRemoved} duplicatas removidas, ${remainingImages} imagem restante`);
		
		return json({
			success: true,
			message: 'Duplicatas removidas com sucesso',
			removed: totalRemoved,
			remaining: remainingImages,
			batches: batchCount
		});
		
	} catch (error) {
		console.error('❌ Erro na limpeza:', error);
		return json({ 
			success: false, 
			error: 'Erro ao limpar duplicatas',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
}; 