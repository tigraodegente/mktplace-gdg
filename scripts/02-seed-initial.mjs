#!/usr/bin/env node

import 'dotenv/config'
import { Database } from '../packages/db-hyperdrive/dist/index.js'
import crypto from 'crypto'

console.log('🌱 Populando banco com dados iniciais...\n')

// Configurar conexão
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

// Helper para criar hash de senha
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

// Helper para criar slug
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function seedDatabase() {
  try {
    // 1. Criar usuários de teste
    console.log('👤 Criando usuários...')
    
    const adminUser = await db.queryOne`
      INSERT INTO users (email, name, password_hash, role)
      VALUES ('admin@marketplace.com', 'Admin User', ${hashPassword('admin123')}, 'admin')
      RETURNING id
    `
    console.log('✅ Admin criado')
    
    const sellerUser = await db.queryOne`
      INSERT INTO users (email, name, password_hash, role)
      VALUES ('vendedor@marketplace.com', 'Vendedor Teste', ${hashPassword('vendedor123')}, 'seller')
      RETURNING id
    `
    console.log('✅ Vendedor criado')
    
    const customerUser = await db.queryOne`
      INSERT INTO users (email, name, password_hash, role)
      VALUES ('cliente@marketplace.com', 'Cliente Teste', ${hashPassword('cliente123')}, 'customer')
      RETURNING id
    `
    console.log('✅ Cliente criado')
    
    // 2. Criar vendedor
    console.log('\n🏪 Criando vendedor...')
    
    const seller = await db.queryOne`
      INSERT INTO sellers (user_id, company_name, company_document, description)
      VALUES (
        ${sellerUser.id}, 
        'Loja Exemplo', 
        '12345678000190',
        'A melhor loja de produtos eletrônicos do marketplace'
      )
      RETURNING id
    `
    console.log('✅ Vendedor criado')
    
    // 3. Criar marcas
    console.log('\n🏷️ Criando marcas...')
    
    const brands = [
      { name: 'Samsung', slug: 'samsung' },
      { name: 'Apple', slug: 'apple' },
      { name: 'Xiaomi', slug: 'xiaomi' },
      { name: 'Sony', slug: 'sony' },
      { name: 'LG', slug: 'lg' }
    ]
    
    const brandIds = []
    for (const brand of brands) {
      const result = await db.queryOne`
        INSERT INTO brands (name, slug, is_active)
        VALUES (${brand.name}, ${brand.slug}, true)
        RETURNING id
      `
      brandIds.push(result.id)
    }
    console.log(`✅ ${brands.length} marcas criadas`)
    
    // 4. Criar categorias
    console.log('\n📁 Criando categorias...')
    
    // Categorias principais
    const mainCategories = [
      { name: 'Eletrônicos', slug: 'eletronicos', description: 'Produtos eletrônicos em geral' },
      { name: 'Informática', slug: 'informatica', description: 'Computadores e acessórios' },
      { name: 'Celulares', slug: 'celulares', description: 'Smartphones e acessórios' },
      { name: 'Games', slug: 'games', description: 'Consoles e jogos' },
      { name: 'Casa', slug: 'casa', description: 'Produtos para casa' }
    ]
    
    const categoryIds = {}
    
    for (const cat of mainCategories) {
      const result = await db.queryOne`
        INSERT INTO categories (name, slug, description, is_active, path)
        VALUES (${cat.name}, ${cat.slug}, ${cat.description}, true, ARRAY[${cat.slug}])
        RETURNING id
      `
      categoryIds[cat.slug] = result.id
    }
    
    // Subcategorias
    const subCategories = [
      { name: 'Smartphones', slug: 'smartphones', parent: 'celulares' },
      { name: 'Acessórios para Celular', slug: 'acessorios-celular', parent: 'celulares' },
      { name: 'Notebooks', slug: 'notebooks', parent: 'informatica' },
      { name: 'Monitores', slug: 'monitores', parent: 'informatica' },
      { name: 'TVs', slug: 'tvs', parent: 'eletronicos' },
      { name: 'Fones de Ouvido', slug: 'fones-ouvido', parent: 'eletronicos' },
      { name: 'PlayStation', slug: 'playstation', parent: 'games' },
      { name: 'Xbox', slug: 'xbox', parent: 'games' },
      { name: 'Nintendo', slug: 'nintendo', parent: 'games' }
    ]
    
    for (const subCat of subCategories) {
      const parentId = categoryIds[subCat.parent]
      const result = await db.queryOne`
        INSERT INTO categories (name, slug, parent_id, is_active, path)
        VALUES (
          ${subCat.name}, 
          ${subCat.slug}, 
          ${parentId}, 
          true,
          ARRAY[${subCat.parent}, ${subCat.slug}]
        )
        RETURNING id
      `
      categoryIds[subCat.slug] = result.id
    }
    
    console.log(`✅ ${mainCategories.length + subCategories.length} categorias criadas`)
    
    // 5. Criar métodos de pagamento
    console.log('\n💳 Criando métodos de pagamento...')
    
    const paymentMethods = [
      { name: 'Cartão de Crédito', code: 'credit_card', type: 'card' },
      { name: 'Cartão de Débito', code: 'debit_card', type: 'card' },
      { name: 'PIX', code: 'pix', type: 'instant' },
      { name: 'Boleto', code: 'boleto', type: 'boleto' }
    ]
    
    for (const method of paymentMethods) {
      await db.execute`
        INSERT INTO payment_methods (name, code, type, is_active)
        VALUES (${method.name}, ${method.code}, ${method.type}, true)
      `
    }
    console.log(`✅ ${paymentMethods.length} métodos de pagamento criados`)
    
    // 6. Criar métodos de envio
    console.log('\n🚚 Criando métodos de envio...')
    
    const shippingMethods = [
      { name: 'Correios PAC', code: 'correios_pac', carrier: 'Correios', minDays: 5, maxDays: 10 },
      { name: 'Correios SEDEX', code: 'correios_sedex', carrier: 'Correios', minDays: 1, maxDays: 3 },
      { name: 'Transportadora', code: 'transportadora', carrier: 'Genérica', minDays: 3, maxDays: 7 },
      { name: 'Retirada na Loja', code: 'retirada', carrier: null, minDays: 0, maxDays: 0 }
    ]
    
    const shippingIds = []
    for (const method of shippingMethods) {
      const result = await db.queryOne`
        INSERT INTO shipping_methods (name, code, carrier, min_days, max_days, is_active)
        VALUES (${method.name}, ${method.code}, ${method.carrier}, ${method.minDays}, ${method.maxDays}, true)
        RETURNING id
      `
      shippingIds.push(result.id)
    }
    console.log(`✅ ${shippingMethods.length} métodos de envio criados`)
    
    // 7. Criar zonas de envio
    console.log('\n🗺️ Criando zonas de envio...')
    
    const zones = [
      { name: 'São Paulo Capital', methodId: shippingIds[0], regions: ['SP'], price: 15.00 },
      { name: 'Grande São Paulo', methodId: shippingIds[0], regions: ['SP-GRU'], price: 20.00 },
      { name: 'Sudeste', methodId: shippingIds[0], regions: ['SP', 'RJ', 'MG', 'ES'], price: 25.00 },
      { name: 'Sul', methodId: shippingIds[0], regions: ['PR', 'SC', 'RS'], price: 30.00 },
      { name: 'Brasil', methodId: shippingIds[0], regions: ['BR'], price: 40.00 }
    ]
    
    for (const zone of zones) {
      await db.execute`
        INSERT INTO shipping_zones (name, shipping_method_id, regions, price, free_above)
        VALUES (${zone.name}, ${zone.methodId}, ${zone.regions}, ${zone.price}, 299.00)
      `
    }
    console.log(`✅ ${zones.length} zonas de envio criadas`)
    
    // 8. Criar configurações do sistema
    console.log('\n⚙️ Criando configurações do sistema...')
    
    const settings = [
      { key: 'site_name', value: 'Marketplace GDG', type: 'string', description: 'Nome do site', isPublic: true },
      { key: 'site_description', value: 'O melhor marketplace do Brasil', type: 'string', description: 'Descrição do site', isPublic: true },
      { key: 'currency', value: 'BRL', type: 'string', description: 'Moeda padrão', isPublic: true },
      { key: 'min_order_value', value: '10.00', type: 'number', description: 'Valor mínimo do pedido', isPublic: true },
      { key: 'max_cart_items', value: '50', type: 'number', description: 'Máximo de itens no carrinho', isPublic: true },
      { key: 'commission_rate', value: '10', type: 'number', description: 'Taxa de comissão (%)', isPublic: false }
    ]
    
    for (const setting of settings) {
      await db.execute`
        INSERT INTO system_settings (key, value, type, description, is_public)
        VALUES (${setting.key}, ${setting.value}, ${setting.type}, ${setting.description}, ${setting.isPublic})
      `
    }
    console.log(`✅ ${settings.length} configurações criadas`)
    
    // 9. Criar páginas estáticas
    console.log('\n📄 Criando páginas estáticas...')
    
    const pages = [
      {
        title: 'Sobre Nós',
        slug: 'sobre-nos',
        content: 'Somos o melhor marketplace do Brasil, conectando vendedores e compradores.'
      },
      {
        title: 'Termos de Uso',
        slug: 'termos-de-uso',
        content: 'Ao usar nosso marketplace, você concorda com os seguintes termos...'
      },
      {
        title: 'Política de Privacidade',
        slug: 'politica-privacidade',
        content: 'Respeitamos sua privacidade e protegemos seus dados...'
      },
      {
        title: 'Como Comprar',
        slug: 'como-comprar',
        content: 'Guia passo a passo para fazer suas compras em nosso marketplace.'
      },
      {
        title: 'Como Vender',
        slug: 'como-vender',
        content: 'Torne-se um vendedor e aumente suas vendas online.'
      }
    ]
    
    for (const page of pages) {
      await db.execute`
        INSERT INTO pages (title, slug, content, is_published)
        VALUES (${page.title}, ${page.slug}, ${page.content}, true)
      `
    }
    console.log(`✅ ${pages.length} páginas criadas`)
    
    // 10. Criar FAQs
    console.log('\n❓ Criando FAQs...')
    
    const faqs = [
      {
        question: 'Como faço para comprar?',
        answer: 'Basta adicionar os produtos ao carrinho e finalizar a compra.',
        category: 'compras'
      },
      {
        question: 'Quais formas de pagamento são aceitas?',
        answer: 'Aceitamos cartão de crédito, débito, PIX e boleto.',
        category: 'pagamento'
      },
      {
        question: 'Qual o prazo de entrega?',
        answer: 'O prazo varia de acordo com sua região e método de envio escolhido.',
        category: 'entrega'
      },
      {
        question: 'Como faço para devolver um produto?',
        answer: 'Entre em contato conosco em até 7 dias após o recebimento.',
        category: 'devolucao'
      }
    ]
    
    for (const faq of faqs) {
      await db.execute`
        INSERT INTO faq (question, answer, category, is_active)
        VALUES (${faq.question}, ${faq.answer}, ${faq.category}, true)
      `
    }
    console.log(`✅ ${faqs.length} FAQs criadas`)
    
    console.log('\n✨ Seed inicial concluído com sucesso!')
    console.log('\n📊 Resumo:')
    console.log('- 3 usuários (admin, vendedor, cliente)')
    console.log('- 1 vendedor')
    console.log(`- ${brands.length} marcas`)
    console.log(`- ${mainCategories.length + subCategories.length} categorias`)
    console.log(`- ${paymentMethods.length} métodos de pagamento`)
    console.log(`- ${shippingMethods.length} métodos de envio`)
    console.log(`- ${zones.length} zonas de envio`)
    console.log(`- ${settings.length} configurações`)
    console.log(`- ${pages.length} páginas`)
    console.log(`- ${faqs.length} FAQs`)
    
    console.log('\n🔑 Credenciais de acesso:')
    console.log('Admin: admin@marketplace.com / admin123')
    console.log('Vendedor: vendedor@marketplace.com / vendedor123')
    console.log('Cliente: cliente@marketplace.com / cliente123')
    
  } catch (error) {
    console.error('❌ Erro no seed:', error)
    throw error
  } finally {
    await db.close()
  }
}

seedDatabase().catch(console.error) 