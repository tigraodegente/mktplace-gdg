#!/usr/bin/env node

import 'dotenv/config'
import { MongoClient } from 'mongodb'
import pg from 'pg'
import fs from 'fs/promises'

const { Pool } = pg

console.log('🚀 Script de Importação MongoDB → Neon PostgreSQL\n')

// Configuração MongoDB
const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DATABASE || 'marketplace',
  collection: process.env.MONGODB_COLLECTION || 'products',
  batchSize: 100
}

// Configuração Neon PostgreSQL
const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

// Configurações de dados mockados
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
    description: 'Categoria temporária para produtos sem categoria definida',
    is_active: true,
    display_order: 999
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
  const idPart = mongoId ? mongoId.toString().slice(-4) : Date.now().toString().slice(-4)
  return `${prefix}-${idPart}-${index.toString().padStart(4, '0')}`
}

// Hash de senha simples para mock
function hashPassword(password) {
  // Em produção, use bcrypt ou similar
  return `mock:${password}`
}

// Mapear dados do MongoDB para PostgreSQL
function mapMongoProductToNeon(mongoProduct, index, fieldMapping) {
  // Usar mapeamento customizado ou padrão
  const mapping = fieldMapping || {
    name: 'name',
    price: 'price',
    description: 'description',
    sku: 'sku',
    category: 'category',
    images: 'images',
    stock: 'stock'
  }
  
  const mapped = {
    // Campos básicos usando mapeamento
    name: mongoProduct[mapping.name] || mongoProduct.name || mongoProduct.nome || `Produto ${index + 1}`,
    price: parseFloat(mongoProduct[mapping.price] || mongoProduct.price || mongoProduct.preco || 0),
    
    // Descrição
    description: mongoProduct[mapping.description] || mongoProduct.description || MOCK_DEFAULTS.product.description,
    
    // SKU e códigos
    sku: mongoProduct[mapping.sku] || mongoProduct.sku || generateSKU(
      mongoProduct[mapping.name] || 'PROD', 
      index,
      mongoProduct._id
    ),
    barcode: mongoProduct.barcode || mongoProduct.ean || mongoProduct.gtin || null,
    
    // Preços
    compare_at_price: parseFloat(mongoProduct.compare_at_price || mongoProduct.preco_comparacao || 0) || null,
    cost: parseFloat(mongoProduct.cost || mongoProduct.custo || 0) || null,
    
    // Estoque
    stock_quantity: parseInt(
      mongoProduct[mapping.stock] || 
      mongoProduct.stock || 
      mongoProduct.estoque || 
      MOCK_DEFAULTS.product.stock_quantity
    ),
    stock_location: mongoProduct.stock_location || 'Estoque Principal',
    
    // Físico
    weight: parseFloat(mongoProduct.weight || mongoProduct.peso || MOCK_DEFAULTS.product.weight),
    dimensions: mongoProduct.dimensions || mongoProduct.dimensoes || MOCK_DEFAULTS.product.dimensions,
    
    // Status
    is_active: mongoProduct.active !== undefined ? mongoProduct.active : MOCK_DEFAULTS.product.is_active,
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
  const imageField = mongoProduct[mapping.images] || mongoProduct.images || mongoProduct.imagens
  if (imageField) {
    if (Array.isArray(imageField)) {
      mapped.images = imageField.map(img => ({
        url: typeof img === 'string' ? img : (img.url || img.src),
        alt: typeof img === 'string' ? mapped.name : (img.alt || mapped.name),
        is_placeholder: false
      }))
    } else if (typeof imageField === 'string') {
      mapped.images = [{
        url: imageField,
        alt: mapped.name,
        is_placeholder: false
      }]
    }
  }
  
  // Adicionar placeholder se não tiver imagens
  if (mapped.images.length === 0) {
    mapped.images = [MOCK_DEFAULTS.placeholderImage]
  }
  
  // Processar tags
  const tags = new Set(MOCK_DEFAULTS.product.tags)
  
  if (mongoProduct.tags && Array.isArray(mongoProduct.tags)) {
    mongoProduct.tags.forEach(tag => tags.add(tag))
  }
  
  if (mongoProduct._id) {
    tags.add(`mongo-${mongoProduct._id.toString().slice(-6)}`)
  }
  
  mapped.tags = Array.from(tags)
  
  // Gerar slug
  mapped.slug = mongoProduct.slug || createSlug(mapped.name)
  
  // Categoria do MongoDB
  mapped.mongo_category = mongoProduct[mapping.category] || mongoProduct.category || mongoProduct.categoria
  
  return mapped
}

// Função principal de importação
async function importFromMongoToNeon(options = {}) {
  const mongoClient = new MongoClient(MONGO_CONFIG.uri)
  
  try {
    // 1. Conectar ao MongoDB
    console.log('🔌 Conectando ao MongoDB...')
    await mongoClient.connect()
    const db = mongoClient.db(MONGO_CONFIG.database)
    const collection = db.collection(MONGO_CONFIG.collection)
    
    // 2. Conectar ao Neon
    console.log('🔌 Conectando ao Neon PostgreSQL...')
    await neonPool.query('SELECT NOW()')
    console.log('✅ Conectado ao Neon!')
    
    // 3. Contar produtos no MongoDB
    const totalCount = await collection.countDocuments(options.filter || {})
    console.log(`✅ ${totalCount} produtos encontrados no MongoDB\n`)
    
    // 4. Criar/verificar vendedor padrão
    console.log('👤 Verificando vendedor padrão...')
    
    let sellerId
    const sellerCheck = await neonPool.query(
      'SELECT id FROM sellers WHERE company_document = $1',
      [MOCK_DEFAULTS.seller.company_document]
    )
    
    if (sellerCheck.rows.length === 0) {
      console.log('Criando vendedor padrão...')
      
      // Criar usuário primeiro
      const userResult = await neonPool.query(`
        INSERT INTO users (email, name, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        MOCK_DEFAULTS.seller.email,
        MOCK_DEFAULTS.seller.name,
        hashPassword(MOCK_DEFAULTS.seller.password),
        'seller',
        true
      ])
      
      const userId = userResult.rows[0].id
      
      // Criar vendedor
      const sellerResult = await neonPool.query(`
        INSERT INTO sellers (
          user_id, company_name, company_document, 
          description, is_verified, rating_average
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        userId,
        MOCK_DEFAULTS.seller.company_name,
        MOCK_DEFAULTS.seller.company_document,
        MOCK_DEFAULTS.seller.description,
        MOCK_DEFAULTS.seller.is_verified,
        MOCK_DEFAULTS.seller.rating_average
      ])
      
      sellerId = sellerResult.rows[0].id
      console.log('✅ Vendedor padrão criado')
    } else {
      sellerId = sellerCheck.rows[0].id
      console.log('✅ Vendedor padrão já existe')
    }
    
    // 5. Criar/verificar categoria padrão
    console.log('\n📁 Verificando categoria padrão...')
    
    let defaultCategoryId
    const categoryCheck = await neonPool.query(
      'SELECT id FROM categories WHERE slug = $1',
      [MOCK_DEFAULTS.defaultCategory.slug]
    )
    
    if (categoryCheck.rows.length === 0) {
      console.log('Criando categoria padrão...')
      
      const categoryResult = await neonPool.query(`
        INSERT INTO categories (name, slug, description, is_active, display_order)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        MOCK_DEFAULTS.defaultCategory.name,
        MOCK_DEFAULTS.defaultCategory.slug,
        MOCK_DEFAULTS.defaultCategory.description,
        MOCK_DEFAULTS.defaultCategory.is_active,
        MOCK_DEFAULTS.defaultCategory.display_order
      ])
      
      defaultCategoryId = categoryResult.rows[0].id
      console.log('✅ Categoria padrão criada')
    } else {
      defaultCategoryId = categoryCheck.rows[0].id
      console.log('✅ Categoria padrão já existe')
    }
    
    // 6. Carregar categorias existentes
    console.log('\n🗂️ Carregando categorias existentes...')
    const categoriesResult = await neonPool.query('SELECT id, name, slug FROM categories')
    const categoryMap = new Map()
    
    categoriesResult.rows.forEach(cat => {
      categoryMap.set(cat.slug, cat.id)
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    })
    
    console.log(`✅ ${categoriesResult.rows.length} categorias carregadas`)
    
    // 7. Carregar mapeamento de campos (se existir)
    let fieldMapping = null
    try {
      const mappingFile = await fs.readFile('./field-mapping.json', 'utf-8')
      fieldMapping = JSON.parse(mappingFile)
      console.log('✅ Mapeamento customizado carregado')
    } catch {
      console.log('ℹ️ Usando mapeamento padrão')
    }
    
    // 8. Importar produtos em lotes
    console.log('\n📦 Iniciando importação de produtos...')
    
    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      batches: 0,
      details: []
    }
    
    // Configurar cursor
    const cursor = collection.find(options.filter || {})
    
    if (options.limit) cursor.limit(options.limit)
    if (options.skip) cursor.skip(options.skip)
    
    // Processar em lotes
    let batch = []
    let index = 0
    
    for await (const mongoProduct of cursor) {
      batch.push(mongoProduct)
      
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
      
      // Iniciar transação
      const client = await neonPool.connect()
      
      try {
        await client.query('BEGIN')
        
        for (let i = 0; i < products.length; i++) {
          const mongoProduct = products[i]
          const currentIndex = startIndex + i
          
          try {
            // Mapear produto
            const productData = mapMongoProductToNeon(mongoProduct, currentIndex, fieldMapping)
            
            // Verificar duplicata por MongoDB ID
            if (mongoProduct._id) {
              const existing = await client.query(
                `SELECT id FROM products WHERE metadata->>'mongo_id' = $1`,
                [mongoProduct._id.toString()]
              )
              
              if (existing.rows.length > 0) {
                console.log(`⏭️ Produto ${currentIndex}/${totalCount}: ${productData.name} - Já importado`)
                results.skipped++
                continue
              }
            }
            
            // Determinar categoria
            let categoryId = defaultCategoryId
            
            if (productData.mongo_category) {
              const catSearch = productData.mongo_category.toLowerCase()
              if (categoryMap.has(catSearch)) {
                categoryId = categoryMap.get(catSearch)
              }
            }
            
            // Inserir produto
            const insertResult = await client.query(`
              INSERT INTO products (
                seller_id, category_id, name, slug, description,
                price, compare_at_price, cost, sku, barcode,
                stock_quantity, stock_location, weight, dimensions,
                images, is_active, is_featured, tags, metadata
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
              RETURNING id
            `, [
              sellerId,
              categoryId,
              productData.name,
              productData.slug,
              productData.description,
              productData.price,
              productData.compare_at_price,
              productData.cost,
              productData.sku,
              productData.barcode,
              productData.stock_quantity,
              productData.stock_location,
              productData.weight,
              JSON.stringify(productData.dimensions),
              JSON.stringify(productData.images),
              productData.is_active,
              productData.is_featured,
              JSON.stringify(productData.tags),
              JSON.stringify(productData.metadata)
            ])
            
            console.log(`✅ Produto ${currentIndex}/${totalCount}: ${productData.name}`)
            results.success++
            results.details.push({
              name: productData.name,
              sku: productData.sku,
              id: insertResult.rows[0].id,
              mongo_id: mongoProduct._id?.toString(),
              needs_enrichment: true
            })
            
          } catch (error) {
            console.error(`❌ Erro no produto ${currentIndex}: ${error.message}`)
            results.errors++
          }
        }
        
        await client.query('COMMIT')
        
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }
    
    // 9. Salvar relatório
    const reportPath = `./import-report-neon-${Date.now()}.json`
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2))
    
    // 10. Resumo final
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
    await neonPool.end()
  }
}

// Executar importação
async function main() {
  const args = process.argv.slice(2)
  
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
          console.error('❌ Filtro inválido')
          process.exit(1)
        }
        break
        
      case '--limit':
        options.limit = parseInt(args[++i])
        break
        
      case '--skip':
        options.skip = parseInt(args[++i])
        break
        
      case '--help':
        console.log(`
Uso: node import-from-mongodb-to-neon.mjs [opções]

Opções:
  --filter <json>     Filtro MongoDB
  --limit <n>         Limitar número de produtos
  --skip <n>          Pular n produtos
  --help              Mostrar ajuda

Exemplos:
  node import-from-mongodb-to-neon.mjs --limit 100
  node import-from-mongodb-to-neon.mjs --filter '{"active":true}'
        `)
        process.exit(0)
    }
  }
  
  await importFromMongoToNeon(options)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { importFromMongoToNeon } 