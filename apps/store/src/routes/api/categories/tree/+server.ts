import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

interface CategoryNode {
	id: string;
	name: string;
	slug: string;
	icon?: string;
	parent_id: string | null;
	children?: CategoryNode[];
	productCount?: number;
}

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const result = await withDatabase(platform, async (db) => {
			// Buscar todas as categorias ativas
			const categories = await db.query(`
				SELECT id, name, slug, parent_id, position
				FROM categories
				WHERE is_active = true
				ORDER BY position ASC, name ASC
			`);
			
			// Contar produtos por categoria
			const productCounts = await db.query(`
				SELECT 
					category_id,
					COUNT(*) as count
				FROM products
				WHERE is_active = true
				GROUP BY category_id
			`);
			
			// Criar mapa de contagem
			const countMap = new Map<string, number>();
			productCounts.forEach((row: any) => {
				if (row.category_id) {
					countMap.set(row.category_id, parseInt(row.count));
				}
			});
			
			// Criar mapa de categorias
			const categoryMap = new Map<string, CategoryNode>();
			const rootCategories: CategoryNode[] = [];
			
			// Primeira passada: criar todos os nós
			categories.forEach((cat: any) => {
				const node: CategoryNode = {
					id: cat.id,
					name: cat.name,
					slug: cat.slug,
					icon: undefined,
					parent_id: cat.parent_id || null,
					children: [],
					productCount: countMap.get(cat.id) || 0
				};
				categoryMap.set(cat.id, node);
			});
			
			// Segunda passada: construir a árvore
			categoryMap.forEach(node => {
				if (node.parent_id && categoryMap.has(node.parent_id)) {
					const parent = categoryMap.get(node.parent_id)!;
					parent.children!.push(node);
				} else {
					rootCategories.push(node);
				}
			});
			
			// Função para calcular total de produtos incluindo subcategorias
			function calculateTotalProducts(node: CategoryNode): number {
				let total = node.productCount || 0;
				if (node.children) {
					node.children.forEach(child => {
						total += calculateTotalProducts(child);
					});
				}
				node.productCount = total;
				return total;
			}
			
			// Calcular totais para cada categoria raiz
			rootCategories.forEach(cat => calculateTotalProducts(cat));
			
			// Ordenar children por productCount (mais produtos primeiro)
			function sortByProductCount(categories: CategoryNode[]) {
				categories.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
				categories.forEach(cat => {
					if (cat.children && cat.children.length > 0) {
						sortByProductCount(cat.children);
					}
				});
			}
			
			sortByProductCount(rootCategories);
			
			return rootCategories;
		});
		
		return json({
			success: true,
			data: result
		});
		
	} catch (error) {
		console.error('Erro ao buscar categorias:', error);
		return json({
			success: false,
			error: {
				message: 'Erro ao buscar categorias',
				details: error instanceof Error ? error.message : 'Erro desconhecido'
			}
		}, { status: 500 });
	}
}; 