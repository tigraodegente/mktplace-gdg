import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// ✅ CACHE para sugestões populares (5 minutos)
interface SuggestionCache {
	suggestions: string[];
	timestamp: number;
}

const popularCache = new Map<string, SuggestionCache>();
const CACHE_DURATION = 300000; // 5 minutos

export const GET: RequestHandler = async ({ url, platform }) => {
	const query = url.searchParams.get('q') || '';
	const limit = parseInt(url.searchParams.get('limit') || '8');
	
	if (!query.trim() || query.length < 2) {
		return json({ success: true, data: { suggestions: [] } });
	}
	
	const cacheKey = `${query.toLowerCase()}_${limit}`;
	const cached = popularCache.get(cacheKey);
	
	// ✅ CACHE HIT - Retornar sugestões em cache
	if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
		return json({
			success: true,
			data: {
				suggestions: cached.suggestions,
				source: 'cache'
			}
		});
	}
	
	try {
		const db = getDatabase(platform);
		
		// ✅ BUSCA OTIMIZADA - Full-text search + similaridade
		const suggestionsQuery = `
			WITH search_results AS (
				-- 1. 🚀 Full-text search com ranking alto
				SELECT DISTINCT
					p.name,
					ts_rank(p.search_vector, plainto_tsquery('portuguese', $1)) * 10 as rank,
					'fulltext' as source
				FROM products p
				WHERE p.is_active = true
				AND p.search_vector @@ plainto_tsquery('portuguese', $1)
				
				UNION ALL
				
				-- 2. 🎯 Busca por nome (início da palavra)
				SELECT DISTINCT
					p.name,
					8.0 as rank,
					'name_start' as source
				FROM products p
				WHERE p.is_active = true
				AND LOWER(p.name) LIKE LOWER($2)
				
				UNION ALL
				
				-- 3. 🔍 Busca por nome (contém)
				SELECT DISTINCT
					p.name,
					5.0 as rank,
					'name_contains' as source
				FROM products p
				WHERE p.is_active = true
				AND LOWER(p.name) LIKE LOWER($3)
				AND NOT LOWER(p.name) LIKE LOWER($2) -- Evitar duplicatas
				
				UNION ALL
				
				-- 4. 🏷️ Busca em marcas populares
				SELECT DISTINCT
					b.name,
					6.0 as rank,
					'brand' as source
				FROM brands b
				JOIN products p ON p.brand_id = b.id
				WHERE p.is_active = true
				AND LOWER(b.name) LIKE LOWER($3)
				GROUP BY b.name
				HAVING COUNT(p.id) >= 5 -- Pelo menos 5 produtos
				
				UNION ALL
				
				-- 5. 📂 Busca em categorias
				SELECT DISTINCT
					c.name,
					4.0 as rank,
					'category' as source
				FROM categories c
				JOIN product_categories pc ON pc.category_id = c.id
				JOIN products p ON p.id = pc.product_id
				WHERE c.is_active = true
				AND p.is_active = true
				AND LOWER(c.name) LIKE LOWER($3)
				GROUP BY c.name
				HAVING COUNT(p.id) >= 3 -- Pelo menos 3 produtos
			)
			SELECT name, MAX(rank) as max_rank, string_agg(DISTINCT source, ',') as sources
			FROM search_results
			GROUP BY name
			ORDER BY max_rank DESC, LENGTH(name) ASC
			LIMIT $4
		`;
		
		const results = await db.query(suggestionsQuery, [
			query,           // $1 - Full-text search
			`${query}%`,     // $2 - Início da palavra
			`%${query}%`,    // $3 - Contém
			limit            // $4 - Limite
		]);
		
		const suggestions = results.map((row: any) => row.name);
		
		// ✅ CACHE das sugestões
		popularCache.set(cacheKey, {
			suggestions,
			timestamp: Date.now()
		});
		
		// ✅ LIMPEZA DE CACHE (manter apenas 100 entradas)
		if (popularCache.size > 100) {
			const oldestKey = [...popularCache.keys()][0];
			popularCache.delete(oldestKey);
		}
		
		return json({
			success: true,
			data: {
				suggestions,
				source: 'database',
				count: suggestions.length
			}
		});
		
	} catch (error: any) {
		console.error('❌ Erro na API de sugestões:', error);
		
		return json({
			success: false,
			error: {
				code: 'SUGGESTIONS_ERROR',
				message: 'Erro ao buscar sugestões'
			}
		}, { status: 500 });
	}
}; 