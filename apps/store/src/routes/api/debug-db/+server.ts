import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ platform }) => {
  try {
    console.log('🔍 Debug Database - Iniciando...')
    
    // Verificar environment
    const env = (platform as any)?.env || {}
    
    return json({
      success: true,
      data: {
        has_platform: !!platform,
        has_hyperdrive_binding: !!env.HYPERDRIVE_DB,
        hyperdrive_connection_string: env.HYPERDRIVE_DB?.connectionString || 'N/A',
        environment_keys: Object.keys(env),
        cloudflare_env: {
          NODE_ENV: env.NODE_ENV || 'N/A',
          CF_PAGES: env.CF_PAGES || 'N/A',
          CF_PAGES_URL: env.CF_PAGES_URL || 'N/A',
          CF_PAGES_COMMIT_SHA: env.CF_PAGES_COMMIT_SHA || 'N/A'
        }
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