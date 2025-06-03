#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkProductStatus() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 VERIFICANDO STATUS DE PUBLICAÇÃO DOS PRODUTOS\n')
    
    const result = await connector.queryNeon(`
      SELECT 
        name,
        slug,
        status,
        is_active,
        published_at
      FROM products 
      WHERE meta_title IS NOT NULL 
      ORDER BY updated_at DESC
      LIMIT 8
    `)
    
    console.log('📊 STATUS DOS PRODUTOS ENRIQUECIDOS:\n')
    
    result.rows.forEach((product, i) => {
      console.log(`${i+1}. ${product.name}`)
      console.log(`   📍 Slug: ${product.slug}`)
      console.log(`   🚦 Status: ${product.status}`)
      console.log(`   🔄 Ativo: ${product.is_active ? 'SIM' : 'NÃO'}`)
      console.log(`   📅 Publicado: ${product.published_at || '❌ NÃO PUBLICADO'}`)
      console.log('')
    })
    
    // Verificar se precisamos publicar
    const unpublished = result.rows.filter(p => !p.published_at)
    
    if (unpublished.length > 0) {
      console.log('⚠️  PRODUTOS NÃO PUBLICADOS:', unpublished.length)
      console.log('💡 SOLUÇÃO: Executar publicação em massa')
      console.log('')
      console.log('🔧 COMANDO PARA PUBLICAR:')
      console.log('   UPDATE products SET published_at = NOW() WHERE meta_title IS NOT NULL;')
    } else {
      console.log('✅ Todos os produtos estão publicados!')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkProductStatus() 