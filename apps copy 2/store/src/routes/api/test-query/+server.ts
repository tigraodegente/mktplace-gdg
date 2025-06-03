import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/db'

export const GET: RequestHandler = async ({ platform }) => {
  const start = Date.now()
  
  try {
    console.log('🔍 Teste query simples - Iniciando...')
    
    const db = getDatabase(platform)
    
    // Query super simples
    const result1 = await db.query`SELECT 1 as test, NOW() as current_time`
    console.log('✅ Query 1 executada:', result1)
    
    // Query na tabela de usuários (deve existir)
    const result2 = await db.query`SELECT COUNT(*) as total FROM users LIMIT 1`
    console.log('✅ Query 2 executada:', result2)
    
    // Query na tabela popular_searches
    const result3 = await db.query`SELECT COUNT(*) as total FROM popular_searches LIMIT 1`
    console.log('✅ Query 3 executada:', result3)
    
    const elapsed = Date.now() - start
    
    return json({
      success: true,
      elapsed_ms: elapsed,
      results: {
        test_query: result1,
        users_count: result2,
        popular_searches_count: result3
      }
    })
    
  } catch (error) {
    const elapsed = Date.now() - start
    console.error('❌ Erro na query teste:', error)
    
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