import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDatabase(platform);

		// Query para estatísticas das cotações
		const [stats] = await db.query`
			SELECT 
				COUNT(*) as total_quotes,
				COUNT(*) FILTER (WHERE status = 'pending') as pending_quotes,
				COUNT(*) FILTER (WHERE status = 'quoted') as quoted_quotes,
				COUNT(*) FILTER (WHERE status = 'selected') as selected_quotes,
				COUNT(*) FILTER (WHERE status = 'expired') as expired_quotes,
				COUNT(*) FILTER (WHERE expires_at < CURRENT_TIMESTAMP) as overdue_quotes
			FROM shipping_quotes
		`;

		await db.close();

		return json({
			success: true,
			data: {
				total_quotes: parseInt(stats.total_quotes || 0),
				pending_quotes: parseInt(stats.pending_quotes || 0),
				quoted_quotes: parseInt(stats.quoted_quotes || 0),
				selected_quotes: parseInt(stats.selected_quotes || 0),
				expired_quotes: parseInt(stats.expired_quotes || 0),
				overdue_quotes: parseInt(stats.overdue_quotes || 0)
			}
		});

	} catch (error) {
		console.error('Error fetching shipping quotes stats:', error);
		return json({
			success: false,
			error: 'Erro ao buscar estatísticas das cotações'
		}, { status: 500 });
	}
}; 