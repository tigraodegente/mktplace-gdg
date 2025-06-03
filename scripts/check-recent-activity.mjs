#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkRecentActivity() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 VERIFICANDO ATIVIDADE RECENTE (últimos 20 minutos)\n')
    
    // Produtos atualizados recentemente
    const recentUpdates = await connector.queryNeon(`
      SELECT 
        name, sku, meta_title, updated_at,
        EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_ago
      FROM products 
      WHERE updated_at > NOW() - INTERVAL '20 minutes'
      ORDER BY updated_at DESC
      LIMIT 10
    `)
    
    console.log('📦 PRODUTOS ATUALIZADOS:')
    if (recentUpdates.rows.length > 0) {
      recentUpdates.rows.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.name} (${p.sku})`)
        console.log(`      Meta title: ${p.meta_title ? 'SIM' : 'NÃO'}`)
        console.log(`      Há ${Math.floor(p.minutes_ago)} minutos\n`)
      })
    } else {
      console.log('   ❌ Nenhum produto atualizado\n')
    }
    
    // Verificar se o script está rodando
    console.log('🔄 STATUS DO SCRIPT:')
    const { exec } = await import('child_process')
    exec('ps aux | grep "enrich-sample-complete" | grep -v grep', (error, stdout) => {
      if (stdout.trim()) {
        console.log('   ✅ Script está rodando')
      } else {
        console.log('   ❌ Script não está rodando')
      }
    })
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkRecentActivity() 