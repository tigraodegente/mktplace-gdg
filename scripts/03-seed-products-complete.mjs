#!/usr/bin/env node

import 'dotenv/config'
import { Database } from '../packages/db-hyperdrive/dist/index.js'
import crypto from 'crypto'

console.log('🛍️ Populando banco com dados completos de produtos...\n')

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

// Helpers
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateSKU(prefix, index) {
  return `${prefix}-${Date.now()}-${index.toString().padStart(4, '0')}`
}

function randomPrice(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2)
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function seedCompleteData() {
  try {
    // Buscar IDs existentes
    console.log('🔍 Buscando dados existentes...')
    
    const brands = await db.query`SELECT id, slug FROM brands`
    const categories = await db.query`SELECT id, slug FROM categories WHERE parent_id IS NOT NULL`
    const existingSeller = await db.queryOne`SELECT id FROM sellers LIMIT 1`
    
    // 1. Criar 4 novos vendedores (já temos 1)
    console.log('\n🏪 Criando novos vendedores...')
    
    const newSellers = [
      {
        email: 'techstore@marketplace.com',
        password: 'tech123',
        name: 'Tech Store Manager',
        companyName: 'Tech Store Premium',
        document: '23456789000101',
        description: 'Especializada em produtos de tecnologia de ponta'
      },
      {
        email: 'gamezone@marketplace.com',
        password: 'game123',
        name: 'Game Zone Manager',
        companyName: 'Game Zone Brasil',
        document: '34567890000102',
        description: 'A maior loja de games do Brasil'
      },
      {
        email: 'smartshop@marketplace.com',
        password: 'smart123',
        name: 'Smart Shop Manager',
        companyName: 'Smart Shop Electronics',
        document: '45678901000103',
        description: 'Smartphones e acessórios com garantia estendida'
      },
      {
        email: 'megastore@marketplace.com',
        password: 'mega123',
        name: 'Mega Store Manager',
        companyName: 'Mega Store Variedades',
        document: '56789012000104',
        description: 'Tudo em eletrônicos e informática'
      }
    ]
    
    const sellerIds = [existingSeller.id] // Começar com o vendedor existente
    
    // Buscar todos os usuários existentes para usar nas reviews
    const existingUsers = await db.query`SELECT id FROM users WHERE role = 'customer'`
    const userIds = existingUsers.map(u => u.id)
    
    // Se não houver usuários clientes, criar alguns
    if (userIds.length === 0) {
      const customerEmails = [
        { email: 'joao.silva@email.com', name: 'João Silva' },
        { email: 'maria.santos@email.com', name: 'Maria Santos' },
        { email: 'pedro.oliveira@email.com', name: 'Pedro Oliveira' },
        { email: 'ana.costa@email.com', name: 'Ana Costa' },
        { email: 'carlos.ferreira@email.com', name: 'Carlos Ferreira' }
      ]
      
      for (const customer of customerEmails) {
        const user = await db.queryOne`
          INSERT INTO users (email, name, password_hash, role)
          VALUES (${customer.email}, ${customer.name}, ${hashPassword('cliente123')}, 'customer')
          RETURNING id
        `
        userIds.push(user.id)
      }
      console.log(`✅ ${customerEmails.length} clientes criados para reviews`)
    }
    
    for (const seller of newSellers) {
      // Criar usuário
      const user = await db.queryOne`
        INSERT INTO users (email, name, password_hash, role)
        VALUES (${seller.email}, ${seller.name}, ${hashPassword(seller.password)}, 'seller')
        RETURNING id
      `
      
      // Criar vendedor
      const newSeller = await db.queryOne`
        INSERT INTO sellers (user_id, company_name, company_document, description, is_verified, rating_average)
        VALUES (
          ${user.id}, 
          ${seller.companyName}, 
          ${seller.document},
          ${seller.description},
          true,
          ${(Math.random() * 2 + 3).toFixed(2)}
        )
        RETURNING id
      `
      
      sellerIds.push(newSeller.id)
      console.log(`✅ Vendedor ${seller.companyName} criado`)
    }
    
    // 2. Criar produtos para cada vendedor
    console.log('\n📦 Criando produtos completos...')
    
    const productTemplates = [
      // Smartphones
      {
        category: 'smartphones',
        products: [
          {
            name: 'iPhone 15 Pro Max 256GB',
            brand: 'apple',
            basePrice: 8999.00,
            description: 'O iPhone mais avançado com chip A17 Pro, sistema de câmera Pro de 48MP e titânio.',
            attributes: { tela: '6.7"', memoria: '256GB', ram: '8GB', camera: '48MP + 12MP + 12MP', bateria: '4422mAh' },
            specifications: { peso: '221g', dimensoes: '159.9 x 76.7 x 8.25mm', resistencia: 'IP68', carregamento: 'USB-C' },
            tags: ['iphone', 'apple', 'premium', '5g', 'titanio'],
            options: [
              { name: 'Cor', values: ['Titânio Natural', 'Titânio Azul', 'Titânio Branco', 'Titânio Preto'] },
              { name: 'Armazenamento', values: ['256GB', '512GB', '1TB'] }
            ]
          },
          {
            name: 'Samsung Galaxy S24 Ultra 512GB',
            brand: 'samsung',
            basePrice: 7499.00,
            description: 'Galaxy AI. O smartphone mais inteligente com S Pen integrada e câmera de 200MP.',
            attributes: { tela: '6.8"', memoria: '512GB', ram: '12GB', camera: '200MP + 50MP + 12MP + 10MP', bateria: '5000mAh' },
            specifications: { peso: '233g', dimensoes: '162.3 x 79.0 x 8.6mm', resistencia: 'IP68', carregamento: '45W' },
            tags: ['samsung', 'galaxy', 's24', '5g', 'spen'],
            options: [
              { name: 'Cor', values: ['Titânio Preto', 'Titânio Cinza', 'Titânio Violeta'] }
            ]
          },
          {
            name: 'Xiaomi 14 Pro 512GB',
            brand: 'xiaomi',
            basePrice: 5999.00,
            description: 'Fotografia Leica. Performance Snapdragon 8 Gen 3.',
            attributes: { tela: '6.73"', memoria: '512GB', ram: '12GB', camera: '50MP Leica + 50MP + 50MP', bateria: '4880mAh' },
            specifications: { peso: '223g', dimensoes: '161.4 x 75.3 x 8.5mm', resistencia: 'IP68', carregamento: '120W' },
            tags: ['xiaomi', 'leica', 'premium', '5g'],
            options: [
              { name: 'Cor', values: ['Preto', 'Branco', 'Verde'] }
            ]
          },
          {
            name: 'Motorola Edge 40 Pro',
            brand: 'samsung', // Usando Samsung pois não temos Motorola
            basePrice: 3999.00,
            description: 'Tela curva 165Hz, carregamento 125W e câmera de 50MP.',
            attributes: { tela: '6.67"', memoria: '256GB', ram: '12GB', camera: '50MP + 50MP + 12MP', bateria: '4600mAh' },
            specifications: { peso: '199g', dimensoes: '161.2 x 74.0 x 8.6mm', resistencia: 'IP68', carregamento: '125W' },
            tags: ['motorola', 'edge', '5g', 'curva'],
            options: [
              { name: 'Cor', values: ['Lunar Blue', 'Interstellar Black'] }
            ]
          },
          {
            name: 'OnePlus 12 256GB',
            brand: 'xiaomi', // Usando Xiaomi pois não temos OnePlus
            basePrice: 4499.00,
            description: 'Hasselblad Camera, Display 2K 120Hz, Snapdragon 8 Gen 3.',
            attributes: { tela: '6.82"', memoria: '256GB', ram: '12GB', camera: '50MP Hasselblad + 48MP + 64MP', bateria: '5400mAh' },
            specifications: { peso: '220g', dimensoes: '164.3 x 75.8 x 9.2mm', resistencia: 'IP65', carregamento: '100W' },
            tags: ['oneplus', 'hasselblad', '5g', 'flagship'],
            options: [
              { name: 'Cor', values: ['Silky Black', 'Flowy Emerald'] }
            ]
          }
        ]
      },
      // Notebooks
      {
        category: 'notebooks',
        products: [
          {
            name: 'MacBook Pro 16" M3 Max',
            brand: 'apple',
            basePrice: 24999.00,
            description: 'O notebook mais poderoso da Apple com chip M3 Max, 36GB RAM e tela Liquid Retina XDR.',
            attributes: { tela: '16.2"', processador: 'M3 Max', ram: '36GB', ssd: '1TB', gpu: '40-core GPU' },
            specifications: { peso: '2.16kg', bateria: 'até 22h', portas: '3x Thunderbolt 4, HDMI, SD, MagSafe 3', teclado: 'Magic Keyboard retroiluminado' },
            tags: ['macbook', 'apple', 'm3', 'pro', 'creator'],
            options: [
              { name: 'Cor', values: ['Space Black', 'Silver'] },
              { name: 'Armazenamento', values: ['1TB', '2TB', '4TB'] }
            ]
          },
          {
            name: 'Dell XPS 15 OLED',
            brand: 'samsung', // Usando Samsung pois não temos Dell
            basePrice: 15999.00,
            description: 'Notebook premium com tela OLED 3.5K, Intel Core i9 e NVIDIA RTX 4070.',
            attributes: { tela: '15.6" OLED', processador: 'Intel i9-13900H', ram: '32GB', ssd: '1TB', gpu: 'RTX 4070' },
            specifications: { peso: '1.86kg', bateria: '86Wh', portas: '2x Thunderbolt 4, USB-A, SD', teclado: 'Retroiluminado' },
            tags: ['dell', 'xps', 'oled', 'creator', 'gaming'],
            options: [
              { name: 'Configuração', values: ['i7/16GB/512GB', 'i9/32GB/1TB', 'i9/64GB/2TB'] }
            ]
          },
          {
            name: 'ASUS ROG Strix G16',
            brand: 'lg', // Usando LG pois não temos ASUS
            basePrice: 12999.00,
            description: 'Notebook gamer com Intel i9, RTX 4080 e tela 240Hz.',
            attributes: { tela: '16" QHD 240Hz', processador: 'Intel i9-13980HX', ram: '32GB', ssd: '2TB', gpu: 'RTX 4080' },
            specifications: { peso: '2.5kg', bateria: '90Wh', portas: 'USB-C, 3x USB-A, HDMI 2.1, RJ45', teclado: 'RGB per-key' },
            tags: ['asus', 'rog', 'gaming', 'rtx4080', '240hz'],
            options: [
              { name: 'Configuração', values: ['RTX 4070/16GB', 'RTX 4080/32GB'] }
            ]
          },
          {
            name: 'Lenovo ThinkPad X1 Carbon',
            brand: 'lg', // Usando LG pois não temos Lenovo
            basePrice: 11999.00,
            description: 'Ultrabook empresarial com 14" 2.8K, Intel vPro e durabilidade militar.',
            attributes: { tela: '14" 2.8K', processador: 'Intel i7-1365U vPro', ram: '32GB', ssd: '1TB', gpu: 'Intel Iris Xe' },
            specifications: { peso: '1.12kg', bateria: '57Wh', portas: '2x Thunderbolt 4, 2x USB-A, HDMI', teclado: 'ThinkPad retroiluminado' },
            tags: ['thinkpad', 'business', 'ultrabook', 'vpro'],
            options: [
              { name: 'Display', values: ['FHD Touch', '2.8K OLED'] }
            ]
          },
          {
            name: 'HP Spectre x360 16"',
            brand: 'samsung', // Usando Samsung pois não temos HP
            basePrice: 13499.00,
            description: 'Conversível 2-em-1 com tela OLED 3K+ touch e Intel Arc.',
            attributes: { tela: '16" 3K+ OLED Touch', processador: 'Intel i7-13700H', ram: '32GB', ssd: '1TB', gpu: 'Intel Arc A370M' },
            specifications: { peso: '2.19kg', bateria: '83Wh', portas: '2x Thunderbolt 4, USB-A, HDMI', teclado: 'Retroiluminado' },
            tags: ['hp', 'spectre', '2em1', 'oled', 'touch'],
            options: [
              { name: 'Cor', values: ['Nightfall Black', 'Nocturne Blue'] }
            ]
          }
        ]
      },
      // TVs
      {
        category: 'tvs',
        products: [
          {
            name: 'Samsung Neo QLED 8K 75"',
            brand: 'samsung',
            basePrice: 29999.00,
            description: 'TV 8K com Quantum Matrix Technology Pro, processador Neural 8K e som Dolby Atmos.',
            attributes: { tamanho: '75"', resolucao: '8K', tecnologia: 'Neo QLED', hdr: 'HDR10+', smart: 'Tizen OS' },
            specifications: { taxa: '120Hz', hdmi: '4x HDMI 2.1', audio: '6.2.4ch 90W', gaming: 'Game Mode Pro' },
            tags: ['samsung', '8k', 'neo-qled', 'premium', 'gaming'],
            options: [
              { name: 'Tamanho', values: ['65"', '75"', '85"'] }
            ]
          },
          {
            name: 'LG OLED evo C3 65"',
            brand: 'lg',
            basePrice: 12999.00,
            description: 'TV OLED com processador α9 AI 4K Gen6, Dolby Vision IQ e webOS 23.',
            attributes: { tamanho: '65"', resolucao: '4K', tecnologia: 'OLED evo', hdr: 'Dolby Vision IQ', smart: 'webOS 23' },
            specifications: { taxa: '120Hz', hdmi: '4x HDMI 2.1', audio: '2.2ch 40W', gaming: 'G-Sync, FreeSync' },
            tags: ['lg', 'oled', '4k', 'dolby-vision', 'gaming'],
            options: [
              { name: 'Tamanho', values: ['55"', '65"', '77"', '83"'] }
            ]
          },
          {
            name: 'Sony BRAVIA XR A95L 77"',
            brand: 'sony',
            basePrice: 34999.00,
            description: 'TV QD-OLED com Cognitive Processor XR e Acoustic Surface Audio+.',
            attributes: { tamanho: '77"', resolucao: '4K', tecnologia: 'QD-OLED', hdr: 'HDR10/Dolby Vision', smart: 'Google TV' },
            specifications: { taxa: '120Hz', hdmi: '4x HDMI 2.1', audio: 'Acoustic Surface Audio+', gaming: 'Perfect for PS5' },
            tags: ['sony', 'qd-oled', 'bravia', 'premium', 'ps5'],
            options: [
              { name: 'Tamanho', values: ['55"', '65"', '77"'] }
            ]
          },
          {
            name: 'TCL Mini LED 4K 75"',
            brand: 'lg', // Usando LG pois não temos TCL
            basePrice: 7999.00,
            description: 'TV Mini LED com Quantum Dot, 144Hz para gaming e Google TV.',
            attributes: { tamanho: '75"', resolucao: '4K', tecnologia: 'Mini LED QLED', hdr: 'Dolby Vision', smart: 'Google TV' },
            specifications: { taxa: '144Hz VRR', hdmi: '2x HDMI 2.1', audio: 'Dolby Atmos', gaming: 'Game Master Pro 2.0' },
            tags: ['tcl', 'mini-led', '4k', '144hz', 'gaming'],
            options: [
              { name: 'Tamanho', values: ['65"', '75"', '85"'] }
            ]
          },
          {
            name: 'Philips Ambilight OLED 55"',
            brand: 'samsung', // Usando Samsung pois não temos Philips
            basePrice: 9999.00,
            description: 'TV OLED com Ambilight 4 lados, P5 AI Perfect Picture e Dolby Atmos.',
            attributes: { tamanho: '55"', resolucao: '4K', tecnologia: 'OLED', hdr: 'HDR10+ Adaptive', smart: 'Android TV' },
            specifications: { taxa: '120Hz', hdmi: '4x HDMI 2.1', audio: '2.1ch 50W', gaming: 'VRR, ALLM' },
            tags: ['philips', 'ambilight', 'oled', '4k'],
            options: [
              { name: 'Tamanho', values: ['48"', '55"', '65"'] }
            ]
          }
        ]
      },
      // Consoles
      {
        category: 'playstation',
        products: [
          {
            name: 'PlayStation 5 Slim Digital',
            brand: 'sony',
            basePrice: 3499.00,
            description: 'Console PlayStation 5 versão Slim Digital com SSD de 1TB.',
            attributes: { armazenamento: '1TB SSD', cpu: 'AMD Zen 2 8-core', gpu: 'AMD RDNA 2', ram: '16GB GDDR6', resolucao: 'Até 4K 120fps' },
            specifications: { peso: '2.6kg', dimensoes: '358×96×216mm', audio: 'Tempest 3D', conectividade: 'Wi-Fi 6, Bluetooth 5.1' },
            tags: ['ps5', 'playstation', 'sony', 'console', 'gaming'],
            options: [
              { name: 'Bundle', values: ['Console apenas', 'Com Spider-Man 2', 'Com God of War Ragnarök'] }
            ]
          },
          {
            name: 'Xbox Series X 1TB',
            brand: 'sony', // Usando Sony pois não temos Microsoft
            basePrice: 3999.00,
            description: 'Console mais poderoso da Microsoft com 12 teraflops e ray tracing.',
            attributes: { armazenamento: '1TB SSD', cpu: 'AMD Zen 2 8-core', gpu: '12 TFLOPS AMD RDNA 2', ram: '16GB GDDR6', resolucao: 'Até 4K 120fps/8K' },
            specifications: { peso: '4.45kg', dimensoes: '301×151×151mm', audio: 'Spatial Sound', conectividade: 'Wi-Fi, Bluetooth' },
            tags: ['xbox', 'series-x', 'microsoft', 'console', 'gaming'],
            options: [
              { name: 'Cor', values: ['Carbon Black', 'Robot White'] }
            ]
          },
          {
            name: 'Nintendo Switch OLED',
            brand: 'lg', // Usando LG pois não temos Nintendo
            basePrice: 2499.00,
            description: 'Console híbrido com tela OLED de 7 polegadas vibrante.',
            attributes: { tela: '7" OLED', armazenamento: '64GB', bateria: '4.5-9 horas', cpu: 'NVIDIA Tegra X1+', resolucao: 'Até 1080p docked' },
            specifications: { peso: '420g com Joy-Con', dimensoes: '242×102×13.9mm', audio: 'Stereo aprimorado', conectividade: 'Wi-Fi, Bluetooth' },
            tags: ['nintendo', 'switch', 'oled', 'portable', 'gaming'],
            options: [
              { name: 'Cor', values: ['Neon Blue/Red', 'White', 'Zelda Edition'] }
            ]
          },
          {
            name: 'Steam Deck OLED 1TB',
            brand: 'lg', // Usando LG pois não temos Valve
            basePrice: 4999.00,
            description: 'PC portátil para jogos com tela OLED HDR e 1TB de armazenamento.',
            attributes: { tela: '7.4" OLED HDR', armazenamento: '1TB NVMe SSD', cpu: 'AMD APU Zen 2', gpu: 'AMD RDNA 2', ram: '16GB LPDDR5' },
            specifications: { peso: '640g', bateria: '3-12 horas', audio: 'Stereo com DSP', conectividade: 'Wi-Fi 6E, Bluetooth 5.3' },
            tags: ['steam-deck', 'valve', 'portable', 'pc-gaming'],
            options: [
              { name: 'Armazenamento', values: ['512GB', '1TB'] }
            ]
          },
          {
            name: 'ASUS ROG Ally',
            brand: 'lg', // Usando LG pois não temos ASUS
            basePrice: 3999.00,
            description: 'Console portátil Windows com AMD Ryzen Z1 Extreme e tela 120Hz.',
            attributes: { tela: '7" FHD 120Hz', processador: 'AMD Ryzen Z1 Extreme', ram: '16GB', armazenamento: '512GB', gpu: 'AMD RDNA 3' },
            specifications: { peso: '608g', bateria: '40Wh', audio: 'Dolby Atmos', conectividade: 'Wi-Fi 6E, Bluetooth 5.2' },
            tags: ['rog-ally', 'asus', 'portable', 'windows', 'gaming'],
            options: [
              { name: 'Processador', values: ['Z1', 'Z1 Extreme'] }
            ]
          }
        ]
      },
      // Fones de Ouvido
      {
        category: 'fones-ouvido',
        products: [
          {
            name: 'AirPods Pro 2ª Geração USB-C',
            brand: 'apple',
            basePrice: 2249.00,
            description: 'Fones com cancelamento de ruído adaptativo, áudio espacial e chip H2.',
            attributes: { tipo: 'In-ear TWS', anc: 'Adaptativo', bateria: '6h (30h com case)', resistencia: 'IPX4', conectividade: 'Bluetooth 5.3' },
            specifications: { driver: 'Custom Apple', codec: 'AAC', controles: 'Touch + Volume', carregamento: 'USB-C, MagSafe, Qi' },
            tags: ['airpods', 'apple', 'tws', 'anc', 'premium'],
            options: [
              { name: 'Gravação', values: ['Sem gravação', 'Com gravação personalizada'] }
            ]
          },
          {
            name: 'Sony WH-1000XM5',
            brand: 'sony',
            basePrice: 2799.00,
            description: 'Headphone com o melhor cancelamento de ruído do mercado e 30h de bateria.',
            attributes: { tipo: 'Over-ear', anc: 'Industry Leading', bateria: '30h', resistencia: 'N/A', conectividade: 'Bluetooth 5.2' },
            specifications: { driver: '30mm', codec: 'LDAC, AAC, SBC', controles: 'Touch', carregamento: 'USB-C fast charge' },
            tags: ['sony', 'wh1000xm5', 'anc', 'over-ear', 'premium'],
            options: [
              { name: 'Cor', values: ['Preto', 'Prata', 'Midnight Blue'] }
            ]
          },
          {
            name: 'Bose QuietComfort Ultra',
            brand: 'lg', // Usando LG pois não temos Bose
            basePrice: 3299.00,
            description: 'Fone com Immersive Audio, cancelamento de ruído de classe mundial.',
            attributes: { tipo: 'Over-ear', anc: 'World-class', bateria: '24h', resistencia: 'N/A', conectividade: 'Bluetooth 5.3' },
            specifications: { driver: '35mm', codec: 'aptX Adaptive, AAC, SBC', controles: 'Touch + Botões', carregamento: 'USB-C' },
            tags: ['bose', 'quietcomfort', 'anc', 'immersive', 'premium'],
            options: [
              { name: 'Cor', values: ['Black', 'White Smoke', 'Sandstone'] }
            ]
          },
          {
            name: 'Samsung Galaxy Buds3 Pro',
            brand: 'samsung',
            basePrice: 1799.00,
            description: 'TWS com design blade, ANC inteligente e som Hi-Fi 24bit.',
            attributes: { tipo: 'In-ear TWS', anc: 'Inteligente', bateria: '6h (26h com case)', resistencia: 'IP57', conectividade: 'Bluetooth 5.4' },
            specifications: { driver: '10.5mm + 6.1mm planar', codec: 'SSC HiFi, AAC, SBC', controles: 'Touch + Pinch', carregamento: 'USB-C, Qi' },
            tags: ['galaxy-buds', 'samsung', 'tws', 'anc', 'hifi'],
            options: [
              { name: 'Cor', values: ['Graphite', 'White'] }
            ]
          },
          {
            name: 'JBL Tour Pro 2',
            brand: 'lg', // Usando LG pois não temos JBL
            basePrice: 1499.00,
            description: 'TWS com case touchscreen inteligente e True Adaptive ANC.',
            attributes: { tipo: 'In-ear TWS', anc: 'True Adaptive', bateria: '10h (40h com case)', resistencia: 'IPX5', conectividade: 'Bluetooth 5.3' },
            specifications: { driver: '10mm', codec: 'AAC, SBC', controles: 'Touch + Smart Case', carregamento: 'USB-C, Qi' },
            tags: ['jbl', 'tour-pro', 'tws', 'smart-case', 'anc'],
            options: [
              { name: 'Cor', values: ['Black', 'Champagne'] }
            ]
          }
        ]
      }
    ]
    
    let totalProducts = 0
    
    // Para cada vendedor, criar 5 produtos
    for (let sellerIndex = 0; sellerIndex < sellerIds.length; sellerIndex++) {
      const sellerId = sellerIds[sellerIndex]
      const sellerProducts = []
      
      // Selecionar produtos de diferentes categorias para cada vendedor
      for (let catIndex = 0; catIndex < productTemplates.length; catIndex++) {
        const template = productTemplates[catIndex]
        const productIndex = (sellerIndex + catIndex) % template.products.length
        const productData = template.products[productIndex]
        
        // Buscar IDs reais
        const brand = brands.find(b => b.slug === productData.brand)
        const category = categories.find(c => c.slug === template.category)
        
        if (!brand || !category) continue
        
        // Criar produto principal
        const sku = generateSKU(productData.brand.toUpperCase(), totalProducts + 1)
        const slug = createSlug(productData.name)
        
        const product = await db.queryOne`
          INSERT INTO products (
            sku, name, slug, description,
            brand_id, category_id, seller_id,
            price, original_price, cost,
            quantity, track_inventory,
            meta_title, meta_description,
            tags, attributes, specifications,
            featured, rating_average, published_at
          ) VALUES (
            ${sku}, ${productData.name}, ${slug}, ${productData.description},
            ${brand.id}, ${category.id}, ${sellerId},
            ${productData.basePrice}, ${productData.basePrice * 1.2}, ${productData.basePrice * 0.6},
            ${randomInt(10, 100)}, true,
            ${productData.name + ' - Melhor Preço'}, ${productData.description.substring(0, 160)},
            ${productData.tags}, ${JSON.stringify(productData.attributes)}, ${JSON.stringify(productData.specifications)},
            ${Math.random() > 0.7}, ${(Math.random() * 2 + 3).toFixed(1)}, NOW()
          ) RETURNING id
        `
        
        // Criar imagens do produto
        const imageUrls = [
          `https://picsum.photos/seed/${slug}-1/800/800`,
          `https://picsum.photos/seed/${slug}-2/800/800`,
          `https://picsum.photos/seed/${slug}-3/800/800`,
          `https://picsum.photos/seed/${slug}-4/800/800`
        ]
        
        for (let i = 0; i < imageUrls.length; i++) {
          await db.execute`
            INSERT INTO product_images (product_id, url, alt_text, position, is_primary)
            VALUES (${product.id}, ${imageUrls[i]}, ${productData.name + ' - Imagem ' + (i + 1)}, ${i}, ${i === 0})
          `
        }
        
        // Criar opções e variações
        if (productData.options && productData.options.length > 0) {
          for (const option of productData.options) {
            const optionResult = await db.queryOne`
              INSERT INTO product_options (product_id, name, position)
              VALUES (${product.id}, ${option.name}, 0)
              RETURNING id
            `
            
            // Criar valores das opções
            const optionValueIds = []
            for (let v = 0; v < option.values.length; v++) {
              const valueResult = await db.queryOne`
                INSERT INTO product_option_values (option_id, value, position)
                VALUES (${optionResult.id}, ${option.values[v]}, ${v})
                RETURNING id
              `
              optionValueIds.push({ id: valueResult.id, value: option.values[v] })
            }
            
            // Criar variações para algumas combinações
            if (option.name === 'Cor' || optionValueIds.length <= 3) {
              for (const optionValue of optionValueIds) {
                const variantSku = `${sku}-${optionValue.value.replace(/\s+/g, '-').toUpperCase()}`
                const variantPrice = productData.basePrice * (1 + Math.random() * 0.1)
                
                const variant = await db.queryOne`
                  INSERT INTO product_variants (
                    product_id, sku, price, original_price, quantity, is_active
                  ) VALUES (
                    ${product.id}, ${variantSku}, ${variantPrice}, ${variantPrice * 1.2}, 
                    ${randomInt(5, 50)}, true
                  ) RETURNING id
                `
                
                // Associar variante com valor da opção
                await db.execute`
                  INSERT INTO variant_option_values (variant_id, option_value_id)
                  VALUES (${variant.id}, ${optionValue.id})
                `
              }
            }
          }
        }
        
        // Adicionar produto a múltiplas categorias (categoria principal já está definida)
        // Adicionar também à categoria pai se existir
        const parentCategory = categories.find(c => c.id === category.parent_id)
        if (parentCategory) {
          await db.execute`
            INSERT INTO product_categories (product_id, category_id, is_primary)
            VALUES (${product.id}, ${category.parent_id}, false)
            ON CONFLICT DO NOTHING
          `
        }
        
        // Criar histórico de preço
        await db.execute`
          INSERT INTO product_price_history (product_id, price, original_price, reason)
          VALUES (${product.id}, ${productData.basePrice}, ${productData.basePrice * 1.2}, 'Preço inicial')
        `
        
        // Criar analytics inicial
        await db.execute`
          INSERT INTO product_analytics (product_id, date, views, clicks, add_to_cart, purchases, revenue)
          VALUES (
            ${product.id}, 
            CURRENT_DATE, 
            ${randomInt(100, 1000)}, 
            ${randomInt(50, 200)}, 
            ${randomInt(10, 50)}, 
            ${randomInt(1, 10)}, 
            ${randomInt(1, 10) * productData.basePrice}
          )
        `
        
        // Criar algumas reviews
        const reviewCount = randomInt(3, 8)
        for (let r = 0; r < reviewCount; r++) {
          const rating = randomInt(3, 5)
          const reviewTitles = [
            'Excelente produto!', 'Muito bom', 'Recomendo', 'Ótima compra', 
            'Superou expectativas', 'Produto de qualidade', 'Vale a pena'
          ]
          const reviewComments = [
            'Produto chegou rápido e bem embalado. Qualidade excelente!',
            'Atendeu todas as minhas expectativas. Recomendo a compra.',
            'Ótimo custo-benefício. Estou muito satisfeito.',
            'Produto original, chegou antes do prazo. Vendedor confiável.',
            'Qualidade premium, vale cada centavo investido.',
            'Comprei e não me arrependi. Produto top!',
            'Entrega rápida, produto conforme anunciado.'
          ]
          
          // Usar um ID de usuário aleatório (não de vendedor)
          const randomUserId = userIds[randomInt(0, userIds.length - 1)]
          
          await db.execute`
            INSERT INTO reviews (
              product_id, user_id, rating, title, comment, is_verified, helpful_count
            ) VALUES (
              ${product.id}, 
              ${randomUserId}, 
              ${rating},
              ${reviewTitles[r % reviewTitles.length]},
              ${reviewComments[r % reviewComments.length]},
              true,
              ${randomInt(0, 20)}
            )
          `
        }
        
        totalProducts++
        sellerProducts.push(productData.name)
      }
      
      console.log(`✅ Vendedor ${sellerIndex + 1}: ${sellerProducts.length} produtos criados`)
    }
    
    // 3. Criar cupons de desconto
    console.log('\n🎟️ Criando cupons de desconto...')
    
    const coupons = [
      { code: 'BEMVINDO10', description: '10% de desconto para novos clientes', type: 'percentage', value: 10, minimum: 100 },
      { code: 'FRETEGRATIS', description: 'Frete grátis em compras acima de R$ 200', type: 'fixed', value: 30, minimum: 200 },
      { code: 'NATAL25', description: '25% de desconto de Natal', type: 'percentage', value: 25, minimum: 500, maximum: 250 },
      { code: 'TECH15', description: '15% em produtos de tecnologia', type: 'percentage', value: 15, minimum: 300 },
      { code: 'APP20', description: '20% de desconto exclusivo do app', type: 'percentage', value: 20, minimum: 150 }
    ]
    
    for (const coupon of coupons) {
      const couponResult = await db.queryOne`
        INSERT INTO coupons (
          code, description, type, value, 
          minimum_amount, maximum_discount, usage_limit,
          valid_from, valid_until, is_active
        ) VALUES (
          ${coupon.code}, ${coupon.description}, ${coupon.type}, ${coupon.value},
          ${coupon.minimum}, ${coupon.maximum || null}, ${randomInt(100, 1000)},
          NOW(), NOW() + INTERVAL '30 days', true
        ) RETURNING id
      `
      
      // Associar alguns cupons a produtos específicos
      if (coupon.code === 'TECH15') {
        const techProducts = await db.query`
          SELECT id FROM products 
          WHERE category_id IN (
            SELECT id FROM categories WHERE slug IN ('smartphones', 'notebooks')
          )
          LIMIT 10
        `
        
        for (const product of techProducts) {
          await db.execute`
            INSERT INTO product_coupons (coupon_id, product_id)
            VALUES (${couponResult.id}, ${product.id})
          `
        }
      }
    }
    
    console.log(`✅ ${coupons.length} cupons criados`)
    
    // 4. Criar banners promocionais
    console.log('\n🎨 Criando banners promocionais...')
    
    const banners = [
      {
        title: 'Black Friday Antecipada',
        subtitle: 'Até 70% de desconto em produtos selecionados',
        image: 'https://picsum.photos/seed/banner-bf/1920/600',
        link: '/categoria/eletronicos',
        position: 'home'
      },
      {
        title: 'Novos iPhones 15',
        subtitle: 'Em até 12x sem juros com frete grátis',
        image: 'https://picsum.photos/seed/banner-iphone/1920/600',
        link: '/categoria/smartphones',
        position: 'home'
      },
      {
        title: 'Gaming Week',
        subtitle: 'Consoles e jogos com preços imperdíveis',
        image: 'https://picsum.photos/seed/banner-gaming/1920/600',
        link: '/categoria/games',
        position: 'category'
      }
    ]
    
    for (let i = 0; i < banners.length; i++) {
      const banner = banners[i]
      await db.execute`
        INSERT INTO banners (
          title, subtitle, image_url, link_url, 
          position, display_order, is_active,
          starts_at, ends_at
        ) VALUES (
          ${banner.title}, ${banner.subtitle}, ${banner.image}, ${banner.link},
          ${banner.position}, ${i}, true,
          NOW(), NOW() + INTERVAL '30 days'
        )
      `
    }
    
    console.log(`✅ ${banners.length} banners criados`)
    
    // 5. Atualizar estatísticas dos vendedores
    console.log('\n📊 Atualizando estatísticas dos vendedores...')
    
    for (const sellerId of sellerIds) {
      const stats = await db.queryOne`
        SELECT 
          COUNT(DISTINCT p.id) as product_count,
          COUNT(DISTINCT r.id) as review_count,
          COALESCE(AVG(r.rating), 0) as avg_rating
        FROM sellers s
        LEFT JOIN products p ON p.seller_id = s.id
        LEFT JOIN reviews r ON r.product_id = p.id
        WHERE s.id = ${sellerId}
        GROUP BY s.id
      `
      
      await db.execute`
        UPDATE sellers 
        SET 
          rating_average = ${stats.avg_rating || 4.5},
          rating_count = ${stats.review_count || 0},
          total_sales = ${randomInt(50, 500)}
        WHERE id = ${sellerId}
      `
    }
    
    console.log('✅ Estatísticas dos vendedores atualizadas')
    
    // Resumo final
    console.log('\n✨ Seed completo concluído com sucesso!')
    console.log('\n📊 Resumo final:')
    
    const summary = await db.queryOne`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM sellers) as total_sellers,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM product_variants) as total_variants,
        (SELECT COUNT(*) FROM product_images) as total_images,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COUNT(*) FROM coupons) as total_coupons,
        (SELECT COUNT(*) FROM banners) as total_banners
    `
    
    console.log(`- ${summary.total_users} usuários`)
    console.log(`- ${summary.total_sellers} vendedores`)
    console.log(`- ${summary.total_products} produtos`)
    console.log(`- ${summary.total_variants} variações`)
    console.log(`- ${summary.total_images} imagens`)
    console.log(`- ${summary.total_reviews} avaliações`)
    console.log(`- ${summary.total_coupons} cupons`)
    console.log(`- ${summary.total_banners} banners`)
    
    console.log('\n🔑 Novos vendedores criados:')
    console.log('- techstore@marketplace.com / tech123')
    console.log('- gamezone@marketplace.com / game123')
    console.log('- smartshop@marketplace.com / smart123')
    console.log('- megastore@marketplace.com / mega123')
    
  } catch (error) {
    console.error('❌ Erro no seed completo:', error)
    throw error
  } finally {
    await db.close()
  }
}

seedCompleteData().catch(console.error) 