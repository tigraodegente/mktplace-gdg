#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

const REFRESH_INTERVAL = 30000 // 30 segundos

async function getProgressData(connector) {
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
  
  const last5MinResult = await connector.queryNeon(`
    SELECT COUNT(*) as count
    FROM products
    WHERE meta_title IS NOT NULL
      AND updated_at > NOW() - INTERVAL '5 minutes'
  `)
  
  const stats = statsResult.rows[0]
  const recentCount = parseInt(last5MinResult.rows[0].count)
  
  return {
    total: parseInt(stats.total),
    fullyEnriched: parseInt(stats.fully_enriched),
    withTitle: parseInt(stats.with_title),
    withDescription: parseInt(stats.with_description),
    withShort: parseInt(stats.with_short),
    withTags: parseInt(stats.with_tags),
    recentCount
  }
}

async function displayProgress(data) {
  console.clear()
  
  const remaining = data.total - data.fullyEnriched
  const progress = (data.fullyEnriched / data.total) * 100
  const progressBars = Math.floor(progress / 2)
  const progressBar = '█'.repeat(progressBars) + '░'.repeat(50 - progressBars)
  const productsPerHour = (data.recentCount / 5) * 60
  
  console.log('🚀 ENRIQUECIMENTO GRÃO DE GENTE - MONITOR LIVE\n')
  console.log('=' .repeat(60) + '\n')
  
  // Status principal
  const statusIcon = data.recentCount > 0 ? '🔄' : '⏸️'
  const statusText = data.recentCount > 0 ? 'PROCESSANDO' : 'PAUSADO'
  console.log(`${statusIcon} STATUS: ${statusText}`)
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`)
  
  // Progresso visual grande
  console.log('📊 PROGRESSO GERAL:')
  console.log(`[${progressBar}] ${progress.toFixed(1)}%`)
  console.log(`${data.fullyEnriched.toLocaleString()} / ${data.total.toLocaleString()} produtos\n`)
  
  // Métricas principais
  console.log('📈 MÉTRICAS:')
  console.log(`   Restantes: ${remaining.toLocaleString()}`)
  console.log(`   Velocidade: ${productsPerHour.toFixed(0)} produtos/hora`)
  
  if (remaining > 0 && productsPerHour > 0) {
    const hoursRemaining = remaining / productsPerHour
    const minutesRemaining = Math.floor(hoursRemaining * 60)
    console.log(`   Tempo restante: ~${Math.floor(minutesRemaining/60)}h${minutesRemaining%60}min`)
  }
  
  const avgCost = 0.016
  const estimatedCost = remaining * avgCost
  console.log(`   Custo restante: ~$${estimatedCost.toFixed(2)}\n`)
  
  // Detalhamento por campo
  console.log('📝 CAMPOS ENRIQUECIDOS:')
  console.log(`   ✅ SEO Title: ${data.withTitle} (${((data.withTitle/data.total)*100).toFixed(1)}%)`)
  console.log(`   ✅ Meta Desc: ${data.withDescription} (${((data.withDescription/data.total)*100).toFixed(1)}%)`)
  console.log(`   ✅ Short Desc: ${data.withShort} (${((data.withShort/data.total)*100).toFixed(1)}%)`)
  console.log(`   ✅ Tags: ${data.withTags} (${((data.withTags/data.total)*100).toFixed(1)}%)\n`)
  
  // Atividade recente
  if (data.recentCount > 0) {
    console.log(`⚡ ATIVIDADE: ${data.recentCount} produtos nos últimos 5 minutos`)
  } else {
    console.log('⚠️  Nenhuma atividade nos últimos 5 minutos')
  }
  
  console.log('\n' + '=' .repeat(60))
  console.log('🔄 Atualizando a cada 30 segundos... (Ctrl+C para sair)')
}

async function watchProgress() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🚀 Iniciando monitor contínuo...\n')
    
    while (true) {
      try {
        const data = await getProgressData(connector)
        await displayProgress(data)
        
        // Se todos os produtos foram processados, parar
        if (data.fullyEnriched >= data.total) {
          console.log('\n🎉 PROCESSAMENTO CONCLUÍDO!')
          break
        }
        
        await new Promise(resolve => setTimeout(resolve, REFRESH_INTERVAL))
      } catch (error) {
        console.error('\n❌ Erro ao atualizar:', error.message)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message)
  } finally {
    await connector.disconnect()
  }
}

// Lidar com Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n✅ Monitor encerrado pelo usuário')
  process.exit(0)
})

watchProgress() 