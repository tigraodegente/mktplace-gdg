#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔍 COMPARANDO SCHEMAS: Local vs Neon\n')

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const NEON_DB_URL = process.env.DATABASE_URL

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // Tabelas a verificar
  const tables = ['brands', 'categories', 'sellers', 'products', 'product_images']
  
  for (const tableName of tables) {
    console.log(`\n📋 TABELA: ${tableName.toUpperCase()}`)
    console.log('=' .repeat(50))
    
    try {
      // Schema do banco local
      const localSchema = await localPool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName])
      
      // Schema do Neon
      const neonSchema = await neonPool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName])
      
      console.log(`\n📊 LOCAL (${localSchema.rows.length} colunas):`)
      localSchema.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
      })
      
      console.log(`\n📊 NEON (${neonSchema.rows.length} colunas):`)
      neonSchema.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
      })
      
      // Diferenças
      const localCols = new Set(localSchema.rows.map(c => c.column_name))
      const neonCols = new Set(neonSchema.rows.map(c => c.column_name))
      
      const onlyInLocal = [...localCols].filter(col => !neonCols.has(col))
      const onlyInNeon = [...neonCols].filter(col => !localCols.has(col))
      
      if (onlyInLocal.length > 0) {
        console.log(`\n⚠️ APENAS NO LOCAL:`)
        onlyInLocal.forEach(col => console.log(`   - ${col}`))
      }
      
      if (onlyInNeon.length > 0) {
        console.log(`\n⚠️ APENAS NO NEON:`)
        onlyInNeon.forEach(col => console.log(`   - ${col}`))
      }
      
      if (onlyInLocal.length === 0 && onlyInNeon.length === 0) {
        console.log(`\n✅ Schemas idênticos`)
      }
      
    } catch (error) {
      console.log(`   ❌ Erro ao verificar ${tableName}: ${error.message}`)
    }
  }
  
  console.log('\n🔧 RECOMENDAÇÕES:')
  console.log('   1. Ajustar schema do Neon para match com Local')
  console.log('   2. Ou ajustar script de sync para lidar com diferenças')
  console.log('   3. Focar apenas nas colunas que existem em ambos')
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await localPool.end().catch(() => {})
  await neonPool.end().catch(() => {})
} 