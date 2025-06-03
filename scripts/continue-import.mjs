#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import ora from 'ora'

async function continueImport() {
  const connector = new DatabaseConnector({ forceConnection: true })
  const spinner = ora()
  
  try {
    // Conectar aos bancos
    spinner.start('🔌 Conectando aos bancos de dados...')
    await connector.connectMongo()
    await connector.connectNeon()
    spinner.succeed('✅ Conectado ao MongoDB e Neon')
    
    // Verificar produtos já importados
    spinner.start('Verificando produtos já importados...')
    const importedResult = await connector.queryNeon(`
      SELECT attributes->>'original_id' as mongo_id 
      FROM products 
      WHERE attributes->>'imported_from' = 'mongodb'
    `)
    
    const importedIds = new Set(importedResult.rows.map(r => r.mongo_id))
    spinner.succeed(`${importedIds.size} produtos já importados`)
    
    // Buscar produtos do MongoDB
    spinner.start('Buscando produtos no MongoDB...')
    const mongoProducts = await connector.queryMongo('m_product_typesense', 'find', {})
    spinner.succeed(`${mongoProducts.length} produtos no MongoDB`)
    
    // Filtrar apenas os não importados
    const productsToImport = mongoProducts.filter(p => !importedIds.has(p._id.toString()))
    console.log(`\n📦 ${productsToImport.length} produtos para importar\n`)
    
    if (productsToImport.length === 0) {
      console.log('✅ Todos os produtos já foram importados!')
      return
    }
    
    // Carregar categorias existentes
    spinner.start('Carregando categorias...')
    const categoriesResult = await connector.queryNeon('SELECT id, name FROM categories')
    const categoryMap = new Map(categoriesResult.rows.map(c => [c.name, c.id]))
    spinner.succeed(`${categoryMap.size} categorias carregadas`)
    
    // Importar produtos faltantes
    console.log('\n📦 Importando produtos faltantes...\n')
    const progressSpinner = ora()
    let successCount = 0
    let errorCount = 0
    let processedCount = 0
    
    for (const product of productsToImport) {
      processedCount++
      
      if (processedCount % 50 === 0) {
        progressSpinner.text = `Processando: ${processedCount}/${productsToImport.length} (${successCount} sucesso, ${errorCount} erros)`
      }
      
      try {
        // Gerar SKU
        const sku = product.sku || product.productid || `SKU-${Date.now()}-${processedCount}`
        
        // Garantir slug único
        let slug = (product.productname || 'produto').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + `-${sku}`
        
        // Dados do produto
        const productData = {
          sku: sku.toString(),
          name: product.productname || 'Produto sem nome',
          slug: slug,
          description: product.descriptions?.description || '',
          price: parseFloat(product.price) || 0,
          original_price: parseFloat(product.promotionalprice) || null,
          cost: parseFloat(product.costprice) || null,
          quantity: parseInt(product.realstock) || 0,
          is_active: product.isactive !== false,
          brand: product.brand?.name || null,
          weight: parseFloat(product.weight) || null,
          width: parseFloat(product.width) || null,
          height: parseFloat(product.height) || null,
          length: parseFloat(product.depth) || null,
          delivery_days_min: parseInt(product.deliverytime) || 3,
          delivery_days_max: parseInt(product.deliverytime) || 7,
          attributes: {
            imported_from: 'mongodb',
            import_date: new Date().toISOString(),
            original_id: product._id.toString(),
            virtual_stock: product.virtualstock || 0,
            active_for_seo: product.activeforseo || false,
            google_name: product.googleproductname || '',
            marketplace_name: product.marketplaceproductname || ''
          }
        }
        
        // Inserir produto
        const productResult = await connector.queryNeon(
          `INSERT INTO products (
            sku, name, slug, description, price, original_price, cost, quantity,
            is_active, brand, weight, width, height, length, 
            delivery_days_min, delivery_days_max, attributes,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb,
            NOW(), NOW()
          ) ON CONFLICT (sku) DO NOTHING
          RETURNING id`,
          [
            productData.sku,
            productData.name,
            productData.slug,
            productData.description,
            productData.price,
            productData.original_price,
            productData.cost,
            productData.quantity,
            productData.is_active,
            productData.brand,
            productData.weight,
            productData.width,
            productData.height,
            productData.length,
            productData.delivery_days_min,
            productData.delivery_days_max,
            JSON.stringify(productData.attributes)
          ]
        )
        
        if (!productResult.rows.length) {
          // Produto já existe com este SKU
          continue
        }
        
        const productId = productResult.rows[0].id
        
        // Associar categorias
        if (product.categories && typeof product.categories === 'object') {
          const categoryEntries = Object.entries(product.categories)
          for (let j = 0; j < categoryEntries.length && j < 3; j++) {
            const [, cat] = categoryEntries[j]
            if (cat && cat.name && categoryMap.has(cat.name)) {
              try {
                await connector.queryNeon(
                  'INSERT INTO product_categories (product_id, category_id, is_primary) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                  [productId, categoryMap.get(cat.name), j === 0]
                )
              } catch (e) {
                // Ignorar erro de categoria
              }
            }
          }
        }
        
        // Inserir imagem principal
        if (product.urlImagePrimary) {
          try {
            await connector.queryNeon(
              `INSERT INTO product_images (product_id, url, alt_text, is_primary, position)
               VALUES ($1, $2, $3, true, 0) ON CONFLICT DO NOTHING`,
              [productId, product.urlImagePrimary, productData.name]
            )
          } catch (e) {
            // Ignorar erro de imagem
          }
        }
        
        // Inserir até 3 imagens adicionais
        if (product.files?.photos && Array.isArray(product.files.photos)) {
          for (let j = 0; j < product.files.photos.length && j < 3; j++) {
            const photo = product.files.photos[j]
            const url = typeof photo === 'string' ? photo : photo?.url
            if (url) {
              try {
                await connector.queryNeon(
                  `INSERT INTO product_images (product_id, url, alt_text, is_primary, position)
                   VALUES ($1, $2, $3, false, $4) ON CONFLICT DO NOTHING`,
                  [productId, url, productData.name, j + 1]
                )
              } catch (e) {
                // Ignorar erro de imagem
              }
            }
          }
        }
        
        successCount++
      } catch (error) {
        errorCount++
        if (errorCount <= 5) {
          console.error(`\nErro no produto ${product.productname}:`, error.message)
        }
      }
    }
    
    progressSpinner.succeed(`Importação concluída! ${successCount} novos produtos importados, ${errorCount} erros`)
    
    // Relatório final
    console.log('\n📊 RESULTADO FINAL\n')
    
    const stats = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as with_stock,
        COUNT(CASE WHEN price > 0 THEN 1 END) as with_price
      FROM products
    `)
    
    const stat = stats.rows[0]
    console.log(`📦 TOTAL DE PRODUTOS NO BANCO: ${stat.total_products}`)
    console.log(`✅ Produtos ativos: ${stat.active}`)
    console.log(`📊 Produtos com estoque: ${stat.with_stock}`)
    console.log(`💰 Produtos com preço > 0: ${stat.with_price}`)
    
    const expectedTotal = mongoProducts.length
    if (stat.total_products < expectedTotal) {
      console.log(`\n⚠️  Ainda faltam ${expectedTotal - stat.total_products} produtos para completar a importação`)
    } else {
      console.log('\n✅ TODOS OS PRODUTOS FORAM IMPORTADOS!')
    }
    
  } catch (error) {
    spinner.fail('Erro durante o processo')
    console.error('❌ Erro:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar
console.log('🚀 Continuando importação dos produtos faltantes...\n')
continueImport() 