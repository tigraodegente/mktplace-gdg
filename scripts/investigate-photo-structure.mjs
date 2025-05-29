#!/usr/bin/env node

import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = "mongodb+srv://gdg:FbiI3dOKYLGebzrb@vitrine.9ssm3.mongodb.net/graodegente"
const DATABASE = "graodegente"

// ID de um dos nossos produtos para examinar
const productId = "65306f5c24a6b1d4adce57c2" // Berço + Kit (tem 8 fotos)

async function investigatePhotoStructure() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    console.log('🔌 Conectando ao MongoDB VITRINE...')
    await client.connect()
    const db = client.db(DATABASE)
    const collection = db.collection('m_product')
    
    console.log('🔍 INVESTIGANDO ESTRUTURA DAS FOTOS\n')
    
    // Buscar o produto específico
    const product = await collection.findOne({ _id: new ObjectId(productId) })
    
    if (product && product.photos && product.photos.length > 0) {
      console.log(`📦 Produto: ${product.complementCompanyId}`)
      console.log(`📸 Total de fotos: ${product.photos.length}\n`)
      
      // Examinar cada foto em detalhes
      product.photos.forEach((photo, index) => {
        console.log(`==================== FOTO ${index + 1} ====================`)
        console.log(`📷 Nome: ${photo.name || 'Sem nome'}`)
        console.log(`🔘 É principal: ${photo.isPrimary || false}`)
        
        if (photo.file) {
          console.log(`📁 Estrutura do campo 'file':`)
          console.log(`   Tipo: ${typeof photo.file}`)
          console.log(`   Campos: ${Object.keys(photo.file).join(', ')}`)
          
          // Mostrar todos os campos do file em detalhes
          Object.keys(photo.file).forEach(key => {
            const value = photo.file[key]
            let displayValue = value
            
            if (typeof value === 'string' && value.length > 100) {
              displayValue = value.substring(0, 100) + '...'
            } else if (typeof value === 'object' && value !== null) {
              displayValue = `{${Object.keys(value).join(', ')}}`
            }
            
            console.log(`   • ${key}: ${typeof value} = ${displayValue}`)
          })
          
          // Se tiver campos que parecem URLs, mostrar
          const potentialUrls = []
          Object.keys(photo.file).forEach(key => {
            const value = photo.file[key]
            if (typeof value === 'string' && (
              value.includes('http') || 
              value.includes('firebase') ||
              value.includes('storage') ||
              value.includes('cdn') ||
              value.includes('.jpg') ||
              value.includes('.png') ||
              value.includes('.webp')
            )) {
              potentialUrls.push(`${key}: ${value}`)
            }
          })
          
          if (potentialUrls.length > 0) {
            console.log(`   🔗 URLs potenciais encontradas:`)
            potentialUrls.forEach(url => console.log(`      ${url}`))
          }
        } else {
          console.log(`❌ Campo 'file' não encontrado`)
        }
        
        console.log('') // linha em branco
      })
      
      // Verificar se há outros padrões de URL nas fotos
      console.log(`🔍 PROCURANDO OUTROS PADRÕES DE URL...`)
      
      // Buscar em todo o documento por campos que podem ter URLs
      const searchForUrls = (obj, path = '') => {
        const urls = []
        
        if (typeof obj === 'string') {
          if (obj.includes('http') || obj.includes('firebase') || obj.includes('storage')) {
            urls.push(`${path}: ${obj}`)
          }
        } else if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => {
            const newPath = path ? `${path}.${key}` : key
            urls.push(...searchForUrls(obj[key], newPath))
          })
        }
        
        return urls
      }
      
      const allUrls = searchForUrls(product)
      if (allUrls.length > 0) {
        console.log(`✅ URLs encontradas no produto:`)
        allUrls.forEach(url => console.log(`   ${url}`))
      } else {
        console.log(`❌ Nenhuma URL encontrada em todo o documento`)
      }
      
    } else {
      console.log('❌ Produto não encontrado ou sem fotos')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await client.close()
  }
}

investigatePhotoStructure().catch(console.error) 