#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔍 Investigando discrepância entre banco e API...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('📂 TODAS as categorias na tabela:')
  const allCategories = await pool.query('SELECT * FROM categories ORDER BY created_at')
  allCategories.rows.forEach((c, idx) => {
    console.log(`   ${idx + 1}. ${c.name} (${c.slug}) [ID: ${c.id}]`)
    console.log(`      Parent: ${c.parent_category_id || 'null'} | Criado: ${c.created_at}`)
  })
  
  console.log('\n🔍 Contagem total de categorias:', allCategories.rows.length)
  
  console.log('\n📊 Categories com produtos:')
  const catsWithProducts = await pool.query(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id, c.name, c.slug, c.parent_category_id, c.created_at
    HAVING COUNT(p.id) > 0
    ORDER BY COUNT(p.id) DESC
  `)
  
  catsWithProducts.rows.forEach(c => {
    console.log(`   - ${c.name}: ${c.product_count} produtos`)
  })
  
  console.log('\n📊 Categories sem produtos:')
  const catsWithoutProducts = await pool.query(`
    SELECT c.*
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id, c.name, c.slug, c.parent_category_id, c.created_at
    HAVING COUNT(p.id) = 0
    ORDER BY c.created_at
  `)
  
  catsWithoutProducts.rows.forEach(c => {
    console.log(`   - ${c.name} (${c.slug}) - Criado: ${c.created_at}`)
  })
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 