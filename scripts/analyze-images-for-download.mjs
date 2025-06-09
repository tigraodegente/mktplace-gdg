#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function analyzeImagesForDownload() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 ANÁLISE DE IMAGENS PARA DOWNLOAD\n')
    
    await connector.connectNeon()
    console.log('🔌 Conectado ao banco Neon\n')
    
    // 1. Contagem geral de imagens
    console.log('📊 ESTATÍSTICAS GERAIS:')
    
    const totalImages = await connector.queryNeon(`
      SELECT COUNT(*) as total
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.attributes->>'imported_from' = 'mongodb'
    `)
    
    const awsImages = await connector.queryNeon(`
      SELECT COUNT(*) as total
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.attributes->>'imported_from' = 'mongodb'
        AND pi.url LIKE '%gdg-images.s3.sa-east-1.amazonaws.com%'
    `)
    
    const ovhImages = await connector.queryNeon(`
      SELECT COUNT(*) as total
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.attributes->>'imported_from' = 'mongodb'
        AND pi.url LIKE '%grao-cdn.s3.bhs.perf.cloud.ovh.net%'
    `)
    
    console.log(`   📦 Total de imagens: ${totalImages.rows[0].total}`)
    console.log(`   ☁️  Imagens AWS: ${awsImages.rows[0].total}`)
    console.log(`   🌍 Imagens OVH: ${ovhImages.rows[0].total}`)
    
    // 2. Distribuição por tipo de arquivo
    console.log('\n📸 DISTRIBUIÇÃO POR TIPO:')
    
    const fileTypes = await connector.queryNeon(`
      SELECT 
        CASE 
          WHEN pi.url LIKE '%.jpg' OR pi.url LIKE '%.jpeg' THEN 'JPEG'
          WHEN pi.url LIKE '%.png' THEN 'PNG'
          WHEN pi.url LIKE '%.webp' THEN 'WebP'
          WHEN pi.url LIKE '%.gif' THEN 'GIF'
          ELSE 'Outros'
        END as tipo,
        COUNT(*) as quantidade
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.attributes->>'imported_from' = 'mongodb'
        AND pi.url LIKE '%gdg-images.s3.sa-east-1.amazonaws.com%'
      GROUP BY tipo
      ORDER BY quantidade DESC
    `)
    
    fileTypes.rows.forEach(row => {
      console.log(`   ${row.tipo}: ${row.quantidade} imagens`)
    })
    
    // 3. Produtos com mais imagens
    console.log('\n🖼️  PRODUTOS COM MAIS IMAGENS (TOP 10):')
    
    const topProducts = await connector.queryNeon(`
      SELECT 
        p.sku,
        p.name,
        COUNT(pi.id) as total_imagens
      FROM products p
      JOIN product_images pi ON p.id = pi.product_id
      WHERE p.attributes->>'imported_from' = 'mongodb'
        AND pi.url LIKE '%gdg-images.s3.sa-east-1.amazonaws.com%'
      GROUP BY p.sku, p.name
      ORDER BY total_imagens DESC
      LIMIT 10
    `)
    
    topProducts.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.sku} - ${row.name.substring(0, 40)}... (${row.total_imagens} imagens)`)
    })
    
    // 4. Média de imagens por produto
    console.log('\n📊 DISTRIBUIÇÃO DE IMAGENS POR PRODUTO:')
    
    const imageDistribution = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_produtos,
        ROUND(AVG(image_count), 2) as media_imagens,
        MIN(image_count) as min_imagens,
        MAX(image_count) as max_imagens
      FROM (
        SELECT 
          p.id,
          COUNT(pi.id) as image_count
        FROM products p
        JOIN product_images pi ON p.id = pi.product_id
        WHERE p.attributes->>'imported_from' = 'mongodb'
          AND pi.url LIKE '%gdg-images.s3.sa-east-1.amazonaws.com%'
        GROUP BY p.id
      ) as produtos_com_imagens
    `)
    
    const dist = imageDistribution.rows[0]
    console.log(`   📦 Produtos com imagens: ${dist.total_produtos}`)
    console.log(`   📊 Média por produto: ${dist.media_imagens} imagens`)
    console.log(`   📉 Mínimo: ${dist.min_imagens} imagens`)
    console.log(`   📈 Máximo: ${dist.max_imagens} imagens`)
    
    // 5. Exemplos de URLs para verificação
    console.log('\n🔗 EXEMPLOS DE URLs (primeiras 5):')
    
    const sampleUrls = await connector.queryNeon(`
      SELECT 
        pi.url,
        p.sku,
        p.name
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.attributes->>'imported_from' = 'mongodb'
        AND pi.url LIKE '%gdg-images.s3.sa-east-1.amazonaws.com%'
      ORDER BY p.sku, pi.position
      LIMIT 5
    `)
    
    sampleUrls.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. [${row.sku}] ${row.url}`)
    })
    
    // 6. Estimativa de download
    console.log('\n🚀 ESTIMATIVA PARA DOWNLOAD:')
    
    const totalToDownload = awsImages.rows[0].total
    const estimatedSizeGB = (totalToDownload * 400) / (1024 * 1024) // 400KB média por imagem
    const estimatedTimeMinutes = Math.ceil(totalToDownload / 50) // 50 downloads por minuto
    
    console.log(`   📦 Imagens para download: ${totalToDownload}`)
    console.log(`   💾 Tamanho estimado: ~${estimatedSizeGB.toFixed(1)} GB`)
    console.log(`   ⏱️  Tempo estimado: ~${estimatedTimeMinutes} minutos`)
    console.log(`   📁 Pasta destino: downloads/images/`)
    console.log(`   🎯 Organização: por SKU do produto`)
    
    console.log('\n✅ PRÓXIMOS PASSOS:')
    console.log('   1. Execute: node scripts/download-images-from-aws.mjs')
    console.log('   2. Execute: node scripts/optimize-images-to-webp.mjs')
    console.log('   3. Depois: migração para Cloudflare')
    
  } catch (error) {
    console.error('❌ Erro na análise:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
analyzeImagesForDownload()
  .then(() => {
    console.log('\n🎉 ANÁLISE CONCLUÍDA!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 ANÁLISE FALHOU:', error)
    process.exit(1)
  }) 