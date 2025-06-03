#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeNeonTables() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 Analisando estrutura do banco Neon...\n')
    
    await connector.connectNeon()
    
    // Listar todas as tabelas
    console.log('📊 TABELAS EXISTENTES NO NEON:')
    const tablesResult = await connector.queryNeon(`
      SELECT table_name, 
             pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log(`Total: ${tablesResult.rows.length} tabelas\n`)
    
    for (const table of tablesResult.rows) {
      const countResult = await connector.queryNeon(`SELECT COUNT(*) as count FROM ${table.table_name}`)
      const count = countResult.rows[0].count
      console.log(`  - ${table.table_name}: ${parseInt(count).toLocaleString('pt-BR')} registros (${table.size})`)
    }
    
    // Verificar estrutura das tabelas principais
    console.log('\n\n📊 ANÁLISE DETALHADA DAS TABELAS PRINCIPAIS:\n')
    
    // CATEGORIAS
    console.log('1️⃣ CATEGORIAS:')
    const categoriesResult = await connector.queryNeon('SELECT COUNT(*) as count FROM categories')
    console.log(`   Total: ${categoriesResult.rows[0].count}`)
    if (categoriesResult.rows[0].count > 0) {
      const sampleCategories = await connector.queryNeon('SELECT id, name, slug, parent_id FROM categories LIMIT 5')
      console.log('   Amostra:')
      sampleCategories.rows.forEach(cat => {
        console.log(`     - ${cat.name} (${cat.slug}) - Parent: ${cat.parent_id || 'ROOT'}`)
      })
    }
    
    // RELAÇÃO PRODUTO-CATEGORIA
    console.log('\n2️⃣ PRODUTO-CATEGORIA:')
    const prodCatResult = await connector.queryNeon('SELECT COUNT(*) as count FROM product_categories')
    console.log(`   Total de relações: ${prodCatResult.rows[0].count}`)
    
    // Produtos sem categoria
    const orphanProducts = await connector.queryNeon(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      WHERE pc.product_id IS NULL
    `)
    console.log(`   ⚠️  Produtos sem categoria: ${orphanProducts.rows[0].count}`)
    
    // IMAGENS
    console.log('\n3️⃣ IMAGENS DOS PRODUTOS:')
    const imagesResult = await connector.queryNeon('SELECT COUNT(*) as count FROM product_images')
    console.log(`   Total de imagens: ${imagesResult.rows[0].count}`)
    
    // Produtos com imagens
    const productsWithImages = await connector.queryNeon(`
      SELECT COUNT(DISTINCT product_id) as count FROM product_images
    `)
    console.log(`   Produtos com imagens: ${productsWithImages.rows[0].count}`)
    
    // USUÁRIOS
    console.log('\n4️⃣ USUÁRIOS:')
    const usersResult = await connector.queryNeon('SELECT COUNT(*) as count FROM users')
    console.log(`   Total: ${usersResult.rows[0].count}`)
    
    // Tipos de usuários
    const userTypes = await connector.queryNeon(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `)
    if (userTypes.rows.length > 0) {
      console.log('   Por tipo:')
      userTypes.rows.forEach(type => {
        console.log(`     - ${type.role || 'customer'}: ${type.count}`)
      })
    }
    
    // PEDIDOS
    console.log('\n5️⃣ PEDIDOS:')
    const ordersResult = await connector.queryNeon('SELECT COUNT(*) as count FROM orders')
    console.log(`   Total: ${ordersResult.rows[0].count}`)
    
    if (ordersResult.rows[0].count > 0) {
      const orderStats = await connector.queryNeon(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(total) as total_value
        FROM orders
        GROUP BY status
      `)
      console.log('   Por status:')
      orderStats.rows.forEach(stat => {
        console.log(`     - ${stat.status}: ${stat.count} pedidos (R$ ${parseFloat(stat.total_value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})})`)
      })
    }
    
    // MÉTODOS DE PAGAMENTO E ENTREGA
    console.log('\n6️⃣ CONFIGURAÇÕES:')
    const shippingResult = await connector.queryNeon('SELECT COUNT(*) as count FROM shipping_methods')
    console.log(`   Métodos de entrega: ${shippingResult.rows[0].count}`)
    
    const paymentResult = await connector.queryNeon('SELECT COUNT(*) as count FROM payment_methods')
    console.log(`   Métodos de pagamento: ${paymentResult.rows[0].count}`)
    
    // ANÁLISE DE PROBLEMAS
    console.log('\n\n🚨 PROBLEMAS IDENTIFICADOS:\n')
    
    const problems = []
    
    if (categoriesResult.rows[0].count === 0) {
      problems.push('❌ Sem categorias - navegação não funcionará')
    }
    
    if (orphanProducts.rows[0].count > 0) {
      problems.push(`⚠️  ${orphanProducts.rows[0].count} produtos sem categoria`)
    }
    
    if (imagesResult.rows[0].count === 0) {
      problems.push('❌ Sem imagens na tabela product_images')
    }
    
    if (usersResult.rows[0].count === 0) {
      problems.push('❌ Sem usuários - login/cadastro não funcionará')
    }
    
    if (shippingResult.rows[0].count === 0) {
      problems.push('❌ Sem métodos de entrega configurados')
    }
    
    if (paymentResult.rows[0].count === 0) {
      problems.push('❌ Sem métodos de pagamento configurados')
    }
    
    if (problems.length > 0) {
      problems.forEach(p => console.log(p))
    } else {
      console.log('✅ Estrutura básica está completa!')
    }
    
    // RECOMENDAÇÕES
    console.log('\n\n💡 DADOS NECESSÁRIOS PARA O FRONTEND:\n')
    console.log('1. CATEGORIAS (MongoDB: c_category?)')
    console.log('   - Necessário para menu de navegação')
    console.log('   - Necessário para filtros de produtos')
    console.log('   - Relacionar produtos com categorias')
    
    console.log('\n2. USUÁRIOS (MongoDB: c_customer_address tem 514.836 docs)')
    console.log('   - Necessário para login/cadastro')
    console.log('   - Histórico de pedidos')
    console.log('   - Endereços de entrega')
    
    console.log('\n3. CONFIGURAÇÕES DE CHECKOUT')
    console.log('   - Métodos de pagamento')
    console.log('   - Métodos de entrega')
    console.log('   - Cálculo de frete')
    
    console.log('\n4. PEDIDOS (MongoDB: c_salesorder tem 391.523 docs)')
    console.log('   - Histórico de compras')
    console.log('   - Status de pedidos')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
  } finally {
    await connector.disconnect()
  }
}

analyzeNeonTables() 