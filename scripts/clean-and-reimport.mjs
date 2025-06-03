#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import ora from 'ora'

async function cleanAndReimport() {
  const connector = new DatabaseConnector({ forceConnection: true })
  const spinner = ora()
  
  try {
    // Conectar aos bancos
    spinner.start('🔌 Conectando aos bancos de dados...')
    await connector.connectMongo()
    await connector.connectNeon()
    spinner.succeed('✅ Conectado ao MongoDB e Neon')
    
    // FASE 1: LIMPEZA COMPLETA
    console.log('\n🧹 FASE 1: LIMPEZA DO BANCO DE DADOS\n')
    
    // Limpar tabelas na ordem correta (respeitando dependências)
    const tablesToClean = [
      // Primeiro limpar tabelas dependentes
      'order_items',
      'cart_items',
      'wishlist_items',
      'reviews',
      'stock_movements',
      'product_images',
      'product_categories', 
      'product_attributes',
      'product_variants',
      // Depois limpar as principais
      'products',
      'categories'
    ]
    
    for (const table of tablesToClean) {
      spinner.start(`Limpando tabela ${table}...`)
      try {
        const result = await connector.queryNeon(`DELETE FROM ${table}`)
        spinner.succeed(`Tabela ${table} limpa (${result.rowCount} registros removidos)`)
      } catch (error) {
        spinner.warn(`Tabela ${table}: ${error.message}`)
      }
    }
    
    console.log('\n✅ Limpeza completa!\n')
    
    // FASE 2: REIMPORTAÇÃO DO MONGODB
    console.log('📥 FASE 2: IMPORTAÇÃO DO MONGODB\n')
    
    // 1. Buscar e criar categorias
    spinner.start('Importando categorias...')
    const mongoCategories = await connector.queryMongo('m_categoria', 'find', {})
    const categoryMap = new Map()
    let categoriesCreated = 0
    
    for (const cat of mongoCategories) {
      if (cat.name && cat.slug) {
        const result = await connector.queryNeon(
          `INSERT INTO categories (name, slug, description, is_active, created_at) 
           VALUES ($1, $2, $3, true, NOW()) 
           RETURNING id`,
          [cat.name, cat.slug, cat.description || null]
        )
        categoryMap.set(cat._id.toString(), result.rows[0].id)
        categoriesCreated++
      }
    }
    spinner.succeed(`${categoriesCreated} categorias criadas`)
    
    // 2. Buscar produtos do MongoDB
    spinner.start('Buscando produtos no MongoDB...')
    const mongoProducts = await connector.queryMongo('m_product_typesense', 'find', {})
    spinner.succeed(`${mongoProducts.length} produtos encontrados`)
    
    // 3. Importar produtos
    console.log('\n📦 Importando produtos...\n')
    let successCount = 0
    let errorCount = 0
    const errors = []
    
    for (let i = 0; i < mongoProducts.length; i++) {
      const product = mongoProducts[i]
      
      if (i % 100 === 0 && i > 0) {
        spinner.text = `Processando produto ${i + 1} de ${mongoProducts.length}...`
      }
      
      try {
        // Dados básicos e íntegros
        const productData = {
          sku: product.code || `SKU-${Date.now()}-${i}`,
          name: product.productname || 'Produto sem nome',
          slug: product.slug || `produto-${Date.now()}-${i}`,
          description: product.description || '',
          price: parseFloat(product.salesprice) || 0,
          cost_price: parseFloat(product.costprice) || 0,
          quantity: parseInt(product.realstock) || 0,
          is_active: product.isactive !== false,
          brand: product.brand?.name || null,
          weight: parseFloat(product.weight) || null,
          width: parseFloat(product.width) || null,
          height: parseFloat(product.height) || null,
          depth: parseFloat(product.depth) || null,
          attributes: {
            imported_from: 'mongodb',
            import_date: new Date().toISOString(),
            original_id: product._id,
            virtual_stock: product.virtualstock,
            active_for_seo: product.activeforseo
          }
        }
        
        // Inserir produto
        const productResult = await connector.queryNeon(
          `INSERT INTO products (
            sku, name, slug, description, price, cost_price, quantity,
            is_active, brand, weight, width, height, depth, attributes,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb,
            NOW(), NOW()
          ) RETURNING id`,
          [
            productData.sku,
            productData.name,
            productData.slug,
            productData.description,
            productData.price,
            productData.cost_price,
            productData.quantity,
            productData.is_active,
            productData.brand,
            productData.weight,
            productData.width,
            productData.height,
            productData.depth,
            JSON.stringify(productData.attributes)
          ]
        )
        
        const productId = productResult.rows[0].id
        
        // Associar categoria se existir
        if (product.category && categoryMap.has(product.category.toString())) {
          await connector.queryNeon(
            'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)',
            [productId, categoryMap.get(product.category.toString())]
          )
        }
        
        // Inserir imagem principal
        if (product.urlImagePrimary) {
          await connector.queryNeon(
            `INSERT INTO product_images (product_id, url, alt_text, is_primary, display_order)
             VALUES ($1, $2, $3, true, 0)`,
            [productId, product.urlImagePrimary, productData.name]
          )
        }
        
        // Inserir imagens adicionais
        if (product.files?.photos && Array.isArray(product.files.photos)) {
          for (let j = 0; j < product.files.photos.length; j++) {
            const photo = product.files.photos[j]
            if (photo.url) {
              await connector.queryNeon(
                `INSERT INTO product_images (product_id, url, alt_text, is_primary, display_order)
                 VALUES ($1, $2, $3, false, $4)`,
                [productId, photo.url, photo.alt || productData.name, j + 1]
              )
            }
          }
        }
        
        successCount++
      } catch (error) {
        errorCount++
        errors.push({
          product: product.productname || product.code,
          error: error.message
        })
        console.error('Erro ao importar produto', product.code, error.message)
      }
    }
    
    spinner.succeed(`Importação concluída!`)
    
    // FASE 3: RELATÓRIO FINAL
    console.log('\n📊 RELATÓRIO DA IMPORTAÇÃO\n')
    console.log(`✅ Produtos importados com sucesso: ${successCount}`)
    console.log(`❌ Produtos com erro: ${errorCount}`)
    
    if (errors.length > 0) {
      console.log('\nPrimeiros 10 erros:')
      errors.slice(0, 10).forEach((e, i) => {
        console.log(`${i + 1}. ${e.product}: ${e.error}`)
      })
    }
    
    // Verificar integridade
    console.log('\n🔍 VERIFICANDO INTEGRIDADE DOS DADOS\n')
    
    const stats = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT sku) as unique_skus,
        COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as with_name,
        COUNT(CASE WHEN price > 0 THEN 1 END) as with_price,
        COUNT(CASE WHEN quantity >= 0 THEN 1 END) as with_stock,
        COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) as with_brand
      FROM products
    `)
    
    const stat = stats.rows[0]
    console.log(`📦 Total de produtos: ${stat.total_products}`)
    console.log(`🔑 SKUs únicos: ${stat.unique_skus}`)
    console.log(`📝 Com nome: ${stat.with_name} (${Math.round(stat.with_name / stat.total_products * 100)}%)`)
    console.log(`💰 Com preço: ${stat.with_price} (${Math.round(stat.with_price / stat.total_products * 100)}%)`)
    console.log(`📊 Com estoque: ${stat.with_stock} (${Math.round(stat.with_stock / stat.total_products * 100)}%)`)
    console.log(`🏷️  Com marca: ${stat.with_brand} (${Math.round(stat.with_brand / stat.total_products * 100)}%)`)
    
    // Verificar categorias
    const catStats = await connector.queryNeon(`
      SELECT 
        COUNT(DISTINCT p.id) as products_with_category,
        COUNT(DISTINCT c.id) as categories_used
      FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      JOIN categories c ON pc.category_id = c.id
    `)
    
    console.log(`\n📁 Produtos categorizados: ${catStats.rows[0].products_with_category}`)
    console.log(`📁 Categorias em uso: ${catStats.rows[0].categories_used}`)
    
    // Verificar imagens
    const imgStats = await connector.queryNeon(`
      SELECT 
        COUNT(DISTINCT product_id) as products_with_images,
        COUNT(*) as total_images
      FROM product_images
    `)
    
    console.log(`\n🖼️  Produtos com imagem: ${imgStats.rows[0].products_with_images}`)
    console.log(`🖼️  Total de imagens: ${imgStats.rows[0].total_images}`)
    
    console.log('\n✅ IMPORTAÇÃO COMPLETA!')
    console.log('\n📌 Próximos passos:')
    console.log('   1. Revisar produtos sem categoria')
    console.log('   2. Popular dados faltantes (descrições, SEO, etc)')
    console.log('   3. Organizar hierarquia de categorias')
    console.log('   4. Adicionar variantes de produtos')
    
  } catch (error) {
    spinner.fail('Erro durante o processo')
    console.error('❌ Erro:', error)
  } finally {
    await connector.disconnect()
  }
}

// Confirmar antes de executar
console.log('⚠️  ATENÇÃO: Este script irá LIMPAR TODOS os dados de produtos e reimportar do MongoDB!')
console.log('Isso inclui: produtos, categorias, imagens, atributos, etc.\n')

import readline from 'readline'
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question('Deseja continuar? (sim/não): ', (answer) => {
  if (answer.toLowerCase() === 'sim' || answer.toLowerCase() === 's') {
    rl.close()
    cleanAndReimport()
  } else {
    console.log('Operação cancelada.')
    rl.close()
    process.exit(0)
  }
}) 