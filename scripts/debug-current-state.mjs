#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔍 Verificando estado atual do banco Neon Develop...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // Produtos
  const products = await pool.query('SELECT name, sku, category_id FROM products ORDER BY created_at DESC LIMIT 10')
  console.log('📦 Últimos 10 produtos:')
  products.rows.forEach(p => console.log(`   - ${p.name} (SKU: ${p.sku}) [Cat: ${p.category_id}]`))
  
  console.log('\n📂 Todas as categorias:')
  const categories = await pool.query('SELECT id, name, slug FROM categories ORDER BY name')
  categories.rows.forEach(c => console.log(`   - ${c.name} (${c.slug}) [ID: ${c.id}]`))
  
  console.log('\n🔗 Produtos por categoria:')
  const productsByCategory = await pool.query(`
    SELECT c.name as category_name, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id, c.name
    ORDER BY c.name
  `)
  productsByCategory.rows.forEach(row => {
    console.log(`   - ${row.category_name}: ${row.product_count} produtos`)
  })
  
  console.log('\n📊 Total de registros:')
  const counts = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM products) as products,
      (SELECT COUNT(*) FROM categories) as categories,
      (SELECT COUNT(*) FROM brands) as brands
  `)
  console.log(`   - Produtos: ${counts.rows[0].products}`)
  console.log(`   - Categorias: ${counts.rows[0].categories}`)
  console.log(`   - Marcas: ${counts.rows[0].brands}`)
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 