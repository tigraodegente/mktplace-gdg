#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function monitorProgress() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('📊 MONITOR DE PROGRESSO EM TEMPO REAL\n')
    console.log('=' .repeat(60) + '\n')
    
    // Estatísticas gerais
    const statsResult = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total,
        COUNT(meta_title) as with_title,
        COUNT(meta_description) as with_description,
        COUNT(short_description) as with_short,
        COUNT(tags) as with_tags,
        COUNT(CASE WHEN meta_title IS NOT NULL AND meta_description IS NOT NULL 
                   AND short_description IS NOT NULL AND tags IS NOT NULL 
              THEN 1 END) as fully_enriched
      FROM products
    `)
    
    const stats = statsResult.rows[0]
    const totalProducts = parseInt(stats.total)
    const fullyEnriched = parseInt(stats.fully_enriched)
    const remaining = totalProducts - fullyEnriched
    
    console.log('📈 ESTATÍSTICAS ATUAIS:')
    console.log(`Total de produtos: ${totalProducts.toLocaleString()}`)
    console.log(`Completamente enriquecidos: ${fullyEnriched.toLocaleString()} (${((fullyEnriched/totalProducts)*100).toFixed(1)}%)`)
    console.log(`Restantes para processar: ${remaining.toLocaleString()}`)
    console.log('')
    
    // Detalhamento por campo
    console.log('📝 DETALHAMENTO POR CAMPO:')
    console.log(`   SEO Title: ${stats.with_title} (${((stats.with_title/totalProducts)*100).toFixed(1)}%)`)
    console.log(`   Meta Description: ${stats.with_description} (${((stats.with_description/totalProducts)*100).toFixed(1)}%)`)
    console.log(`   Short Description: ${stats.with_short} (${((stats.with_short/totalProducts)*100).toFixed(1)}%)`)
    console.log(`   Tags: ${stats.with_tags} (${((stats.with_tags/totalProducts)*100).toFixed(1)}%)`)
    console.log('')
    
    // Progresso visual
    const progress = (fullyEnriched / totalProducts) * 100
    const progressBars = Math.floor(progress / 2) // 50 caracteres = 100%
    const progressBar = '█'.repeat(progressBars) + '░'.repeat(50 - progressBars)
    console.log('📊 PROGRESSO VISUAL:')
    console.log(`[${progressBar}] ${progress.toFixed(1)}%`)
    console.log('')
    
    // Últimos produtos processados
    console.log('🆕 ÚLTIMOS 10 PRODUTOS ENRIQUECIDOS:\n')
    
    const recentResult = await connector.queryNeon(`
      SELECT 
        name,
        meta_title,
        sku,
        updated_at
      FROM products
      WHERE meta_title IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 10
    `)
    
    recentResult.rows.forEach((product, i) => {
      const timeAgo = new Date() - new Date(product.updated_at)
      const minutesAgo = Math.floor(timeAgo / 60000)
      const timeText = minutesAgo < 1 ? 'agora' : `${minutesAgo}min atrás`
      
      console.log(`${i + 1}.  ${product.name}`)
      console.log(`    SKU: ${product.sku} | ${timeText}`)
      console.log(`    Title: "${product.meta_title}"`)
      console.log('')
    })
    
    // Estimativas
    if (remaining > 0) {
      const avgCostPerProduct = 0.016
      const estimatedCost = remaining * avgCostPerProduct
      const avgTimePerProduct = 2 // segundos
      const estimatedTimeMinutes = (remaining * avgTimePerProduct) / 60
      
      console.log('📊 ESTIMATIVAS PARA CONCLUSÃO:')
      console.log(`   Produtos restantes: ${remaining.toLocaleString()}`)
      console.log(`   Custo estimado: $${estimatedCost.toFixed(2)} (R$ ${(estimatedCost * 5).toFixed(2)})`)
      console.log(`   Tempo estimado: ${Math.floor(estimatedTimeMinutes)} minutos (${Math.floor(estimatedTimeMinutes/60)}h${Math.floor(estimatedTimeMinutes%60)}min)`)
      console.log('')
    }
    
    // Velocidade de processamento
    const last5MinResult = await connector.queryNeon(`
      SELECT COUNT(*) as count
      FROM products
      WHERE meta_title IS NOT NULL
        AND updated_at > NOW() - INTERVAL '5 minutes'
    `)
    
    const recentCount = parseInt(last5MinResult.rows[0].count)
    const productsPerHour = (recentCount / 5) * 60
    
    if (recentCount > 0) {
      console.log('⚡ VELOCIDADE ATUAL:')
      console.log(`   Últimos 5 minutos: ${recentCount} produtos`)
      console.log(`   Velocidade: ${productsPerHour.toFixed(0)} produtos/hora`)
      console.log('')
    }
    
    // Status do processamento
    if (remaining === 0) {
      console.log('🎉 ✅ TODOS OS PRODUTOS FORAM PROCESSADOS!')
    } else if (recentCount > 0) {
      console.log('🔄 ✅ PROCESSAMENTO ATIVO')
    } else {
      console.log('⚠️  Nenhum produto processado nos últimos 5 minutos')
      console.log('   Verificar se o script principal ainda está rodando')
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log(`📅 Última atualização: ${new Date().toLocaleString('pt-BR')}`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

monitorProgress() 