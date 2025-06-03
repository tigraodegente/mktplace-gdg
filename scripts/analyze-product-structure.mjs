#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeProductStructure() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 ANÁLISE COMPLETA DA ESTRUTURA DE PRODUTOS\n')
    console.log('=' .repeat(70) + '\n')
    
    // 1. Estrutura da tabela products
    console.log('📋 ESTRUTURA DA TABELA PRODUCTS:\n')
    const productColumns = await connector.queryNeon(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `)
    
    productColumns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)'
      const defaultVal = col.column_default ? ` [default: ${col.column_default}]` : ''
      console.log(`   ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`)
    })
    
    // 2. Tabelas relacionadas a produtos
    console.log('\n📊 TABELAS RELACIONADAS A PRODUTOS:\n')
    const relatedTables = await connector.queryNeon(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_name LIKE '%product%'
        OR table_name IN ('categories', 'brands', 'suppliers', 'reviews', 'variants', 'attributes')
      ORDER BY table_name
    `)
    
    relatedTables.rows.forEach(table => {
      console.log(`   📄 ${table.table_name}`)
    })
    
    // 3. Análise de categorias disponíveis
    console.log('\n🏷️  ANÁLISE DE CATEGORIAS:\n')
    const categoriesInfo = await connector.queryNeon(`
      SELECT 
        c.name,
        COUNT(p.id) as product_count,
        c.id
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name
      HAVING COUNT(p.id) > 0
      ORDER BY COUNT(p.id) DESC
      LIMIT 20
    `)
    
    categoriesInfo.rows.forEach(cat => {
      console.log(`   📦 ${cat.name}: ${cat.product_count} produtos`)
    })
    
    // 4. Análise de campos já preenchidos vs vazios
    console.log('\n📈 STATUS DOS CAMPOS DE PRODUTOS:\n')
    const fieldStatus = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total,
        COUNT(name) as with_name,
        COUNT(description) as with_description,
        COUNT(price) as with_price,
        COUNT(meta_title) as with_meta_title,
        COUNT(meta_description) as with_meta_description,
        COUNT(short_description) as with_short_description,
        COUNT(tags) as with_tags,
        COUNT(meta_keywords) as with_meta_keywords,
        COUNT(brand) as with_brand,
        COUNT(weight) as with_weight,
        COUNT(specifications) as with_specifications,
        COUNT(attributes) as with_attributes,
        COUNT(model) as with_model,
        COUNT(barcode) as with_barcode,
        COUNT(height) as with_height,
        COUNT(width) as with_width,
        COUNT(length) as with_length
      FROM products
    `)
    
    const status = fieldStatus.rows[0]
    const total = parseInt(status.total)
    
    console.log(`   Total de produtos: ${total}`)
    console.log(`   Com nome: ${status.with_name} (${((status.with_name/total)*100).toFixed(1)}%)`)
    console.log(`   Com descrição: ${status.with_description} (${((status.with_description/total)*100).toFixed(1)}%)`)
    console.log(`   Com preço: ${status.with_price} (${((status.with_price/total)*100).toFixed(1)}%)`)
    console.log(`   Com meta_title: ${status.with_meta_title} (${((status.with_meta_title/total)*100).toFixed(1)}%)`)
    console.log(`   Com meta_description: ${status.with_meta_description} (${((status.with_meta_description/total)*100).toFixed(1)}%)`)
    console.log(`   Com short_description: ${status.with_short_description} (${((status.with_short_description/total)*100).toFixed(1)}%)`)
    console.log(`   Com tags: ${status.with_tags} (${((status.with_tags/total)*100).toFixed(1)}%)`)
    console.log(`   Com meta_keywords: ${status.with_meta_keywords} (${((status.with_meta_keywords/total)*100).toFixed(1)}%)`)
    console.log(`   Com brand: ${status.with_brand} (${((status.with_brand/total)*100).toFixed(1)}%)`)
    console.log(`   Com weight: ${status.with_weight} (${((status.with_weight/total)*100).toFixed(1)}%)`)
    console.log(`   Com specifications: ${status.with_specifications} (${((status.with_specifications/total)*100).toFixed(1)}%)`)
    console.log(`   Com attributes: ${status.with_attributes} (${((status.with_attributes/total)*100).toFixed(1)}%)`)
    console.log(`   Com model: ${status.with_model} (${((status.with_model/total)*100).toFixed(1)}%)`)
    console.log(`   Com barcode: ${status.with_barcode} (${((status.with_barcode/total)*100).toFixed(1)}%)`)
    console.log(`   Com dimensões (H/W/L): ${status.with_height}/${status.with_width}/${status.with_length}`)
    
    // 5. Sugestão de produtos diversificados para amostra
    console.log('\n🎯 PRODUTOS SUGERIDOS PARA AMOSTRA DIVERSIFICADA:\n')
    const sampleProducts = await connector.queryNeon(`
      WITH category_samples AS (
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.price,
          c.name as category_name,
          ROW_NUMBER() OVER (PARTITION BY p.category_id ORDER BY p.price DESC) as rn
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name IS NOT NULL 
          AND p.price IS NOT NULL
      )
      SELECT 
        id,
        name,
        sku,
        price,
        category_name
      FROM category_samples
      WHERE rn <= 3  -- Máximo 3 produtos por categoria
      ORDER BY category_name, price DESC
      LIMIT 50
    `)
    
    console.log(`   📦 ${sampleProducts.rows.length} produtos selecionados:`)
    sampleProducts.rows.forEach((product, i) => {
      console.log(`   ${i+1}. ${product.name} (${product.category_name}) - R$ ${product.price}`)
    })
    
    console.log('\n' + '=' .repeat(70))
    console.log('\n✅ ANÁLISE CONCLUÍDA!')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

analyzeProductStructure() 