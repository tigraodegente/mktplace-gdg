#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkReviewsTable() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA REVIEWS:')
    const structure = await connector.queryNeon(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'reviews'
      ORDER BY ordinal_position
    `)
    
    console.log('Colunas da tabela reviews:')
    structure.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`)
    })
    
    console.log('\n📋 SAMPLE DE DADOS:')
    const sample = await connector.queryNeon(`
      SELECT * FROM reviews LIMIT 3
    `)
    
    if (sample.rows.length > 0) {
      console.log('Primeiras 3 reviews:')
      sample.rows.forEach((review, i) => {
        console.log(`\n   ${i+1}. Review ID: ${review.id}`)
        Object.entries(review).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`)
        })
      })
    } else {
      console.log('   ❌ Nenhuma review encontrada')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkReviewsTable() 