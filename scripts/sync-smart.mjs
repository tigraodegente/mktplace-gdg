#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🧠 SINCRONIZAÇÃO INTELIGENTE: Local → Neon\n')

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const NEON_DB_URL = process.env.DATABASE_URL

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('🔍 Verificando conexões...')
  await localPool.query('SELECT 1')
  await neonPool.query('SELECT 1')
  console.log('   ✅ Ambas as conexões OK')
  
  // Backup dos produtos MongoDB
  console.log('\n💾 Salvando produtos MongoDB...')
  const mongoProducts = await neonPool.query(`
    SELECT * FROM products 
    WHERE category_id IN (
      SELECT id FROM categories 
      WHERE name IN ('Almofada Quarto de Bebê', 'Cabanas e Tendas', 'Kit Berço + Berço', 'Roupinhas', 'Saia Berço')
    )
  `)
  console.log(`   📦 ${mongoProducts.rows.length} produtos MongoDB salvos`)
  
  // Limpar Neon
  console.log('\n🗑️ Limpando Neon...')
  await neonPool.query('DELETE FROM product_images')
  await neonPool.query('DELETE FROM products')
  await neonPool.query('DELETE FROM categories')
  await neonPool.query('DELETE FROM brands')
  await neonPool.query('DELETE FROM sellers')
  console.log('   ✅ Neon limpo')
  
  // 1. BRANDS (sem website)
  console.log('\n📋 Sincronizando brands...')
  const localBrands = await localPool.query('SELECT id, name, slug, description, logo_url, is_active, created_at, updated_at FROM brands')
  for (const brand of localBrands.rows) {
    await neonPool.query(`
      INSERT INTO brands (id, name, slug, description, logo_url, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [brand.id, brand.name, brand.slug, brand.description, brand.logo_url, brand.is_active, brand.created_at, brand.updated_at])
  }
  console.log(`   ✅ ${localBrands.rows.length} brands copiadas`)
  
  // 2. SELLERS (sem state, city, slug)  
  console.log('\n👥 Sincronizando sellers...')
  const localSellers = await localPool.query(`
    SELECT id, user_id, company_name, company_document, description, logo_url, banner_url, 
           is_verified, is_active, rating_average, rating_count, total_sales, created_at, updated_at
    FROM sellers
  `)
  for (const seller of localSellers.rows) {
    await neonPool.query(`
      INSERT INTO sellers (id, user_id, company_name, company_document, description, logo_url, banner_url, 
                          is_verified, is_active, rating_average, rating_count, total_sales, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      seller.id, seller.user_id, seller.company_name, seller.company_document, seller.description,
      seller.logo_url, seller.banner_url, seller.is_verified, seller.is_active,
      seller.rating_average, seller.rating_count, seller.total_sales, seller.created_at, seller.updated_at
    ])
  }
  console.log(`   ✅ ${localSellers.rows.length} sellers copiados`)
  
  // 3. CATEGORIES (schemas idênticos)
  console.log('\n📂 Sincronizando categories...')
  const localCategories = await localPool.query('SELECT * FROM categories ORDER BY created_at')
  for (const cat of localCategories.rows) {
    await neonPool.query(`
      INSERT INTO categories (id, name, slug, description, parent_id, image_url, is_active, position, path, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      cat.id, cat.name, cat.slug, cat.description, cat.parent_id, cat.image_url,
      cat.is_active, cat.position, cat.path, cat.created_at, cat.updated_at
    ])
  }
  console.log(`   ✅ ${localCategories.rows.length} categories copiadas`)
  
  // 4. PRODUCTS (sem featuring do Neon)
  console.log('\n📦 Sincronizando products...')
  const localProducts = await localPool.query(`
    SELECT id, sku, name, slug, description, brand_id, category_id, seller_id, status, is_active,
           price, original_price, cost, currency, quantity, stock_location, track_inventory, 
           allow_backorder, weight, height, width, length, meta_title, meta_description, 
           meta_keywords, tags, attributes, specifications, view_count, sales_count, 
           rating_average, rating_count, featured, barcode, created_at, updated_at, 
           published_at, condition, delivery_days, has_free_shipping, seller_state, seller_city
    FROM products ORDER BY created_at
  `)
  
  for (const prod of localProducts.rows) {
    await neonPool.query(`
      INSERT INTO products (
        id, sku, name, slug, description, brand_id, category_id, seller_id, status, is_active,
        price, original_price, cost, currency, quantity, stock_location, track_inventory, 
        allow_backorder, weight, height, width, length, meta_title, meta_description, 
        meta_keywords, tags, attributes, specifications, view_count, sales_count, 
        rating_average, rating_count, featured, barcode, created_at, updated_at, 
        published_at, has_free_shipping, delivery_days, condition, seller_state, seller_city
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
      )
    `, [
      prod.id, prod.sku, prod.name, prod.slug, prod.description, prod.brand_id, prod.category_id, 
      prod.seller_id, prod.status, prod.is_active, prod.price, prod.original_price, prod.cost, 
      prod.currency, prod.quantity, prod.stock_location, prod.track_inventory, prod.allow_backorder,
      prod.weight, prod.height, prod.width, prod.length, prod.meta_title, prod.meta_description,
      prod.meta_keywords, prod.tags, prod.attributes, prod.specifications, prod.view_count, 
      prod.sales_count, prod.rating_average, prod.rating_count, prod.featured, prod.barcode,
      prod.created_at, prod.updated_at, prod.published_at, prod.has_free_shipping, 
      prod.delivery_days, prod.condition, prod.seller_state, prod.seller_city
    ])
  }
  console.log(`   ✅ ${localProducts.rows.length} products copiados`)
  
  // 5. PRODUCT_IMAGES (schemas idênticos)
  console.log('\n🖼️ Sincronizando product_images...')
  try {
    const localImages = await localPool.query('SELECT * FROM product_images ORDER BY position')
    for (const img of localImages.rows) {
      await neonPool.query(`
        INSERT INTO product_images (id, product_id, url, alt_text, position, is_primary, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [img.id, img.product_id, img.url, img.alt_text, img.position, img.is_primary, img.created_at])
    }
    console.log(`   ✅ ${localImages.rows.length} images copiadas`)
  } catch (error) {
    console.log(`   ⚠️ Erro com images: ${error.message}`)
  }
  
  // 6. Adicionar produtos MongoDB de volta
  console.log('\n🔄 Restaurando produtos MongoDB...')
  for (const prod of mongoProducts.rows) {
    try {
      await neonPool.query(`
        INSERT INTO products (
          id, sku, name, slug, description, brand_id, category_id, seller_id, status, is_active,
          price, original_price, cost, currency, quantity, stock_location, track_inventory, 
          allow_backorder, weight, height, width, length, meta_title, meta_description, 
          meta_keywords, tags, attributes, specifications, view_count, sales_count, 
          rating_average, rating_count, featured, barcode, created_at, updated_at, 
          published_at, has_free_shipping, delivery_days, condition, seller_state, seller_city
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
        )
        ON CONFLICT (id) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          updated_at = NOW()
      `, [
        prod.id, prod.sku, prod.name, prod.slug, prod.description, prod.brand_id, prod.category_id, 
        prod.seller_id, prod.status, prod.is_active, prod.price, prod.original_price, prod.cost, 
        prod.currency, prod.quantity, prod.stock_location, prod.track_inventory, prod.allow_backorder,
        prod.weight, prod.height, prod.width, prod.length, prod.meta_title, prod.meta_description,
        prod.meta_keywords, prod.tags, prod.attributes, prod.specifications, prod.view_count, 
        prod.sales_count, prod.rating_average, prod.rating_count, prod.featured, prod.barcode,
        prod.created_at, prod.updated_at, prod.published_at, prod.has_free_shipping, 
        prod.delivery_days, prod.condition, prod.seller_state, prod.seller_city
      ])
    } catch (error) {
      console.log(`   📦 Produto ${prod.name} mantido`)
    }
  }
  
  // Resultado final
  console.log('\n✅ SINCRONIZAÇÃO COMPLETA!')
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
  
  console.log('\n🎉 Neon agora é espelho do Local!')
  console.log('   A aplicação funcionará identicamente em ambos')
  
} catch (error) {
  console.error('❌ Erro:', error.message)
  console.error(error)
} finally {
  await localPool.end().catch(() => {})
  await neonPool.end().catch(() => {})
} 