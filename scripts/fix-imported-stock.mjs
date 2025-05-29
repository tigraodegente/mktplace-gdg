#!/usr/bin/env node

import 'dotenv/config'
import { MongoClient } from 'mongodb'
import pg from 'pg'

const { Pool } = pg

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function fixImportedStock() {
  const mongoClient = new MongoClient(process.env.MONGODB_URI)
  
  try {
    console.log('🔧 Corrigindo estoque dos produtos importados...\n')
    
    // Conectar aos bancos
    await mongoClient.connect()
    const db = mongoClient.db('graodegente')
    const collection = db.collection('m_product')
    
    // Buscar produtos importados no Neon
    const neonProducts = await neonPool.query(`
      SELECT id, sku, name, quantity
      FROM products 
      WHERE tags::text LIKE '%importado-mongodb%'
    `)
    
    console.log(`📦 ${neonProducts.rows.length} produtos importados encontrados\n`)
    
    let fixed = 0
    let notFound = 0
    
    for (const neonProduct of neonProducts.rows) {
      try {
        // Buscar produto original no MongoDB pelo SKU (productId)
        const mongoProduct = await collection.findOne({
          productId: parseInt(neonProduct.sku)
        })
        
        if (!mongoProduct) {
          console.log(`⚠️ ${neonProduct.name}: produto não encontrado no MongoDB`)
          notFound++
          continue
        }
        
        // Determinar estoque correto
        let correctStock = 0
        
        if (mongoProduct.stock && mongoProduct.stock > 0) {
          correctStock = mongoProduct.stock
        } else if (mongoProduct.realStock && mongoProduct.realStock > 0) {
          correctStock = mongoProduct.realStock
        } else if (mongoProduct.virtualStock && mongoProduct.virtualStock > 0) {
          correctStock = mongoProduct.virtualStock
        } else {
          // Estoque padrão para produtos ativos
          correctStock = mongoProduct.activeForSeo ? 10 : 0
        }
        
        // Atualizar no Neon se necessário
        if (correctStock !== neonProduct.quantity) {
          await neonPool.query(`
            UPDATE products 
            SET quantity = $1, updated_at = NOW()
            WHERE id = $2
          `, [correctStock, neonProduct.id])
          
          console.log(`✅ ${neonProduct.name}: ${neonProduct.quantity} → ${correctStock}`)
          fixed++
        } else {
          console.log(`➡️ ${neonProduct.name}: mantido em ${correctStock}`)
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${neonProduct.name}:`, error.message)
      }
    }
    
    console.log(`\n📊 Resumo:`)
    console.log(`   ✅ Corrigidos: ${fixed}`)
    console.log(`   ➡️ Mantidos: ${neonProducts.rows.length - fixed - notFound}`)
    console.log(`   ⚠️ Não encontrados: ${notFound}`)
    
    if (fixed > 0) {
      console.log(`\n🎉 ${fixed} produtos agora têm estoque correto!`)
      console.log(`📱 Teste novamente: http://localhost:5173/produto/saia-de-cama-infantil-amiguinhos-verde`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await mongoClient.close()
    await neonPool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fixImportedStock()
} 