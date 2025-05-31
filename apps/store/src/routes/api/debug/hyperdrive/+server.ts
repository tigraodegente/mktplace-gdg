import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/db'

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const start = Date.now()
    console.log('🔍 Debug Hyperdrive - Iniciando...')
    
    // Verificar o platform
    console.log('📊 Platform disponível:', !!platform)
    console.log('📊 Platform.env:', Object.keys((platform as any)?.env || {}))
    console.log('📊 HYPERDRIVE_DB:', !!(platform as any)?.env?.HYPERDRIVE_DB)
    
    const db = getDatabase(platform)
    console.log('📊 Database criado')
    
    // Query super simples
    const result = await db.query`SELECT 1 as test`
    console.log('📊 Query executada:', result)
    
    const elapsed = Date.now() - start
    
    return json({
      success: true,
      data: {
        elapsed_ms: elapsed,
        has_platform: !!platform,
        has_hyperdrive_binding: !!(platform as any)?.env?.HYPERDRIVE_DB,
        hyperdrive_connection_string: (platform as any)?.env?.HYPERDRIVE_DB?.connectionString || 'N/A',
        query_result: result,
        environment_keys: Object.keys((platform as any)?.env || {})
      }
    })
    
  } catch (error) {
    console.error('❌ Erro no debug:', error)
    
    return json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }
    })
  }
} 