#!/usr/bin/env node

import { MongoClient } from 'mongodb'

const MONGODB_URI = "mongodb+srv://gdg:FbiI3dOKYLGebzrb@vitrine.9ssm3.mongodb.net/graodegente"
const DATABASE = "graodegente"

async function exploreVitrineDB() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    console.log('🔌 Conectando ao MongoDB VITRINE...')
    await client.connect()
    const db = client.db(DATABASE)
    
    console.log('📊 EXPLORANDO BANCO DE DADOS VITRINE\n')
    
    // Listar todas as coleções
    console.log('📂 COLEÇÕES DISPONÍVEIS:')
    const collections = await db.listCollections().toArray()
    collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. ${collection.name}`)
    })
    
    // Analisar cada coleção
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name
      const collection = db.collection(collectionName)
      
      console.log(`\n==================== COLEÇÃO: ${collectionName} ====================`)
      
      // Contar documentos
      const count = await collection.countDocuments()
      console.log(`📊 Total de documentos: ${count}`)
      
      if (count > 0) {
        // Pegar um documento de exemplo
        const sample = await collection.findOne()
        console.log(`🔍 Estrutura (campos disponíveis):`)
        const fields = Object.keys(sample)
        fields.forEach(field => {
          const value = sample[field]
          let type = typeof value
          if (Array.isArray(value)) type = `array[${value.length}]`
          if (value === null) type = 'null'
          console.log(`   • ${field}: ${type}`)
        })
        
        // Se for a coleção m_product, mostrar mais detalhes
        if (collectionName === 'm_product') {
          console.log(`\n📦 DETALHES DOS PRODUTOS:`)
          
          // Contar produtos com fotos
          const withPhotos = await collection.countDocuments({ 
            photos: { $exists: true, $ne: [], $not: { $size: 0 } } 
          })
          console.log(`   📸 Com fotos: ${withPhotos}/${count} (${Math.round(withPhotos/count*100)}%)`)
          
          // Contar produtos com descrições
          const withDescriptions = await collection.countDocuments({ 
            descriptions: { $exists: true, $ne: [], $not: { $size: 0 } } 
          })
          console.log(`   📝 Com descrições: ${withDescriptions}/${count} (${Math.round(withDescriptions/count*100)}%)`)
          
          // Contar produtos ativos
          const active = await collection.countDocuments({ activeForSeo: true })
          console.log(`   ✅ Ativos: ${active}/${count} (${Math.round(active/count*100)}%)`)
          
          // Verificar produtos com fotos e URLs válidas
          const productsWithValidPhotos = await collection.find({ 
            photos: { $exists: true, $ne: [] },
            $or: [
              { "photos.cdnUrl": { $exists: true, $ne: null, $ne: "" } },
              { "photos.url": { $exists: true, $ne: null, $ne: "" } }
            ]
          }).limit(5).toArray()
          
          console.log(`\n📸 PRODUTOS COM FOTOS VÁLIDAS (primeiros 5):`)
          productsWithValidPhotos.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.complementCompanyId || 'Sem nome'}`)
            if (product.photos && product.photos.length > 0) {
              const photo = product.photos[0]
              const url = photo.cdnUrl || photo.url || 'SEM URL'
              console.log(`      📷 Foto: ${url.substring(0, 80)}${url.length > 80 ? '...' : ''}`)
            }
          })
          
          // Categorias mais comuns
          console.log(`\n📂 CATEGORIAS MAIS COMUNS:`)
          const categoryStats = await collection.aggregate([
            { $unwind: "$categories" },
            { $group: { _id: "$categories.name", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]).toArray()
          
          categoryStats.forEach((cat, index) => {
            console.log(`   ${index + 1}. ${cat._id}: ${cat.count} produtos`)
          })
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await client.close()
  }
}

exploreVitrineDB().catch(console.error) 