import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const db = getDatabase();
		
		// Parâmetros de consulta
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const search = url.searchParams.get('search') || '';
		const offset = (page - 1) * limit;
		
		// Query de contagem com ou sem busca
		let totalResult;
		if (search.trim()) {
			// Com busca - usando cast explícito para o parâmetro
			const searchPattern = `%${search}%`;
			totalResult = await db.query(
				`SELECT COUNT(*) as total FROM brands 
				 WHERE name ILIKE $1::text OR slug ILIKE $1::text OR description ILIKE $1::text`,
				[searchPattern]
			);
		} else {
			// Sem busca
			totalResult = await db.query('SELECT COUNT(*) as total FROM brands');
		}
		
		const total = parseInt(totalResult[0]?.total || '0');
		const totalPages = Math.ceil(total / limit);
		
		// Query principal com ou sem busca
		let brands;
		if (search.trim()) {
			// Com busca - usando cast explícito para o parâmetro
			const searchPattern = `%${search}%`;
			const mainQuery = `
				SELECT 
					b.*,
					COALESCE(p.product_count, 0) as product_count
				FROM brands b
				LEFT JOIN (
					SELECT brand_id, COUNT(*) as product_count 
					FROM products 
					GROUP BY brand_id
				) p ON p.brand_id = b.id
				WHERE b.name ILIKE $1::text OR b.slug ILIKE $1::text OR b.description ILIKE $1::text
				ORDER BY b.name ASC
				LIMIT ${limit} OFFSET ${offset}
			`;
			brands = await db.query(mainQuery, [searchPattern]);
		} else {
			// Sem busca
			const mainQuery = `
				SELECT 
					b.*,
					COALESCE(p.product_count, 0) as product_count
				FROM brands b
				LEFT JOIN (
					SELECT brand_id, COUNT(*) as product_count 
					FROM products 
					GROUP BY brand_id
				) p ON p.brand_id = b.id
				ORDER BY b.name ASC
				LIMIT ${limit} OFFSET ${offset}
			`;
			brands = await db.query(mainQuery);
		}
		
		return json({
			success: true,
			data: {
				brands,
				pagination: {
					currentPage: page,
					totalPages,
					total,
					limit,
					hasNext: page < totalPages,
					hasPrev: page > 1
				}
			}
		});
		
	} catch (error: any) {
		console.error('❌ Erro na query:', error);
		return json({
			success: false,
			error: 'Erro ao buscar marcas'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		// Validação
		if (!data.name || !data.slug) {
			return json({
				success: false,
				error: 'Nome e slug são obrigatórios'
			}, { status: 400 });
		}
		
		// Verificar se slug já existe
		const existingBrand = await db.query(
			'SELECT id FROM brands WHERE slug = $1',
			[data.slug]
		);
		
		if (existingBrand.length > 0) {
			return json({
				success: false,
				error: 'Slug já existe'
			}, { status: 400 });
		}
		
		// Inserir nova marca (ajustando o nome da coluna website)
		const result = await db.query(
			`INSERT INTO brands (name, slug, description, logo_url, website, is_active, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, NOW())
			 RETURNING *`,
			[
				data.name,
				data.slug,
				data.description || null,
				data.logo_url || null,
				data.website || null, // Mudança aqui: website em vez de website_url
				data.is_active ?? true
			]
		);
		
		return json({
			success: true,
			data: result[0],
			message: 'Marca criada com sucesso'
		});
		
	} catch (error: any) {
		console.error('❌ Erro ao criar marca:', error);
		return json({
			success: false,
			error: 'Erro ao criar marca'
		}, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		// Validação
		if (!data.id || !data.name || !data.slug) {
			return json({
				success: false,
				error: 'ID, nome e slug são obrigatórios'
			}, { status: 400 });
		}
		
		// Verificar se marca existe
		const existingBrand = await db.query(
			'SELECT id FROM brands WHERE id = $1',
			[data.id]
		);
		
		if (existingBrand.length === 0) {
			return json({
				success: false,
				error: 'Marca não encontrada'
			}, { status: 404 });
		}
		
		// Verificar se slug já existe (exceto para a própria marca)
		const slugCheck = await db.query(
			'SELECT id FROM brands WHERE slug = $1 AND id != $2',
			[data.slug, data.id]
		);
		
		if (slugCheck.length > 0) {
			return json({
				success: false,
				error: 'Slug já existe'
			}, { status: 400 });
		}
		
		// Atualizar marca (ajustando o nome da coluna website)
		const result = await db.query(
			`UPDATE brands 
			 SET name = $1, slug = $2, description = $3, logo_url = $4, 
			     website = $5, is_active = $6, updated_at = NOW()
			 WHERE id = $7
			 RETURNING *`,
			[
				data.name,
				data.slug,
				data.description || null,
				data.logo_url || null,
				data.website || null, // Mudança aqui: website em vez de website_url
				data.is_active ?? true,
				data.id
			]
		);
		
		return json({
			success: true,
			data: result[0],
			message: 'Marca atualizada com sucesso'
		});
		
	} catch (error: any) {
		console.error('❌ Erro ao atualizar marca:', error);
		return json({
			success: false,
			error: 'Erro ao atualizar marca'
		}, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.id) {
			return json({
				success: false,
				error: 'ID da marca é obrigatório'
			}, { status: 400 });
		}
		
		// Verificar se marca existe
		const existingBrand = await db.query(
			'SELECT id, name FROM brands WHERE id = $1',
			[data.id]
		);
		
		if (existingBrand.length === 0) {
			return json({
				success: false,
				error: 'Marca não encontrada'
			}, { status: 404 });
		}
		
		// Verificar se há produtos usando esta marca
		const productsCount = await db.query(
			'SELECT COUNT(*) as count FROM products WHERE brand_id = $1',
			[data.id]
		);
		
		if (parseInt(productsCount[0]?.count || '0') > 0) {
			return json({
				success: false,
				error: 'Não é possível excluir marca que possui produtos associados'
			}, { status: 400 });
		}
		
		// Excluir marca
		await db.query('DELETE FROM brands WHERE id = $1', [data.id]);
		
		return json({
			success: true,
			message: `Marca "${existingBrand[0].name}" excluída com sucesso`
		});
		
	} catch (error: any) {
		console.error('❌ Erro ao excluir marca:', error);
		return json({
			success: false,
			error: 'Erro ao excluir marca'
		}, { status: 500 });
	}
}; 