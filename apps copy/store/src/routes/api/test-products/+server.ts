import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/db'

export const GET: RequestHandler = async ({ platform }) => {
  const start = Date.now()
  
  try {
    console.log('🔍 Teste produtos - Iniciando...')
    
    const db = getDatabase(platform)
    
    // Query 1: Count total de produtos
    const result1 = await db.query`SELECT COUNT(*) as total FROM products`
    console.log('✅ Query 1 executada (total):', result1)
    
    // Query 2: Count produtos featured
    const result2 = await db.query`SELECT COUNT(*) as total FROM products WHERE featured = true`
    console.log('✅ Query 2 executada (featured):', result2)
    
    // Query 3: Count produtos featured + ativos
    const result3 = await db.query`SELECT COUNT(*) as total FROM products WHERE featured = true AND is_active = true`
    console.log('✅ Query 3 executada (featured + ativos):', result3)
    
    // Query 4: Buscar primeiros 3 produtos featured
    const result4 = await db.query`
      SELECT id, name, slug, price 
      FROM products 
      WHERE featured = true AND is_active = true 
      ORDER BY created_at DESC 
      LIMIT 3
    `
    console.log('✅ Query 4 executada (dados):', result4)
    
    const elapsed = Date.now() - start
    
    return json({
      success: true,
      elapsed_ms: elapsed,
      results: {
        total_produtos: result1[0]?.total,
        produtos_featured: result2[0]?.total,
        produtos_featured_ativos: result3[0]?.total,
        primeiros_3_produtos: result4.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price
        }))
      }
    })
    
  } catch (error) {
    const elapsed = Date.now() - start
    console.error('❌ Erro na query teste produtos:', error)
    
    return json({
      success: false,
      elapsed_ms: elapsed,
      error: {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }
    })
  }
} 