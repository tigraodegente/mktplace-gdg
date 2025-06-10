#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function checkActions() {
  try {
    console.log('📊 Verificando ações no banco...\n')
    
    const result = await pool.query(`
      SELECT action, summary, COUNT(*) as count 
      FROM product_history 
      GROUP BY action, summary 
      ORDER BY action, count DESC
    `)
    
    console.log('Ações encontradas:')
    result.rows.forEach(row => {
      console.log(`   ${row.action}: ${row.summary} (${row.count}x)`)
    })
    
    console.log('\n📋 Últimos 10 registros:')
    const recent = await pool.query(`
      SELECT action, summary, created_at 
      FROM product_history 
      ORDER BY created_at DESC 
      LIMIT 10
    `)
    
    recent.rows.forEach(row => {
      console.log(`   ${row.created_at}: ${row.action} - ${row.summary}`)
    })
    
    await pool.end()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await pool.end()
  }
}

checkActions() 