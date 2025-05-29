#!/usr/bin/env node

import 'dotenv/config'
import { MongoClient } from 'mongodb'
import pg from 'pg'
import fs from 'fs/promises'

const { Pool } = pg

console.log('🚀 Script de Importação MongoDB → PostgreSQL LOCAL\n')

// Configuração MongoDB
const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DATABASE || 'graodegente',
  collection: process.env.MONGODB_COLLECTION || 'm_product',
  batchSize: 100
}

// Configuração PostgreSQL LOCAL
const localPool = new Pool({
  connectionString: process.env.LOCAL_DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev',
  // Sem SSL para banco local
})

// Configurações de dados mockados
const MOCK_DEFAULTS = {
  seller: {
    email: 'graodegente@marketplace.com',
    name: 'Grão de Gente',
    password: 'temp123456',
    company_name: 'Grão de Gente - Produtos para Bebê',
    company_document: '12345678000123',
    description: 'Loja especializada em produtos para bebê e quarto infantil',
    is_verified: true,
    rating_average: 4.8
  },
  
  defaultCategory: {
    name: 'Produtos para Bebê',
    slug: 'produtos-para-bebe',
    description: 'Categoria para produtos infantis e de bebê',
    is_active: true,
    display_order: 1
  },
  
  product: {
    description: '[PENDENTE] Descrição detalhada do produto a ser preenchida via IA',
    stock_quantity: 50,
    weight: 0.5,
    dimensions: {
      length: 30,
      width: 20,
      height: 10,
      unit: 'cm'
    },
    images: [],
    is_active: true,
    is_featured: true,
    tags: ['grão-de-gente', 'bebê', 'mongodb-import'],
    metadata: {
      imported_at: new Date().toISOString(),
      needs_enrichment: true,
      source: 'mongodb-graodegente',
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
  const prefix = 'GDG' // Grão de Gente
  const idPart = mongoId ? mongoId.toString().slice(-4) : Date.now().toString().slice(-4)
  return `${prefix}-${idPart}-${index.toString().padStart(3, '0')}`
}

// Hash de senha simples para mock
function hashPassword(password) {
  // Em produção, use bcrypt ou similar
  return `mock:${password}`
}

// Mapear dados do MongoDB para PostgreSQL LOCAL
function mapMongoProductToLocal(mongoProduct, index, fieldMapping) {
  // Extrair dados do produto MongoDB da Grão de Gente
  const name = mongoProduct.complementCompanyId || mongoProduct.name || `Produto ${index + 1}`
  const price = mongoProduct.costPrice || 0
  
  // Extrair categoria
  let categoryName = 'Produtos para Bebê'
  if (mongoProduct.categories && mongoProduct.categories.length > 0) {
    categoryName = mongoProduct.categories[0].name || categoryName
  }
  
  // Extrair descrição
  let description = MOCK_DEFAULTS.product.description
  if (mongoProduct.descriptions && mongoProduct.descriptions.length > 0) {
    const descObj = mongoProduct.descriptions.find(d => d.attribute?.name === 'Descrição')
    if (descObj && descObj.attributeValue) {
      description = descObj.attributeValue.replace(/<[^>]*>/g, '').trim() // Remove HTML
    }
  }
  
  // Extrair atributos/especificações
  const attributes = {}
  if (mongoProduct.attributes && mongoProduct.attributes.length > 0) {
    mongoProduct.attributes.forEach(attr => {
      if (attr.attributeValue) {
        attributes[attr.attribute?._path || 'attr'] = attr.attributeValue
      }
    })
  }
  
  const mapped = {
    // Campos básicos
    name: name,
    price: parseFloat(price) || 0,
    description: description,
    
    // SKU e códigos usando dados reais
    sku: mongoProduct.sku || generateSKU(name, index, mongoProduct._id),
    barcode: mongoProduct.barcode || null,
    
    // Preços
    original_price: parseFloat(price * 1.2) || null, // Preço "de" 20% maior
    cost: parseFloat(price * 0.7) || null, // Custo 30% menor
    
    // Estoque
    quantity: mongoProduct.stock || 50,
    stock_location: mongoProduct.defaultShippingPlace?.name || 'Estoque Principal',
    
    // Físico
    weight: parseFloat(mongoProduct.weight || MOCK_DEFAULTS.product.weight),
    height: parseFloat(mongoProduct.height || 10),
    width: parseFloat(mongoProduct.width || 20),  
    length: parseFloat(mongoProduct.depth || 30),
    
    // Status
    is_active: mongoProduct.activeForSeo !== false,
    featured: true, // Produtos MongoDB são especiais
    
    // Campos do banco local
    status: 'active',
    currency: 'BRL',
    track_inventory: true,
    allow_backorder: false,
    delivery_days: mongoProduct.deliveryTime || 7,
    has_free_shipping: true,
    condition: 'new',
    
    // Tags e metadata
    tags: ['grão-de-gente', 'bebê', 'infantil', 'mongodb'],
    attributes: attributes,
    
    // Metadata específica do banco local
    view_count: 0,
    sales_count: 0,
    rating_average: 0,
    rating_count: 0,
    mongo_category: categoryName,
    mongo_id: mongoProduct._id?.toString()
  }
  
  // Gerar slug
  mapped.slug = createSlug(mapped.name)
  
  return mapped
}

// Função principal de importação
async function importFromMongoToLocal(options = {}) {
  const mongoClient = new MongoClient(MONGO_CONFIG.uri)
  
  try {
    // 1. Conectar ao MongoDB
    console.log('🔌 Conectando ao MongoDB Grão de Gente...')
    await mongoClient.connect()
    const db = mongoClient.db(MONGO_CONFIG.database)
    const collection = db.collection(MONGO_CONFIG.collection)
    
    // 2. Conectar ao PostgreSQL Local
    console.log('🔌 Conectando ao PostgreSQL LOCAL...')
    await localPool.query('SELECT NOW()')
    console.log('✅ Conectado ao banco LOCAL!')
    
    // 3. Contar produtos no MongoDB
    const totalCount = await collection.countDocuments(options.filter || {})
    console.log(`✅ ${totalCount} produtos encontrados no MongoDB\n`)
    
    // 4. Criar/verificar vendedor Grão de Gente
    console.log('👤 Verificando vendedor Grão de Gente...')
    
    let sellerId
    const sellerCheck = await localPool.query(
      'SELECT id FROM sellers WHERE company_document = $1',
      [MOCK_DEFAULTS.seller.company_document]
    )
    
    if (sellerCheck.rows.length === 0) {
      console.log('Criando vendedor Grão de Gente...')
      
      // Criar usuário primeiro
      const userResult = await localPool.query(`
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
      const sellerResult = await localPool.query(`
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
      console.log('✅ Vendedor Grão de Gente criado')
    } else {
      sellerId = sellerCheck.rows[0].id
      console.log('✅ Vendedor Grão de Gente já existe')
    }
    
    // 5. Criar/verificar categorias para bebê
    console.log('\n📁 Verificando categorias para bebê...')
    
    // Criar categorias específicas se não existirem
    const categoriesToCreate = [
      { name: 'Almofadas', slug: 'almofadas' },
      { name: 'Berços', slug: 'bercos' },
      { name: 'Cabanas e Tendas', slug: 'cabanas-tendas' },
      { name: 'Roupinhas', slug: 'roupinhas' },
      { name: 'Kit Berço', slug: 'kit-berco' }
    ]
    
    const categoryMap = new Map()
    
    for (const catData of categoriesToCreate) {
      let category = await localPool.query(
        'SELECT id FROM categories WHERE slug = $1',
        [catData.slug]
      )
      
      if (category.rows.length === 0) {
        console.log(`Criando categoria: ${catData.name}`)
        const result = await localPool.query(`
          INSERT INTO categories (name, slug, description, is_active, position)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [
          catData.name,
          catData.slug,
          `Produtos de ${catData.name} para bebê`,
          true,
          1
        ])
        categoryMap.set(catData.name.toLowerCase(), result.rows[0].id)
      } else {
        categoryMap.set(catData.name.toLowerCase(), category.rows[0].id)
      }
    }
    
    // Categoria padrão
    let defaultCategoryId = categoryMap.get('almofadas') || Array.from(categoryMap.values())[0]
    
    console.log(`✅ ${categoryMap.size} categorias preparadas`)
    
    // 6. Importar produtos em lotes
    console.log('\n📦 Iniciando importação de produtos da Grão de Gente...')
    
    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      batches: 0,
      details: []
    }
    
    // Configurar cursor - buscar produtos pelos nomes que sabemos que existem
    const targetNames = ['Almofada', 'Cabana', 'Berço', 'Kit Body', 'Saia']
    const cursor = collection.find({
      $or: targetNames.map(name => ({
        $or: [
          { complementCompanyId: { $regex: name, $options: 'i' } },
          { productName: { $regex: name, $options: 'i' } }
        ]
      })).flat()
    }).limit(5) // Limitar a 5 produtos para teste inicial
    
    // Processar produtos
    let index = 0
    
    for await (const mongoProduct of cursor) {
      try {
        // Mapear produto
        const productData = mapMongoProductToLocal(mongoProduct, index)
        
        // Verificar duplicata por SKU
        const existing = await localPool.query(
          'SELECT id FROM products WHERE sku = $1',
          [productData.sku]
        )
        
        if (existing.rows.length > 0) {
          console.log(`⏭️ Produto ${index + 1}: ${productData.name} - SKU ${productData.sku} já existe`)
          results.skipped++
          index++
          continue
        }
        
        // Determinar categoria baseada no nome
        let categoryId = defaultCategoryId
        const productName = productData.name.toLowerCase()
        
        if (productName.includes('cabana')) {
          categoryId = categoryMap.get('cabanas e tendas') || defaultCategoryId
        } else if (productName.includes('almofada')) {
          categoryId = categoryMap.get('almofadas') || defaultCategoryId
        } else if (productName.includes('berço')) {
          categoryId = categoryMap.get('berços') || categoryMap.get('kit berço') || defaultCategoryId
        } else if (productName.includes('body') || productName.includes('saia')) {
          categoryId = categoryMap.get('roupinhas') || defaultCategoryId
        }
        
        // Buscar brand_id (assumir que existe uma marca padrão)
        const brandResult = await localPool.query('SELECT id FROM brands LIMIT 1')
        const brandId = brandResult.rows[0]?.id || null
        
        // Inserir produto usando schema do banco local
        const insertResult = await localPool.query(`
          INSERT INTO products (
            sku, name, slug, description, brand_id, category_id, seller_id,
            status, is_active, price, original_price, cost, currency,
            quantity, stock_location, track_inventory, allow_backorder,
            weight, height, width, length, tags, attributes,
            view_count, sales_count, rating_average, rating_count,
            featured, condition, delivery_days, has_free_shipping,
            created_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
            $24, $25, $26, $27, $28, $29, $30, $31, NOW(), NOW()
          )
          RETURNING id
        `, [
          productData.sku,
          productData.name,
          productData.slug,
          productData.description,
          brandId,
          categoryId,
          sellerId,
          productData.status,
          productData.is_active,
          productData.price,
          productData.original_price,
          productData.cost,
          productData.currency,
          productData.quantity,
          productData.stock_location,
          productData.track_inventory,
          productData.allow_backorder,
          productData.weight,
          productData.height,
          productData.width,
          productData.length,
          productData.tags,
          JSON.stringify(productData.attributes),
          productData.view_count,
          productData.sales_count,
          productData.rating_average,
          productData.rating_count,
          productData.featured,
          productData.condition,
          productData.delivery_days,
          productData.has_free_shipping
        ])
        
        console.log(`✅ Produto ${index + 1}: ${productData.name} (SKU: ${productData.sku})`)
        results.success++
        results.details.push({
          name: productData.name,
          sku: productData.sku,
          id: insertResult.rows[0].id,
          mongo_id: productData.mongo_id
        })
        
      } catch (error) {
        console.error(`❌ Erro no produto ${index + 1}: ${error.message}`)
        results.errors++
      }
      
      index++
    }
    
    // 7. Salvar relatório
    const reportPath = `./import-report-local-${Date.now()}.json`
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2))
    
    // 8. Resumo final
    console.log('\n📊 Resumo da Importação:')
    console.log(`✅ Sucesso: ${results.success} produtos`)
    console.log(`⏭️ Ignorados: ${results.skipped} produtos`)
    console.log(`❌ Erros: ${results.errors} produtos`)
    console.log(`\n📄 Relatório salvo em: ${reportPath}`)
    
    return results
    
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    throw error
  } finally {
    await mongoClient.close()
    await localPool.end()
  }
}

// Executar importação
async function main() {
  const args = process.argv.slice(2)
  
  const options = {
    filter: {},
    limit: 5 // Apenas os 5 produtos que já temos
  }
  
  await importFromMongoToLocal(options)
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { importFromMongoToLocal } 