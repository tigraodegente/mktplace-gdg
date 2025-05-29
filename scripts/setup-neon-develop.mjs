#!/usr/bin/env node

import fs from 'fs'
import pg from 'pg'

const { Pool } = pg

console.log('🚀 Configurando banco Neon Develop...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('🔧 Habilitando extensões necessárias...')
  
  // Habilitar extensão UUID
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
  console.log('✅ Extensão UUID habilitada')
  
  console.log('🔧 Criando schema completo no banco Develop...')
  
  const sql = fs.readFileSync('./scripts/backup/migration-safe-marketplace.sql', 'utf8')
  await pool.query(sql)
  
  console.log('✅ Schema criado com sucesso!\n')
  
  // Verificar tabelas criadas
  const result = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)
  
  console.log(`📊 ${result.rows.length} tabelas criadas:`)
  result.rows.forEach(row => console.log(`   - ${row.tablename}`))
  
  console.log('\n🎉 Banco Develop configurado e pronto para uso!')
  
} catch (error) {
  console.error('❌ Erro ao configurar banco:', error.message)
} finally {
  await pool.end()
} 