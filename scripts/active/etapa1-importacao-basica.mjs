#!/usr/bin/env node
import { DatabaseConnector } from '../sync/utils/db-connector.mjs'

class Etapa1ImportacaoBasica {
  constructor() {
    this.connector = new DatabaseConnector({ forceConnection: true })
    this.stats = {
      total: 0,
      processed: 0,
      categoryUpdated: 0,
      originalPriceUpdated: 0,
      costUpdated: 0,
      errors: 0
    }
    this.categoryMap = new Map()
  }

  async init() {
    console.log('🔵 ETAPA 1 - IMPORTAÇÃO BÁSICA DO MONGODB')
    console.log('='.repeat(60))
    
    await this.connector.connectMongo()
    await this.connector.connectNeon()
    
    // Carregar mapeamento de categorias
    await this.loadCategoryMapping()
  }

  async loadCategoryMapping() {
    console.log('\n📋 Carregando categorias do Neon...')
    
    const categories = await this.connector.queryNeon(`
      SELECT id, name, slug 
      FROM categories 
      ORDER BY name
    `)
    
    console.log(`✅ ${categories.rows.length} categorias encontradas`)
    
    // Criar mapeamento para busca rápida
    categories.rows.forEach(cat => {
      // Mapear por nome exato
      this.categoryMap.set(cat.name.toLowerCase().trim(), cat.id)
      
      // Mapear variações comuns
      const variations = this.generateCategoryVariations(cat.name)
      variations.forEach(variation => {
        this.categoryMap.set(variation, cat.id)
      })
    })
    
    console.log(`📋 Mapeamento criado com ${this.categoryMap.size} variações`)
  }

  generateCategoryVariations(name) {
    const variations = []
    const clean = name.toLowerCase().trim()
    
    variations.push(clean)
    variations.push(clean.replace(/[^\w\s]/g, '')) // Remove pontuação
    variations.push(clean.replace(/\s+/g, '')) // Remove espaços
    
    // Variações específicas conhecidas
    const mappings = {
      'bebê': ['bebe', 'baby'],
      'criança': ['crianca', 'infantil'],
      'mamãe': ['mamae', 'mae', 'mãe'],
      'papai': ['papae', 'pai'],
      'amamentação': ['amamentacao']
    }
    
    Object.entries(mappings).forEach(([key, values]) => {
      if (clean.includes(key)) {
        values.forEach(value => {
          variations.push(clean.replace(key, value))
        })
      }
    })
    
    return variations
  }

  async processProducts() {
    console.log('\n🔄 Iniciando processamento dos produtos...')
    
    const db = this.connector.getMongoDb()
    
    // Primeiro, vamos ver quantos produtos do MongoDB existem no Neon
    console.log('\n📊 Verificando intersecção MongoDB <-> Neon...')
    
    const mongoSkus = await db.collection('m_product_typesense')
      .find({ isactive: true }, { projection: { productid: 1 } })
      .toArray()
    
    const mongoSkuList = mongoSkus.map(p => p.productid.toString()) // Converter para string para comparar com Neon
    console.log(`📦 SKUs no MongoDB: ${mongoSkuList.length}`)
    
    // mongoSkuList já são strings agora
    
    // Verificar quais existem no Neon (buscar por string, pois Neon usa string)
    const existingInNeon = await this.connector.queryNeon(`
      SELECT sku FROM products 
      WHERE sku = ANY($1)
    `, [mongoSkuList])
    
    const existingSkus = existingInNeon.rows.map(row => row.sku)
    console.log(`📦 SKUs existem no Neon: ${existingSkus.length}`)
    console.log(`📦 SKUs faltantes no Neon: ${mongoSkuList.length - existingSkus.length}`)
    
    // Processar apenas produtos que existem em ambas as bases
    this.stats.total = existingSkus.length
    console.log(`\n📦 Processando ${this.stats.total} produtos (intersecção)`)
    
    // Processar em batches
    const batchSize = 50
    let processed = 0
    
    while (processed < existingSkus.length) {
      const batchSkus = existingSkus.slice(processed, processed + batchSize)
      const batchSkusNum = batchSkus.map(sku => parseInt(sku)) // Converter para números
      
      console.log(`\n📦 Batch ${Math.floor(processed/batchSize) + 1}/${Math.ceil(existingSkus.length/batchSize)}`)
      console.log(`   SKUs ${processed + 1} a ${Math.min(processed + batchSize, existingSkus.length)}`)
      
      // Buscar produtos do MongoDB para este batch (usando números)
      const mongoProducts = await db.collection('m_product_typesense')
        .find({ 
          isactive: true,
          productid: { $in: batchSkusNum }
        })
        .toArray()
      
      await this.processBatch(mongoProducts)
      
      processed += batchSize
      
      // Log de progresso
      const progress = Math.round((this.stats.processed / this.stats.total) * 100)
      console.log(`   ✅ Progresso: ${this.stats.processed}/${this.stats.total} (${progress}%)`)
    }
    
    console.log('\n🎉 Processamento concluído!')
    this.printFinalStats()
  }

  async processBatch(products) {
    for (const mongoProduct of products) {
      try {
        await this.processProduct(mongoProduct)
        this.stats.processed++
      } catch (error) {
        this.stats.errors++
        console.error(`❌ Erro ao processar SKU ${mongoProduct.productid}:`, error.message)
      }
    }
  }

  async processProduct(mongoProduct) {
    const sku = mongoProduct.productid
    
    // Preparar dados para atualizar
    const updates = []
    const values = []
    let paramCount = 0
    
    // 1. CATEGORY_ID
    const categoryId = this.findCategoryId(mongoProduct.categories)
    if (categoryId) {
      updates.push(`category_id = $${++paramCount}`)
      values.push(categoryId)
      this.stats.categoryUpdated++
    }
    
    // 2. ORIGINAL_PRICE
    if (mongoProduct.promotionalprice && mongoProduct.promotionalprice > 0) {
      updates.push(`original_price = $${++paramCount}`)
      values.push(parseFloat(mongoProduct.promotionalprice))
      this.stats.originalPriceUpdated++
    }
    
    // 3. COST
    if (mongoProduct.costprice && mongoProduct.costprice > 0) {
      updates.push(`cost = $${++paramCount}`)
      values.push(parseFloat(mongoProduct.costprice))
      this.stats.costUpdated++
    }
    
    // Executar update se há mudanças
    if (updates.length > 0) {
      const query = `
        UPDATE products 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE sku = $${++paramCount}
      `
      values.push(sku)
      
      await this.connector.queryNeon(query, values)
    }
  }

  findCategoryId(categories) {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return null
    }
    
    // MongoDB categorias são objetos: {id, name, googleCategory}
    for (let i = categories.length - 1; i >= 0; i--) {
      const category = categories[i]
      
      // Verificar se é objeto com propriedade name
      if (typeof category === 'object' && category.name) {
        const categoryId = this.categoryMap.get(category.name.toLowerCase().trim())
        if (categoryId) {
          return categoryId
        }
      }
      // Fallback para string (caso ainda existam)
      else if (typeof category === 'string') {
        const categoryId = this.categoryMap.get(category.toLowerCase().trim())
        if (categoryId) {
          return categoryId
        }
      }
    }
    
    return null
  }

  printFinalStats() {
    console.log('\n📊 ESTATÍSTICAS FINAIS:')
    console.log('='.repeat(50))
    console.log(`📦 Total processado: ${this.stats.processed}/${this.stats.total}`)
    console.log(`🏷️  Category ID atualizado: ${this.stats.categoryUpdated}`)
    console.log(`💰 Original Price atualizado: ${this.stats.originalPriceUpdated}`)
    console.log(`💸 Cost atualizado: ${this.stats.costUpdated}`)
    console.log(`❌ Erros: ${this.stats.errors}`)
    
    console.log('\n📈 PERCENTUAIS:')
    console.log(`   Category ID: ${Math.round((this.stats.categoryUpdated/this.stats.processed)*100)}%`)
    console.log(`   Original Price: ${Math.round((this.stats.originalPriceUpdated/this.stats.processed)*100)}%`)
    console.log(`   Cost: ${Math.round((this.stats.costUpdated/this.stats.processed)*100)}%`)
  }

  async run() {
    try {
      await this.init()
      await this.processProducts()
    } catch (error) {
      console.error('❌ Erro fatal:', error.message)
    } finally {
      await this.connector.disconnect()
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const etapa1 = new Etapa1ImportacaoBasica()
  await etapa1.run()
}

export default Etapa1ImportacaoBasica 