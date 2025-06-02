import { json } from '@sveltejs/kit'
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/db'

export const GET: RequestHandler = async ({ platform }) => {
  console.log('🔍 Popular-terms com fallback rápido')
  
  // Fallback padrão sempre disponível
  const fallbackTerms = [
    'xiaomi',
    'galaxy', 
    'samsung',
    'tv',
    'smartphone',
    'iphone'
  ]
  
  // Tentar buscar no banco com timeout curto
  try {
    // Promise de timeout de 2 segundos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 2000)
    })
    
    // Promise da query do banco
    const queryPromise = (async () => {
      const db = getDatabase(platform)
      const result = await db.query`
        SELECT term FROM popular_searches 
        WHERE search_count > 0 
        ORDER BY search_count DESC 
        LIMIT 10
      `
      return result.map((r: any) => r.term)
    })()
    
    // Race entre query e timeout
    const terms = await Promise.race([queryPromise, timeoutPromise])
    
    console.log(`✅ Sucesso: ${(terms as string[]).length} termos do banco`)
    return json({
      success: true,
      data: terms as string[]
    })
    
  } catch (error) {
    console.log('⚠️ Usando fallback:', error instanceof Error ? error.message : 'erro')
    
    return json({
      success: true,
      data: fallbackTerms
    })
  }
} 