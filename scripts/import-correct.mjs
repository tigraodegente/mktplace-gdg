#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import ora from 'ora'

async function importProducts() {
  const connector = new DatabaseConnector({ forceConnection: true })
  const spinner = ora()
  
  try {
    // Conectar aos bancos
    spinner.start('🔌 Conectando aos bancos de dados...')
    await connector.connectMongo()
    await connector.connectNeon()
    spinner.succeed('✅ Conectado ao MongoDB e Neon')
    
    // Limpar dados incorretos
    spinner.start('🧹 Limpando dados incorretos...')
    await connector.queryNeon('DELETE FROM product_images')
    await connector.queryNeon('DELETE FROM product_categories')
    await connector.queryNeon('DELETE FROM products')
    await connector.queryNeon('DELETE FROM categories')
    spinner.succeed('Dados limpos')
    
    // 1. Buscar produtos do MongoDB
    spinner.start('Buscando produtos no MongoDB...')
    const mongoProducts = await connector.queryMongo('m_product_typesense', 'find', {})
    spinner.succeed(`${mongoProducts.length} produtos encontrados`)
    
    // 2. Criar mapa de categorias únicas
    spinner.start('Processando categorias...')
    const categoryMap = new Map()
    const categoriesSet = new Set()
    
    mongoProducts.forEach(product => {
      if (product.categories && typeof product.categories === 'object') {
        Object.entries(product.categories).forEach(([key, cat]) => {
          if (cat && cat.name) {
            categoriesSet.add(JSON.stringify({
              name: cat.name,
              slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            }))
          }
        })
      }
    })
    
    // Criar categorias no banco
    let categoriesCreated = 0
    for (const catStr of categoriesSet) {
      const cat = JSON.parse(catStr)
      try {
        const result = await connector.queryNeon(
          `INSERT INTO categories (name, slug, is_active, created_at) 
           VALUES ($1, $2, true, NOW()) 
           RETURNING id`,
          [cat.name, cat.slug]
        )
        categoryMap.set(cat.name, result.rows[0].id)
        categoriesCreated++
      } catch (error) {
        console.error(`Erro ao criar categoria ${cat.name}:`, error.message)
      }
    }
    spinner.succeed(`${categoriesCreated} categorias criadas`)
    
    // 3. Importar produtos
    console.log('\n📦 Importando produtos...\n')
    const progressSpinner = ora()
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < mongoProducts.length; i++) {
      const product = mongoProducts[i]
      
      if (i % 100 === 0) {
        progressSpinner.text = `Processando: ${i}/${mongoProducts.length} (${successCount} sucesso, ${errorCount} erros)`
      }
      
      try {
        // Gerar SKU
        const sku = product.sku || product.productid || `SKU-${Date.now()}-${i}`
        
        // Garantir slug único
        let slug = product.slug || `${product.productname || 'produto'}-${sku}`.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        
        // Dados básicos com campos CORRETOS
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
            virtual_stock: product.virtualstock,
            active_for_seo: product.activeforseo,
            google_name: product.googleproductname,
            marketplace_name: product.marketplaceproductname
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
          ) RETURNING id`,
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
        
        const productId = productResult.rows[0].id
        
        // Associar categorias
        if (product.categories && typeof product.categories === 'object') {
          const categoryEntries = Object.entries(product.categories)
          for (let j = 0; j < categoryEntries.length; j++) {
            const [, cat] = categoryEntries[j]
            if (cat && cat.name && categoryMap.has(cat.name)) {
              await connector.queryNeon(
                'INSERT INTO product_categories (product_id, category_id, is_primary) VALUES ($1, $2, $3)',
                [productId, categoryMap.get(cat.name), j === 0]
              )
            }
          }
        }
        
        // Inserir imagem principal
        if (product.urlImagePrimary) {
          await connector.queryNeon(
            `INSERT INTO product_images (product_id, url, alt_text, is_primary, position)
             VALUES ($1, $2, $3, true, 0)`,
            [productId, product.urlImagePrimary, productData.name]
          )
        }
        
        // Inserir imagens adicionais
        if (product.files?.photos && Array.isArray(product.files.photos)) {
          for (let j = 0; j < product.files.photos.length && j < 5; j++) {
            const photo = product.files.photos[j]
            if (photo.url || photo) {
              const url = typeof photo === 'string' ? photo : photo.url
              await connector.queryNeon(
                `INSERT INTO product_images (product_id, url, alt_text, is_primary, position)
                 VALUES ($1, $2, $3, false, $4)`,
                [productId, url, productData.name, j + 1]
              )
            }
          }
        }
        
        successCount++
      } catch (error) {
        errorCount++
        if (errorCount <= 10) {
          console.error(`\nErro no produto ${product.productname}:`, error.message)
        }
      }
    }
    
    progressSpinner.succeed(`Importação concluída! ${successCount} sucesso, ${errorCount} erros`)
    
    // Relatório final
    console.log('\n📊 VERIFICANDO RESULTADO FINAL\n')
    
    const stats = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as with_stock,
        COUNT(CASE WHEN price > 0 THEN 1 END) as with_price,
        COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) as with_brand,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM products
    `)
    
    const stat = stats.rows[0]
    console.log(`📦 Total de produtos importados: ${stat.total_products}`)
    console.log(`✅ Produtos ativos: ${stat.active}`)
    console.log(`📊 Produtos com estoque: ${stat.with_stock}`)
    console.log(`💰 Produtos com preço > 0: ${stat.with_price}`)
    console.log(`🏷️  Produtos com marca: ${stat.with_brand}`)
    console.log(`💵 Preços: Min R$ ${parseFloat(stat.min_price).toFixed(2)} | Médio R$ ${parseFloat(stat.avg_price).toFixed(2)} | Máx R$ ${parseFloat(stat.max_price).toFixed(2)}`)
    
    const catStats = await connector.queryNeon(`
      SELECT COUNT(DISTINCT product_id) as categorized, COUNT(DISTINCT category_id) as categories_used
      FROM product_categories
    `)
    
    console.log(`\n📁 Produtos categorizados: ${catStats.rows[0].categorized}`)
    console.log(`📁 Categorias em uso: ${catStats.rows[0].categories_used}`)
    
    const imgStats = await connector.queryNeon(`
      SELECT COUNT(DISTINCT product_id) as with_images, COUNT(*) as total_images
      FROM product_images
    `)
    
    console.log(`\n🖼️  Produtos com imagem: ${imgStats.rows[0].with_images}`)
    console.log(`🖼️  Total de imagens: ${imgStats.rows[0].total_images}`)
    
  } catch (error) {
    spinner.fail('Erro durante o processo')
    console.error('❌ Erro:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar diretamente
console.log('🚀 Iniciando importação CORRETA de produtos do MongoDB...\n')
importProducts() 