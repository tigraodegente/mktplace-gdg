#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

/**
 * Script para verificar URLs de imagens no banco Neon
 */
async function checkImageUrls() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 VERIFICANDO URLs DE IMAGENS NO NEON\n')
    
    await connector.connectNeon()
    
    // 1. Estatísticas gerais
    const stats = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_images,
        COUNT(DISTINCT product_id) as products_with_images,
        COUNT(CASE WHEN url ~* '\.ovh\.' THEN 1 END) as ovh_urls,
        COUNT(CASE WHEN url ~* 'amazonaws' THEN 1 END) as aws_urls,
        COUNT(CASE WHEN url ~* 'cloudflare' THEN 1 END) as cloudflare_urls,
        COUNT(CASE WHEN url LIKE '/placeholder%' THEN 1 END) as placeholder_urls
      FROM product_images 
      WHERE url IS NOT NULL
    `)
    
    const data = stats.rows[0]
    console.log('📊 ESTATÍSTICAS GERAIS:')
    console.log(`   📸 Total de imagens: ${data.total_images}`)
    console.log(`   🛍️  Produtos com imagem: ${data.products_with_images}`)
    console.log(`   🏢 URLs OVH: ${data.ovh_urls}`)
    console.log(`   ☁️  URLs AWS: ${data.aws_urls}`)
    console.log(`   🌐 URLs Cloudflare: ${data.cloudflare_urls}`)
    console.log(`   📄 Placeholders: ${data.placeholder_urls}`)
    
    // 2. Exemplos de URLs por tipo
    console.log('\n🔍 EXEMPLOS DE URLs POR TIPO:\n')
    
    // URLs OVH
    if (data.ovh_urls > 0) {
      console.log('🏢 URLS OVH:')
      const ovhUrls = await connector.queryNeon(`
        SELECT url 
        FROM product_images 
        WHERE url ~* '\.ovh\.'
        LIMIT 3
      `)
      ovhUrls.rows.forEach(row => console.log(`   ${row.url}`))
      console.log('')
    }
    
    // URLs AWS
    if (data.aws_urls > 0) {
      console.log('☁️  URLS AWS:')
      const awsUrls = await connector.queryNeon(`
        SELECT url 
        FROM product_images 
        WHERE url ~* 'amazonaws'
        LIMIT 3
      `)
      awsUrls.rows.forEach(row => console.log(`   ${row.url}`))
      console.log('')
    }
    
    // URLs Cloudflare
    if (data.cloudflare_urls > 0) {
      console.log('🌐 URLS CLOUDFLARE:')
      const cfUrls = await connector.queryNeon(`
        SELECT url 
        FROM product_images 
        WHERE url ~* 'cloudflare'
        LIMIT 3
      `)
      cfUrls.rows.forEach(row => console.log(`   ${row.url}`))
      console.log('')
    }
    
    // 3. Análise por domínio
    console.log('🌐 ANÁLISE POR DOMÍNIO:')
    const domains = await connector.queryNeon(`
      SELECT 
        CASE 
          WHEN url ~* '\.ovh\.' THEN 'OVH'
          WHEN url ~* 'amazonaws\.com' THEN 'AWS S3'
          WHEN url ~* 'cloudflare' THEN 'Cloudflare'
          WHEN url LIKE '/placeholder%' THEN 'Placeholder'
          WHEN url LIKE 'http%' THEN SUBSTRING(url FROM 'https?://([^/]+)')
          ELSE 'Outros'
        END as domain_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
      FROM product_images 
      WHERE url IS NOT NULL
      GROUP BY domain_type
      ORDER BY count DESC
    `)
    
    domains.rows.forEach(row => {
      console.log(`   ${row.domain_type}: ${row.count} (${row.percentage}%)`)
    })
    
    // 4. Recomendações
    console.log('\n💡 RECOMENDAÇÕES:')
    
    if (data.ovh_urls > 0) {
      console.log(`   🔄 Converter ${data.ovh_urls} URLs do OVH para AWS`)
      console.log('   ▶️  node scripts/convert-ovh-to-aws-urls.mjs --confirm')
    }
    
    if (data.placeholder_urls > 0) {
      console.log(`   📷 Substituir ${data.placeholder_urls} placeholders por imagens reais`)
    }
    
    if (data.aws_urls === 0 && data.ovh_urls > 0) {
      console.log('   ⚠️  Recomenda-se migrar para AWS S3 para melhor performance')
    }
    
    if (data.total_images === 0) {
      console.log('   📦 Importar produtos com imagens do MongoDB')
      console.log('   ▶️  node scripts/clean-products-and-import-sample.mjs --limit 50')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

// Executar
checkImageUrls() 