#!/usr/bin/env node

import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkNeonSchema() {
  try {
    console.log('🔌 Conectando ao Neon PostgreSQL...')
    
    // 1. Listar todas as tabelas
    const tablesResult = await neonPool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)
    
    console.log('\n📊 Tabelas encontradas no Neon:')
    console.log('=' * 40)
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ Nenhuma tabela encontrada!')
      return
    }
    
    for (const table of tablesResult.rows) {
      const tableName = table.tablename
      
      // Contar registros
      const countResult = await neonPool.query(`SELECT COUNT(*) as count FROM ${tableName}`)
      const count = parseInt(countResult.rows[0].count)
      
      console.log(`📁 ${tableName.padEnd(20)} → ${count.toLocaleString()} registros`)
      
      // Se for uma tabela importante, mostrar estrutura
      if (['users', 'sellers', 'categories', 'products'].includes(tableName)) {
        const columnsResult = await neonPool.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tableName])
        
        console.log(`   Colunas:`)
        columnsResult.rows.forEach(col => {
          console.log(`     ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
        })
        console.log('')
      }
    }
    
    // 2. Verificar se as tabelas principais existem
    const requiredTables = ['users', 'sellers', 'categories', 'products']
    const existingTables = tablesResult.rows.map(r => r.tablename)
    
    console.log('\n🔍 Verificação de Tabelas Obrigatórias:')
    console.log('=' * 50)
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ ${table} - Existe`)
      } else {
        console.log(`❌ ${table} - NÃO EXISTE`)
      }
    }
    
    // 3. Se a tabela products existir, verificar estrutura
    if (existingTables.includes('products')) {
      console.log('\n📦 Estrutura da Tabela Products:')
      console.log('=' * 40)
      
      const productColumns = await neonPool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        ORDER BY ordinal_position
      `)
      
      productColumns.rows.forEach(col => {
        console.log(`${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
      })

      // Verificar estrutura da tabela product_images
      console.log('\n📸 Estrutura da Tabela Product Images:')
      console.log('NaN')
      const imageColumns = await neonPool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'product_images'
        ORDER BY ordinal_position
      `)
      
      imageColumns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
        console.log(`${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | ${nullable}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await neonPool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkNeonSchema()
} 