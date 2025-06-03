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
    
    // 1. Buscar e criar categorias
    spinner.start('Importando categorias...')
    const mongoCategories = await connector.queryMongo('m_categoria', 'find', {})
    const categoryMap = new Map()
    let categoriesCreated = 0
    
    for (const cat of mongoCategories) {
      if (cat.name && cat.slug) {
        try {
          const result = await connector.queryNeon(
            `INSERT INTO categories (name, slug, description, is_active, created_at) 
             VALUES ($1, $2, $3, true, NOW()) 
             ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [cat.name, cat.slug, cat.description || null]
          )
          categoryMap.set(cat._id.toString(), result.rows[0].id)
          categoriesCreated++
        } catch (error) {
          console.error(`Erro ao criar categoria ${cat.name}:`, error.message)
        }
      }
    }
    spinner.succeed(`${categoriesCreated} categorias criadas/atualizadas`)
    
    // 2. Buscar produtos do MongoDB
    spinner.start('Buscando produtos no MongoDB...')
    const mongoProducts = await connector.queryMongo('m_product_typesense', 'find', {})
    spinner.succeed(`${mongoProducts.length} produtos encontrados`)
    
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
        // Garantir slug único
        let slug = product.slug || `produto-${Date.now()}-${i}`
        if (!slug || slug.trim() === '') {
          slug = `${product.productname || 'produto'}-${product.code || i}`.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
        }
        
        // Dados básicos
        const productData = {
          sku: product.code || `SKU-${Date.now()}-${i}`,
          name: product.productname || 'Produto sem nome',
          slug: slug,
          description: product.description || '',
          price: parseFloat(product.salesprice) || 0,
          cost: parseFloat(product.costprice) || null,
          quantity: parseInt(product.realstock) || 0,
          is_active: product.isactive !== false,
          brand: product.brand?.name || null,
          weight: parseFloat(product.weight) || null,
          width: parseFloat(product.width) || null,
          height: parseFloat(product.height) || null,
          length: parseFloat(product.depth) || null,
          attributes: {
            imported_from: 'mongodb',
            import_date: new Date().toISOString(),
            original_id: product._id.toString(),
            virtual_stock: product.virtualstock,
            active_for_seo: product.activeforseo
          }
        }
        
        // Inserir produto
        const productResult = await connector.queryNeon(
          `INSERT INTO products (
            sku, name, slug, description, price, cost, quantity,
            is_active, brand, weight, width, height, length, attributes,
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
            productData.cost,
            productData.quantity,
            productData.is_active,
            productData.brand,
            productData.weight,
            productData.width,
            productData.height,
            productData.length,
            JSON.stringify(productData.attributes)
          ]
        )
        
        const productId = productResult.rows[0].id
        
        // Associar categoria
        if (product.category && categoryMap.has(product.category.toString())) {
          await connector.queryNeon(
            'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)',
            [productId, categoryMap.get(product.category.toString())]
          )
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
            if (photo.url) {
              await connector.queryNeon(
                `INSERT INTO product_images (product_id, url, alt_text, is_primary, position)
                 VALUES ($1, $2, $3, false, $4)`,
                [productId, photo.url, photo.alt || productData.name, j + 1]
              )
            }
          }
        }
        
        successCount++
      } catch (error) {
        errorCount++
        if (errorCount <= 5) {
          console.error(`\nErro no produto ${product.productname || product.code}:`, error.message)
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
        COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) as with_brand
      FROM products
    `)
    
    const stat = stats.rows[0]
    console.log(`📦 Total de produtos importados: ${stat.total_products}`)
    console.log(`✅ Produtos ativos: ${stat.active}`)
    console.log(`📊 Produtos com estoque: ${stat.with_stock}`)
    console.log(`🏷️  Produtos com marca: ${stat.with_brand}`)
    
    const catStats = await connector.queryNeon(`
      SELECT COUNT(DISTINCT product_id) as categorized
      FROM product_categories
    `)
    
    console.log(`📁 Produtos categorizados: ${catStats.rows[0].categorized}`)
    
    const imgStats = await connector.queryNeon(`
      SELECT COUNT(DISTINCT product_id) as with_images, COUNT(*) as total_images
      FROM product_images
    `)
    
    console.log(`🖼️  Produtos com imagem: ${imgStats.rows[0].with_images}`)
    console.log(`🖼️  Total de imagens: ${imgStats.rows[0].total_images}`)
    
  } catch (error) {
    spinner.fail('Erro durante o processo')
    console.error('❌ Erro:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar diretamente
console.log('🚀 Iniciando importação de produtos do MongoDB...\n')
importProducts() 