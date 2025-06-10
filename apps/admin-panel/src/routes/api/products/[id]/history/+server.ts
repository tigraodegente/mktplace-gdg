import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { withAdminAuth, authUtils } from '@mktplace/utils/auth/middleware';

export interface ProductHistoryEntry {
	id: string;
	product_id: string;
	user_id: string;
	user_name: string;
	action: 'created' | 'updated' | 'deleted' | 'published' | 'unpublished';
	changes: Record<string, { old: any; new: any }>;
	summary: string;
	created_at: string;
}

// GET - Buscar histórico do produto
export const GET: RequestHandler = withAdminAuth(async ({ params, url, data, platform }: any) => {
	try {
		const user = authUtils.getUser({ data });
		const db = getDatabase(platform);
		const { id: productId } = params;
		
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = (page - 1) * limit;
		
		console.log(`📋 Buscando histórico do produto ${productId} - página ${page}`);
		
		// Buscar histórico
		const query = `
			SELECT 
				ph.*,
				u.name as user_name,
				u.email as user_email,
				COUNT(*) OVER() as total_count
			FROM product_history ph
			LEFT JOIN users u ON u.id = ph.user_id
			WHERE ph.product_id = $1
			ORDER BY ph.created_at DESC
			LIMIT $2 OFFSET $3
		`;
		
		const history = await db.query(query, [productId, limit, offset]);
		const totalCount = history[0]?.total_count || 0;
		
		await db.close();
		
		return json({
			success: true,
			data: history.map((entry: any) => ({
				id: entry.id,
				product_id: entry.product_id,
				user_id: entry.user_id,
				user_name: entry.user_name || 'Sistema',
				user_email: entry.user_email,
				action: entry.action,
				changes: entry.changes || {},
				summary: entry.summary || '',
				created_at: entry.created_at
			})),
			meta: {
				page,
				limit,
				total: parseInt(totalCount),
				totalPages: Math.ceil(totalCount / limit),
				hasNext: offset + limit < totalCount,
				hasPrev: page > 1
			}
		});
		
	} catch (error) {
		console.error('❌ Erro ao buscar histórico:', error);
		return json({
			success: false,
			error: 'Erro ao buscar histórico'
		}, { status: 500 });
	}
});

// POST - Registrar alteração no histórico
export const POST: RequestHandler = withAdminAuth(async ({ params, request, data, platform }: any) => {
	try {
		const user = authUtils.getUser({ data });
		const db = getDatabase(platform);
		const { id: productId } = params;
		const body = await request.json();
		
		console.log(`📝 Registrando alteração no produto ${productId} por ${user?.name}`);
		
		// Validar dados
		if (!body.action || !body.changes) {
			await db.close();
			return json({
				success: false,
				error: 'Action e changes são obrigatórios'
			}, { status: 400 });
		}
		
		// Gerar resumo das alterações
		const summary = generateChangeSummary(body.changes, body.action);
		
		// Inserir no histórico
		const result = await db.query(`
			INSERT INTO product_history (
				product_id, user_id, action, changes, summary, created_at
			) VALUES (
				$1, $2, $3, $4, $5, NOW()
			) RETURNING *
		`, [
			productId,
			user?.id || null,
			body.action,
			JSON.stringify(body.changes),
			summary
		]);
		
		await db.close();
		
		return json({
			success: true,
			data: result[0]
		});
		
	} catch (error) {
		console.error('❌ Erro ao registrar histórico:', error);
		return json({
			success: false,
			error: 'Erro ao registrar histórico'
		}, { status: 500 });
	}
});

// Função para gerar resumo das alterações
function generateChangeSummary(changes: Record<string, { old: any; new: any }>, action: string): string {
	if (action === 'created') {
		return 'Produto criado';
	}
	
	if (action === 'deleted') {
		return 'Produto excluído';
	}
	
	if (action === 'published') {
		return 'Produto publicado';
	}
	
	if (action === 'unpublished') {
		return 'Produto despublicado';
	}
	
	// Para ação 'updated', gerar resumo baseado nos campos alterados
	const changedFields = Object.keys(changes);
	
	if (changedFields.length === 1) {
		const field = changedFields[0];
		const fieldName = getFieldDisplayName(field);
		return `${fieldName} alterado`;
	}
	
	if (changedFields.length === 2) {
		const fields = changedFields.map(getFieldDisplayName);
		return `${fields[0]} e ${fields[1]} alterados`;
	}
	
	if (changedFields.length <= 5) {
		const fields = changedFields.map(getFieldDisplayName);
		const lastField = fields.pop();
		return `${fields.join(', ')} e ${lastField} alterados`;
	}
	
	return `${changedFields.length} campos alterados`;
}

// Mapear nomes técnicos para nomes amigáveis
function getFieldDisplayName(field: string): string {
	const fieldNames: Record<string, string> = {
		name: 'Nome',
		sku: 'SKU',
		price: 'Preço',
		original_price: 'Preço original',
		cost: 'Custo',
		description: 'Descrição',
		short_description: 'Descrição curta',
		quantity: 'Estoque',
		is_active: 'Status ativo',
		featured: 'Em destaque',
		category_id: 'Categoria',
		brand_id: 'Marca',
		tags: 'Tags',
		weight: 'Peso',
		height: 'Altura',
		width: 'Largura',
		length: 'Comprimento',
		meta_title: 'Título SEO',
		meta_description: 'Descrição SEO',
		meta_keywords: 'Palavras-chave SEO',
		attributes: 'Atributos',
		specifications: 'Especificações',
		images: 'Imagens'
	};
	
	return fieldNames[field] || field;
} 