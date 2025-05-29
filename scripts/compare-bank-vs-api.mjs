#!/usr/bin/env node

import pg from 'pg'
import fetch from 'node-fetch'

const { Pool } = pg

console.log('📊 COMPARAÇÃO: Banco Neon vs API da Aplicação\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // 1. Verificar direto no banco Neon
  console.log('🔍 Direto no banco Neon Develop:')
  
  const products = await pool.query('SELECT COUNT(*) FROM products WHERE is_active = true AND quantity > 0')
  const categories = await pool.query('SELECT COUNT(*) FROM categories WHERE is_active = true')
  const brands = await pool.query('SELECT COUNT(*) FROM brands WHERE is_active = true')
  
  const neonData = {
    products: parseInt(products.rows[0].count),
    categories: parseInt(categories.rows[0].count),
    brands: parseInt(brands.rows[0].count)
  }
  
  console.log(`   Produtos ativos: ${neonData.products}`)
  console.log(`   Categorias ativas: ${neonData.categories}`)
  console.log(`   Marcas ativas: ${neonData.brands}`)
  
  // 2. Verificar via API da aplicação
  console.log('\n🌐 Via API da aplicação (localhost:5173):')
  
  try {
    const productsRes = await fetch('http://localhost:5173/api/products?limit=100')
    const productsApi = await productsRes.json()
    
    const categoriesRes = await fetch('http://localhost:5173/api/categories')
    const categoriesApi = await categoriesRes.json()
    
    const apiData = {
      products: productsApi.data?.products?.length || 0,
      categories: categoriesApi.data?.categories?.length || 0
    }
    
    console.log(`   Produtos ativos: ${apiData.products}`)
    console.log(`   Categorias ativas: ${apiData.categories}`)
    
    // 3. Comparação
    console.log('\n⚖️ COMPARAÇÃO:')
    console.log(`   Produtos: Banco ${neonData.products} vs API ${apiData.products} ${neonData.products === apiData.products ? '✅' : '❌'}`)
    console.log(`   Categorias: Banco ${neonData.categories} vs API ${apiData.categories} ${neonData.categories === apiData.categories ? '✅' : '❌'}`)
    
    if (neonData.products === apiData.products && neonData.categories === apiData.categories) {
      console.log('\n🎉 DADOS CONSISTENTES! A aplicação está consumindo do banco Neon Develop correto.')
    } else {
      console.log('\n⚠️ INCONSISTÊNCIA! A aplicação pode estar conectada a outro banco.')
    }
    
  } catch (apiError) {
    console.log('❌ Erro ao consultar API:', apiError.message)
    console.log('⚠️ Aplicação pode não estar rodando ou banco incorreto')
  }
  
  // 4. Verificar origem dos dados (MongoDB tags)
  console.log('\n🔍 Verificando origem dos dados:')
  const mongoProducts = await pool.query("SELECT COUNT(*) FROM products WHERE tags::text LIKE '%importado-mongodb%'")
  console.log(`   Produtos importados do MongoDB: ${mongoProducts.rows[0].count}`)
  
  // 5. Detalhes dos produtos importados
  const productDetails = await pool.query(`
    SELECT p.name, p.sku, c.name as category_name, p.quantity, p.is_active
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE tags::text LIKE '%importado-mongodb%'
    ORDER BY p.name
  `)
  
  console.log('\n📦 Produtos importados do MongoDB:')
  productDetails.rows.forEach((prod, i) => {
    console.log(`   ${i+1}. ${prod.name} (SKU: ${prod.sku})`)
    console.log(`      Categoria: ${prod.category_name || 'N/A'}`)
    console.log(`      Estoque: ${prod.quantity} | Ativo: ${prod.is_active}`)
  })

} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 