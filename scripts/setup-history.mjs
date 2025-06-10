#!/usr/bin/env node

import fs from 'fs'
import pg from 'pg'

const { Pool } = pg

console.log('🔄 Configurando histórico de produtos...\n')

// URL padrão do Neon para desenvolvimento
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('📋 Executando setup-product-history.sql...')
  
  const sql = fs.readFileSync('./setup-product-history.sql', 'utf8')
  await pool.query(sql)
  
  console.log('✅ Histórico de produtos configurado com sucesso!')
  
  // Verificar se a tabela foi criada
  const result = await pool.query(`
    SELECT COUNT(*) as count FROM information_schema.tables 
    WHERE table_name = 'product_history'
  `)
  
  if (result.rows[0].count > 0) {
    console.log('✅ Tabela product_history existe')
    
    // Verificar quantos registros existem
    const countResult = await pool.query('SELECT COUNT(*) as count FROM product_history')
    console.log(`📊 ${countResult.rows[0].count} registros de histórico encontrados`)
  } else {
    console.log('❌ Tabela product_history não foi criada')
  }
  
} catch (error) {
  console.error('❌ Erro ao configurar histórico:', error.message)
} finally {
  await pool.end()
} 