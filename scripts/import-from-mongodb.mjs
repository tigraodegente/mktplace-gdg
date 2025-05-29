#!/usr/bin/env node

import 'dotenv/config'
import { getXataClient } from '../packages/xata-client/src/xata.js'
import { MongoClient } from 'mongodb'

console.log('🚀 Script de Importação de Produtos do MongoDB\n')

// Clientes
const xata = getXataClient()

// Configuração MongoDB
const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DATABASE || 'marketplace',
  collection: process.env.MONGODB_COLLECTION || 'products',
  batchSize: 100 // Processar em lotes
}

// Reutilizar configurações do script anterior
const MOCK_DEFAULTS = {
  seller: {
    email: 'vendedor.padrao@marketplace.com',
    name: 'Vendedor Padrão',
    password: 'temp123456',
    company_name: 'Loja Padrão Marketplace',
    company_document: '00000000000000',
    description: '[PENDENTE] Descrição da empresa a ser preenchida',
    is_verified: false,
    rating_average: 0
  },
  
  defaultCategory: {
    name: 'Produtos Gerais',
    slug: 'produtos-gerais',
    description: 'Categoria temporária para produtos sem categoria definida'
  },
  
  product: {
    description: '[PENDENTE] Descrição detalhada do produto a ser preenchida via IA',
    stock_quantity: 100,
    weight: 1.0,
    dimensions: {
      length: 30,
      width: 20,
      height: 10,
      unit: 'cm'
    },
    images: [],
    is_active: true,
    is_featured: false,
    tags: ['importado', 'pendente-enriquecimento', 'origem-mongodb'],
    metadata: {
      imported_at: new Date().toISOString(),
      needs_enrichment: true,
      source: 'mongodb',
      original_data: {}
    }
  },
  
  placeholderImage: {
    url: '/api/placeholder/800/800',
    alt: 'Imagem do produto',
    is_placeholder: true
  }
}

// Funções auxiliares
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateSKU(name, index, mongoId) {
  const prefix = name.substring(0, 3).toUpperCase()
  // Incluir parte do MongoDB ID para unicidade
  const idPart = mongoId ? mongoId.toString().slice(-4) : Date.now().toString().slice(-4)
  return `${prefix}-${idPart}-${index.toString().padStart(4, '0')}`
}

// Mapear dados do MongoDB para Xata
function mapMongoProductToXata(mongoProduct, index) {
  const mapped = {
    // Campos básicos
    name: mongoProduct.name || mongoProduct.nome || mongoProduct.title || `Produto ${index + 1}`,
    price: parseFloat(mongoProduct.price || mongoProduct.preco || mongoProduct.valor || 0),
    
    // Descrição
    description: mongoProduct.description || mongoProduct.descricao || mongoProduct.desc || MOCK_DEFAULTS.product.description,
    
    // SKU e códigos
    sku: mongoProduct.sku || mongoProduct.codigo || generateSKU(
      mongoProduct.name || 'PROD', 
      index,
      mongoProduct._id
    ),
    barcode: mongoProduct.barcode || mongoProduct.ean || mongoProduct.gtin || mongoProduct.codigo_barras || null,
    
    // Preços
    compare_at_price: parseFloat(mongoProduct.compare_at_price || mongoProduct.preco_comparacao || mongoProduct.preco_de || 0) || null,
    cost: parseFloat(mongoProduct.cost || mongoProduct.custo || 0) || null,
    
    // Estoque
    stock_quantity: parseInt(
      mongoProduct.stock || 
      mongoProduct.estoque || 
      mongoProduct.quantidade || 
      mongoProduct.stock_quantity || 
      MOCK_DEFAULTS.product.stock_quantity
    ),
    stock_location: mongoProduct.stock_location || mongoProduct.localizacao || 'Estoque Principal',
    
    // Físico
    weight: parseFloat(mongoProduct.weight || mongoProduct.peso || MOCK_DEFAULTS.product.weight),
    dimensions: mongoProduct.dimensions || mongoProduct.dimensoes || MOCK_DEFAULTS.product.dimensions,
    
    // Status
    is_active: mongoProduct.active !== undefined ? mongoProduct.active : 
               mongoProduct.ativo !== undefined ? mongoProduct.ativo : 
               MOCK_DEFAULTS.product.is_active,
    is_featured: mongoProduct.featured || mongoProduct.destaque || MOCK_DEFAULTS.product.is_featured,
    
    // Arrays
    images: [],
    tags: [],
    
    // Metadata
    metadata: {
      ...MOCK_DEFAULTS.product.metadata,
      mongo_id: mongoProduct._id?.toString(),
      original_data: mongoProduct
    }
  }
  
  // Processar imagens
  if (mongoProduct.images && Array.isArray(mongoProduct.images)) {
    mapped.images = mongoProduct.images.map(img => ({
      url: typeof img === 'string' ? img : (img.url || img.src),
      alt: typeof img === 'string' ? mapped.name : (img.alt || mapped.name),
      is_placeholder: false
    }))
  } else if (mongoProduct.image || mongoProduct.imagem || mongoProduct.foto) {
    const imageUrl = mongoProduct.image || mongoProduct.imagem || mongoProduct.foto
    mapped.images = [{
      url: imageUrl,
      alt: mapped.name,
      is_placeholder: false
    }]
  }
  
  // Adicionar placeholder se não tiver imagens
  if (mapped.images.length === 0) {
    mapped.images = [MOCK_DEFAULTS.placeholderImage]
  }
  
  // Processar tags
  const tags = new Set(MOCK_DEFAULTS.product.tags)
  
  // Tags do MongoDB
  if (mongoProduct.tags && Array.isArray(mongoProduct.tags)) {
    mongoProduct.tags.forEach(tag => tags.add(tag))
  }
  
  // Categorias como tags
  if (mongoProduct.categorias && Array.isArray(mongoProduct.categorias)) {
    mongoProduct.categorias.forEach(cat => tags.add(cat))
  }
  
  // Tag única do MongoDB ID
  if (mongoProduct._id) {
    tags.add(`mongo-${mongoProduct._id.toString().slice(-6)}`)
  }
  
  mapped.tags = Array.from(tags)
  
  // Gerar slug
  mapped.slug = mongoProduct.slug || createSlug(mapped.name)
  
  return mapped
}

// Função principal de importação
async function importFromMongoDB(options = {}) {
  const mongoClient = new MongoClient(MONGO_CONFIG.uri)
  
  try {
    // 1. Conectar ao MongoDB
    console.log('🔌 Conectando ao MongoDB...')
    await mongoClient.connect()
    const db = mongoClient.db(MONGO_CONFIG.database)
    const collection = db.collection(MONGO_CONFIG.collection)
    
    // 2. Contar produtos
    const totalCount = await collection.countDocuments(options.filter || {})
    console.log(`✅ Conectado! ${totalCount} produtos encontrados\n`)
    
    // 3. Preparar vendedor e categoria padrão (igual ao script anterior)
    console.log('👤 Verificando vendedor padrão...')
    let seller = await xata.db.sellers
      .filter({ company_document: MOCK_DEFAULTS.seller.company_document })
      .getFirst()
    
    if (!seller) {
      console.log('Criando vendedor padrão...')
      
      const user = await xata.db.users.create({
        email: MOCK_DEFAULTS.seller.email,
        name: MOCK_DEFAULTS.seller.name,
        password_hash: `mock:${MOCK_DEFAULTS.seller.password}`,
        role: 'seller',
        is_active: true
      })
      
      seller = await xata.db.sellers.create({
        user_id: user.id,
        company_name: MOCK_DEFAULTS.seller.company_name,
        company_document: MOCK_DEFAULTS.seller.company_document,
        description: MOCK_DEFAULTS.seller.description,
        is_verified: MOCK_DEFAULTS.seller.is_verified,
        rating_average: MOCK_DEFAULTS.seller.rating_average
      })
      
      console.log('✅ Vendedor padrão criado')
    }
    
    console.log('\n📁 Verificando categoria padrão...')
    let defaultCategory = await xata.db.categories
      .filter({ slug: MOCK_DEFAULTS.defaultCategory.slug })
      .getFirst()
    
    if (!defaultCategory) {
      console.log('Criando categoria padrão...')
      defaultCategory = await xata.db.categories.create(MOCK_DEFAULTS.defaultCategory)
      console.log('✅ Categoria padrão criada')
    }
    
    // 4. Carregar categorias existentes
    console.log('\n🗂️ Carregando categorias existentes...')
    const categories = await xata.db.categories.getAll()
    const categoryMap = new Map()
    
    categories.forEach(cat => {
      categoryMap.set(cat.slug, cat)
      categoryMap.set(cat.name.toLowerCase(), cat)
    })
    
    console.log(`✅ ${categories.length} categorias carregadas`)
    
    // 5. Importar produtos em lotes
    console.log('\n📦 Iniciando importação de produtos...')
    
    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      batches: 0,
      details: []
    }
    
    // Configurar cursor com opções
    const cursor = collection.find(options.filter || {})
    
    if (options.limit) {
      cursor.limit(options.limit)
    }
    
    if (options.skip) {
      cursor.skip(options.skip)
    }
    
    // Processar em lotes
    let batch = []
    let index = 0
    
    for await (const mongoProduct of cursor) {
      batch.push(mongoProduct)
      
      // Processar quando atingir o tamanho do lote
      if (batch.length >= MONGO_CONFIG.batchSize) {
        await processBatch(batch, index - batch.length + 1)
        batch = []
        results.batches++
      }
      
      index++
    }
    
    // Processar último lote
    if (batch.length > 0) {
      await processBatch(batch, index - batch.length + 1)
      results.batches++
    }
    
    // Função para processar lote
    async function processBatch(products, startIndex) {
      console.log(`\n🔄 Processando lote ${results.batches + 1} (${products.length} produtos)...`)
      
      for (let i = 0; i < products.length; i++) {
        const mongoProduct = products[i]
        const currentIndex = startIndex + i
        
        try {
          // Mapear produto
          const productData = mapMongoProductToXata(mongoProduct, currentIndex)
          
          // Verificar duplicata por MongoDB ID
          if (mongoProduct._id) {
            const existing = await xata.db.products
              .filter({ 'metadata.mongo_id': mongoProduct._id.toString() })
              .getFirst()
            
            if (existing) {
              console.log(`⏭️ Produto ${currentIndex}/${totalCount}: ${productData.name} - Já importado`)
              results.skipped++
              continue
            }
          }
          
          // Verificar duplicata por SKU
          const existingBySku = await xata.db.products
            .filter({ sku: productData.sku })
            .getFirst()
          
          if (existingBySku) {
            console.log(`⏭️ Produto ${currentIndex}/${totalCount}: ${productData.name} - SKU já existe`)
            results.skipped++
            continue
          }
          
          // Determinar categoria
          let categoryId = defaultCategory.id
          
          if (mongoProduct.category || mongoProduct.categoria) {
            const catSearch = (mongoProduct.category || mongoProduct.categoria).toLowerCase()
            const foundCat = categoryMap.get(catSearch)
            if (foundCat) {
              categoryId = foundCat.id
            }
          }
          
          // Criar produto
          const product = await xata.db.products.create({
            ...productData,
            seller_id: seller.id,
            category_id: categoryId
          })
          
          console.log(`✅ Produto ${currentIndex}/${totalCount}: ${productData.name}`)
          results.success++
          results.details.push({
            name: productData.name,
            sku: productData.sku,
            id: product.id,
            mongo_id: mongoProduct._id?.toString(),
            needs_enrichment: true
          })
          
        } catch (error) {
          console.error(`❌ Erro no produto ${currentIndex}: ${error.message}`)
          results.errors++
        }
      }
    }
    
    // 6. Salvar relatório
    const reportPath = `./import-report-mongodb-${Date.now()}.json`
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2))
    
    // 7. Resumo final
    console.log('\n📊 Resumo da Importação:')
    console.log(`✅ Sucesso: ${results.success} produtos`)
    console.log(`⏭️ Ignorados: ${results.skipped} produtos`)
    console.log(`❌ Erros: ${results.errors} produtos`)
    console.log(`📦 Lotes processados: ${results.batches}`)
    console.log(`\n📄 Relatório salvo em: ${reportPath}`)
    
    return results
    
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    throw error
  } finally {
    await mongoClient.close()
  }
}

// Função para importar com filtros específicos
async function importWithFilters() {
  // Exemplos de filtros úteis
  
  // Importar apenas produtos ativos
  await importFromMongoDB({
    filter: { active: true }
  })
  
  // Importar produtos de uma categoria específica
  await importFromMongoDB({
    filter: { category: 'eletronicos' }
  })
  
  // Importar produtos com estoque
  await importFromMongoDB({
    filter: { stock: { $gt: 0 } }
  })
  
  // Importar com limite
  await importFromMongoDB({
    limit: 1000,
    skip: 0
  })
}

// Executar importação
async function main() {
  const args = process.argv.slice(2)
  
  // Opções de linha de comando
  const options = {
    filter: {},
    limit: null,
    skip: null
  }
  
  // Processar argumentos
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--filter':
        try {
          options.filter = JSON.parse(args[++i])
        } catch (e) {
          console.error('❌ Filtro inválido. Use JSON válido.')
          process.exit(1)
        }
        break
        
      case '--limit':
        options.limit = parseInt(args[++i])
        break
        
      case '--skip':
        options.skip = parseInt(args[++i])
        break
        
      case '--active-only':
        options.filter.active = true
        break
        
      case '--with-stock':
        options.filter.stock = { $gt: 0 }
        break
        
      case '--category':
        options.filter.category = args[++i]
        break
        
      case '--help':
        console.log(`
Uso: node import-from-mongodb.mjs [opções]

Opções:
  --filter <json>     Filtro MongoDB em JSON
  --limit <n>         Limitar número de produtos
  --skip <n>          Pular n produtos
  --active-only       Importar apenas produtos ativos
  --with-stock        Importar apenas produtos com estoque
  --category <nome>   Importar apenas de uma categoria
  --help              Mostrar esta ajuda

Exemplos:
  node import-from-mongodb.mjs --limit 100
  node import-from-mongodb.mjs --active-only --with-stock
  node import-from-mongodb.mjs --filter '{"price":{"$gte":100}}'
        `)
        process.exit(0)
    }
  }
  
  // Executar importação
  await importFromMongoDB(options)
}

// Importar fs para salvar relatório
import fs from 'fs/promises'

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { importFromMongoDB, mapMongoProductToXata } 