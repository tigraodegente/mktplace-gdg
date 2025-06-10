#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function debugCurrentIssue() {
  try {
    console.log('🔍 Debugando problema atual...\n')
    
    // 1. Verificar produtos que só têm "created"
    const onlyCreated = await pool.query(`
      SELECT product_id, COUNT(*) as count
      FROM product_history 
      WHERE action = 'created'
      AND product_id NOT IN (
        SELECT DISTINCT product_id 
        FROM product_history 
        WHERE action != 'created'
      )
      GROUP BY product_id
      ORDER BY count DESC
      LIMIT 5
    `)
    
    console.log('📋 Produtos que só têm "created":')
    onlyCreated.rows.forEach(row => {
      console.log(`  ${row.product_id}: ${row.count} registros`)
    })
    
    // 2. Verificar produtos com ações variadas
    const varied = await pool.query(`
      SELECT p.id, p.name, COUNT(DISTINCT ph.action) as distinct_actions,
             STRING_AGG(DISTINCT ph.action, ', ') as actions
      FROM products p
      JOIN product_history ph ON p.id = ph.product_id
      GROUP BY p.id, p.name
      HAVING COUNT(DISTINCT ph.action) > 1
      ORDER BY distinct_actions DESC
      LIMIT 3
    `)
    
    console.log('\n✅ Produtos com ações variadas:')
    varied.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.name}`)
      console.log(`    Ações: ${row.actions} (${row.distinct_actions} diferentes)`)
    })
    
    // 3. Testar consulta da API para o produto específico
    const targetProduct = '00056193-38eb-4c48-9883-162e7f453a12'
    
    console.log(`\n🎯 Testando consulta para produto: ${targetProduct}`)
    
    const apiQuery = await pool.query(`
      SELECT 
        ph.*,
        u.name as user_name,
        u.email as user_email,
        COUNT(*) OVER() as total_count
      FROM product_history ph
      LEFT JOIN users u ON u.id = ph.user_id
      WHERE ph.product_id = $1
      ORDER BY ph.created_at DESC
      LIMIT 10 OFFSET 0
    `, [targetProduct])
    
    console.log(`📊 Resultado da consulta API: ${apiQuery.rows.length} registros`)
    apiQuery.rows.forEach(row => {
      console.log(`  ${row.action}: ${row.summary} (${row.created_at})`)
    })
    
    // 4. Verificar se existe tabela users
    const usersExist = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `)
    
    console.log(`\n👥 Tabela users existe: ${usersExist.rows[0].count > 0}`)
    
    await pool.end()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await pool.end()
  }
}

debugCurrentIssue() 