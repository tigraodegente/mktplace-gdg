import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		// Em desenvolvimento, sempre retornar usuário mock
		if (import.meta.env.DEV) {
			// Pegar parâmetro da URL para simular diferentes usuários  
			const userParam = url.searchParams.get('user');
			const contextCookie = cookies.get('user_context');
			
			// Determinar role baseado no parâmetro ou cookie
			const role = userParam || contextCookie || 'admin';
			
			let mockUser;
			
			if (role === 'vendor') {
				mockUser = {
					id: 'vendor-dev',
					name: 'João Vendedor',
					email: 'joao@vendor.local',
					role: 'vendor',
					roles: ['vendor']
				};
			} else {
				// Default: admin
				mockUser = {
					id: 'admin-dev',
					name: 'Maria Admin',
					email: 'admin@dev.local',
					role: 'admin',
					roles: ['admin']
				};
			}
			
			return json({
				success: true,
				user: mockUser
			});
		}
		
		// Em produção, verificar sessão real
		const sessionCookie = cookies.get('auth_session');
		const contextCookie = cookies.get('user_context');
		
		if (!sessionCookie) {
			return json({
				success: false,
				error: 'Não autenticado'
			}, { status: 401 });
		}
		
		// TODO: Em produção, validar sessão real com banco/JWT
		// Por enquanto, retornar erro de não implementado
		return json({
			success: false,
			error: 'Sistema de autenticação em produção não implementado'
		}, { status: 501 });
		
	} catch (error) {
		console.error('Erro na verificação de autenticação:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 