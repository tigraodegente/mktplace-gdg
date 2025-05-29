#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = "mongodb+srv://gdg:FbiI3dOKYLGebzrb@vitrine.9ssm3.mongodb.net/graodegente"
const DATABASE = "graodegente"

// IDs dos produtos que importamos
const importedProductIds = [
  "65306f5524a6b1d4adce5239", // Cru e Laranja
  "65306f5b24a6b1d4adce56c3", // Menino Astronauta - 04
  "65306f5c24a6b1d4adce57c2", // Berço + Kit Berço 9 Peças + Colchão e Protetor
  "65306f5c24a6b1d4adce58d7", // Amiguinhas - Meia Manga - G
  "65306f5e24a6b1d4adce5bb2"  // Amiguinhos Infantil Verde
]

async function checkVitrinePhotos() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    console.log('🔌 Conectando ao MongoDB VITRINE...')
    await client.connect()
    const db = client.db(DATABASE)
    const collection = db.collection('m_product')
    
    console.log('📸 VERIFICANDO FOTOS NO MONGODB VITRINE\n')
    
    // Estatísticas gerais
    const totalProducts = await collection.countDocuments()
    const withPhotos = await collection.countDocuments({ 
      photos: { $exists: true, $ne: [], $not: { $size: 0 } } 
    })
    
    console.log(`📊 ESTATÍSTICAS GERAIS:`)
    console.log(`   Total de produtos: ${totalProducts}`)
    console.log(`   Com fotos: ${withPhotos} (${Math.round(withPhotos/totalProducts*100)}%)`)
    
    // Verificar produtos com URLs válidas
    const withValidUrls = await collection.countDocuments({
      $or: [
        { "photos.cdnUrl": { $exists: true, $ne: null, $ne: "" } },
        { "photos.url": { $exists: true, $ne: null, $ne: "" } },
        { "photos.uploadcareUrl": { $exists: true, $ne: null, $ne: "" } }
      ]
    })
    
    console.log(`   Com URLs válidas: ${withValidUrls} (${Math.round(withValidUrls/totalProducts*100)}%)`)
    
    // Verificar nossos produtos específicos
    console.log(`\n🔍 NOSSOS 5 PRODUTOS IMPORTADOS:`)
    
    for (let i = 0; i < importedProductIds.length; i++) {
      const productId = importedProductIds[i]
      const product = await collection.findOne({ _id: new ObjectId(productId) })
      
      if (product) {
        console.log(`\n${i + 1}. ${product.complementCompanyId}`)
        
        if (product.photos && product.photos.length > 0) {
          console.log(`   📸 ${product.photos.length} fotos encontradas:`)
          
          product.photos.forEach((photo, photoIndex) => {
            const urls = []
            if (photo.cdnUrl) urls.push(`CDN: ${photo.cdnUrl}`)
            if (photo.url) urls.push(`URL: ${photo.url}`)
            if (photo.uploadcareUrl) urls.push(`Uploadcare: ${photo.uploadcareUrl}`)
            if (photo.firebaseUrl) urls.push(`Firebase: ${photo.firebaseUrl}`)
            
            if (urls.length > 0) {
              console.log(`      ${photoIndex + 1}. ${urls.join(' | ')}`)
            } else {
              console.log(`      ${photoIndex + 1}. ❌ SEM URL VÁLIDA`)
              console.log(`         Campos: ${Object.keys(photo).join(', ')}`)
            }
          })
        } else {
          console.log(`   ❌ Nenhuma foto encontrada`)
        }
      }
    }
    
    // Encontrar alguns produtos com fotos válidas como exemplo
    console.log(`\n✅ EXEMPLOS DE PRODUTOS COM FOTOS VÁLIDAS:`)
    const validPhotoProducts = await collection.find({
      $or: [
        { "photos.cdnUrl": { $regex: "^https?://" } },
        { "photos.url": { $regex: "^https?://" } },
        { "photos.uploadcareUrl": { $regex: "^https?://" } }
      ]
    }).limit(3).toArray()
    
    validPhotoProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.complementCompanyId}`)
      const photo = product.photos[0]
      const validUrl = photo.cdnUrl || photo.url || photo.uploadcareUrl
      console.log(`   📷 ${validUrl}`)
    })
    
    // Verificar estrutura das fotos
    console.log(`\n🔧 ESTRUTURA TÍPICA DAS FOTOS:`)
    const sampleProduct = await collection.findOne({ 
      photos: { $exists: true, $ne: [] } 
    })
    
    if (sampleProduct && sampleProduct.photos && sampleProduct.photos.length > 0) {
      const samplePhoto = sampleProduct.photos[0]
      console.log(`   Campos disponíveis: ${Object.keys(samplePhoto).join(', ')}`)
      
      Object.keys(samplePhoto).forEach(key => {
        const value = samplePhoto[key]
        console.log(`   • ${key}: ${typeof value} ${Array.isArray(value) ? `[${value.length}]` : ''}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await client.close()
  }
}

checkVitrinePhotos().catch(console.error) 