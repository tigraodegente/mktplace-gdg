#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function publishEnrichedProducts() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('📅 PUBLICANDO PRODUTOS ENRIQUECIDOS...\n')
    
    const result = await connector.queryNeon(`
      UPDATE products 
      SET published_at = NOW() 
      WHERE meta_title IS NOT NULL 
        AND published_at IS NULL
      RETURNING name, slug
    `)
    
    console.log(`✅ ${result.rows.length} produtos publicados!\n`)
    
    result.rows.forEach((product, i) => {
      console.log(`${i+1}. ${product.name}`)
      console.log(`   🔗 https://www.graodegente.com.br/produto/${product.slug}`)
      console.log('')
    })
    
    console.log('🎉 Todos os produtos estão agora visíveis na loja!')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

publishEnrichedProducts() 