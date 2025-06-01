import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'

export const GET: RequestHandler = async ({ platform }) => {
  try {
    // Acesso seguro às variáveis de ambiente
    const envDbUrl = env.DATABASE_URL
    const platformDbUrl = (platform as any)?.env?.DATABASE_URL
    const dbUrl = platformDbUrl || envDbUrl || 'não encontrado'
    
    // Mascarar credenciais para não expor
    const maskedUrl = dbUrl.replace(/\/\/.*@/, '//***@')
    
    return json({
      success: true,
      data: {
        hasEnv: !!envDbUrl,
        hasPlatformEnv: !!platformDbUrl,
        url: maskedUrl,
        isLocal: dbUrl.includes('localhost'),
        environment: (platform as any)?.env ? 'cloudflare' : 'development'
      }
    })
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
} 