import { json, type RequestHandler } from '@sveltejs/kit'
import { getDatabase } from '$lib/db'
import { dev } from '$app/environment'

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform)
    
    // Testar conexão simples
    const result = await db.query`SELECT COUNT(*) as total_produtos FROM products WHERE is_active = true LIMIT 1`
    const totalProdutos = result[0]?.total_produtos || 0
    
    // Testar products com attributes
    const attributesResult = await db.query`
      SELECT COUNT(*) as com_attributes 
      FROM products 
      WHERE is_active = true 
      AND attributes IS NOT NULL 
      AND attributes != '{}'::jsonb
      LIMIT 1
    `
    const comAttributes = attributesResult[0]?.com_attributes || 0
    
    // Informações de debug
    const debugInfo = {
      environment: {
        dev: dev,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      },
      database: {
        totalProdutos: parseInt(totalProdutos),
        comAttributes: parseInt(comAttributes),
        // Não expor a URL completa por segurança, só o hostname
        connection: 'Connected successfully'
      },
      message: totalProdutos > 2000 ? 
        '✅ Conectado ao banco de DESENVOLVIMENTO (ep-raspy-meadow)' :
        '⚠️ Conectado ao banco de PRODUÇÃO (ep-dawn-field)'
    }
    
    await db.close()
    
    return json({
      success: true,
      debug: debugInfo
    })
  } catch (error: any) {
    return json({
      success: false,
      error: {
        message: error.message,
        code: error.code
      }
    })
  }
} 