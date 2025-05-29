#!/usr/bin/env node

import 'dotenv/config'
import { MongoClient } from 'mongodb'
import pg from 'pg'
import fs from 'fs/promises'
import crypto from 'crypto'

const { Pool } = pg

console.log('🚀 Script Final: MongoDB → Neon PostgreSQL\n')

// Configurações
const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DATABASE || 'graodegente',
  collection: process.env.MONGODB_COLLECTION || 'm_product',
  batchSize: 50
}

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// Função para criar slug
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Função para gerar hash de senha
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// Mapear produto do MongoDB para Neon
function mapMongoProductToNeon(mongoProduct, index) {
  // Extrair descrição HTML dos descriptions
  let description = '[PENDENTE] Descrição a ser enriquecida via IA'
  if (mongoProduct.descriptions && Array.isArray(mongoProduct.descriptions)) {
    const descObj = mongoProduct.descriptions.find(d => 
      d.attribute?.name === 'Descrição' || 
      d.attribute?.name === 'Descrição Marketplace'
    )
    if (descObj && descObj.attributeValue) {
      description = descObj.attributeValue
    }
  }

  // Extrair dimensões
  const height = mongoProduct.height || null
  const width = mongoProduct.width || null  
  const length = mongoProduct.depth || null
  const weight = mongoProduct.weight ? mongoProduct.weight / 1000 : null // Converter g para kg

  // Processar imagens
  const images = []
  if (mongoProduct.photos && Array.isArray(mongoProduct.photos)) {
    mongoProduct.photos.forEach(photo => {
      if (photo.file?.downloadURL) {
        images.push({
          url: photo.file.downloadURL,
          alt: mongoProduct.productName || 'Produto',
          is_primary: photo.isPrimary || false,
          position: images.length + 1
        })
      }
    })
  }

  // Montar produto para Neon
  return {
    // Campos básicos
    sku: mongoProduct.productId?.toString() || `IMPORT-${index}`,
    name: mongoProduct.productName || `Produto ${index}`,
    slug: createSlug(mongoProduct.productName || `produto-${index}`),
    description: description,
    
    // Preços
    price: mongoProduct.price || 0,
    original_price: mongoProduct.promotionalPrice > 0 ? mongoProduct.price : null,
    cost: mongoProduct.costPrice || null,
    currency: 'BRL',
    
    // Estoque
    quantity: mongoProduct.stock || 0,
    stock_location: 'CD Principal',
    track_inventory: true,
    allow_backorder: false,
    
    // Físico
    weight: weight,
    height: height,
    width: width,
    length: length,
    
    // Status
    status: mongoProduct.activeForSeo ? 'active' : 'draft',
    is_active: mongoProduct.activeForSeo || false,
    
    // SEO (para IA preencher depois)
    meta_title: mongoProduct.productName || null,
    meta_description: null,
    meta_keywords: [],
    tags: ['importado-mongodb'],
    
    // Analytics
    view_count: 0,
    sales_count: mongoProduct.qtyOrdered || 0,
    rating_average: null,
    rating_count: 0,
    featured: false,
    
    // Dados adicionais
    barcode: mongoProduct.ean || null,
    
    // JSON para dados complexos
    attributes: {
      mongo_id: mongoProduct._id?.toString(),
      firebase_id: mongoProduct.firestoreId,
      google_product_name: mongoProduct.googleProductName,
      marketplace_product_name: mongoProduct.marketplaceProductName,
      original_created: mongoProduct.audit?.createdAt,
      product_type: mongoProduct.productType,
      ncm: mongoProduct.ncm,
      cfop_category: mongoProduct.cfopCategory,
      minimum_stock: mongoProduct.minimumStock,
      delivery_time: mongoProduct.deliveryTime
    },
    
    specifications: {
      real_stock: mongoProduct.realStock,
      virtual_stock: mongoProduct.virtualStock,
      pieces_quantity: mongoProduct.piecesQuantity,
      volume_quantity: mongoProduct.volumeQuantity,
      sold_yesterday: mongoProduct.soldQuantityYesterday
    },
    
    // Campos de timestamp
    created_at: new Date(),
    updated_at: new Date(),
    published_at: mongoProduct.activeForSeo ? new Date() : null,
    
    // Para relacionamentos
    brand_name: mongoProduct.brand?.name || 'Grão de Gente',
    category_names: mongoProduct.categories?.map(c => c.name) || ['Produtos Gerais'],
    images: images
  }
}

// Buscar ou criar marca
async function findOrCreateBrand(brandName, client) {
  if (!brandName) return null
  
  const existing = await client.query(
    'SELECT id FROM brands WHERE name ILIKE $1',
    [brandName]
  )
  
  if (existing.rows.length > 0) {
    return existing.rows[0].id
  }
  
  // Criar nova marca
  const result = await client.query(
    'INSERT INTO brands (name, slug, is_active, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
    [brandName, createSlug(brandName), true]
  )
  
  console.log(`✅ Marca criada: ${brandName}`)
  return result.rows[0].id
}

// Buscar ou criar categoria
async function findOrCreateCategory(categoryNames, client) {
  if (!categoryNames || categoryNames.length === 0) {
    // Categoria padrão
    const defaultCat = await client.query(
      'SELECT id FROM categories WHERE slug = $1',
      ['produtos-gerais']
    )
    
    if (defaultCat.rows.length > 0) {
      return defaultCat.rows[0].id
    }
    
    // Criar categoria padrão
    const result = await client.query(`
      INSERT INTO categories (name, slug, description, is_active, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, NOW(), NOW()) 
      RETURNING id
    `, ['Produtos Gerais', 'produtos-gerais', 'Categoria padrão para produtos importados', true])
    
    return result.rows[0].id
  }
  
  // Usar primeira categoria
  const categoryName = categoryNames[0]
  const existing = await client.query(
    'SELECT id FROM categories WHERE name ILIKE $1',
    [categoryName]
  )
  
  if (existing.rows.length > 0) {
    return existing.rows[0].id
  }
  
  // Criar nova categoria
  const result = await client.query(`
    INSERT INTO categories (name, slug, description, is_active, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, NOW(), NOW()) 
    RETURNING id
  `, [categoryName, createSlug(categoryName), `Categoria: ${categoryName}`, true])
  
  console.log(`✅ Categoria criada: ${categoryName}`)
  return result.rows[0].id
}

// Buscar ou criar vendedor
async function findOrCreateSeller(client) {
  const existing = await client.query(
    'SELECT id FROM sellers WHERE company_document = $1',
    ['00000000000000']
  )
  
  if (existing.rows.length > 0) {
    return existing.rows[0].id
  }
  
  console.log('Criando vendedor padrão...')
  
  // Criar usuário
  const userResult = await client.query(`
    INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING id
  `, [
    'vendedor.padrao@graodegente.com',
    'Grão de Gente - Vendedor Padrão',
    hashPassword('temp123456'),
    'seller',
    true
  ])
  
  // Criar vendedor
  const sellerResult = await client.query(`
    INSERT INTO sellers (user_id, company_name, company_document, description, is_verified, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id
  `, [
    userResult.rows[0].id,
    'Grão de Gente',
    '00000000000000',
    'Vendedor padrão para produtos importados do MongoDB',
    true,
    true
  ])
  
  console.log('✅ Vendedor padrão criado')
  return sellerResult.rows[0].id
}

// Inserir imagens do produto
async function insertProductImages(productId, images, client) {
  if (!images || images.length === 0) return
  
  for (const image of images) {
    await client.query(`
      INSERT INTO product_images (product_id, url, alt_text, is_primary, position, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [productId, image.url, image.alt, image.is_primary, image.position])
  }
  
  console.log(`📸 ${images.length} imagens inseridas`)
}

// Função principal
async function importFromMongoToNeon(options = {}) {
  const mongoClient = new MongoClient(MONGO_CONFIG.uri)
  
  try {
    // Conectar aos bancos
    console.log('🔌 Conectando ao MongoDB...')
    await mongoClient.connect()
    const db = mongoClient.db(MONGO_CONFIG.database)
    const collection = db.collection(MONGO_CONFIG.collection)
    
    console.log('🔌 Conectando ao Neon...')
    await neonPool.query('SELECT NOW()')
    console.log('✅ Ambos os bancos conectados!\n')
    
    // Contar total
    const totalCount = await collection.countDocuments(options.filter || {})
    console.log(`📦 ${totalCount.toLocaleString()} produtos encontrados\n`)
    
    // Preparar vendedor padrão
    const client = await neonPool.connect()
    const sellerId = await findOrCreateSeller(client)
    client.release()
    
    // Configurar cursor
    const cursor = collection.find(options.filter || {})
    if (options.limit) cursor.limit(options.limit)
    if (options.skip) cursor.skip(options.skip)
    
    // Estatísticas
    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      details: []
    }
    
    // Processar produtos
    console.log('📦 Iniciando importação...\n')
    
    let index = 0
    for await (const mongoProduct of cursor) {
      const client = await neonPool.connect()
      
      try {
        await client.query('BEGIN')
        
        // Mapear produto
        const productData = mapMongoProductToNeon(mongoProduct, index)
        
        // Verificar duplicata
        const existing = await client.query(
          'SELECT id FROM products WHERE sku = $1',
          [productData.sku]
        )
        
        if (existing.rows.length > 0) {
          console.log(`⏭️ ${index + 1}/${options.limit || totalCount}: ${productData.name} - SKU já existe`)
          results.skipped++
          await client.query('ROLLBACK')
          continue
        }
        
        // Buscar/criar relacionamentos
        const brandId = await findOrCreateBrand(productData.brand_name, client)
        const categoryId = await findOrCreateCategory(productData.category_names, client)
        
        // Inserir produto
        const productResult = await client.query(`
          INSERT INTO products (
            sku, name, slug, description, brand_id, category_id, seller_id,
            status, is_active, price, original_price, cost, currency,
            quantity, stock_location, track_inventory, allow_backorder,
            weight, height, width, length, meta_title, meta_description, meta_keywords,
            tags, attributes, specifications, view_count, sales_count, rating_average,
            rating_count, featured, barcode, featuring, created_at, updated_at, published_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37
          ) RETURNING id
        `, [
          productData.sku, productData.name, productData.slug, productData.description,
          brandId, categoryId, sellerId, productData.status, productData.is_active,
          productData.price, productData.original_price, productData.cost, productData.currency,
          productData.quantity, productData.stock_location, productData.track_inventory, productData.allow_backorder,
          productData.weight, productData.height, productData.width, productData.length,
          productData.meta_title, productData.meta_description, productData.meta_keywords,
          productData.tags, JSON.stringify(productData.attributes), JSON.stringify(productData.specifications),
          productData.view_count, productData.sales_count, productData.rating_average,
          productData.rating_count, productData.featured, productData.barcode, null,
          productData.created_at, productData.updated_at, productData.published_at
        ])
        
        const productId = productResult.rows[0].id
        
        // Inserir imagens
        if (productData.images && productData.images.length > 0) {
          await insertProductImages(productId, productData.images, client)
        }
        
        await client.query('COMMIT')
        
        console.log(`✅ ${index + 1}/${options.limit || totalCount}: ${productData.name}`)
        results.success++
        results.details.push({
          name: productData.name,
          sku: productData.sku,
          id: productId,
          mongo_id: mongoProduct._id?.toString()
        })
        
      } catch (error) {
        await client.query('ROLLBACK')
        console.error(`❌ ${index + 1}: ${error.message}`)
        results.errors++
      } finally {
        client.release()
      }
      
      index++
    }
    
    // Relatório final
    console.log('\n📊 Importação Concluída!')
    console.log(`✅ Sucesso: ${results.success}`)
    console.log(`⏭️ Ignorados: ${results.skipped}`)
    console.log(`❌ Erros: ${results.errors}`)
    
    // Salvar relatório
    const reportPath = `./import-report-${Date.now()}.json`
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2))
    console.log(`📄 Relatório: ${reportPath}`)
    
    return results
    
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    throw error
  } finally {
    await mongoClient.close()
    await neonPool.end()
  }
}

// Executar
async function main() {
  const args = process.argv.slice(2)
  
  const options = {}
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        options.limit = parseInt(args[++i])
        break
      case '--filter':
        options.filter = JSON.parse(args[++i])
        break
    }
  }
  
  await importFromMongoToNeon(options)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { importFromMongoToNeon } 