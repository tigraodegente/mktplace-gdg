#!/usr/bin/env node
import { DatabaseConnector } from '../sync/utils/db-connector.mjs'

class Etapa2SistemaVariacoes {
  constructor() {
    this.connector = new DatabaseConnector({ forceConnection: true })
    this.stats = {
      gruposAnalisados: 0,
      produtosPrincipaisCriados: 0,
      variacoesCriadas: 0,
      opcoesCriadas: 0,
      valoresOpcaoCriados: 0,
      erros: 0
    }
    this.colorOption = null
  }

  async init() {
    console.log('🔄 ETAPA 2 - SISTEMA DE VARIAÇÕES')
    console.log('='.repeat(60))
    
    await this.connector.connectMongo()
    await this.connector.connectNeon()
    
    // Criar opção "Cor" se não existir
    await this.ensureColorOption()
  }

  async ensureColorOption() {
    console.log('\n🎨 Verificando opção "Cor"...')
    
    // Verificar se opção Cor já existe
    const existingOption = await this.connector.queryNeon(`
      SELECT id FROM product_options WHERE name = 'Cor'
    `)
    
    if (existingOption.rows.length > 0) {
      this.colorOption = existingOption.rows[0].id
      console.log(`✅ Opção "Cor" já existe: ${this.colorOption}`)
    } else {
      // Criar opção Cor
      const newOption = await this.connector.queryNeon(`
        INSERT INTO product_options (name, display_name, type, created_at, updated_at)
        VALUES ('Cor', 'Cor', 'select', NOW(), NOW())
        RETURNING id
      `)
      
      this.colorOption = newOption.rows[0].id
      this.stats.opcoesCriadas++
      console.log(`✅ Opção "Cor" criada: ${this.colorOption}`)
    }
  }

  async processVariationGroups() {
    console.log('\n🔄 Processando grupos de variação...')
    
    const db = this.connector.getMongoDb()
    
    // Buscar grupos válidos (2+ produtos, parentID não-null)
    const grupos = await db.collection('m_product_typesense').aggregate([
      { 
        $match: { 
          isactive: true, 
          parentID: { $exists: true, $ne: null, $ne: 0 }
        }
      },
      {
        $group: {
          _id: '$parentID',
          produtos: { 
            $push: {
              productid: '$productid',
              productname: '$productname',
              price: '$price',
              costprice: '$costprice',
              promotionalprice: '$promotionalprice',
              corHexadecimal: '$corHexadecimal'
            }
          },
          count: { $sum: 1 }
        }
      },
      { 
        $match: { 
          count: { $gte: 2 }, // Apenas grupos com 2+ produtos
          _id: { $ne: null }   // Excluir parentID null
        }
      },
      { $sort: { count: -1 } }
    ]).toArray()
    
    console.log(`📊 Grupos válidos encontrados: ${grupos.length}`)
    
    // Processar em batches
    const batchSize = 10
    let processed = 0
    
    while (processed < grupos.length) {
      const batch = grupos.slice(processed, processed + batchSize)
      
      console.log(`\n📦 Processando batch ${Math.floor(processed/batchSize) + 1}/${Math.ceil(grupos.length/batchSize)}`)
      console.log(`   Grupos ${processed + 1} a ${Math.min(processed + batchSize, grupos.length)}`)
      
      for (const grupo of batch) {
        try {
          await this.processGroup(grupo)
          this.stats.gruposAnalisados++
        } catch (error) {
          this.stats.erros++
          console.error(`❌ Erro no grupo ${grupo._id}:`, error.message)
        }
      }
      
      processed += batchSize
      
      const progress = Math.round((this.stats.gruposAnalisados / grupos.length) * 100)
      console.log(`   ✅ Progresso: ${this.stats.gruposAnalisados}/${grupos.length} (${progress}%)`)
    }
  }

  async processGroup(grupo) {
    const parentID = grupo._id
    const produtos = grupo.produtos
    
    // Verificar se produtos existem no Neon
    const skus = produtos.map(p => p.productid.toString())
    const existingProducts = await this.connector.queryNeon(`
      SELECT id, sku, name FROM products 
      WHERE sku = ANY($1)
    `, [skus])
    
    if (existingProducts.rows.length === 0) {
      console.log(`   ⚠️  Grupo ${parentID}: nenhum produto encontrado no Neon`)
      return
    }
    
    // Escolher produto principal (menor SKU)
    const sortedProducts = existingProducts.rows.sort((a, b) => 
      parseInt(a.sku) - parseInt(b.sku)
    )
    const mainProduct = sortedProducts[0]
    const variants = sortedProducts.slice(1)
    
    console.log(`   🎯 Grupo ${parentID}: ${mainProduct.sku} principal, ${variants.length} variações`)
    
    // Processar cada variação
    for (const variant of variants) {
      await this.createVariant(mainProduct, variant, produtos)
    }
    
    this.stats.produtosPrincipaisCriados++
    this.stats.variacoesCriadas += variants.length
  }

  async createVariant(mainProduct, variantProduct, mongoData) {
    try {
      // Encontrar dados do MongoDB para esta variação
      const variantMongo = mongoData.find(p => p.productid.toString() === variantProduct.sku)
      if (!variantMongo) return
      
      // Extrair cor
      const cor = this.extractColor(variantMongo.corHexadecimal)
      
      // Criar variant
      const variantResult = await this.connector.queryNeon(`
        INSERT INTO product_variants (
          product_id, 
          sku, 
          price, 
          quantity, 
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, (SELECT quantity FROM products WHERE id = $4), NOW(), NOW())
        RETURNING id
      `, [
        mainProduct.id,
        variantProduct.sku,
        variantMongo.price || 0,
        variantProduct.id
      ])
      
      const variantId = variantResult.rows[0].id
      
      // Criar ou buscar valor da opção de cor
      if (cor) {
        const colorValueId = await this.ensureColorValue(cor)
        
        // Associar variação com valor da cor
        await this.connector.queryNeon(`
          INSERT INTO variant_option_values (variant_id, option_id, option_value_id)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [variantId, this.colorOption, colorValueId])
      }
      
      // Marcar produto original como variação (is_variant = true)
      await this.connector.queryNeon(`
        UPDATE products 
        SET is_variant = true, updated_at = NOW()
        WHERE id = $1
      `, [variantProduct.id])
      
    } catch (error) {
      console.error(`   ❌ Erro criando variação ${variantProduct.sku}:`, error.message)
      throw error
    }
  }

  async ensureColorValue(cor) {
    // Verificar se valor já existe
    const existing = await this.connector.queryNeon(`
      SELECT id FROM product_option_values 
      WHERE option_id = $1 AND value = $2
    `, [this.colorOption, cor])
    
    if (existing.rows.length > 0) {
      return existing.rows[0].id
    }
    
    // Criar novo valor
    const newValue = await this.connector.queryNeon(`
      INSERT INTO product_option_values (option_id, value, display_value, created_at, updated_at)
      VALUES ($1, $2, $2, NOW(), NOW())
      RETURNING id
    `, [this.colorOption, cor])
    
    this.stats.valoresOpcaoCriados++
    return newValue.rows[0].id
  }

  extractColor(corHexadecimal) {
    if (!corHexadecimal || corHexadecimal === 'null') {
      return null
    }
    
    // Formato esperado: "Rosa|#df8aa7"
    const parts = corHexadecimal.split('|')
    return parts.length > 0 ? parts[0].trim() : corHexadecimal.trim()
  }

  printFinalStats() {
    console.log('\n📊 ESTATÍSTICAS FINAIS:')
    console.log('='.repeat(50))
    console.log(`🏷️  Grupos analisados: ${this.stats.gruposAnalisados}`)
    console.log(`📦 Produtos principais: ${this.stats.produtosPrincipaisCriados}`)
    console.log(`🔄 Variações criadas: ${this.stats.variacoesCriadas}`)
    console.log(`⚙️  Opções criadas: ${this.stats.opcoesCriadas}`)
    console.log(`🎨 Valores de cor criados: ${this.stats.valoresOpcaoCriados}`)
    console.log(`❌ Erros: ${this.stats.erros}`)
    
    if (this.stats.gruposAnalisados > 0) {
      const avgVariacoes = Math.round(this.stats.variacoesCriadas / this.stats.gruposAnalisados * 100) / 100
      console.log(`📈 Média de variações por grupo: ${avgVariacoes}`)
    }
  }

  async run() {
    try {
      await this.init()
      await this.processVariationGroups()
      
      console.log('\n🎉 Processamento concluído!')
      this.printFinalStats()
      
    } catch (error) {
      console.error('❌ Erro fatal:', error.message)
      console.error(error.stack)
    } finally {
      await this.connector.disconnect()
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const etapa2 = new Etapa2SistemaVariacoes()
  await etapa2.run()
}

export default Etapa2SistemaVariacoes 