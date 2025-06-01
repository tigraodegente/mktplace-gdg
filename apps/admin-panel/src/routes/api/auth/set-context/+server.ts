import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { role } = await request.json();
		
		// Validar role
		if (!role || !['admin', 'vendor'].includes(role)) {
			return json({
				success: false,
				error: 'Role inválido'
			}, { status: 400 });
		}
		
		// Em desenvolvimento, sempre permitir
		if (import.meta.env.DEV) {
			// Definir cookie com contexto do usuário
			cookies.set('user_context', role, {
				path: '/',
				maxAge: 60 * 60 * 24 * 7, // 7 dias
				secure: false, // false para desenvolvimento
				httpOnly: true,
				sameSite: 'lax'
			});
			
			return json({
				success: true,
				context: role
			});
		}
		
		// Em produção, verificar sessão existente
		const sessionCookie = cookies.get('auth_session');
		if (!sessionCookie) {
			return json({
				success: false,
				error: 'Sessão não encontrada'
			}, { status: 401 });
		}
		
		// Definir contexto na sessão
		cookies.set('user_context', role, {
			path: '/',
			maxAge: 60 * 60 * 24 * 7, // 7 dias
			secure: true,
			httpOnly: true,
			sameSite: 'lax'
		});
		
		return json({
			success: true,
			context: role
		});
		
	} catch (error) {
		console.error('Erro ao definir contexto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 