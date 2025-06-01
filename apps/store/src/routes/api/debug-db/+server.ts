import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'

export const GET: RequestHandler = async () => {
  try {
    const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL || 'não encontrado'
    
    // Mascarar credenciais para não expor
    const maskedUrl = dbUrl.replace(/\/\/.*@/, '//***@')
    
    return json({
      success: true,
      data: {
        hasEnv: !!env.DATABASE_URL,
        hasProcessEnv: !!process.env.DATABASE_URL,
        url: maskedUrl,
        isLocal: dbUrl.includes('localhost'),
        nodeEnv: process.env.NODE_ENV || 'undefined'
      }
    })
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
} 