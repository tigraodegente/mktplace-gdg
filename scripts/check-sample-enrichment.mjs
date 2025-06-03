#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkSampleEnrichment() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 VERIFICAÇÃO COMPLETA DO ENRIQUECIMENTO DA AMOSTRA\n')
    console.log('=' .repeat(70) + '\n')
    
    // 1. Verificar produtos enriquecidos recentemente
    console.log('📦 PRODUTOS RECENTEMENTE ENRIQUECIDOS:\n')
    const enrichedProducts = await connector.queryNeon(`
      SELECT 
        p.id,
        p.name,
        p.meta_title,
        p.meta_description,
        p.short_description,
        p.tags,
        p.specifications,
        p.rating_average,
        p.rating_count,
        p.updated_at
      FROM products p
      WHERE p.meta_title IS NOT NULL
        AND p.updated_at > NOW() - INTERVAL '10 minutes'
      ORDER BY p.updated_at DESC
      LIMIT 5
    `)
    
    enrichedProducts.rows.forEach((product, i) => {
      console.log(`${i + 1}. ${product.name}`)
      console.log(`   📝 Title: "${product.meta_title}"`)
      console.log(`   📝 Description: "${product.meta_description?.substring(0, 80)}..."`)
      console.log(`   📝 Short: "${product.short_description?.substring(0, 60)}..."`)
      console.log(`   🏷️  Tags: ${product.tags ? product.tags.join(', ') : 'N/A'}`)
      console.log(`   🔧 Specs: ${product.specifications ? 'SIM' : 'NÃO'}`)
      console.log(`   ⭐ Rating: ${product.rating_average || 'N/A'} (${product.rating_count || 0} reviews)`)
      console.log(`   🕐 Atualizado: ${new Date(product.updated_at).toLocaleString('pt-BR')}\n`)
    })
    
    if (enrichedProducts.rows.length > 0) {
      const sampleProduct = enrichedProducts.rows[0]
      
      // 2. Verificar variantes do primeiro produto
      console.log(`🎨 VARIANTES DE "${sampleProduct.name}":\n`)
      const variants = await connector.queryNeon(`
        SELECT sku, price, quantity, is_active
        FROM product_variants
        WHERE product_id = $1
        ORDER BY created_at DESC
      `, [sampleProduct.id])
      
      if (variants.rows.length > 0) {
        variants.rows.forEach((variant, i) => {
          console.log(`   ${i + 1}. SKU: ${variant.sku}`)
          console.log(`      Preço: R$ ${variant.price}`)
          console.log(`      Estoque: ${variant.quantity}`)
          console.log(`      Ativo: ${variant.is_active ? 'SIM' : 'NÃO'}`)
        })
        console.log('')
      } else {
        console.log('   ❌ Nenhuma variante encontrada\n')
      }
      
      // 3. Verificar reviews do primeiro produto
      console.log(`⭐ REVIEWS DE "${sampleProduct.name}":\n`)
      const reviews = await connector.queryNeon(`
        SELECT u.name as reviewer_name, r.rating, r.title, r.comment, r.is_verified, r.helpful_count
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC
      `, [sampleProduct.id])
      
      if (reviews.rows.length > 0) {
        reviews.rows.forEach((review, i) => {
          console.log(`   ${i + 1}. ${review.reviewer_name} - ${review.rating}⭐`)
          console.log(`      "${review.title}"`)
          console.log(`      "${review.comment?.substring(0, 80)}..."`)
          console.log(`      Compra verificada: ${review.is_verified ? 'SIM' : 'NÃO'}`)
          console.log(`      Útil: ${review.helpful_count} pessoas`)
          console.log('')
        })
      } else {
        console.log('   ❌ Nenhuma review encontrada\n')
      }
      
      // 4. Verificar imagens do primeiro produto
      console.log(`📸 IMAGENS DE "${sampleProduct.name}":\n`)
      const images = await connector.queryNeon(`
        SELECT url, alt_text, is_primary, position
        FROM product_images
        WHERE product_id = $1
        ORDER BY position
      `, [sampleProduct.id])
      
      if (images.rows.length > 0) {
        images.rows.forEach((image, i) => {
          const primaryText = image.is_primary ? ' (PRINCIPAL)' : ''
          console.log(`   ${i + 1}. ${image.url}${primaryText}`)
          console.log(`      Alt: "${image.alt_text}"`)
        })
        console.log('')
      } else {
        console.log('   ❌ Nenhuma imagem encontrada\n')
      }
      
      // 5. Verificar especificações
      if (sampleProduct.specifications) {
        console.log(`🔧 ESPECIFICAÇÕES DE "${sampleProduct.name}":\n`)
        try {
          const specs = typeof sampleProduct.specifications === 'string' 
            ? JSON.parse(sampleProduct.specifications) 
            : sampleProduct.specifications
          
          Object.entries(specs).forEach(([key, value]) => {
            console.log(`   • ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          })
          console.log('')
        } catch (error) {
          console.log('   ❌ Erro ao processar especificações\n')
        }
      }
    }
    
    // 6. Estatísticas gerais das tabelas relacionadas
    console.log('📊 ESTATÍSTICAS DAS TABELAS RELACIONADAS:\n')
    
    const variantsCount = await connector.queryNeon(`
      SELECT COUNT(*) as count FROM product_variants
      WHERE created_at > NOW() - INTERVAL '10 minutes'
    `)
    
    const reviewsCount = await connector.queryNeon(`
      SELECT COUNT(*) as count FROM reviews
      WHERE created_at > NOW() - INTERVAL '10 minutes'
    `)
    
    const imagesCount = await connector.queryNeon(`
      SELECT COUNT(*) as count FROM product_images
      WHERE created_at > NOW() - INTERVAL '10 minutes'
    `)
    
    console.log(`   🎨 Variantes criadas: ${variantsCount.rows[0].count}`)
    console.log(`   ⭐ Reviews criadas: ${reviewsCount.rows[0].count}`)
    console.log(`   📸 Imagens criadas: ${imagesCount.rows[0].count}`)
    
    console.log('\n' + '=' .repeat(70))
    console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkSampleEnrichment() 