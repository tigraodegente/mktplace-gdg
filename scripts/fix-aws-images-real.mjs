#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function fixAWSImagesReal() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔧 CORRIGINDO COM URLs REAIS DA AWS QUE FUNCIONAM')
    console.log('=' .repeat(70))
    console.log('')
    
    // Corrigir produto 176223 com URLs AWS reais
    const product176223 = {
      sku: '176223',
      name: 'Kit Berço Amiguinhos Harry Potter',
      awsImages: [
        'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/176223/kit-berco-amiguinhos-harry-potter-482393.jpg',
        'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/176223/kit-berco-amiguinhos-harry-potter-482385.jpg',
        'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/176223/kit-berco-amiguinhos-harry-potter-482386.jpg',
        'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/176223/kit-berco-amiguinhos-harry-potter-482387.jpg'
      ]
    }
    
    console.log(`🔧 Corrigindo: ${product176223.name}`)
    
    // Buscar produto
    const product = await connector.queryNeon(`
      SELECT id FROM products WHERE sku = $1
    `, [product176223.sku])
    
    if (product.rows.length === 0) {
      console.log(`❌ Produto ${product176223.sku} não encontrado`)
      return
    }
    
    const productId = product.rows[0].id
    
    // Remover imagens OVH antigas
    await connector.queryNeon(`
      DELETE FROM product_images WHERE product_id = $1
    `, [productId])
    console.log(`   🗑️  Removidas imagens OVH antigas`)
    
    // Adicionar imagens AWS reais
    for (let i = 0; i < product176223.awsImages.length; i++) {
      await connector.queryNeon(`
        INSERT INTO product_images (product_id, url, position, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [productId, product176223.awsImages[i], i + 1])
    }
    
    console.log(`   ✅ Adicionadas ${product176223.awsImages.length} imagens AWS REAIS`)
    
    console.log('\n🎉 CORREÇÃO CONCLUÍDA!')
    console.log('')
    
    console.log('🧪 TESTE AGORA:')
    console.log(`   Frontend: http://localhost:5174/produto/kit-berco-amiguinhos-harry-potter-176223`)
    console.log(`   Imagem direta: ${product176223.awsImages[0]}`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

fixAWSImagesReal() 