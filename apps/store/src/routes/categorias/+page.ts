import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Buscar árvore de categorias
		const response = await fetch('/api/categories/tree');
		
		if (!response.ok) {
			throw new Error('Erro ao buscar categorias');
		}
		
		const result = await response.json();
		
		if (!result.success) {
			throw new Error(result.error?.message || 'Erro desconhecido');
		}
		
		return {
			categories: result.data
		};
		
	} catch (error) {
		console.error('Erro ao carregar categorias:', error);
		return {
			categories: []
		};
	}
}; 