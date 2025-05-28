import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';

interface CategoryNode {
	id: string;
	name: string;
	slug: string;
	icon?: string;
	parent_id: string | null;
	children?: CategoryNode[];
	productCount?: number;
}

export const GET: RequestHandler = async () => {
	try {
		const xata = getXataClient();
		
		// Buscar todas as categorias ativas
		const categories = await xata.db.categories
			.filter({ is_active: true })
			.select(['id', 'name', 'slug', 'parent_id', 'position'])
			.sort('position', 'asc')
			.getAll();
		
		// Contar produtos por categoria
		const productCounts = await xata.db.products
			.filter({ is_active: true })
			.summarize({
				columns: ['category_id'],
				summaries: {
					count: { count: '*' }
				}
			});
		
		// Criar mapa de contagem
		const countMap = new Map<string, number>();
		if (productCounts.summaries && Array.isArray(productCounts.summaries)) {
			productCounts.summaries.forEach((summary: any) => {
				if (summary.category_id) {
					countMap.set(summary.category_id, summary.count || 0);
				}
			});
		}
		
		// Criar mapa de categorias
		const categoryMap = new Map<string, CategoryNode>();
		const rootCategories: CategoryNode[] = [];
		
		// Primeira passada: criar todos os nós
		categories.forEach(cat => {
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
		
		return json({
			success: true,
			data: rootCategories
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