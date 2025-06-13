import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { withAdminAuth, authUtils } from '@mktplace/utils';

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
export const GET: RequestHandler = async ({ params }) => {
	try {
		console.log('🔌 Dev: NEON - Buscando histórico do produto');
		const db = getDatabase();
		const { id } = params;
		
		const query = `
			SELECT 
				id,
				product_id,
				user_name,
				user_email,
				action,
				changes,
				summary,
				created_at
			FROM product_history 
			WHERE product_id = $1 
			ORDER BY created_at DESC
			LIMIT 50
		`;
		
		const result = await db.query(query, [id]);
		
		console.log(`✅ Encontrado ${result.length} registros de histórico para produto ${id}`);
		
		return json({
			success: true,
			data: result,
			meta: {
				total: result.length,
				product_id: id
			}
		});
		
	} catch (error) {
		console.error('❌ Erro ao buscar histórico:', error);
		return json({
			success: false,
			error: 'Erro ao buscar histórico',
			details: error instanceof Error ? error.message : 'Erro desconhecido'
		}, { status: 500 });
	}
};

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
		
		// Usar resumo enviado pelo frontend (mais inteligente) ou gerar um básico
		const summary = body.summary || generateChangeSummary(body.changes, body.action);
		
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

// Função para gerar resumo das alterações (fallback se frontend não enviar)
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
	
	// Para ação 'updated', gerar resumo específico
	const changedFields = Object.keys(changes);
	
	if (changedFields.length === 0) {
		return 'Nenhuma alteração detectada';
	}
	
	if (changedFields.length === 1) {
		const field = changedFields[0];
		const fieldName = getFieldDisplayName(field);
		return `${fieldName} alterado`;
	}
	
	if (changedFields.length === 2) {
		const fields = changedFields.map(getFieldDisplayName);
		return `${fields[0]} e ${fields[1]} alterados`;
	}
	
	if (changedFields.length === 3) {
		const fields = changedFields.map(getFieldDisplayName);
		return `${fields[0]}, ${fields[1]} e ${fields[2]} alterados`;
	}
	
	// Para 4+ campos, priorizar campos importantes
	const priorityFields = ['name', 'price', 'sku', 'quantity', 'is_active'];
	const priorityChanges = changedFields.filter(field => priorityFields.includes(field));
	
	if (priorityChanges.length > 0) {
		const priorityNames = priorityChanges.map(getFieldDisplayName);
		
		if (priorityChanges.length === 1 && changedFields.length <= 4) {
			const otherFields = changedFields.filter(f => !priorityFields.includes(f));
			const otherNames = otherFields.slice(0, 2).map(getFieldDisplayName);
			
			if (otherNames.length === 1) {
				return `${priorityNames[0]} e ${otherNames[0]} alterados`;
			} else if (otherNames.length === 2) {
				return `${priorityNames[0]}, ${otherNames[0]} e ${otherNames[1]} alterados`;
			}
		}
		
		if (priorityChanges.length >= 2) {
			return `${priorityNames[0]}, ${priorityNames[1]} e outros ${changedFields.length - 2} campos alterados`;
		}
		
		return `${priorityNames[0]} e outros ${changedFields.length - 1} campos alterados`;
	}
	
	// Se não há campos prioritários, listar os primeiros
	const firstFields = changedFields.slice(0, 3).map(getFieldDisplayName);
	if (changedFields.length <= 3) {
		return firstFields.join(', ') + ' alterados';
	}
	
	return `${firstFields[0]}, ${firstFields[1]} e outros ${changedFields.length - 2} campos alterados`;
}

// Mapear nomes técnicos para nomes amigáveis
function getFieldDisplayName(field: string): string {
	const fieldNames: Record<string, string> = {
		// Básicos
		name: 'Nome',
		slug: 'URL',
		sku: 'SKU',
		barcode: 'Código de Barras',
		model: 'Modelo',
		description: 'Descrição',
		short_description: 'Descrição Curta',
		
		// Preços
		price: 'Preço',
		original_price: 'Preço Original',
		cost: 'Custo',
		sale_price: 'Preço de Venda',
		regular_price: 'Preço Regular',
		
		// Status
		is_active: 'Status Ativo',
		status: 'Status',
		featured: 'Em Destaque',
		condition: 'Condição',
		
		// Estoque
		quantity: 'Quantidade em Estoque',
		stock_location: 'Localização do Estoque',
		track_inventory: 'Controlar Estoque',
		allow_backorder: 'Permitir Pré-venda',
		
		// Relacionamentos
		category_id: 'Categoria',
		brand_id: 'Marca',
		seller_id: 'Vendedor',
		
		// Dimensões
		weight: 'Peso',
		height: 'Altura',
		width: 'Largura',
		length: 'Comprimento',
		
		// Frete
		has_free_shipping: 'Frete Grátis',
		delivery_days: 'Prazo de Entrega',
		requires_shipping: 'Requer Frete',
		is_digital: 'Produto Digital',
		
		// SEO
		meta_title: 'Título SEO',
		meta_description: 'Descrição SEO',
		meta_keywords: 'Palavras-chave SEO',
		
		// Arrays/Objetos
		tags: 'Tags',
		images: 'Imagens',
		attributes: 'Atributos para Filtros',
		specifications: 'Especificações Técnicas'
	};
	
	return fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
} 