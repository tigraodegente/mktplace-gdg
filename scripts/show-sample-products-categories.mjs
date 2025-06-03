#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function showSampleProductsCategories() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 PRODUTOS E CATEGORIAS PARA TESTAR NO FRONTEND\n')
    console.log('='.repeat(60) + '\n')
    
    await connector.connectNeon()
    
    // Mostrar categorias principais
    console.log('📂 CATEGORIAS PRINCIPAIS:\n')
    const mainCategories = await connector.queryNeon(`
      SELECT c.id, c.name, c.slug, COUNT(pc.product_id) as product_count
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      WHERE c.parent_id IS NULL
      GROUP BY c.id
      ORDER BY product_count DESC
      LIMIT 10
    `)
    
    mainCategories.rows.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat.name}`)
      console.log(`   URL: /categorias/${cat.slug}`)
      console.log(`   Produtos: ${cat.product_count}\n`)
    })
    
    // Mostrar produtos populares
    console.log('\n📦 PRODUTOS PARA TESTAR:\n')
    const products = await connector.queryNeon(`
      SELECT 
        p.id, p.name, p.slug, p.price, p.sku,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image_url
      FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      JOIN categories c ON pc.category_id = c.id
      WHERE p.is_active = true
      AND p.quantity > 0
      ORDER BY p.view_count DESC, p.created_at DESC
      LIMIT 15
    `)
    
    products.rows.forEach((product, i) => {
      console.log(`${i + 1}. ${product.name}`)
      console.log(`   Preço: R$ ${parseFloat(product.price).toFixed(2)}`)
      console.log(`   SKU: ${product.sku}`)
      console.log(`   Categoria: ${product.category_name}`)
      console.log(`   URL Produto: /produto/${product.slug}`)
      console.log(`   URL Categoria: /categorias/${product.category_slug}`)
      if (product.image_url) {
        console.log(`   ✅ Tem imagem`)
      } else {
        console.log(`   ⚠️  Sem imagem`)
      }
      console.log('')
    })
    
    // URLs específicas para testar
    console.log('\n🔗 URLS PARA TESTAR NO NAVEGADOR:\n')
    console.log('1. PÁGINA INICIAL:')
    console.log('   http://localhost:5173/\n')
    
    console.log('2. TODAS AS CATEGORIAS:')
    console.log('   http://localhost:5173/categorias\n')
    
    console.log('3. CATEGORIA ESPECÍFICA (Roupinhas):')
    console.log('   http://localhost:5173/categorias/roupinhas\n')
    
    console.log('4. PRODUTO ESPECÍFICO:')
    const firstProduct = products.rows[0]
    if (firstProduct) {
      console.log(`   http://localhost:5173/produto/${firstProduct.slug}\n`)
    }
    
    console.log('5. BUSCA:')
    console.log('   http://localhost:5173/busca?q=bebê\n')
    
    // Verificar funcionalidades
    console.log('\n✅ O QUE VERIFICAR NO FRONTEND:\n')
    console.log('1. MENU DE CATEGORIAS:')
    console.log('   - Deve aparecer no header/menu principal')
    console.log('   - Ao clicar, deve listar produtos da categoria\n')
    
    console.log('2. LISTAGEM DE PRODUTOS:')
    console.log('   - Imagens devem carregar')
    console.log('   - Nome e preço visíveis')
    console.log('   - Botão de adicionar ao carrinho\n')
    
    console.log('3. PÁGINA DO PRODUTO:')
    console.log('   - Galeria de imagens')
    console.log('   - Informações completas')
    console.log('   - Categoria clicável')
    console.log('   - Calcular frete\n')
    
    console.log('4. FILTROS E BUSCA:')
    console.log('   - Filtrar por categoria')
    console.log('   - Ordenar por preço')
    console.log('   - Buscar produtos\n')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

showSampleProductsCategories() 