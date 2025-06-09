#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import { DataMapper } from './sync/utils/data-mapper.mjs'
import { Logger } from './sync/utils/logger.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function importTestProducts() {
  const logger = new Logger('import-test')
  const mapper = new DataMapper({ defaultStock: 10 })
  const connector = new DatabaseConnector({ forceConnection: true })
  
  const stats = {
    imported: 0,
    errors: 0,
    errorDetails: []
  }
  
  try {
    console.log('🎯 IMPORTANDO 10 PRODUTOS DE TESTE COM CRITÉRIOS CORRETOS\n')
    console.log('✅ Data de criação: HOJE (' + new Date().toLocaleDateString('pt-BR') + ')')
    console.log('✅ Excluindo produtos ocultos conforme regra definida')
    console.log('✅ Conversão automática URLs OVH → AWS\n')
    
    // Conectar aos bancos
    await logger.info('🔌 Conectando aos bancos de dados...')
    await connector.connectMongo()
    await connector.connectNeon()
    
    // Verificar saúde das conexões
    const health = await connector.healthCheck()
    if (!health.mongo || !health.neon) {
      throw new Error('Falha na verificação de saúde das conexões')
    }
    
    // Obter coleção de produtos
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // Filtro para produtos vendáveis (critérios corretos)
    const sellableFilter = {
      $and: [
        // Deve estar ativo
        { isactive: true },
        
        // Deve ter estoque
        {
          $or: [
            { realstock: { $gt: 0 } },
            { virtualstock: { $gt: 0 } }
          ]
        },
        
        // Deve ter preço
        { price: { $gt: 0 } },
        
        // Deve ter nome
        { productname: { $exists: true, $ne: '' } },
        
        // NÃO deve estar oculto ou não-vendável
        { hideinlist: { $ne: true } },
        { hideinsearch: { $ne: true } },
        { notSalable: { $ne: true } }
      ]
    }
    
    console.log('🔍 Buscando 10 produtos vendáveis do MongoDB...')
    
    // Buscar 10 produtos que atendem aos critérios
    const products = await collection
      .find(sellableFilter)
      .limit(10)
      .toArray()
    
    console.log(`✅ Encontrados ${products.length} produtos para importar\n`)
    
    // Verificar se já existem produtos com os mesmos SKUs
    console.log('🔍 Verificando produtos existentes...')
    const existingSkus = await connector.queryNeon(`
      SELECT sku FROM products 
      WHERE sku = ANY($1)
    `, [products.map(p => p.productid?.toString())])
    
    const existingSkuSet = new Set(existingSkus.rows.map(row => row.sku))
    console.log(`📊 ${existingSkuSet.size} produtos já existem no banco\n`)
    
    // Importar cada produto
    for (let i = 0; i < products.length; i++) {
      const mongoProduct = products[i]
      const sku = mongoProduct.productid?.toString()
      
      try {
        console.log(`📦 [${i + 1}/10] Processando: ${mongoProduct.productname} (SKU: ${sku})`)
        
        // Verificar se já existe
        if (existingSkuSet.has(sku)) {
          console.log(`   ⏭️  Produto já existe, pulando...\n`)
          stats.imported++ // Contar como processado
          continue
        }
        
        console.log(`   📥 Importando produto novo...`)
        
        // Mapear produto
        const neonProduct = mapper.mapProduct(mongoProduct)
        
        console.log(`   💰 Preço: R$ ${neonProduct.price}`)
        console.log(`   📦 Estoque: ${neonProduct.quantity}`)
        console.log(`   🖼️  Imagens: ${neonProduct.images.length}`)
        
        // Mostrar URLs de imagem (primeira para debug)
        if (neonProduct.images.length > 0) {
          const firstImage = neonProduct.images[0]
          console.log(`   🔗 URL imagem: ${firstImage.url.substring(0, 70)}...`)
        }
        
        // Criar produto no Neon com data de HOJE
        const result = await connector.queryNeon(`
          INSERT INTO products (
            sku, barcode, name, slug, description, short_description,
            price, original_price, cost,
            quantity, track_inventory, allow_backorder,
            weight, width, height, length,
            is_active, featured,
            meta_title, meta_description, meta_keywords,
            category_id, brand, 
            tags, attributes,
            created_at, updated_at, status, currency, view_count, sales_count, rating_count
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9,
            $10, $11, $12,
            $13, $14, $15, $16,
            $17, $18,
            $19, $20, $21,
            $22, $23,
            $24, $25,
            NOW(), NOW(), 'published', 'BRL', 0, 0, 0
          ) RETURNING id
        `, [
          neonProduct.sku, 
          neonProduct.barcode, 
          neonProduct.name, 
          neonProduct.slug, 
          neonProduct.description, 
          neonProduct.short_description,
          neonProduct.price, 
          neonProduct.compare_at_price, 
          neonProduct.cost,
          neonProduct.quantity, 
          neonProduct.track_inventory, 
          neonProduct.allow_backorder,
          neonProduct.weight, 
          neonProduct.width, 
          neonProduct.height, 
          neonProduct.length,
          neonProduct.is_active, 
          neonProduct.is_featured,
          neonProduct.meta_title, 
          neonProduct.meta_description, 
          neonProduct.meta_keywords || [],
          neonProduct.category_id, 
          neonProduct.brand,
          neonProduct.tags || [], 
          JSON.stringify(neonProduct.metadata)
        ])
        
        const productId = result.rows[0].id
        
        // Inserir imagens
        for (let imgIndex = 0; imgIndex < neonProduct.images.length; imgIndex++) {
          const img = neonProduct.images[imgIndex]
          await connector.queryNeon(`
            INSERT INTO product_images (
              product_id, url, alt_text, position, is_primary, created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
          `, [
            productId, 
            img.url, 
            img.alt || 'Imagem do produto', 
            imgIndex, 
            img.is_primary || false
          ])
        }
        
        stats.imported++
        console.log(`   ✅ Importado com sucesso! (ID Neon: ${productId})\n`)
        
      } catch (error) {
        stats.errors++
        stats.errorDetails.push({
          product: mongoProduct.productname,
          sku: mongoProduct.productid,
          error: error.message
        })
        console.log(`   ❌ Erro: ${error.message}\n`)
        
        // Continuar com próximo produto
        continue
      }
    }
    
    // Verificar resultados
    console.log('📊 VERIFICANDO PRODUTOS IMPORTADOS:\n')
    
    const importedProducts = await connector.queryNeon(`
      SELECT 
        p.id, p.sku, p.name, p.price, p.quantity, p.created_at,
        COUNT(pi.id) as image_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id, p.sku, p.name, p.price, p.quantity, p.created_at
      ORDER BY p.created_at DESC
    `)
    
    importedProducts.rows.forEach((product, i) => {
      console.log(`${i + 1}. ${product.name} (SKU: ${product.sku})`)
      console.log(`   💰 R$ ${product.price} | 📦 ${product.quantity} unidades | 🖼️ ${product.image_count} imagens`)
      console.log(`   📅 Criado: ${new Date(product.created_at).toLocaleString('pt-BR')}`)
      console.log('')
    })
    
    // Resumo final
    console.log('🎯 RESUMO DA IMPORTAÇÃO:')
    console.log(`   ✅ Produtos importados: ${stats.imported}`)
    console.log(`   ❌ Erros: ${stats.errors}`)
    console.log(`   📅 Data de criação: HOJE (${new Date().toLocaleDateString('pt-BR')})`)
    
    if (stats.errors > 0) {
      console.log('\n❌ DETALHES DOS ERROS:')
      stats.errorDetails.forEach(err => {
        console.log(`   - [${err.sku}] ${err.product}: ${err.error}`)
      })
    }
    
    console.log('\n✅ IMPORTAÇÃO DE TESTE CONCLUÍDA!')
    
  } catch (error) {
    console.error('❌ Erro na importação:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
importTestProducts()
  .then(() => {
    console.log('\n🚀 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Script falhou:', error)
    process.exit(1)
  }) 