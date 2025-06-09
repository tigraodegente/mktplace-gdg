import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	try {
		console.log('🧪 SERVER LOAD - Carregando dados no servidor...');
		console.log('🧪 SERVER LOAD - URL params:', url.search);
		
		// Construir URL da API com todos os parâmetros da busca
		const apiParams = new URLSearchParams(url.searchParams);
		apiParams.set('limite', '20'); // ✅ CORRIGIDO: usar 'limite' em vez de 'limit'
		
		const apiUrl = `/api/products?${apiParams.toString()}`;
		console.log('🧪 SERVER LOAD - URL:', apiUrl);
		
		const response = await fetch(apiUrl);
		const data = await response.json();
		
		console.log('🧪 SERVER LOAD - Resultado:', {
			success: data.success,
			products_count: data.data?.products?.length || 0,
			facets_categories: data.data?.facets?.categories?.length || 0,
			facets_brands: data.data?.facets?.brands?.length || 0,
			facets_tags: data.data?.facets?.tags?.length || 0
		});
		
		return {
			serverData: {
				success: data.success,
				products: data.data?.products || [],
				facets: data.data?.facets || {},
				totalCount: data.data?.pagination?.total || 0
			}
		};
	} catch (error) {
		console.error('🧪 SERVER LOAD - Erro:', error);
		return {
			serverData: {
				success: false,
				products: [],
				facets: {},
				totalCount: 0,
				error: error instanceof Error ? error.message : String(error)
			}
		};
	}
}; 