import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/db'

export const GET: RequestHandler = async ({ platform }) => {
  try {
    console.log('🔍 DEBUG - Testando conexão Hyperdrive')
    
    const db = getDatabase(platform)
    
    // Teste 1: Query simples
    console.log('📊 Teste 1: COUNT total de produtos')
    const totalProducts = await db.queryOne`SELECT COUNT(*) as total FROM products WHERE is_active = true`
    console.log(`✅ Total produtos: ${totalProducts?.total}`)
    
    // Teste 2: Query smartphones simples
    console.log('📱 Teste 2: Produtos smartphones')
    const smartphones = await db.query`
      SELECT p.id, p.name, p.quantity 
      FROM products p 
      LEFT JOIN categories c ON c.id = p.category_id 
      WHERE p.is_active = true 
        AND c.slug = 'smartphones' 
      LIMIT 3
    `
    console.log(`📱 Smartphones encontrados: ${smartphones.length}`)
    
    // Teste 3: Categorias
    console.log('🏷️ Teste 3: Categorias ativas')
    const categories = await db.query`SELECT name, slug FROM categories WHERE is_active = true LIMIT 5`
    console.log(`🏷️ Categorias encontradas: ${categories.length}`)
    
    return json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        platform: platform ? 'CloudFlare' : 'Local',
        tests: {
          totalProducts: totalProducts?.total || 0,
          smartphones: smartphones.length,
          smartphonesList: smartphones.map(p => ({ id: p.id, name: p.name, quantity: p.quantity })),
          categories: categories.length,
          categoriesList: categories.map(c => ({ name: c.name, slug: c.slug }))
        }
      }
    })
    
  } catch (error) {
    console.error('❌ ERRO DEBUG:', error)
    return json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : 'N/A'
      }
    }, { status: 500 })
  }
} 