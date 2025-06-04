import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Listar todas as coleções
export async function GET({ url, platform }) {
	try {
		const search = url.searchParams.get('search') || '';
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		return await withDatabase(platform, async (db) => {
			let query = `
				SELECT 
					c.id,
					c.name,
					c.slug,
					c.description,
					c.image_url,
					c.is_active,
					c.position,
					c.created_at,
					c.updated_at,
					COUNT(pc.product_id) as product_count
				FROM collections c
				LEFT JOIN product_collections pc ON pc.collection_id = c.id
			`;
			
			const params: any[] = [];
			let whereClause = '';
			
			if (search) {
				whereClause = ' WHERE c.name ILIKE $1 OR c.description ILIKE $1';
				params.push(`%${search}%`);
			}
			
			query += whereClause;
			query += ` GROUP BY c.id ORDER BY c.position ASC, c.name ASC`;
			query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
			params.push(limit, offset);
			
			const collections = await db.query(query, params);
			
			// Buscar total de registros
			let countQuery = 'SELECT COUNT(*) as total FROM collections c';
			if (search) {
				countQuery += ' WHERE c.name ILIKE $1 OR c.description ILIKE $1';
			}
			
			const totalResult = await db.query(countQuery, search ? [`%${search}%`] : []);
			const total = parseInt(totalResult[0].total);
			
			return json({
				success: true,
				data: collections,
				meta: {
					total,
					limit,
					offset,
					hasMore: offset + limit < total
				}
			});
		});
	} catch (error) {
		console.error('Erro ao buscar coleções:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Criar nova coleção
export async function POST({ request, platform }) {
	try {
		const { name, slug, description, image_url, is_active = true, position = 0 } = await request.json();
		
		if (!name || !slug) {
			return json({
				success: false,
				error: 'Nome e slug são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			const query = `
				INSERT INTO collections (name, slug, description, image_url, is_active, position)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *
			`;
			
			const result = await db.query(query, [name, slug, description, image_url, is_active, position]);
			
			return json({
				success: true,
				data: result[0],
				message: 'Coleção criada com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao criar coleção:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// PUT - Atualizar coleção
export async function PUT({ request, platform }) {
	try {
		const { id, name, slug, description, image_url, is_active, position } = await request.json();
		
		if (!id) {
			return json({
				success: false,
				error: 'ID da coleção é obrigatório'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			const query = `
				UPDATE collections 
				SET name = $2, slug = $3, description = $4, image_url = $5, 
				    is_active = $6, position = $7, updated_at = NOW()
				WHERE id = $1
				RETURNING *
			`;
			
			const result = await db.query(query, [id, name, slug, description, image_url, is_active, position]);
			
			if (!result[0]) {
				return json({
					success: false,
					error: 'Coleção não encontrada'
				}, { status: 404 });
			}
			
			return json({
				success: true,
				data: result[0],
				message: 'Coleção atualizada com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar coleção:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// DELETE - Remover coleção
export async function DELETE({ request, platform }) {
	try {
		const { ids } = await request.json();
		
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return json({
				success: false,
				error: 'IDs das coleções são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			// Remover produtos das coleções primeiro
			await db.query(`DELETE FROM product_collections WHERE collection_id = ANY($1)`, [ids]);
			
			// Remover as coleções
			const query = `DELETE FROM collections WHERE id = ANY($1)`;
			await db.query(query, [ids]);
			
			return json({
				success: true,
				message: `${ids.length} coleção(ões) removida(s) com sucesso`
			});
		});
	} catch (error) {
		console.error('Erro ao remover coleções:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 