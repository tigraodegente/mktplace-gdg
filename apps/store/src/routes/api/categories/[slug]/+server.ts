import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const xata = getXataClient();
		const { slug } = params;
		
		// Buscar categoria pelo slug
		const category = await xata.db.categories
			.filter({ 
				slug,
				is_active: true 
			})
			.getFirst();
		
		if (!category) {
			return json({
				success: false,
				error: { message: 'Categoria não encontrada' }
			}, { status: 404 });
		}
		
		// Buscar subcategorias se houver
		const subcategories = await xata.db.categories
			.filter({
				parent_id: category.id,
				is_active: true
			})
			.select(['id', 'name', 'slug', 'description', 'image_url'])
			.sort('position', 'asc')
			.getAll();
		
		// Contar produtos na categoria
		const productCount = await xata.db.products
			.filter({
				category_id: category.id,
				is_active: true
			})
			.summarize({
				summaries: {
					count: { count: '*' }
				}
			})
			.then(result => result.summaries[0]?.count || 0);
		
		// Contar produtos nas subcategorias
		const subcategoriesWithCount = await Promise.all(
			subcategories.map(async (subcat) => {
				const count = await xata.db.products
					.filter({
						category_id: subcat.id,
						is_active: true
					})
					.summarize({
						summaries: {
							count: { count: '*' }
						}
					})
					.then(result => result.summaries[0]?.count || 0);
				
				return {
					id: subcat.id,
					name: subcat.name,
					slug: subcat.slug,
					description: subcat.description,
					image: subcat.image_url,
					count
				};
			})
		);
		
		return json({
			success: true,
			data: {
				id: category.id,
				name: category.name,
				slug: category.slug,
				description: category.description,
				image: category.image_url,
				productCount,
				subcategories: subcategoriesWithCount
			}
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