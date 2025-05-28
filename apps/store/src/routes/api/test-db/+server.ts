import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { withDatabase } from '$lib/db'

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Testa a conexão
      const version = await db.queryOne`SELECT version()`
      
      // Conta registros
      const counts = await db.query`
        SELECT 
          'users' as table_name, COUNT(*) as count FROM users
        UNION ALL
          SELECT 'products', COUNT(*) FROM products
        UNION ALL
          SELECT 'categories', COUNT(*) FROM categories
        UNION ALL
          SELECT 'sellers', COUNT(*) FROM sellers
      `
      
      return {
        connected: true,
        environment: platform?.env ? 'production' : 'development',
        database: platform?.env?.HYPERDRIVE_DB ? 'Neon via Hyperdrive' : 'PostgreSQL Local',
        version: version?.version,
        counts
      }
    })
    
    return json(result)
  } catch (error) {
    console.error('Database error:', error)
    return json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 