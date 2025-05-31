import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/db'

interface PopularTerm {
  term: string
  count: number
}

interface ProductTerm {
  term: string
}

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDatabase(platform)
  
  try {
    console.log('🔍 Buscando termos populares...')
    
    // Buscar os 10 termos mais populares
    const popularTerms = await db.query<PopularTerm>`
      SELECT term, search_count as count
      FROM popular_searches
      WHERE search_count > 0
      ORDER BY search_count DESC
      LIMIT 10
    `
    
    console.log(`📊 Encontrados ${popularTerms.length} termos populares`)
    
    // Se não houver termos suficientes, buscar dos produtos mais populares
    if (popularTerms.length < 5) {
      console.log('📦 Buscando termos dos produtos...')
      
      const productTerms = await db.query<ProductTerm>`
        SELECT DISTINCT LOWER(p.name) as term
        FROM products p
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 10
      `
      
      // Combinar com os termos existentes
      const existingTerms = new Set(popularTerms.map((t: PopularTerm) => t.term))
      for (const pt of productTerms) {
        if (!existingTerms.has(pt.term) && popularTerms.length < 10) {
          popularTerms.push({ term: pt.term, count: 0 })
        }
      }
      
      console.log(`📦 Total após combinar: ${popularTerms.length} termos`)
    }
    
    const result = popularTerms.map((t: PopularTerm) => t.term)
    console.log('✅ Termos populares retornados:', result)
    
    return json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('❌ Erro ao buscar termos populares:', error)
    
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
  }
} 