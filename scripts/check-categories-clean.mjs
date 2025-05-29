#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('📊 Verificando categorias no banco Develop:')
  
  const categories = await pool.query('SELECT id, name, slug, is_active FROM categories ORDER BY name')
  console.log(`Total: ${categories.rows.length} categorias`)
  
  categories.rows.forEach((cat, i) => {
    console.log(`${i+1}. ${cat.name} (slug: ${cat.slug}, ativo: ${cat.is_active})`)
  })

  console.log('\n📊 Verificando produtos e suas categorias:')
  const products = await pool.query(`
    SELECT p.name, c.name as category_name, p.is_active, p.quantity
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.name
  `)
  
  products.rows.forEach((prod, i) => {
    console.log(`${i+1}. ${prod.name} → ${prod.category_name || 'SEM CATEGORIA'} (ativo: ${prod.is_active}, estoque: ${prod.quantity})`)
  })

  console.log('\n📊 Verificando marcas:')
  const brands = await pool.query('SELECT id, name, slug, is_active FROM brands ORDER BY name')
  console.log(`Total: ${brands.rows.length} marcas`)
  
  brands.rows.forEach((brand, i) => {
    console.log(`${i+1}. ${brand.name} (slug: ${brand.slug}, ativo: ${brand.is_active})`)
  })

  console.log('\n🔍 Testando problema da API:')
  console.log('Verificando se aplicação está rodando...')

} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 