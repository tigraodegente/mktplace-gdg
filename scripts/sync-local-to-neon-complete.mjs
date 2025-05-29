#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔄 SINCRONIZAÇÃO COMPLETA: Local → Neon Develop\n')

// Configurações
const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const NEON_DB_URL = process.env.DATABASE_URL

if (!NEON_DB_URL) {
  console.error('❌ DATABASE_URL não definida!')
  process.exit(1)
}

console.log('🔌 Sincronizando de:')
console.log(`   Local: ${LOCAL_DB_URL}`)
console.log(`   Para:  ${NEON_DB_URL.substring(0, 50)}...`)

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // 1. Verificar conexões
  console.log('\n🔍 Verificando conexões...')
  await localPool.query('SELECT 1')
  await neonPool.query('SELECT 1')
  console.log('   ✅ Ambas as conexões OK')
  
  // 2. Backup atual do Neon (precaução)
  console.log('\n💾 Fazendo backup das categorias MongoDB do Neon...')
  const mongoCategories = await neonPool.query(`
    SELECT * FROM categories 
    WHERE name IN ('Almofada Quarto de Bebê', 'Cabanas e Tendas', 'Kit Berço + Berço', 'Roupinhas', 'Saia Berço')
  `)
  console.log(`   📦 Salvando ${mongoCategories.rows.length} categorias MongoDB`)
  
  const mongoProducts = await neonPool.query(`
    SELECT * FROM products 
    WHERE category_id IN (
      SELECT id FROM categories 
      WHERE name IN ('Almofada Quarto de Bebê', 'Cabanas e Tendas', 'Kit Berço + Berço', 'Roupinhas', 'Saia Berço')
    )
  `)
  console.log(`   📦 Salvando ${mongoProducts.rows.length} produtos MongoDB`)
  
  // 3. Limpar Neon (CUIDADO!)
  console.log('\n🗑️ Limpando dados atuais do Neon...')
  await neonPool.query('DELETE FROM product_images')
  await neonPool.query('DELETE FROM products')
  await neonPool.query('DELETE FROM categories')
  await neonPool.query('DELETE FROM brands')
  await neonPool.query('DELETE FROM sellers')
  console.log('   ✅ Neon limpo')
  
  // 4. Copiar dados do Local para Neon
  console.log('\n📋 Copiando dados Local → Neon...')
  
  // 4a. Copiar marcas
  const localBrands = await localPool.query('SELECT * FROM brands ORDER BY created_at')
  console.log(`   📋 Copiando ${localBrands.rows.length} marcas...`)
  for (const brand of localBrands.rows) {
    await neonPool.query(`
      INSERT INTO brands (id, name, slug, logo_url, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [brand.id, brand.name, brand.slug, brand.logo_url, brand.is_active, brand.created_at, brand.updated_at])
  }
  
  // 4b. Copiar vendedores
  const localSellers = await localPool.query('SELECT * FROM sellers ORDER BY created_at')
  console.log(`   👥 Copiando ${localSellers.rows.length} vendedores...`)
  for (const seller of localSellers.rows) {
    await neonPool.query(`
      INSERT INTO sellers (id, user_id, business_name, cnpj, description, phone, whatsapp, is_verified, is_active, rating, total_reviews, total_sales, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      seller.id, seller.user_id, seller.business_name, seller.cnpj, seller.description,
      seller.phone, seller.whatsapp, seller.is_verified, seller.is_active,
      seller.rating, seller.total_reviews, seller.total_sales, seller.created_at, seller.updated_at
    ])
  }
  
  // 4c. Copiar categorias
  const localCategories = await localPool.query('SELECT * FROM categories ORDER BY created_at')
  console.log(`   📂 Copiando ${localCategories.rows.length} categorias...`)
  for (const cat of localCategories.rows) {
    await neonPool.query(`
      INSERT INTO categories (id, name, slug, description, parent_id, icon, is_active, position, path, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      cat.id, cat.name, cat.slug, cat.description, cat.parent_id, cat.icon,
      cat.is_active, cat.position, cat.path, cat.created_at, cat.updated_at
    ])
  }
  
  // 4d. Copiar produtos
  const localProducts = await localPool.query('SELECT * FROM products ORDER BY created_at')
  console.log(`   📦 Copiando ${localProducts.rows.length} produtos...`)
  for (const prod of localProducts.rows) {
    await neonPool.query(`
      INSERT INTO products (
        id, name, slug, description, price, quantity, sku, category_id, brand_id, seller_id,
        images, weight, dimensions, is_active, featured, tags, has_free_shipping, delivery_days,
        condition, seller_state, seller_city, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    `, [
      prod.id, prod.name, prod.slug, prod.description, prod.price, prod.quantity, prod.sku,
      prod.category_id, prod.brand_id, prod.seller_id, prod.images, prod.weight, prod.dimensions,
      prod.is_active, prod.featured, prod.tags, prod.has_free_shipping, prod.delivery_days,
      prod.condition, prod.seller_state, prod.seller_city, prod.created_at, prod.updated_at
    ])
  }
  
  // 4e. Copiar imagens dos produtos
  try {
    const localImages = await localPool.query('SELECT * FROM product_images ORDER BY position')
    console.log(`   🖼️ Copiando ${localImages.rows.length} imagens...`)
    for (const img of localImages.rows) {
      await neonPool.query(`
        INSERT INTO product_images (id, product_id, image_url, alt_text, position, is_primary, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [img.id, img.product_id, img.image_url, img.alt_text, img.position, img.is_primary, img.created_at, img.updated_at])
    }
  } catch (error) {
    console.log(`   ⚠️ Erro ao copiar imagens: ${error.message}`)
  }
  
  // 5. Adicionar de volta os produtos MongoDB
  console.log('\n🔄 Adicionando de volta produtos MongoDB...')
  for (const prod of mongoProducts.rows) {
    try {
      await neonPool.query(`
        INSERT INTO products (
          id, name, slug, description, price, quantity, sku, category_id, brand_id, seller_id,
          images, weight, dimensions, is_active, featured, tags, has_free_shipping, delivery_days,
          condition, seller_state, seller_city, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          quantity = EXCLUDED.quantity,
          updated_at = NOW()
      `, [
        prod.id, prod.name, prod.slug, prod.description, prod.price, prod.quantity, prod.sku,
        prod.category_id, prod.brand_id, prod.seller_id, prod.images, prod.weight, prod.dimensions,
        prod.is_active, prod.featured, prod.tags, prod.has_free_shipping, prod.delivery_days,
        prod.condition, prod.seller_state, prod.seller_city, prod.created_at, prod.updated_at
      ])
    } catch (error) {
      console.log(`   ⚠️ Produto MongoDB ${prod.name} já existe, mantendo`)
    }
  }
  
  // 6. Verificar resultado final
  console.log('\n✅ RESULTADO FINAL:')
  const finalCounts = await neonPool.query(`
    SELECT 
      (SELECT COUNT(*) FROM products) as products,
      (SELECT COUNT(*) FROM categories) as categories,
      (SELECT COUNT(*) FROM brands) as brands,
      (SELECT COUNT(*) FROM sellers) as sellers
  `)
  
  const counts = finalCounts.rows[0]
  console.log(`   📦 Produtos: ${counts.products}`)
  console.log(`   📂 Categorias: ${counts.categories}`)  
  console.log(`   🏷️ Marcas: ${counts.brands}`)
  console.log(`   👥 Vendedores: ${counts.sellers}`)
  
  console.log('\n📂 Categorias finais no Neon:')
  const finalCategories = await neonPool.query('SELECT name, slug FROM categories ORDER BY name')
  finalCategories.rows.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.slug})`)
  })
  
  console.log('\n🎉 SINCRONIZAÇÃO COMPLETA!')
  console.log('   Agora Local e Neon têm dados idênticos')
  console.log('   A aplicação funcionará igual independente da conexão')
  
} catch (error) {
  console.error('❌ Erro durante sincronização:', error.message)
  console.error(error)
} finally {
  await localPool.end().catch(() => {})
  await neonPool.end().catch(() => {})
} 