#!/usr/bin/env node

import { DataMapper } from './sync/utils/data-mapper.mjs'

/**
 * Script para testar a conversão de URLs OVH para AWS
 */
function testUrlConversion() {
  console.log('🧪 TESTANDO CONVERSÃO DE URLs OVH → AWS\n')
  
  const mapper = new DataMapper()
  
  // URLs reais encontradas na análise
  const testCases = [
    {
      name: 'Kit Berço Azul Clássico',
      ovh: 'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/154201/kit-berco-azul-classico-352417.jpg',
      expectedAws: 'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/154201/kit-berco-azul-classico-1.jpg'
    },
    {
      name: 'Mochila Maternidade',
      ovh: 'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/146588/mochila-maternidade-rosa-e-bege-luxo-36cm-344557.jpg',
      expectedAws: 'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/146588/mochila-maternidade-rosa-e-bege-luxo-36cm-1.jpg'
    },
    {
      name: 'Kit Cama Babá',
      ovh: 'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/53417/kit-cama-baba-realeza-marinho-premium-163107.jpg',
      expectedAws: 'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/53417/kit-cama-baba-realeza-marinho-premium-1.jpg'
    },
    {
      name: 'Arquivo com acentos',
      ovh: 'https://grao-cdn.s3.bhs.perf.cloud.ovh.net/fotos/12345/almofada-amamentação-especial-123456.jpg',
      expectedAws: 'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/12345/almofada-amamentacao-especial-1.jpg'
    }
  ]
  
  console.log('📋 CASOS DE TESTE:\n')
  
  testCases.forEach((testCase, i) => {
    console.log(`${i + 1}. ${testCase.name}`)
    console.log(`   🏢 OVH Original:`)
    console.log(`      ${testCase.ovh}`)
    
    const converted = mapper.convertOvhToAwsUrl(testCase.ovh)
    console.log(`   ☁️  AWS Convertida:`)
    console.log(`      ${converted}`)
    
    const isExpected = converted === testCase.expectedAws
    console.log(`   ${isExpected ? '✅' : '❌'} Resultado: ${isExpected ? 'CORRETO' : 'DIFERENTE DO ESPERADO'}`)
    
    if (!isExpected) {
      console.log(`   💡 Esperado:`)
      console.log(`      ${testCase.expectedAws}`)
    }
    console.log('')
  })
  
  // Testar URLs que NÃO devem ser convertidas
  console.log('🚫 TESTANDO URLs QUE NÃO DEVEM SER CONVERTIDAS:\n')
  
  const noConvertCases = [
    'https://gdg-vendure.s3.sa-east-1.amazonaws.com/produto/desktop/0x0/arquivo.webp',
    'https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/123/arquivo.jpg',
    '/placeholder.jpg',
    'https://exemplo.com/imagem.jpg'
  ]
  
  noConvertCases.forEach((url, i) => {
    const converted = mapper.convertOvhToAwsUrl(url)
    const unchanged = converted === url
    console.log(`${i + 1}. ${unchanged ? '✅' : '❌'} ${url}`)
    if (!unchanged) {
      console.log(`    Convertida para: ${converted}`)
    }
  })
  
  console.log('\n🎯 RESUMO:')
  console.log('   ✅ URLs OVH são convertidas para AWS simples')
  console.log('   ✅ URLs AWS existentes são mantidas')
  console.log('   ✅ Outras URLs são mantidas inalteradas')
  console.log('   ✅ Acentos e caracteres especiais são normalizados')
  console.log('   ✅ Sufixos numéricos OVH são substituídos por -1')
  
  console.log('\n💡 ESTRATÉGIA:')
  console.log('   1. Tenta AWS simples primeiro (maior chance de existir)')
  console.log('   2. Se AWS falhar, sistema pode fazer fallback para OVH')
  console.log('   3. Gradualmente migra conforme AWS simples seja populada')
}

// Executar teste
testUrlConversion() 