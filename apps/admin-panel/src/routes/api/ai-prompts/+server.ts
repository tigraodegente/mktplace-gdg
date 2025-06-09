import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// Função auxiliar para verificar autenticação admin (simplificada)
function requireAdminAuth(handler: (event: any) => Promise<Response>): RequestHandler {
	return async (event) => {
		// Em desenvolvimento, sempre permitir
		if (process.env.NODE_ENV === 'development') {
			return handler(event);
		}
		
		// TODO: Implementar verificação de autenticação real
		// Por agora, simplesmente executar o handler
		return handler(event);
	};
}

// GET - Listar todos os prompts
export const GET: RequestHandler = requireAdminAuth(async ({ url, platform }) => {
	try {
		const db = getDatabase(platform);
		
		// Parâmetros de filtro
		const name = url.searchParams.get('name');
		const category = url.searchParams.get('category');
		const active = url.searchParams.get('active');
		
		let whereConditions = ['1=1'];
		let params: any[] = [];
		
		if (name) {
			whereConditions.push(`name = $${params.length + 1}`);
			params.push(name);
		}
		
		if (category) {
			whereConditions.push(`category = $${params.length + 1}`);
			params.push(category);
		}
		
		if (active) {
			whereConditions.push(`is_active = $${params.length + 1}`);
			params.push(active === 'true');
		}
		
		const query = `
			SELECT 
				id, name, category, title, description,
				prompt_template, variables, expected_output,
				is_active, version, created_at, updated_at
			FROM ai_prompts 
			WHERE ${whereConditions.join(' AND ')}
			ORDER BY name, category
		`;
		
		const prompts = await db.query(query, ...params);
		await db.close();
		
		return json({
			success: true,
			data: prompts
		});
		
	} catch (error) {
		console.error('Erro ao buscar prompts:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
});

// POST - Criar novo prompt
export const POST: RequestHandler = requireAdminAuth(async ({ request, platform }) => {
	try {
		const requestData = await request.json();
		const { 
			name, 
			category, 
			title, 
			description, 
			prompt_template, 
			variables, 
			expected_output 
		} = requestData;
		
		// Validação básica
		if (!name || !title || !prompt_template) {
			return json({
				success: false,
				error: 'Campos obrigatórios: name, title, prompt_template'
			}, { status: 400 });
		}
		
		const db = getDatabase(platform);
		
		// Verificar se já existe
		const existing = await db.query`
			SELECT id FROM ai_prompts 
			WHERE name = ${name} AND category = ${category || 'general'}
		`;
		
		if (existing.length > 0) {
			await db.close();
			return json({
				success: false,
				error: 'Já existe um prompt com esse nome e categoria'
			}, { status: 409 });
		}
		
		// Inserir novo prompt (sem created_by por enquanto)
		const result = await db.query`
			INSERT INTO ai_prompts (
				name, category, title, description, 
				prompt_template, variables, expected_output
			) VALUES (
				${name}, 
				${category || 'general'}, 
				${title}, 
				${description || ''}, 
				${prompt_template},
				${JSON.stringify(variables || [])},
				${expected_output || ''}
			) RETURNING id, name, category, title
		`;
		
		await db.close();
		
		return json({
			success: true,
			data: result[0],
			message: 'Prompt criado com sucesso'
		});
		
	} catch (error) {
		console.error('Erro ao criar prompt:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
});

// PUT - Atualizar prompt existente
export const PUT: RequestHandler = requireAdminAuth(async ({ request, platform }) => {
	try {
		const requestData = await request.json();
		const { 
			id,
			name, 
			category, 
			title, 
			description, 
			prompt_template, 
			variables, 
			expected_output,
			is_active 
		} = requestData;
		
		if (!id) {
			return json({
				success: false,
				error: 'ID do prompt é obrigatório'
			}, { status: 400 });
		}
		
		const db = getDatabase(platform);
		
		// Buscar prompt atual para histórico
		const current = await db.query`
			SELECT * FROM ai_prompts WHERE id = ${id}
		`;
		
		if (current.length === 0) {
			await db.close();
			return json({
				success: false,
				error: 'Prompt não encontrado'
			}, { status: 404 });
		}
		
		// Salvar versão atual no histórico (sem created_by por enquanto)
		await db.query`
			INSERT INTO ai_prompts_history (
				prompt_id, version, prompt_template, variables,
				change_notes
			) VALUES (
				${id}, 
				${current[0].version}, 
				${current[0].prompt_template},
				${current[0].variables},
				'Versão anterior ao update'
			)
		`;
		
		// Atualizar prompt
		const newVersion = current[0].version + 1;
		const result = await db.query`
			UPDATE ai_prompts SET
				name = ${name || current[0].name},
				category = ${category || current[0].category},
				title = ${title || current[0].title},
				description = ${description || current[0].description},
				prompt_template = ${prompt_template || current[0].prompt_template},
				variables = ${JSON.stringify(variables || current[0].variables)},
				expected_output = ${expected_output || current[0].expected_output},
				is_active = ${is_active !== undefined ? is_active : current[0].is_active},
				version = ${newVersion},
				updated_at = NOW()
			WHERE id = ${id}
			RETURNING id, name, category, title, version
		`;
		
		await db.close();
		
		return json({
			success: true,
			data: result[0],
			message: 'Prompt atualizado com sucesso'
		});
		
	} catch (error) {
		console.error('Erro ao atualizar prompt:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
});

// DELETE - Desativar prompt (soft delete)
export const DELETE: RequestHandler = requireAdminAuth(async ({ url, platform }) => {
	try {
		const id = url.searchParams.get('id');
		
		if (!id) {
			return json({
				success: false,
				error: 'ID do prompt é obrigatório'
			}, { status: 400 });
		}
		
		const db = getDatabase(platform);
		
		// Desativar ao invés de deletar
		const result = await db.query`
			UPDATE ai_prompts SET 
				is_active = false,
				updated_at = NOW()
			WHERE id = ${id}
			RETURNING id, name
		`;
		
		await db.close();
		
		if (result.length === 0) {
			return json({
				success: false,
				error: 'Prompt não encontrado'
			}, { status: 404 });
		}
		
		return json({
			success: true,
			message: 'Prompt desativado com sucesso'
		});
		
	} catch (error) {
		console.error('Erro ao desativar prompt:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}); 