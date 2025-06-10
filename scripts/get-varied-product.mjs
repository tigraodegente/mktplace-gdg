#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function getProductWithVariedHistory() {
  try {
    const result = await pool.query(`
      SELECT product_id, COUNT(DISTINCT action) as action_count
      FROM product_history 
      GROUP BY product_id 
      HAVING COUNT(DISTINCT action) > 1
      ORDER BY action_count DESC
      LIMIT 1
    `)
    
    if (result.rows.length > 0) {
      const productId = result.rows[0].product_id
      console.log('🎯 Produto com histórico variado:', productId)
      
      const history = await pool.query(`
        SELECT action, summary, created_at 
        FROM product_history 
        WHERE product_id = $1
        ORDER BY created_at DESC
      `, [productId])
      
      console.log('\n📋 Histórico deste produto:')
      history.rows.forEach(row => {
        console.log(`   ${row.action}: ${row.summary}`)
      })
      
      console.log('\n🔗 Use este Product ID para testar:', productId)
    } else {
      console.log('❌ Nenhum produto com ações variadas encontrado')
    }
    
    await pool.end()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await pool.end()
  }
}

getProductWithVariedHistory() 