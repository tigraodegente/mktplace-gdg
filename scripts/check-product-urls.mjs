#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkProductUrls() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔗 URLs DOS PRODUTOS ENRIQUECIDOS NA LOJA\n')
    console.log('=' .repeat(70) + '\n')
    
    const result = await connector.queryNeon(`
      SELECT 
        name,
        slug,
        sku,
        meta_title,
        price
      FROM products 
      WHERE meta_title IS NOT NULL 
        AND updated_at > NOW() - INTERVAL '30 minutes'
      ORDER BY updated_at DESC
      LIMIT 10
    `)
    
    result.rows.forEach((product, i) => {
      const url = `https://www.graodegente.com.br/produto/${product.slug}`
      
      console.log(`${i+1}. ${product.name}`)
      console.log(`   🔗 URL: ${url}`)
      console.log(`   📝 Meta Title: ${product.meta_title}`)
      console.log(`   💰 Preço: R$ ${product.price}`)
      console.log(`   📦 SKU: ${product.sku}`)
      console.log('')
    })
    
    console.log('💡 COMO TESTAR:')
    console.log('1. Acesse qualquer URL acima no navegador')
    console.log('2. Verifique se os dados SEO aparecem')
    console.log('3. Confirme se variantes, especificações e reviews estão visíveis')
    console.log('4. Teste a funcionalidade de compra')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkProductUrls() 