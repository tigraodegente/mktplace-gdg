#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔍 Verificando coluna is_active na tabela categories...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // Verificar se a coluna is_active existe
  const columnCheck = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'categories' 
    AND column_name = 'is_active'
  `)
  
  console.log('📊 Coluna is_active existe:', columnCheck.rows.length > 0)
  
  // Verificar todas as categorias sem filtro
  console.log('\n📂 Todas as categorias (sem filtro):')
  const allCategories = await pool.query('SELECT id, name, slug, is_active FROM categories ORDER BY name')
  allCategories.rows.forEach(c => {
    console.log(`   - ${c.name}: is_active = ${c.is_active}`)
  })
  
  // Verificar apenas as ativas
  console.log('\n✅ Categorias ativas (is_active = true):')
  const activeCategories = await pool.query('SELECT id, name, slug FROM categories WHERE is_active = true ORDER BY name')
  if (activeCategories.rows.length === 0) {
    console.log('   ❌ Nenhuma categoria ativa encontrada!')
  } else {
    activeCategories.rows.forEach(c => {
      console.log(`   - ${c.name}`)
    })
  }
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 