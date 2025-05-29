#!/usr/bin/env node

import 'dotenv/config'
import { getXataClient } from '../packages/xata-client/src/xata.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Script de Importação de Produtos Reais\n')

// Cliente Xata
const xata = getXataClient()

// Configurações de dados mockados
const MOCK_DEFAULTS = {
  // Dados padrão para campos obrigatórios
  seller: {
    email: 'vendedor.padrao@marketplace.com',
    name: 'Vendedor Padrão',
    password: 'temp123456',
    company_name: 'Loja Padrão Marketplace',
    company_document: '00000000000000',
    description: '[PENDENTE] Descrição da empresa a ser preenchida',
    is_verified: false,
    rating_average: 0
  },
  
  // Categoria padrão se não encontrar
  defaultCategory: {
    name: 'Produtos Gerais',
    slug: 'produtos-gerais',
    description: 'Categoria temporária para produtos sem categoria definida'
  },
  
  // Dados mockados para produtos
  product: {
    description: '[PENDENTE] Descrição detalhada do produto a ser preenchida via IA',
    stock_quantity: 100, // Estoque padrão
    weight: 1.0, // 1kg padrão
    dimensions: {
      length: 30,
      width: 20,
      height: 10,
      unit: 'cm'
    },
    images: [], // Será preenchido com placeholder se vazio
    is_active: true,
    is_featured: false,
    tags: ['importado', 'pendente-enriquecimento'],
    metadata: {
      imported_at: new Date().toISOString(),
      needs_enrichment: true,
      original_data: {} // Guardar dados originais aqui
    }
  },
  
  // Placeholder para imagens
  placeholderImage: {
    url: '/api/placeholder/800/800',
    alt: 'Imagem do produto',
    is_placeholder: true
  }
}

// Funções auxiliares
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateSKU(name, index) {
  const prefix = name.substring(0, 3).toUpperCase()
  return `${prefix}-${Date.now()}-${index.toString().padStart(4, '0')}`
}

// Mapear campos do JSON para o banco
function mapProductData(rawProduct, index) {
  const mapped = {
    // Campos que geralmente existem
    name: rawProduct.name || rawProduct.title || `Produto ${index + 1}`,
    price: parseFloat(rawProduct.price || rawProduct.preco || 0),
    
    // Campos que podem existir
    description: rawProduct.description || rawProduct.descricao || MOCK_DEFAULTS.product.description,
    sku: rawProduct.sku || rawProduct.codigo || generateSKU(rawProduct.name || 'PROD', index),
    barcode: rawProduct.barcode || rawProduct.ean || rawProduct.gtin || null,
    
    // Campos de preço
    compare_at_price: parseFloat(rawProduct.compare_price || rawProduct.preco_comparacao || 0) || null,
    cost: parseFloat(rawProduct.cost || rawProduct.custo || 0) || null,
    
    // Estoque
    stock_quantity: parseInt(rawProduct.stock || rawProduct.estoque || rawProduct.quantity || MOCK_DEFAULTS.product.stock_quantity),
    stock_location: rawProduct.stock_location || rawProduct.localizacao || 'Estoque Principal',
    
    // Dimensões e peso
    weight: parseFloat(rawProduct.weight || rawProduct.peso || MOCK_DEFAULTS.product.weight),
    dimensions: rawProduct.dimensions || rawProduct.dimensoes || MOCK_DEFAULTS.product.dimensions,
    
    // Imagens
    images: [],
    
    // Status
    is_active: rawProduct.active !== undefined ? rawProduct.active : MOCK_DEFAULTS.product.is_active,
    is_featured: rawProduct.featured || rawProduct.destaque || MOCK_DEFAULTS.product.is_featured,
    
    // Tags e metadata
    tags: [...(rawProduct.tags || rawProduct.categorias || []), ...MOCK_DEFAULTS.product.tags],
    metadata: {
      ...MOCK_DEFAULTS.product.metadata,
      original_data: rawProduct
    }
  }
  
  // Processar imagens
  if (rawProduct.images && Array.isArray(rawProduct.images)) {
    mapped.images = rawProduct.images.map(img => ({
      url: img.url || img.src || img,
      alt: img.alt || mapped.name,
      is_placeholder: false
    }))
  } else if (rawProduct.image || rawProduct.imagem) {
    mapped.images = [{
      url: rawProduct.image || rawProduct.imagem,
      alt: mapped.name,
      is_placeholder: false
    }]
  }
  
  // Adicionar placeholder se não tiver imagens
  if (mapped.images.length === 0) {
    mapped.images = [MOCK_DEFAULTS.placeholderImage]
  }
  
  // Gerar slug
  mapped.slug = rawProduct.slug || createSlug(mapped.name)
  
  return mapped
}

// Função principal de importação
async function importProducts(jsonFilePath) {
  try {
    // 1. Ler arquivo JSON
    console.log(`📄 Lendo arquivo: ${jsonFilePath}`)
    const jsonContent = await fs.readFile(jsonFilePath, 'utf-8')
    const rawProducts = JSON.parse(jsonContent)
    
    console.log(`✅ ${rawProducts.length} produtos encontrados no arquivo\n`)
    
    // 2. Verificar/criar vendedor padrão
    console.log('👤 Verificando vendedor padrão...')
    let seller = await xata.db.sellers
      .filter({ company_document: MOCK_DEFAULTS.seller.company_document })
      .getFirst()
    
    if (!seller) {
      console.log('Criando vendedor padrão...')
      
      // Criar usuário primeiro
      const user = await xata.db.users.create({
        email: MOCK_DEFAULTS.seller.email,
        name: MOCK_DEFAULTS.seller.name,
        password_hash: `mock:${MOCK_DEFAULTS.seller.password}`, // Marcado como mock
        role: 'seller',
        is_active: true
      })
      
      // Criar vendedor
      seller = await xata.db.sellers.create({
        user_id: user.id,
        company_name: MOCK_DEFAULTS.seller.company_name,
        company_document: MOCK_DEFAULTS.seller.company_document,
        description: MOCK_DEFAULTS.seller.description,
        is_verified: MOCK_DEFAULTS.seller.is_verified,
        rating_average: MOCK_DEFAULTS.seller.rating_average
      })
      
      console.log('✅ Vendedor padrão criado')
    } else {
      console.log('✅ Vendedor padrão já existe')
    }
    
    // 3. Verificar/criar categoria padrão
    console.log('\n📁 Verificando categoria padrão...')
    let defaultCategory = await xata.db.categories
      .filter({ slug: MOCK_DEFAULTS.defaultCategory.slug })
      .getFirst()
    
    if (!defaultCategory) {
      console.log('Criando categoria padrão...')
      defaultCategory = await xata.db.categories.create(MOCK_DEFAULTS.defaultCategory)
      console.log('✅ Categoria padrão criada')
    } else {
      console.log('✅ Categoria padrão já existe')
    }
    
    // 4. Mapear categorias existentes
    console.log('\n🗂️ Carregando categorias existentes...')
    const categories = await xata.db.categories.getAll()
    const categoryMap = new Map()
    
    categories.forEach(cat => {
      categoryMap.set(cat.slug, cat)
      categoryMap.set(cat.name.toLowerCase(), cat)
    })
    
    console.log(`✅ ${categories.length} categorias carregadas`)
    
    // 5. Importar produtos
    console.log('\n📦 Iniciando importação de produtos...')
    
    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
      details: []
    }
    
    for (let i = 0; i < rawProducts.length; i++) {
      const rawProduct = rawProducts[i]
      
      try {
        // Mapear dados do produto
        const productData = mapProductData(rawProduct, i)
        
        // Verificar se já existe pelo SKU
        const existing = await xata.db.products
          .filter({ sku: productData.sku })
          .getFirst()
        
        if (existing) {
          console.log(`⏭️ Produto ${i + 1}/${rawProducts.length}: ${productData.name} - SKU já existe`)
          results.skipped++
          continue
        }
        
        // Determinar categoria
        let categoryId = defaultCategory.id
        
        // Tentar encontrar categoria pelo nome ou tags
        if (rawProduct.category || rawProduct.categoria) {
          const catSearch = (rawProduct.category || rawProduct.categoria).toLowerCase()
          const foundCat = categoryMap.get(catSearch)
          if (foundCat) {
            categoryId = foundCat.id
          }
        }
        
        // Criar produto
        const product = await xata.db.products.create({
          ...productData,
          seller_id: seller.id,
          category_id: categoryId
        })
        
        console.log(`✅ Produto ${i + 1}/${rawProducts.length}: ${productData.name}`)
        results.success++
        results.details.push({
          name: productData.name,
          sku: productData.sku,
          id: product.id,
          needs_enrichment: true
        })
        
      } catch (error) {
        console.error(`❌ Erro no produto ${i + 1}: ${error.message}`)
        results.errors++
      }
    }
    
    // 6. Salvar relatório de importação
    const reportPath = path.join(__dirname, `import-report-${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2))
    
    // 7. Resumo final
    console.log('\n📊 Resumo da Importação:')
    console.log(`✅ Sucesso: ${results.success} produtos`)
    console.log(`⏭️ Ignorados: ${results.skipped} produtos (já existentes)`)
    console.log(`❌ Erros: ${results.errors} produtos`)
    console.log(`\n📄 Relatório salvo em: ${reportPath}`)
    
    // 8. Próximos passos
    console.log('\n🎯 Próximos Passos:')
    console.log('1. Revisar produtos importados no painel administrativo')
    console.log('2. Executar script de enriquecimento via IA para completar descrições')
    console.log('3. Adicionar imagens reais dos produtos')
    console.log('4. Ajustar categorias e tags')
    console.log('5. Configurar preços e estoque reais')
    console.log('6. Ativar produtos após revisão')
    
    return results
    
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    throw error
  }
}

// Executar importação
async function main() {
  // Verificar argumento do arquivo
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('❌ Erro: Especifique o arquivo JSON para importar')
    console.log('Uso: node import-real-products.mjs <caminho-do-arquivo.json>')
    console.log('\nExemplo:')
    console.log('node import-real-products.mjs ../data/produtos.json')
    process.exit(1)
  }
  
  const filePath = path.resolve(args[0])
  
  // Verificar se arquivo existe
  try {
    await fs.access(filePath)
  } catch {
    console.log(`❌ Erro: Arquivo não encontrado: ${filePath}`)
    process.exit(1)
  }
  
  // Executar importação
  await importProducts(filePath)
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { importProducts, mapProductData } 