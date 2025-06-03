#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function fixRealImages() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔧 CORRIGINDO IMAGENS - APENAS URLs REAIS QUE FUNCIONAM')
    console.log('=' .repeat(70))
    console.log('')
    
    // Para os 3 produtos específicos, vamos usar as imagens OVH que funcionam
    const productsToFix = [
      {
        sku: '194747',
        name: 'Cadeirinha de Carro Only One Cinza',
        realImages: [
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/194747/cadeira-only-one-asphalt-470866.jpg',
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/194747/cadeira-only-one-asphalt-470864.jpg',
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/194747/cadeira-only-one-asphalt-470865.jpg',
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/194747/cadeira-only-one-asphalt-470867.jpg'
        ]
      },
      {
        sku: '167807',
        name: 'Papel de Parede Floresta Encantada 4m',
        realImages: [
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/167807/papel-de-parede-floresta-encantada-4m-360546.jpg',
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/167807/papel-de-parede-floresta-encantada-4m-360542.jpg',
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/167807/papel-de-parede-floresta-encantada-4m-360546.jpg'
        ]
      },
      {
        sku: '155332', 
        name: 'Capa de Carrinho com Protetor de Cinto Rosa',
        realImages: [
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/155332/capa-de-carrinho-com-protetor-de-cinto-rosa-amor-351389.jpg',
          'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/155332/capa-de-carrinho-com-protetor-de-cinto-rosa-amor-351388.jpg'
        ]
      }
    ]
    
    for (const productInfo of productsToFix) {
      console.log(`🔧 Corrigindo imagens: ${productInfo.name}`)
      
      // Buscar produto
      const product = await connector.queryNeon(`
        SELECT id FROM products WHERE sku = $1
      `, [productInfo.sku])
      
      if (product.rows.length === 0) {
        console.log(`❌ Produto ${productInfo.sku} não encontrado`)
        continue
      }
      
      const productId = product.rows[0].id
      
      // Remover imagens fictícias AWS
      await connector.queryNeon(`
        DELETE FROM product_images WHERE product_id = $1
      `, [productId])
      console.log(`   🗑️  Removidas imagens fictícias`)
      
      // Adicionar imagens reais OVH
      for (let i = 0; i < productInfo.realImages.length; i++) {
        await connector.queryNeon(`
          INSERT INTO product_images (product_id, url, position, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [productId, productInfo.realImages[i], i + 1])
      }
      
      console.log(`   ✅ Adicionadas ${productInfo.realImages.length} imagens REAIS`)
      console.log('')
    }
    
    console.log('🎉 CORREÇÃO CONCLUÍDA!')
    console.log('')
    
    // Verificar resultado
    await verifyImages(connector)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

async function verifyImages(connector) {
  console.log('🔍 VERIFICAÇÃO DAS IMAGENS:')
  console.log('=' .repeat(50))
  
  const products = await connector.queryNeon(`
    SELECT 
      p.name,
      p.sku,
      pi.url,
      pi.position
    FROM products p
    JOIN product_images pi ON pi.product_id = p.id
    WHERE p.sku IN ('194747', '167807', '155332')
    ORDER BY p.sku, pi.position
  `)
  
  let currentProduct = null
  
  products.rows.forEach(row => {
    if (currentProduct !== row.sku) {
      console.log(`\n📦 ${row.name} (${row.sku}):`)
      currentProduct = row.sku
    }
    
    console.log(`   ${row.position}. ${row.url}`)
  })
  
  console.log('\n🧪 TESTE AS IMAGENS:')
  console.log('1. Acesse: http://localhost:5174/produto/cadeirinha-de-carro-only-one-cinza-194747')
  console.log('2. As imagens devem carregar corretamente agora!')
}

fixRealImages() 