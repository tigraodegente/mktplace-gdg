#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import ora from 'ora'

/**
 * Script para converter URLs de imagens do OVH para AWS no banco Neon
 */
async function convertOvhToAwsUrls() {
  const connector = new DatabaseConnector({ forceConnection: true })
  const spinner = ora()
  
  // Configuração AWS
  const AWS_BASE_URL = 'https://gdg-vendure.s3.sa-east-1.amazonaws.com'
  const AWS_PRODUCTS_PATH = 'produto/desktop/0x0'
  
  // Padrões OVH para detectar
  const ovhPatterns = [
    /https?:\/\/.*\.ovh\.net/i,
    /https?:\/\/.*\.ovhcloud\.com/i,
    /https?:\/\/.*\.cluster\d+\.hosting\.ovh\.net/i,
    /https?:\/\/storage\.sbg\d+\.cloud\.ovh\.net/i,
    /https?:\/\/grao-cdn\.s3\.bhs\.perf\.cloud\.ovh\.net/i  // Padrão específico encontrado
  ]
  
  function convertUrl(url) {
    if (!url || typeof url !== 'string') return url
    
    const isOvhUrl = ovhPatterns.some(pattern => pattern.test(url))
    
    if (isOvhUrl) {
      // Extrair nome do arquivo
      const fileName = url.split('/').pop()
      return `${AWS_BASE_URL}/${AWS_PRODUCTS_PATH}/${fileName}`
    }
    
    return url
  }
  
  try {
    console.log('🔄 CONVERSÃO DE URLs OVH → AWS\n')
    
    // Conectar ao banco
    spinner.start('🔌 Conectando ao banco Neon...')
    await connector.connectNeon()
    spinner.succeed('✅ Conectado')
    
    // 1. Verificar URLs atuais
    spinner.start('📊 Analisando URLs atuais...')
    const currentUrls = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN url ~* '\.ovh\.' THEN 1 END) as ovh_urls,
        COUNT(CASE WHEN url ~* 'amazonaws' THEN 1 END) as aws_urls
      FROM product_images 
      WHERE url IS NOT NULL
    `)
    
    const stats = currentUrls.rows[0]
    spinner.succeed(`📊 URLs encontradas: ${stats.total} total, ${stats.ovh_urls} OVH, ${stats.aws_urls} AWS`)
    
    if (stats.ovh_urls === 0) {
      console.log('\n✅ Nenhuma URL do OVH encontrada! Todas já estão convertidas.')
      return
    }
    
    // 2. Mostrar exemplos de URLs que serão convertidas
    console.log('\n🔍 EXEMPLOS DE CONVERSÃO:')
    const sampleUrls = await connector.queryNeon(`
      SELECT url
      FROM product_images 
      WHERE url ~* '\.ovh\.'
      LIMIT 5
    `)
    
    sampleUrls.rows.forEach(row => {
      console.log(`   OVH: ${row.url}`)
      console.log(`   AWS: ${convertUrl(row.url)}`)
      console.log('')
    })
    
    // 3. Confirmar conversão
    console.log(`⚠️  Será feita a conversão de ${stats.ovh_urls} URLs do OVH para AWS`)
    console.log('Isso irá atualizar as URLs no banco de dados.\n')
    
    const confirm = process.argv.includes('--confirm')
    if (!confirm) {
      console.log('Para executar a conversão, adicione --confirm:')
      console.log('node scripts/convert-ovh-to-aws-urls.mjs --confirm')
      return
    }
    
    // 4. Executar conversão
    console.log('🚀 INICIANDO CONVERSÃO...\n')
    
    const ovhImages = await connector.queryNeon(`
      SELECT id, url, product_id
      FROM product_images 
      WHERE url ~* '\.ovh\.'
      ORDER BY id
    `)
    
    let converted = 0
    let errors = 0
    
    for (const image of ovhImages.rows) {
      try {
        const newUrl = convertUrl(image.url)
        
        await connector.queryNeon(`
          UPDATE product_images 
          SET url = $1, updated_at = NOW()
          WHERE id = $2
        `, [newUrl, image.id])
        
        converted++
        
        if (converted % 50 === 0) {
          spinner.text = `Convertidas: ${converted}/${ovhImages.rows.length}`
        }
        
      } catch (error) {
        errors++
        console.error(`❌ Erro na imagem ${image.id}: ${error.message}`)
      }
    }
    
    spinner.succeed(`✅ Conversão concluída!`)
    
    // 5. Verificar resultado
    console.log('\n📊 RESULTADO FINAL:')
    const finalStats = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN url ~* '\.ovh\.' THEN 1 END) as ovh_remaining,
        COUNT(CASE WHEN url ~* 'amazonaws' THEN 1 END) as aws_urls
      FROM product_images 
      WHERE url IS NOT NULL
    `)
    
    const final = finalStats.rows[0]
    console.log(`   ✅ URLs convertidas: ${converted}`)
    console.log(`   ❌ Erros: ${errors}`)
    console.log(`   📊 Total atual: ${final.total}`)
    console.log(`   🔄 OVH restantes: ${final.ovh_remaining}`)
    console.log(`   ☁️  AWS atuais: ${final.aws_urls}`)
    
    if (final.ovh_remaining === 0) {
      console.log('\n🎉 SUCESSO! Todas as URLs foram convertidas para AWS!')
    } else {
      console.log(`\n⚠️  Ainda restam ${final.ovh_remaining} URLs do OVH`)
    }
    
    // 6. Mostrar exemplos finais
    console.log('\n🔍 EXEMPLOS FINAIS:')
    const finalExamples = await connector.queryNeon(`
      SELECT url
      FROM product_images 
      WHERE url ~* 'amazonaws'
      LIMIT 3
    `)
    
    finalExamples.rows.forEach(row => {
      console.log(`   ✅ ${row.url}`)
    })
    
  } catch (error) {
    spinner.fail('Erro durante a conversão')
    console.error('\n❌ Erro:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Conversão de URLs OVH para AWS\n')
  console.log('Este script converte URLs existentes no banco Neon de OVH para AWS')
  console.log('')
  console.log('Opções:')
  console.log('  --confirm    Executar a conversão (obrigatório)')
  console.log('')
  
  convertOvhToAwsUrls()
    .then(() => {
      console.log('\n🎉 Processo finalizado!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Processo falhou:', error.message)
      process.exit(1)
    })
} 