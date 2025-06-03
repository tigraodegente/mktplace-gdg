import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Simular dados de estatísticas do menu
		const mockStats = {
			products: { 
				total: 247, 
				active: 189, 
				pending: 12 
			},
			orders: { 
				total: 1543, 
				pending: 23 
			},
			users: { 
				total: 8920, 
				customers: 8456, 
				vendors: 464 
			},
			reviews: { 
				total: 2891, 
				pending: 8 
			},
			returns: { 
				total: 156, 
				pending: 5 
			},
			coupons: { 
				total: 45, 
				active: 32 
			},
			categories: { 
				total: 89, 
				active: 67 
			},
			pages: { 
				total: 24, 
				published: 19 
			},
			wishlists: { 
				total: 423, 
				public: 201 
			},
			brands: {
				total: 156
			},
			sellers: {
				total: 464
			},
			payment_methods: {
				total: 8
			}
		};

		return json({
			success: true,
			data: mockStats
		});
	} catch (error) {
		console.error('Erro ao buscar estatísticas do menu:', error);
		return json({
			success: false,
			error: {
				code: 'MENU_STATS_ERROR',
				message: 'Erro ao carregar estatísticas do menu'
			}
		}, { status: 500 });
	}
}; 