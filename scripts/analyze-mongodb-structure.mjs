#!/usr/bin/env node

import 'dotenv/config'
import { MongoClient } from 'mongodb'
import fs from 'fs/promises'

console.log('🔍 Analisador de Estrutura MongoDB\n')

// Configuração
const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DATABASE || 'marketplace',
  collection: process.env.MONGODB_COLLECTION || 'products',
  sampleSize: 100 // Quantos documentos analisar
}

// Padrões conhecidos de campos
const FIELD_PATTERNS = {
  name: /^(name|nome|title|titulo|product_name|productName|item_name)$/i,
  price: /^(price|preco|valor|value|cost|custo|amount)$/i,
  description: /^(description|descricao|desc|details|detalhes|about|sobre)$/i,
  sku: /^(sku|codigo|code|product_code|item_code|reference|referencia)$/i,
  category: /^(category|categoria|cat|type|tipo|department|departamento)$/i,
  brand: /^(brand|marca|manufacturer|fabricante|maker)$/i,
  image: /^(image|imagem|img|photo|foto|picture|thumbnail|thumb)$/i,
  stock: /^(stock|estoque|quantity|quantidade|inventory|available)$/i,
  weight: /^(weight|peso|mass|massa)$/i,
  dimensions: /^(dimensions|dimensoes|size|tamanho|medidas|measures)$/i,
  tags: /^(tags|etiquetas|keywords|palavras_chave|labels)$/i,
  active: /^(active|ativo|enabled|habilitado|status|available|disponivel)$/i
}

// Analisar tipo de dado
function analyzeFieldType(values) {
  const types = {
    string: 0,
    number: 0,
    boolean: 0,
    array: 0,
    object: 0,
    null: 0
  }
  
  values.forEach(val => {
    if (val === null || val === undefined) types.null++
    else if (Array.isArray(val)) types.array++
    else if (typeof val === 'object') types.object++
    else if (typeof val === 'boolean') types.boolean++
    else if (typeof val === 'number') types.number++
    else if (typeof val === 'string') types.string++
  })
  
  // Retorna o tipo mais comum
  return Object.entries(types)
    .sort((a, b) => b[1] - a[1])[0][0]
}

// Detectar campo baseado em padrões
function detectFieldPurpose(fieldName, sampleValues) {
  // Verificar por nome
  for (const [purpose, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (pattern.test(fieldName)) {
      return purpose
    }
  }
  
  // Verificar por conteúdo
  const firstValue = sampleValues.find(v => v !== null && v !== undefined)
  
  if (firstValue) {
    // Detectar URLs de imagem
    if (typeof firstValue === 'string' && 
        (firstValue.includes('.jpg') || firstValue.includes('.png') || 
         firstValue.includes('http') && firstValue.includes('image'))) {
      return 'image'
    }
    
    // Detectar preços por formato
    if (typeof firstValue === 'number' && firstValue > 0 && firstValue < 1000000) {
      const str = firstValue.toString()
      if (str.includes('.') && str.split('.')[1].length === 2) {
        return 'price'
      }
    }
    
    // Detectar booleanos como status
    if (typeof firstValue === 'boolean') {
      return 'active'
    }
  }
  
  return 'unknown'
}

// Função principal de análise
async function analyzeMongoStructure() {
  const mongoClient = new MongoClient(MONGO_CONFIG.uri)
  
  try {
    // Conectar
    console.log('🔌 Conectando ao MongoDB...')
    await mongoClient.connect()
    const db = mongoClient.db(MONGO_CONFIG.database)
    const collection = db.collection(MONGO_CONFIG.collection)
    
    // Contar total
    const totalCount = await collection.countDocuments()
    console.log(`✅ Conectado! Total de documentos: ${totalCount}\n`)
    
    // Buscar amostra
    console.log(`📊 Analisando amostra de ${MONGO_CONFIG.sampleSize} documentos...`)
    const sample = await collection
      .find({})
      .limit(MONGO_CONFIG.sampleSize)
      .toArray()
    
    if (sample.length === 0) {
      console.log('❌ Nenhum documento encontrado!')
      return
    }
    
    // Analisar estrutura
    const fieldAnalysis = {}
    const fieldExamples = {}
    
    // Coletar todos os campos
    sample.forEach(doc => {
      Object.keys(doc).forEach(field => {
        if (!fieldAnalysis[field]) {
          fieldAnalysis[field] = []
          fieldExamples[field] = []
        }
        fieldAnalysis[field].push(doc[field])
        
        // Guardar até 3 exemplos
        if (fieldExamples[field].length < 3 && doc[field] !== null) {
          fieldExamples[field].push(doc[field])
        }
      })
    })
    
    // Analisar cada campo
    const structure = {}
    
    Object.keys(fieldAnalysis).forEach(field => {
      const values = fieldAnalysis[field]
      const nonNullValues = values.filter(v => v !== null && v !== undefined)
      
      structure[field] = {
        type: analyzeFieldType(values),
        purpose: detectFieldPurpose(field, values),
        nullable: values.some(v => v === null || v === undefined),
        unique: new Set(nonNullValues).size === nonNullValues.length,
        examples: fieldExamples[field].slice(0, 3),
        fillRate: `${Math.round((nonNullValues.length / values.length) * 100)}%`
      }
    })
    
    // Gerar mapeamento sugerido
    const suggestedMapping = {
      name: null,
      price: null,
      description: null,
      sku: null,
      category: null,
      brand: null,
      images: null,
      stock: null,
      weight: null,
      dimensions: null,
      tags: null,
      active: null
    }
    
    // Mapear campos detectados
    Object.entries(structure).forEach(([field, info]) => {
      if (info.purpose !== 'unknown' && !suggestedMapping[info.purpose]) {
        suggestedMapping[info.purpose] = field
      }
    })
    
    // Tentar detectar campos não mapeados por análise de conteúdo
    Object.entries(structure).forEach(([field, info]) => {
      // Se ainda não tem nome e o campo tem strings únicas
      if (!suggestedMapping.name && info.type === 'string' && info.unique) {
        const avgLength = info.examples.reduce((sum, ex) => sum + ex.length, 0) / info.examples.length
        if (avgLength > 10 && avgLength < 100) {
          suggestedMapping.name = field
        }
      }
      
      // Se ainda não tem preço e o campo tem números
      if (!suggestedMapping.price && info.type === 'number') {
        const avg = fieldAnalysis[field]
          .filter(v => typeof v === 'number')
          .reduce((sum, v) => sum + v, 0) / fieldAnalysis[field].length
        
        if (avg > 1 && avg < 100000) {
          suggestedMapping.price = field
        }
      }
    })
    
    // Exibir resultados
    console.log('\n📋 ESTRUTURA DETECTADA:')
    console.log('=' * 80)
    
    Object.entries(structure).forEach(([field, info]) => {
      console.log(`\n📌 Campo: ${field}`)
      console.log(`   Tipo: ${info.type}`)
      console.log(`   Propósito: ${info.purpose}`)
      console.log(`   Preenchimento: ${info.fillRate}`)
      console.log(`   Nullable: ${info.nullable ? 'Sim' : 'Não'}`)
      console.log(`   Único: ${info.unique ? 'Sim' : 'Não'}`)
      console.log(`   Exemplos: ${JSON.stringify(info.examples.slice(0, 2))}`)
    })
    
    console.log('\n\n🎯 MAPEAMENTO SUGERIDO:')
    console.log('=' * 80)
    
    Object.entries(suggestedMapping).forEach(([purpose, field]) => {
      if (field) {
        console.log(`✅ ${purpose.padEnd(15)} → ${field}`)
      } else {
        console.log(`❌ ${purpose.padEnd(15)} → NÃO ENCONTRADO`)
      }
    })
    
    // Salvar análise
    const report = {
      timestamp: new Date().toISOString(),
      database: MONGO_CONFIG.database,
      collection: MONGO_CONFIG.collection,
      totalDocuments: totalCount,
      sampleSize: sample.length,
      structure,
      suggestedMapping,
      unmappedFields: Object.keys(structure).filter(field => 
        !Object.values(suggestedMapping).includes(field) && field !== '_id'
      )
    }
    
    const reportPath = `./mongodb-structure-analysis-${Date.now()}.json`
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`\n\n📄 Análise completa salva em: ${reportPath}`)
    
    // Gerar código de mapeamento
    console.log('\n\n🔧 CÓDIGO DE MAPEAMENTO GERADO:')
    console.log('=' * 80)
    console.log('// Copie este código para o script de importação:\n')
    console.log('const FIELD_MAPPING = {')
    Object.entries(suggestedMapping).forEach(([purpose, field]) => {
      if (field) {
        console.log(`  ${purpose}: '${field}',`)
      }
    })
    console.log('}')
    
    console.log('\n// Função de mapeamento:')
    console.log('function mapMongoToXata(mongoProduct) {')
    console.log('  return {')
    console.log(`    name: mongoProduct['${suggestedMapping.name || 'name'}'],`)
    console.log(`    price: parseFloat(mongoProduct['${suggestedMapping.price || 'price'}'] || 0),`)
    console.log(`    description: mongoProduct['${suggestedMapping.description || 'description'}'] || '[PENDENTE]',`)
    console.log(`    // ... adicione outros campos`)
    console.log('  }')
    console.log('}')
    
    return report
    
  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await mongoClient.close()
  }
}

// Executar
async function main() {
  await analyzeMongoStructure()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { analyzeMongoStructure } 