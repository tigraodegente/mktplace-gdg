import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url, setHeaders }) => {
	// Headers de cache otimizados para categorias (mudam menos frequentemente)
	setHeaders({
		'cache-control': 'public, max-age=900, s-maxage=1800', // 15min client, 30min CDN
		'vary': 'Accept-Encoding'
	});

	try {
		const includeProducts = url.searchParams.get('includeProducts') === 'true';
		const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);
		
		const result = await withDatabase(platform, async (db) => {
			// Query otimizada para buscar categorias hierárquicas com contagem de produtos
			const categories = await db.query`
				WITH RECURSIVE category_tree AS (
					-- Categorias raiz (sem parent)
					SELECT 
						c.id,
						c.name,
						c.slug,
						c.description,
						c.parent_id,
						c.is_active,
						c.sort_order,
						c.created_at,
						c.updated_at,
						0 as level,
						c.id::text as path
					FROM categories c
					WHERE c.parent_id IS NULL AND c.is_active = true
					
					UNION ALL
					
					-- Categorias filhas (recursivo)
					SELECT 
						c.id,
						c.name,
						c.slug,
						c.description,
						c.parent_id,
						c.is_active,
						c.sort_order,
						c.created_at,
						c.updated_at,
						ct.level + 1,
						ct.path || '/' || c.id::text
					FROM categories c
					INNER JOIN category_tree ct ON c.parent_id = ct.id
					WHERE c.is_active = true AND ct.level < 3 -- Máximo 3 níveis
				),
				category_stats AS (
					SELECT 
						c.id as category_id,
						COUNT(DISTINCT p.id) as product_count,
						COUNT(DISTINCT CASE WHEN p.quantity > 0 THEN p.id END) as available_count,
						COUNT(DISTINCT CASE WHEN p.featured = true THEN p.id END) as featured_count,
						AVG(p.price) as avg_price,
						MIN(p.price) as min_price,
						MAX(p.price) as max_price
					FROM category_tree c
					LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
					GROUP BY c.id
				)
				SELECT 
					ct.*,
					COALESCE(cs.product_count, 0) as product_count,
					COALESCE(cs.available_count, 0) as available_count,
					COALESCE(cs.featured_count, 0) as featured_count,
					cs.avg_price,
					cs.min_price,
					cs.max_price
				FROM category_tree ct
				LEFT JOIN category_stats cs ON cs.category_id = ct.id
				ORDER BY ct.level, ct.sort_order NULLS LAST, ct.name
				LIMIT ${limit}
			`;
			
			// Organizar em estrutura hierárquica
			const categoryMap = new Map();
			const rootCategories: any[] = [];
			
			// Primeiro passo: criar objetos de categoria
			categories.forEach((cat: any) => {
				const category = {
					id: cat.id,
					name: cat.name,
					slug: cat.slug,
					description: cat.description,
					parent_id: cat.parent_id,
					level: cat.level,
					sort_order: cat.sort_order,
					productCount: parseInt(cat.product_count) || 0,
					availableCount: parseInt(cat.available_count) || 0,
					featuredCount: parseInt(cat.featured_count) || 0,
					priceRange: cat.min_price && cat.max_price ? {
						min: Number(cat.min_price),
						max: Number(cat.max_price),
						avg: cat.avg_price ? Number(cat.avg_price) : undefined
					} : undefined,
					children: [],
					created_at: cat.created_at,
					updated_at: cat.updated_at
				};
				
				categoryMap.set(cat.id, category);
				
				if (!cat.parent_id) {
					rootCategories.push(category);
				}
			});
			
			// Segundo passo: organizar hierarquia
			categories.forEach((cat: any) => {
				if (cat.parent_id) {
					const parent = categoryMap.get(cat.parent_id);
					const child = categoryMap.get(cat.id);
					if (parent && child) {
						parent.children.push(child);
					}
				}
			});
			
			// Incluir produtos se solicitado
			if (includeProducts) {
				const categoryIds = Array.from(categoryMap.keys());
				if (categoryIds.length > 0) {
					const products = await db.query`
						SELECT 
							p.id,
							p.name,
							p.slug,
							p.price,
							p.original_price,
							p.category_id,
							p.featured,
							pi.url as image
						FROM products p
						LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.position = 1
						WHERE 
							p.category_id = ANY(${categoryIds})
							AND p.is_active = true 
							AND p.quantity > 0
						ORDER BY p.featured DESC, p.sales_count DESC
					`;
					
					// Agrupar produtos por categoria
					const productsByCategory = new Map<string, any[]>();
					products.forEach((product: any) => {
						const categoryProducts = productsByCategory.get(product.category_id) || [];
						categoryProducts.push({
							id: product.id,
							name: product.name,
							slug: product.slug,
							price: Number(product.price),
							original_price: product.original_price ? Number(product.original_price) : undefined,
							image: product.image,
							featured: product.featured
						});
						productsByCategory.set(product.category_id, categoryProducts);
					});
					
					// Adicionar produtos às categorias
					categoryMap.forEach((category, categoryId) => {
						category.products = productsByCategory.get(categoryId) || [];
					});
				}
			}
			
			return rootCategories;
		});
		
		console.log(`✅ API categorias: ${result.length} categorias raiz retornadas`);
		
		return json({
			success: true,
			data: result,
			meta: {
				total: result.length,
				includeProducts,
				timestamp: new Date().toISOString()
			}
		});
		
	} catch (error) {
		console.error('❌ Erro na API de categorias:', error);
		return json({
			success: false,
			error: { 
				message: 'Erro ao buscar categorias',
				details: error instanceof Error ? error.message : 'Erro desconhecido'
			}
		}, { status: 500 });
	}
}; 