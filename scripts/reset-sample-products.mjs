#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function resetSampleProducts() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔄 LIMPANDO PRODUTOS PROCESSADOS COM ERRO...\n')
    
    // Produtos que foram processados nos últimos 10 minutos mas podem ter erro
    const recentProducts = await connector.queryNeon(`
      SELECT id, name, sku 
      FROM products 
      WHERE meta_title IS NOT NULL 
        AND updated_at > NOW() - INTERVAL '10 minutes'
      ORDER BY updated_at DESC
    `)
    
    console.log(`🎯 ${recentProducts.rows.length} produtos para limpar:`)
    recentProducts.rows.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.name} (SKU: ${p.sku})`)
    })
    
    if (recentProducts.rows.length > 0) {
      console.log('\n🧹 LIMPANDO DADOS...')
      
      for (const product of recentProducts.rows) {
        // 1. Limpar produto principal
        await connector.queryNeon(`
          UPDATE products 
          SET 
            meta_title = NULL,
            meta_description = NULL,
            short_description = NULL,
            tags = NULL,
            meta_keywords = NULL,
            specifications = NULL,
            rating_average = NULL,
            rating_count = 0
          WHERE id = $1
        `, [product.id])
        
        // 2. Remover variantes
        await connector.queryNeon(`
          DELETE FROM product_variants 
          WHERE product_id = $1
        `, [product.id])
        
        // 3. Remover reviews e usuários dummy
        const reviewUsers = await connector.queryNeon(`
          SELECT DISTINCT u.id 
          FROM users u
          JOIN reviews r ON u.id = r.user_id
          WHERE r.product_id = $1 AND u.email LIKE '%@dummy.com'
        `, [product.id])
        
        await connector.queryNeon(`
          DELETE FROM reviews WHERE product_id = $1
        `, [product.id])
        
        for (const user of reviewUsers.rows) {
          await connector.queryNeon(`
            DELETE FROM users WHERE id = $1
          `, [user.id])
        }
        
        // 4. Remover imagens
        await connector.queryNeon(`
          DELETE FROM product_images WHERE product_id = $1
        `, [product.id])
        
        console.log(`   ✅ ${product.name} limpo`)
      }
      
      console.log(`\n✅ ${recentProducts.rows.length} produtos limpos e prontos para reprocessamento!`)
    } else {
      console.log('\n✅ Nenhum produto para limpar.')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

resetSampleProducts() 