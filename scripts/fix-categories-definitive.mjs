#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔧 LIMPEZA DEFINITIVA das categorias...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // 1. Verificar produtos existentes e suas categorias
  console.log('📦 Verificando produtos existentes...')
  const products = await pool.query(`
    SELECT id, name, category_id 
    FROM products 
    WHERE quantity > 0
    ORDER BY name
  `)
  
  console.log(`   Encontrados ${products.rows.length} produtos ativos`)
  
  if (products.rows.length === 0) {
    console.log('❌ Nenhum produto ativo encontrado! Abortando...')
    process.exit(1)
  }
  
  // 2. Verificar categorias atuais
  console.log('\n📂 Categorias atuais:')
  const currentCategories = await pool.query('SELECT id, name, slug FROM categories ORDER BY name')
  currentCategories.rows.forEach(c => {
    console.log(`   - ${c.name} (${c.slug}) [${c.id}]`)
  })
  
  // 3. Verificar se há produtos órfãos
  console.log('\n🔍 Verificando consistência produtos <-> categorias...')
  const orphanProducts = await pool.query(`
    SELECT p.id, p.name, p.category_id
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE c.id IS NULL AND p.quantity > 0
  `)
  
  if (orphanProducts.rows.length > 0) {
    console.log('⚠️ Produtos sem categoria encontrados:')
    orphanProducts.rows.forEach(p => {
      console.log(`   - ${p.name} [categoria: ${p.category_id}]`)
    })
  } else {
    console.log('✅ Todos os produtos têm categorias válidas')
  }
  
  // 4. Identificar categorias sem produtos
  console.log('\n🗑️ Categorias sem produtos:')
  const emptyCats = await pool.query(`
    SELECT c.id, c.name, c.slug
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.quantity > 0
    GROUP BY c.id, c.name, c.slug
    HAVING COUNT(p.id) = 0
  `)
  
  if (emptyCats.rows.length > 0) {
    console.log(`   Encontradas ${emptyCats.rows.length} categorias vazias:`)
    emptyCats.rows.forEach(c => {
      console.log(`   - ${c.name} (${c.slug})`)
    })
    
    // 5. Remover categorias vazias
    console.log('\n🗑️ Removendo categorias vazias...')
    const deleteResult = await pool.query(`
      DELETE FROM categories 
      WHERE id IN (
        SELECT c.id
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.quantity > 0
        GROUP BY c.id
        HAVING COUNT(p.id) = 0
      )
    `)
    console.log(`   ✅ Removidas ${deleteResult.rowCount} categorias vazias`)
  } else {
    console.log('   ✅ Nenhuma categoria vazia encontrada')
  }
  
  // 6. Verificar estado final
  console.log('\n✅ ESTADO FINAL:')
  const finalCategories = await pool.query('SELECT id, name, slug FROM categories ORDER BY name')
  const finalProducts = await pool.query('SELECT COUNT(*) as total FROM products WHERE quantity > 0')
  
  console.log(`   📂 Categorias restantes: ${finalCategories.rows.length}`)
  finalCategories.rows.forEach(c => {
    console.log(`      - ${c.name} (${c.slug})`)
  })
  
  console.log(`   📦 Produtos ativos: ${finalProducts.rows[0].total}`)
  
  // 7. Verificar integridade final
  const integrityCheck = await pool.query(`
    SELECT COUNT(*) as count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE c.id IS NULL AND p.quantity > 0
  `)
  
  if (integrityCheck.rows[0].count > 0) {
    console.log('❌ ERRO: Ainda há produtos sem categoria válida!')
  } else {
    console.log('✅ Integridade verificada: todos os produtos têm categorias válidas')
  }
  
  console.log('\n🎉 Limpeza concluída! Categorias agora estão consistentes.')
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 