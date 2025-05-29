#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔍 VERIFICAÇÃO COMPLETA do banco...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // 1. Listar todas as tabelas
  console.log('📊 Todas as tabelas no banco:')
  const tables = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)
  
  tables.rows.forEach(table => {
    console.log(`   - ${table.tablename}`)
  })
  
  // 2. Verificar múltiplas tabelas de categorias
  console.log('\n🔍 Procurando por tabelas similares a "categories":')
  const catTables = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE '%categor%'
    ORDER BY tablename
  `)
  
  catTables.rows.forEach(table => {
    console.log(`   - ${table.tablename}`)
  })
  
  // 3. Verificar se há esquemas múltiplos
  console.log('\n🏗️ Esquemas no banco:')
  const schemas = await pool.query(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY schema_name
  `)
  
  schemas.rows.forEach(schema => {
    console.log(`   - ${schema.schema_name}`)
  })
  
  // 4. Verificar todas as categorias com timestamps
  console.log('\n📂 TODAS as categorias com timestamps:')
  const allCats = await pool.query(`
    SELECT id, name, slug, is_active, created_at, updated_at
    FROM categories 
    ORDER BY created_at DESC
  `)
  
  allCats.rows.forEach((cat, idx) => {
    console.log(`   ${idx + 1}. ${cat.name} (${cat.slug})`)
    console.log(`      ID: ${cat.id}`)
    console.log(`      Active: ${cat.is_active}`)
    console.log(`      Created: ${cat.created_at}`)
    console.log(`      Updated: ${cat.updated_at}`)
    console.log('')
  })
  
  // 5. Verificar conexão em si
  console.log('🔌 Informações da conexão:')
  const connInfo = await pool.query('SELECT current_database(), current_user, version()')
  console.log(`   Database: ${connInfo.rows[0].current_database}`)
  console.log(`   User: ${connInfo.rows[0].current_user}`)
  console.log(`   Version: ${connInfo.rows[0].version.substring(0, 50)}...`)
  
  // 6. Verificar configurações do banco
  console.log('\n⚙️ Configurações relevantes:')
  const settings = await pool.query(`
    SELECT name, setting 
    FROM pg_settings 
    WHERE name IN ('timezone', 'datestyle', 'shared_preload_libraries')
  `)
  
  settings.rows.forEach(setting => {
    console.log(`   ${setting.name}: ${setting.setting}`)
  })
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 