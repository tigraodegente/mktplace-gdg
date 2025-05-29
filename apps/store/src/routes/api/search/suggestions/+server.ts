import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchService } from '$lib/services/searchService';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	
	if (!query || query.length < 2) {
		// Formato OpenSearch: [query, [suggestions], [descriptions], [urls]]
		return json(['', [], [], []]);
	}
	
	try {
		// Buscar sugestões usando o serviço existente
		const suggestions = await searchService.quickSearch(query);
		
		// Converter para formato OpenSearch
		const texts = suggestions.map(s => s.text);
		const descriptions = suggestions.map(s => {
			if (s.type === 'product' && s.price) {
				return `Produto - R$ ${s.price.toFixed(2).replace('.', ',')}`;
			} else if (s.type === 'category' && s.count) {
				return `Categoria - ${s.count} produtos`;
			} else if (s.type === 'brand') {
				return 'Marca';
			}
			return '';
		});
		
		// URLs diretas para cada sugestão
		const urls = suggestions.map(s => {
			const baseUrl = url.origin;
			if (s.type === 'product' && s.slug) {
				return `${baseUrl}/produto/${s.slug}`;
			} else if (s.type === 'category' && s.slug) {
				return `${baseUrl}/busca?categoria=${s.slug}`;
			} else if (s.type === 'brand' && s.id) {
				return `${baseUrl}/busca?marca=${s.id}`;
			}
			return `${baseUrl}/busca?q=${encodeURIComponent(s.text)}`;
		});
		
		// Retornar no formato OpenSearch
		return json([query, texts, descriptions, urls]);
		
	} catch (error) {
		console.error('Erro ao buscar sugestões:', error);
		return json([query, [], [], []]);
	}
}; 