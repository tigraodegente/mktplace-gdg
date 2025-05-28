import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { withDatabase } from '$lib/db'
import { dev } from '$app/environment'

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Teste de conexão
      const testQuery = await db.query`SELECT 1 as connected`
      
      // Buscar versão do PostgreSQL
      const versionResult = await db.query`SELECT version()`
      
      // Contar registros em algumas tabelas
      const counts = await db.query`
        SELECT 
          'users' as table_name, 
          COUNT(*)::text as count 
        FROM users
        UNION ALL
        SELECT 
          'products' as table_name, 
          COUNT(*)::text as count 
        FROM products
        UNION ALL
        SELECT 
          'categories' as table_name, 
          COUNT(*)::text as count 
        FROM categories
        UNION ALL
        SELECT 
          'sellers' as table_name, 
          COUNT(*)::text as count 
        FROM sellers
      `
      
      return {
        connected: testQuery[0].connected === 1,
        environment: dev ? 'development' : 'production',
        database: dev ? 'PostgreSQL Local' : 'Hyperdrive (Neon)',
        version: versionResult[0].version,
        counts
      }
    })
    
    return json(result)
  } catch (error) {
    console.error('Database test error:', error)
    return json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: dev ? 'development' : 'production'
    }, { status: 500 })
  }
} 