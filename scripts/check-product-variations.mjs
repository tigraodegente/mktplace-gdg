#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkProductVariations() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🎨 VERIFICANDO VARIAÇÕES E ATRIBUTOS DOS PRODUTOS\n')
    console.log('=' .repeat(70) + '\n')
    
    // Buscar produtos com variantes
    const productsWithVariants = await connector.queryNeon(`
      SELECT 
        p.name,
        p.sku,
        p.slug,
        p.attributes,
        COUNT(pv.id) as variant_count
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.meta_title IS NOT NULL
      GROUP BY p.id, p.name, p.sku, p.slug, p.attributes
      ORDER BY variant_count DESC, p.updated_at DESC
      LIMIT 10
    `)
    
    console.log('📊 PRODUTOS COM VARIAÇÕES:\n')
    
    productsWithVariants.rows.forEach((product, i) => {
      console.log(`${i+1}. ${product.name}`)
      console.log(`   📦 SKU: ${product.sku}`)
      console.log(`   🎨 Variantes: ${product.variant_count}`)
      console.log(`   🔗 URL: https://www.graodegente.com.br/produto/${product.slug}`)
      
      // Mostrar atributos se existirem
      if (product.attributes) {
        try {
          const attrs = typeof product.attributes === 'string' 
            ? JSON.parse(product.attributes) 
            : product.attributes
          
          console.log(`   🏷️  Atributos:`)
          Object.entries(attrs).forEach(([key, value]) => {
            console.log(`      • ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          })
        } catch (error) {
          console.log(`   🏷️  Atributos: Erro ao processar`)
        }
      } else {
        console.log(`   🏷️  Atributos: Nenhum`)
      }
      console.log('')
    })
    
    // Buscar detalhes das variantes do produto com mais variações
    if (productsWithVariants.rows.length > 0) {
      const topProduct = productsWithVariants.rows[0]
      
      console.log(`🔍 DETALHES DAS VARIANTES DE "${topProduct.name}":\n`)
      
      const variants = await connector.queryNeon(`
        SELECT 
          sku,
          price,
          quantity,
          is_active,
          created_at
        FROM product_variants
        WHERE product_id = (SELECT id FROM products WHERE sku = $1)
        ORDER BY created_at DESC
      `, [topProduct.sku])
      
      variants.rows.forEach((variant, i) => {
        console.log(`   ${i+1}. SKU: ${variant.sku}`)
        console.log(`      💰 Preço: R$ ${variant.price}`)
        console.log(`      📦 Estoque: ${variant.quantity}`)
        console.log(`      🔄 Ativo: ${variant.is_active ? 'SIM' : 'NÃO'}`)
        console.log('')
      })
    }
    
    // Estatísticas gerais
    console.log('📈 ESTATÍSTICAS GERAIS:\n')
    
    const stats = await connector.queryNeon(`
      SELECT 
        COUNT(DISTINCT p.id) as products_with_meta,
        COUNT(pv.id) as total_variants,
        COUNT(DISTINCT CASE WHEN p.attributes IS NOT NULL THEN p.id END) as products_with_attributes
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.meta_title IS NOT NULL
    `)
    
    const stat = stats.rows[0]
    console.log(`   📦 Produtos enriquecidos: ${stat.products_with_meta}`)
    console.log(`   🎨 Total de variantes: ${stat.total_variants}`)
    console.log(`   🏷️  Produtos com atributos: ${stat.products_with_attributes}`)
    console.log(`   📊 Média de variantes por produto: ${(stat.total_variants / stat.products_with_meta).toFixed(1)}`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkProductVariations() 