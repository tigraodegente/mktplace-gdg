#!/usr/bin/env node

import 'dotenv/config'
import { Database } from '../apps/store/src/lib/db/database.js'

console.log('🖼️ Atualizando imagens dos produtos...\n')

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')

const db = new Database({
  provider: 'postgres',
  connectionString: dbUrl,
  options: {
    postgres: {
      ssl: isLocal ? false : 'require'
    }
  }
})

async function fixProductImages() {
  try {
    // Buscar todos os produtos
    console.log('📋 Buscando produtos...')
    const products = await db.query`
      SELECT id, name, slug FROM products
    `
    
    console.log(`✅ ${products.length} produtos encontrados\n`)
    
    // Atualizar imagens de cada produto
    for (const product of products) {
      console.log(`🔄 Atualizando imagens de: ${product.name}`)
      
      // Gerar 4 URLs de imagem usando placeholder local
      const imageUrls = [
        `/api/placeholder/800/800?text=${encodeURIComponent(product.name)}&bg=f0f0f0`,
        `/api/placeholder/800/800?text=${encodeURIComponent(product.name)}&bg=e0e0e0`,
        `/api/placeholder/800/800?text=${encodeURIComponent(product.name)}&bg=d0d0d0`,
        `/api/placeholder/800/800?text=${encodeURIComponent(product.name)}&bg=c0c0c0`
      ];
      
      // Atualizar na tabela product_images
      // Primeiro, deletar imagens antigas
      await db.execute`
        DELETE FROM product_images WHERE product_id = ${product.id}
      `
      
      // Inserir novas imagens
      for (let i = 0; i < imageUrls.length; i++) {
        await db.execute`
          INSERT INTO product_images (product_id, url, alt_text, position, is_primary)
          VALUES (${product.id}, ${imageUrls[i]}, ${product.name}, ${i}, ${i === 0})
        `
      }
    }
    
    console.log('\n✅ Todas as imagens foram atualizadas!')
    
  } catch (error) {
    console.error('❌ Erro ao atualizar imagens:', error)
    throw error
  } finally {
    await db.close()
  }
}

fixProductImages().catch(console.error) 