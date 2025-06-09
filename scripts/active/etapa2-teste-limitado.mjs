#!/usr/bin/env node
import { DatabaseConnector } from '../sync/utils/db-connector.mjs'

class Etapa2TesteLimitado {
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
    console.log('🔄 ETAPA 2 - SISTEMA DE VARIAÇÕES (TESTE LIMITADO)')
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
    console.log('\n🔄 Processando grupos de variação (LIMITADO)...')
    
    const db = this.connector.getMongoDb()
    
    // Buscar apenas 5 grupos pequenos para teste
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
          count: { $gte: 2, $lte: 5 }, // Grupos pequenos/médios
          _id: { $ne: null }
        }
      },
      { $limit: 5 } // APENAS 5 GRUPOS PARA TESTE
    ]).toArray()
    
    console.log(`📊 Grupos para teste: ${grupos.length}`)
    
    // Processar cada grupo
    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i]
      
      console.log(`\n📦 Grupo ${i+1}/${grupos.length} - ParentID ${grupo._id}:`)
      
      try {
        await this.processGroup(grupo)
        this.stats.gruposAnalisados++
        console.log(`   ✅ Processado com sucesso`)
      } catch (error) {
        this.stats.erros++
        console.error(`   ❌ Erro: ${error.message}`)
      }
    }
  }

  async processGroup(grupo) {
    const parentID = grupo._id
    const produtos = grupo.produtos
    
    console.log(`   📋 ${produtos.length} produtos no grupo`)
    
    // Verificar se produtos existem no Neon
    const skus = produtos.map(p => p.productid.toString())
    const existingProducts = await this.connector.queryNeon(`
      SELECT id, sku, name FROM products 
      WHERE sku = ANY($1)
    `, [skus])
    
    if (existingProducts.rows.length === 0) {
      console.log(`   ⚠️  Nenhum produto encontrado no Neon`)
      return
    }
    
    console.log(`   📦 ${existingProducts.rows.length}/${skus.length} produtos encontrados no Neon`)
    
    // Escolher produto principal (menor SKU)
    const sortedProducts = existingProducts.rows.sort((a, b) => 
      parseInt(a.sku) - parseInt(b.sku)
    )
    const mainProduct = sortedProducts[0]
    const variants = sortedProducts.slice(1)
    
    console.log(`   🎯 Principal: ${mainProduct.sku}`)
    console.log(`   🔄 Variações: ${variants.map(v => v.sku).join(', ')}`)
    
    // Processar cada variação
    for (const variant of variants) {
      await this.createVariant(mainProduct, variant, produtos)
    }
    
    this.stats.produtosPrincipaisCriados++
    this.stats.variacoesCriadas += variants.length
  }

  async createVariant(mainProduct, variantProduct, mongoData) {
    try {
      console.log(`     📝 Criando variação ${variantProduct.sku}...`)
      
      // Encontrar dados do MongoDB para esta variação
      const variantMongo = mongoData.find(p => p.productid.toString() === variantProduct.sku)
      if (!variantMongo) {
        console.log(`     ⚠️  Dados MongoDB não encontrados`)
        return
      }
      
      // Extrair cor
      const cor = this.extractColor(variantMongo.corHexadecimal)
      console.log(`     🎨 Cor: ${cor || 'N/A'}`)
      
      // Criar variant (evitar duplicatas)
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
        ON CONFLICT (sku) DO UPDATE SET
          product_id = EXCLUDED.product_id,
          price = EXCLUDED.price,
          quantity = EXCLUDED.quantity,
          updated_at = NOW()
        RETURNING id
      `, [
        mainProduct.id,
        variantProduct.sku,
        variantMongo.price || 0,
        variantProduct.id
      ])
      
      const variantId = variantResult.rows[0].id
      console.log(`     ✅ Variant ID: ${variantId}`)
      
      // Criar ou buscar valor da opção de cor
      if (cor) {
        const colorValueId = await this.ensureColorValue(cor)
        
        // Associar variação com valor da cor
        await this.connector.queryNeon(`
          INSERT INTO variant_option_values (variant_id, option_id, option_value_id, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (variant_id, option_value_id) DO UPDATE SET
            option_id = EXCLUDED.option_id,
            created_at = NOW()
        `, [variantId, this.colorOption, colorValueId])
        
        console.log(`     🔗 Cor associada: ${cor}`)
      }
      
      // Marcar produto original como variação (is_variant = true)
      await this.connector.queryNeon(`
        UPDATE products 
        SET is_variant = true, updated_at = NOW()
        WHERE id = $1
      `, [variantProduct.id])
      
      console.log(`     🏷️  Produto marcado como variação`)
      
    } catch (error) {
      console.error(`     ❌ Erro: ${error.message}`)
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
      
      console.log('\n🎉 Teste limitado concluído!')
      this.printFinalStats()
      
      // Verificar resultado final
      console.log('\n📊 VERIFICAÇÃO FINAL:')
      
             const finalStats = await this.connector.queryNeon(`
         SELECT 
           (SELECT COUNT(*) FROM products WHERE is_variant = false OR is_variant IS NULL) as main_products,
           (SELECT COUNT(*) FROM products WHERE is_variant = true) as variant_products,
           (SELECT COUNT(*) FROM product_variants) as total_variants,
           (SELECT COUNT(*) FROM product_option_values) as total_color_values
       `)
      
      const stats = finalStats.rows[0]
      console.log(`📦 Produtos principais: ${stats.main_products}`)
      console.log(`🔄 Produtos marcados como variação: ${stats.variant_products}`)
      console.log(`📊 Total de variações: ${stats.total_variants}`)
      console.log(`🎨 Valores de cor: ${stats.total_color_values}`)
      
    } catch (error) {
      console.error('❌ Erro fatal:', error.message)
      console.error(error.stack)
    } finally {
      await this.connector.disconnect()
    }
  }
}

// Executar
const teste = new Etapa2TesteLimitado()
await teste.run() 