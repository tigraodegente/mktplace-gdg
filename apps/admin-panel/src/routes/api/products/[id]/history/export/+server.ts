import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { withAdminAuth, authUtils } from '@mktplace/utils/auth/middleware';

// GET - Exportar histórico em CSV
export const GET: RequestHandler = withAdminAuth(async ({ params, url, data, platform }: any) => {
	try {
		const user = authUtils.getUser({ data });
		const db = getDatabase(platform);
		const { id: productId } = params;
		
		console.log(`📊 Admin ${user?.name} exportando histórico do produto ${productId}`);
		
		// Buscar todo o histórico
		const query = `
			SELECT 
				ph.*,
				u.name as user_name,
				u.email as user_email,
				p.name as product_name,
				p.sku as product_sku
			FROM product_history ph
			LEFT JOIN users u ON u.id = ph.user_id
			LEFT JOIN products p ON p.id = ph.product_id
			WHERE ph.product_id = $1
			ORDER BY ph.created_at DESC
		`;
		
		const history = await db.query(query, [productId]);
		
		if (history.length === 0) {
			await db.close();
			return json({
				success: false,
				error: 'Nenhum histórico encontrado'
			}, { status: 404 });
		}
		
		// Gerar CSV
		const csvHeaders = [
			'Data/Hora',
			'Ação',
			'Resumo',
			'Usuário',
			'Email',
			'Produto',
			'SKU',
			'Alterações'
		].join(',');
		
		const csvRows = history.map(entry => {
			const date = new Date(entry.created_at).toLocaleString('pt-BR');
			const changes = JSON.stringify(entry.changes || {});
			
			return [
				`"${date}"`,
				`"${entry.action}"`,
				`"${entry.summary || ''}"`,
				`"${entry.user_name || 'Sistema'}"`,
				`"${entry.user_email || ''}"`,
				`"${entry.product_name || ''}"`,
				`"${entry.product_sku || ''}"`,
				`"${changes.replace(/"/g, '""')}"`
			].join(',');
		});
		
		const csvContent = [csvHeaders, ...csvRows].join('\n');
		
		await db.close();
		
		// Retornar CSV
		return new Response(csvContent, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="produto-${productId}-historico-${new Date().toISOString().split('T')[0]}.csv"`
			}
		});
		
	} catch (error) {
		console.error('❌ Erro ao exportar histórico:', error);
		return json({
			success: false,
			error: 'Erro ao exportar histórico'
		}, { status: 500 });
	}
}); 