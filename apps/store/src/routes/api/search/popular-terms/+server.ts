import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/db'

interface PopularTerm {
  term: string
  search_count: number
}

interface ProductTerm {
  term: string
}

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDatabase(platform)
  
  try {
    // Buscar os 10 termos mais populares dos últimos 30 dias
    const popularTerms = await db.query<PopularTerm>`
      SELECT term, search_count
      FROM popular_searches
      WHERE period_end >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY search_count DESC
      LIMIT 10
    `
    
    // Se não houver termos suficientes, buscar dos produtos mais vendidos
    if (popularTerms.length < 5) {
      const productTerms = await db.query<ProductTerm>`
        SELECT DISTINCT LOWER(p.name) as term
        FROM products p
        INNER JOIN order_items oi ON oi.product_id = p.id
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY p.name
        ORDER BY COUNT(oi.id) DESC
        LIMIT 10
      `
      
      // Combinar com os termos existentes
      const existingTerms = new Set(popularTerms.map((t: PopularTerm) => t.term))
      for (const pt of productTerms) {
        if (!existingTerms.has(pt.term) && popularTerms.length < 10) {
          popularTerms.push({ term: pt.term, search_count: 0 })
        }
      }
    }
    
    return json({
      success: true,
      data: popularTerms.map((t: PopularTerm) => t.term)
    })
    
  } catch (error) {
    console.error('Erro ao buscar termos populares:', error)
    
    // Fallback para termos padrão em caso de erro
    return json({
      success: true,
      data: [
        'samsung',
        'iphone',
        'notebook',
        'fone de ouvido',
        'tv',
        'playstation'
      ]
    })
  } finally {
    await db.close()
  }
} 