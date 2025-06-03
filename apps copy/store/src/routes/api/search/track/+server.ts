import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/db'

export const POST: RequestHandler = async ({ request, platform, cookies, getClientAddress }) => {
  const db = getDatabase(platform)
  
  try {
    const { query, resultsCount, clickedPosition, clickedProductId } = await request.json()
    
    if (!query || query.trim() === '') {
      return json({
        success: false,
        error: 'Query é obrigatória'
      }, { status: 400 })
    }
    
    // Obter informações da sessão
    const sessionId = cookies.get('session_id')
    const userId = cookies.get('user_id') // Se o usuário estiver logado
    const ipAddress = getClientAddress()
    const userAgent = request.headers.get('user-agent') || ''
    
    // Registrar a busca
    await db.execute`
      INSERT INTO search_history (
        query,
        user_id,
        session_id,
        results_count,
        clicked_position,
        clicked_product_id,
        ip_address,
        user_agent
      ) VALUES (
        ${query.trim()},
        ${userId || null},
        ${sessionId || null},
        ${resultsCount || 0},
        ${clickedPosition || null},
        ${clickedProductId || null},
        ${ipAddress},
        ${userAgent}
      )
    `
    
    // Atualizar termos populares de forma assíncrona
    // Não esperamos a conclusão para não atrasar a resposta
    db.execute`SELECT update_popular_searches()`.catch(console.error)
    
    return json({
      success: true,
      message: 'Busca registrada com sucesso'
    })
    
  } catch (error) {
    console.error('Erro ao registrar busca:', error)
    
    // Não retornamos erro para o cliente, apenas logamos
    // Para não impactar a experiência do usuário
    return json({
      success: true,
      message: 'OK'
    })
  } finally {
    await db.close()
  }
} 