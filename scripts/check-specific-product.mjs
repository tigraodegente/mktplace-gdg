#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function checkSpecificProduct() {
  try {
    const productId = '00056193-38eb-4c48-9883-162e7f453a12'
    
    console.log('🔍 Verificando produto:', productId)
    
    // Verificar se o produto existe na tabela products
    const productExists = await pool.query('SELECT id, name FROM products WHERE id = $1', [productId])
    
    if (productExists.rows.length === 0) {
      console.log('❌ Produto não existe na tabela products')
      
      // Pegar um produto que realmente existe
      const realProduct = await pool.query(`
        SELECT p.id, p.name, COUNT(ph.id) as history_count
        FROM products p
        LEFT JOIN product_history ph ON p.id = ph.product_id
        GROUP BY p.id, p.name
        HAVING COUNT(ph.id) > 0
        ORDER BY COUNT(ph.id) DESC
        LIMIT 1
      `)
      
      if (realProduct.rows.length > 0) {
        const realId = realProduct.rows[0].id
        console.log('✅ Produto real encontrado:', realId, '-', realProduct.rows[0].name)
        console.log('📊 Registros de histórico:', realProduct.rows[0].history_count)
        
        // Mostrar histórico do produto real
        const history = await pool.query(`
          SELECT action, summary, created_at 
          FROM product_history 
          WHERE product_id = $1 
          ORDER BY created_at DESC 
          LIMIT 5
        `, [realId])
        
        console.log('\n📋 Histórico:')
        history.rows.forEach(row => {
          console.log(`   ${row.action}: ${row.summary}`)
        })
        
        console.log('\n🔗 Use este ID:', realId)
      }
    } else {
      console.log('✅ Produto existe:', productExists.rows[0].name)
      
      // Verificar histórico
      const history = await pool.query(`
        SELECT action, summary, created_at 
        FROM product_history 
        WHERE product_id = $1 
        ORDER BY created_at DESC
      `, [productId])
      
      console.log('📊 Total de registros:', history.rows.length)
      
      if (history.rows.length > 0) {
        console.log('\n📋 Histórico:')
        history.rows.forEach(row => {
          console.log(`   ${row.action}: ${row.summary}`)
        })
      }
    }
    
    await pool.end()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await pool.end()
  }
}

checkSpecificProduct() 