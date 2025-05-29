#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔍 Investigação DETALHADA das categorias...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // Contar TODAS as categorias
  const totalCount = await pool.query('SELECT COUNT(*) as total FROM categories')
  console.log('📊 Total de categorias na tabela:', totalCount.rows[0].total)
  
  // Buscar TODAS as categorias (incluindo possíveis inativas)
  console.log('\n📂 TODAS as categorias (sem nenhum filtro):')
  const allCategories = await pool.query(`
    SELECT id, name, slug, parent_id, is_active, created_at, description, position
    FROM categories 
    ORDER BY created_at DESC
  `)
  
  allCategories.rows.forEach((c, idx) => {
    console.log(`   ${idx + 1}. ${c.name} (${c.slug})`)
    console.log(`      ID: ${c.id}`)
    console.log(`      Parent: ${c.parent_id || 'null'}`)
    console.log(`      Active: ${c.is_active}`)
    console.log(`      Created: ${c.created_at}`)
    console.log(`      Position: ${c.position}`)
    console.log(`      Description: ${c.description || 'null'}`)
    console.log('')
  })
  
  // Verificar se há IDs duplicados
  console.log('🔍 Verificando IDs duplicados:')
  const duplicateIds = await pool.query(`
    SELECT id, COUNT(*) as count 
    FROM categories 
    GROUP BY id 
    HAVING COUNT(*) > 1
  `)
  
  if (duplicateIds.rows.length > 0) {
    console.log('⚠️ IDs duplicados encontrados:')
    duplicateIds.rows.forEach(row => {
      console.log(`   - ID ${row.id}: ${row.count} vezes`)
    })
  } else {
    console.log('✅ Nenhum ID duplicado')
  }
  
  // Verificar a query exata da API
  console.log('\n🔎 Query exata da API (is_active = true):')
  const apiQuery = await pool.query(`
    SELECT id, name, slug, parent_id, description, position
    FROM categories
    WHERE is_active = true
    ORDER BY position ASC, name ASC
  `)
  
  console.log(`   Retornou: ${apiQuery.rows.length} categorias`)
  apiQuery.rows.forEach(c => {
    console.log(`   - ${c.name} (${c.slug}) [ID: ${c.id}]`)
  })
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 