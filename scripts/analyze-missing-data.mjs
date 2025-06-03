#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeMissingData() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 Analisando dados necessários para o frontend...\n')
    
    // Conectar aos bancos
    await connector.connectMongo()
    await connector.connectNeon()
    
    const mongoDb = connector.getMongoDb()
    
    // Listar coleções no MongoDB
    console.log('📊 COLEÇÕES NO MONGODB:')
    const collections = await mongoDb.listCollections().toArray()
    console.log(`Total: ${collections.length} coleções\n`)
    
    for (const col of collections) {
      const count = await mongoDb.collection(col.name).countDocuments()
      console.log(`  - ${col.name}: ${count.toLocaleString('pt-BR')} documentos`)
    }
    
    // Verificar tabelas essenciais no Neon
    console.log('\n\n📊 TABELAS ESSENCIAIS NO NEON:')
    
    const essentialTables = [
      { name: 'products', description: 'Produtos' },
      { name: 'categories', description: 'Categorias' },
      { name: 'product_categories', description: 'Relação Produto-Categoria' },
      { name: 'product_images', description: 'Imagens dos produtos' },
      { name: 'users', description: 'Usuários/Clientes' },
      { name: 'orders', description: 'Pedidos' },
      { name: 'order_items', description: 'Itens dos pedidos' },
      { name: 'addresses', description: 'Endereços' },
      { name: 'product_variants', description: 'Variações de produtos' },
      { name: 'product_options', description: 'Opções de produtos' },
      { name: 'sellers', description: 'Vendedores' },
      { name: 'brands', description: 'Marcas' },
      { name: 'reviews', description: 'Avaliações' },
      { name: 'coupons', description: 'Cupons' },
      { name: 'shipping_methods', description: 'Métodos de entrega' },
      { name: 'payment_methods', description: 'Métodos de pagamento' }
    ]
    
    for (const table of essentialTables) {
      try {
        const result = await connector.queryNeon(`
          SELECT COUNT(*) as count,
                 COUNT(CASE WHEN attributes->>'imported_from' = 'mongodb' THEN 1 END) as from_mongo
          FROM ${table.name}
        `)
        const data = result.rows[0]
        console.log(`\n  ✅ ${table.description} (${table.name}):`)
        console.log(`     Total: ${parseInt(data.count).toLocaleString('pt-BR')}`)
        console.log(`     Do MongoDB: ${parseInt(data.from_mongo).toLocaleString('pt-BR')}`)
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`\n  ❌ ${table.description} (${table.name}): TABELA NÃO EXISTE`)
        } else if (error.message.includes('column "attributes" does not exist')) {
          // Tabela existe mas não tem coluna attributes
          try {
            const countResult = await connector.queryNeon(`SELECT COUNT(*) as count FROM ${table.name}`)
            console.log(`\n  ⚠️  ${table.description} (${table.name}):`)
            console.log(`     Total: ${parseInt(countResult.rows[0].count).toLocaleString('pt-BR')}`)
            console.log(`     (sem tracking de importação)`)
          } catch (e) {
            console.log(`\n  ❓ ${table.description} (${table.name}): Erro ao verificar`)
          }
        } else {
          console.log(`\n  ❓ ${table.description} (${table.name}): ${error.message}`)
        }
      }
    }
    
    // Verificar relacionamentos críticos
    console.log('\n\n📊 VERIFICAÇÃO DE INTEGRIDADE:')
    
    // Produtos sem categoria
    const orphanProducts = await connector.queryNeon(`
      SELECT COUNT(*) as count
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      WHERE pc.product_id IS NULL
    `)
    console.log(`\n  ⚠️  Produtos sem categoria: ${orphanProducts.rows[0].count}`)
    
    // Produtos sem imagens
    const noImages = await connector.queryNeon(`
      SELECT COUNT(*) as count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE pi.product_id IS NULL
    `)
    console.log(`  ⚠️  Produtos sem imagens na tabela product_images: ${noImages.rows[0].count}`)
    
    // Recomendações
    console.log('\n\n💡 RECOMENDAÇÕES PARA MIGRAÇÃO:')
    
    const mongoCollections = {
      'm_customer': 'Clientes/Usuários',
      'm_category': 'Categorias',
      'm_order': 'Pedidos',
      'm_brand': 'Marcas',
      'm_seller': 'Vendedores',
      'm_review': 'Avaliações',
      'm_coupon': 'Cupons'
    }
    
    for (const [collection, description] of Object.entries(mongoCollections)) {
      const exists = collections.find(c => c.name === collection)
      if (exists) {
        const count = await mongoDb.collection(collection).countDocuments()
        if (count > 0) {
          console.log(`\n  📦 Migrar ${description}:`)
          console.log(`     Coleção: ${collection}`)
          console.log(`     Documentos: ${count.toLocaleString('pt-BR')}`)
        }
      }
    }
    
    console.log('\n\n🎯 PRIORIDADES PARA O FRONTEND FUNCIONAR:')
    console.log('  1. Categorias (para navegação)')
    console.log('  2. Relação Produto-Categoria')
    console.log('  3. Imagens dos produtos (se não estiverem inline)')
    console.log('  4. Usuários (para login/cadastro)')
    console.log('  5. Métodos de pagamento e entrega')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

analyzeMissingData() 