import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ params, platform }) => {
	try {
		const { slug } = params;
		
		const result = await withDatabase(platform, async (db) => {
			// Buscar categoria pelo slug
			const category = await db.queryOne`
				SELECT id, name, slug, description, image_url
				FROM categories
				WHERE slug = ${slug} AND is_active = true
			`;
			
			if (!category) {
				return null;
			}
			
			// Buscar subcategorias com contagem de produtos
			const subcategories = await db.query`
				SELECT 
					c.id,
					c.name,
					c.slug,
					c.description,
					c.image_url,
					COUNT(p.id)::text as product_count
				FROM categories c
				LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
				WHERE c.parent_id = ${category.id} AND c.is_active = true
				GROUP BY c.id, c.name, c.slug, c.description, c.image_url, c.position
				ORDER BY c.position ASC, c.name ASC
			`;
			
			// Contar produtos na categoria principal
			const productCountResult = await db.queryOne`
				SELECT COUNT(*)::text as count
				FROM products
				WHERE category_id = ${category.id} AND is_active = true
			`;
			
			const productCount = parseInt(productCountResult?.count || '0');
			
			// Formatar subcategorias
			const subcategoriesWithCount = subcategories.map((subcat: any) => ({
				id: subcat.id,
				name: subcat.name,
				slug: subcat.slug,
				description: subcat.description,
				image: subcat.image_url,
				count: parseInt(subcat.product_count)
			}));
			
			return {
				id: category.id,
				name: category.name,
				slug: category.slug,
				description: category.description,
				image: category.image_url,
				productCount,
				subcategories: subcategoriesWithCount
			};
		});
		
		if (!result) {
			return json({
				success: false,
				error: { message: 'Categoria não encontrada' }
			}, { status: 404 });
		}
		
		return json({
			success: true,
			data: result
		});
		
	} catch (error) {
		console.error('Erro ao buscar categoria:', error);
		return json({
			success: false,
			error: {
				message: 'Erro ao buscar categoria',
				details: error instanceof Error ? error.message : 'Erro desconhecido'
			}
		}, { status: 500 });
	}
}; 