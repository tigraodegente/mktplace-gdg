#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkImageSources() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 VERIFICANDO ORIGENS DAS IMAGENS\n')
    
    const images = await connector.queryNeon(`
      SELECT 
        p.name,
        p.sku,
        pi.url,
        CASE 
          WHEN pi.url LIKE '%ovh.net%' THEN 'OVH'
          WHEN pi.url LIKE '%amazonaws.com%' THEN 'AWS'
          ELSE 'OUTRO'
        END as source
      FROM products p
      JOIN product_images pi ON pi.product_id = p.id
      WHERE p.meta_title IS NOT NULL
      ORDER BY p.name, pi.position
      LIMIT 30
    `)
    
    const ovhCount = images.rows.filter(img => img.source === 'OVH').length
    const awsCount = images.rows.filter(img => img.source === 'AWS').length
    const otherCount = images.rows.filter(img => img.source === 'OUTRO').length
    
    console.log('📊 ESTATÍSTICAS:')
    console.log(`   🔴 OVH: ${ovhCount} imagens`)
    console.log(`   🟢 AWS: ${awsCount} imagens`)
    console.log(`   ⚪ OUTROS: ${otherCount} imagens`)
    console.log('')
    
    console.log('📋 AMOSTRAS POR ORIGEM:')
    console.log('')
    
    // Agrupar por origem
    const bySource = images.rows.reduce((acc, img) => {
      if (!acc[img.source]) acc[img.source] = []
      acc[img.source].push(img)
      return acc
    }, {})
    
    Object.entries(bySource).forEach(([source, imgs]) => {
      console.log(`${source === 'OVH' ? '🔴' : source === 'AWS' ? '🟢' : '⚪'} ${source}:`)
      imgs.slice(0, 5).forEach(img => {
        console.log(`   ${img.sku}: ${img.url}`)
      })
      console.log('')
    })
    
    // Verificar produtos específicos
    console.log('🔍 ANÁLISE DETALHADA - Kit Berço Amiguinhas Realeza:')
    const specificProduct = await connector.queryNeon(`
      SELECT 
        pi.url,
        pi.position,
        CASE 
          WHEN pi.url LIKE '%ovh.net%' THEN 'OVH'
          WHEN pi.url LIKE '%amazonaws.com%' THEN 'AWS'
          ELSE 'OUTRO'
        END as source
      FROM products p
      JOIN product_images pi ON pi.product_id = p.id
      WHERE p.sku = '120455'
      ORDER BY pi.position
    `)
    
    specificProduct.rows.forEach((img, i) => {
      console.log(`   ${i+1}. [${img.source}] ${img.url}`)
    })
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkImageSources() 