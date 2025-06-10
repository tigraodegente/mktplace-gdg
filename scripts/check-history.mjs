#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function checkHistory() {
  try {
    console.log('🔍 Verificando histórico de produtos...\n')
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'product_history'
    `)
    console.log('📊 Tabela product_history existe?', tableCheck.rows[0].count > 0)
    
    if (tableCheck.rows[0].count === '0') {
      console.log('❌ Tabela não existe! Execute: node setup-history.mjs')
      return
    }
    
    // Contar registros
    const countResult = await pool.query('SELECT COUNT(*) as total FROM product_history')
    console.log('📈 Total de registros:', countResult.rows[0].total)
    
    // Contar por produto
    const byProduct = await pool.query(`
      SELECT product_id, COUNT(*) as count 
      FROM product_history 
      GROUP BY product_id 
      ORDER BY count DESC 
      LIMIT 5
    `)
    console.log('\n📋 Registros por produto:')
    byProduct.rows.forEach(row => {
      console.log(`  - Produto ${row.product_id}: ${row.count} registros`)
    })
    
    // Mostrar alguns registros recentes
    const sampleData = await pool.query(`
      SELECT id, product_id, action, summary, created_at, user_name 
      FROM product_history 
      ORDER BY created_at DESC 
      LIMIT 5
    `)
    console.log('\n🕒 Últimos registros:')
    sampleData.rows.forEach(row => {
      console.log(`  - ${row.created_at}: Produto ${row.product_id} - ${row.action} - ${row.summary}`)
    })
    
    // Verificar se existe produto específico
    console.log('\n🎯 Testando produto específico (ID 1):')
    const productHistory = await pool.query(
      'SELECT COUNT(*) as count FROM product_history WHERE product_id = $1',
      ['1']
    )
    console.log(`   Produto 1 tem ${productHistory.rows[0].count} registros`)
    
    await pool.end()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await pool.end()
  }
}

checkHistory() 