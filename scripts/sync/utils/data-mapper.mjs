#!/usr/bin/env node

import crypto from 'crypto'

/**
 * Mapeador de dados MongoDB → PostgreSQL
 * Converte estruturas de dados entre os dois bancos
 */
export class DataMapper {
  constructor(options = {}) {
    this.options = {
      anonymizeUsers: options.anonymizeUsers || process.env.ANONYMIZE_USERS === 'true',
      preservePasswords: options.preservePasswords || false,
      defaultStock: options.defaultStock || 10,
      tagPrefix: options.tagPrefix || 'sync-',
      ...options
    }
    
    // Cache para mapeamentos frequentes
    this.categoryCache = new Map()
    this.sellerCache = new Map()
    this.brandCache = new Map()
  }

  /**
   * Mapear produto MongoDB → PostgreSQL
   */
  mapProduct(mongoProduct) {
    if (!mongoProduct) return null
    
    // Determinar estoque
    let stock = this.options.defaultStock
    if (mongoProduct.stock && mongoProduct.stock > 0) {
      stock = mongoProduct.stock
    } else if (mongoProduct.realStock && mongoProduct.realStock > 0) {
      stock = mongoProduct.realStock
    } else if (mongoProduct.virtualStock && mongoProduct.virtualStock > 0) {
      stock = mongoProduct.virtualStock
    } else if (!mongoProduct.activeForSeo) {
      stock = 0
    }
    
    // Mapear imagens
    const images = this.mapProductImages(mongoProduct)
    
    // Criar slug se não existir
    const slug = mongoProduct.slug || this.createSlug(mongoProduct.name || mongoProduct.productName)
    
    // Tags do produto
    const tags = this.mapProductTags(mongoProduct)
    
    return {
      // Identificadores
      sku: mongoProduct.productId?.toString() || mongoProduct.sku || this.generateSKU(),
      barcode: mongoProduct.ean || mongoProduct.barcode || null,
      
      // Informações básicas
      name: mongoProduct.name || mongoProduct.productName || 'Produto sem nome',
      slug: slug,
      description: this.mapDescription(mongoProduct),
      short_description: mongoProduct.shortDescription || null,
      
      // Preços
      price: this.parsePrice(mongoProduct.price || mongoProduct.salePrice),
      compare_at_price: this.parsePrice(mongoProduct.originalPrice || mongoProduct.comparePrice),
      cost: this.parsePrice(mongoProduct.cost || mongoProduct.costPrice),
      
      // Estoque
      quantity: stock,
      track_inventory: mongoProduct.trackStock !== false,
      allow_backorder: mongoProduct.allowBackorder || false,
      
      // Dimensões e peso
      weight: this.parseWeight(mongoProduct),
      width: mongoProduct.width || mongoProduct.dimensions?.width || null,
      height: mongoProduct.height || mongoProduct.dimensions?.height || null,
      length: mongoProduct.length || mongoProduct.dimensions?.length || null,
      
      // Status
      is_active: mongoProduct.activeForSeo !== false,
      is_featured: mongoProduct.featured || mongoProduct.isFeatured || false,
      
      // SEO
      meta_title: mongoProduct.metaTitle || mongoProduct.seoTitle || null,
      meta_description: mongoProduct.metaDescription || mongoProduct.seoDescription || null,
      meta_keywords: mongoProduct.metaKeywords || mongoProduct.seoKeywords || null,
      
      // Categorização
      category_id: this.mapCategoryId(mongoProduct),
      brand: mongoProduct.brand || mongoProduct.manufacturer || null,
      
      // Imagens e mídia
      images: images,
      video_url: mongoProduct.videoUrl || mongoProduct.video || null,
      
      // Tags e metadata
      tags: tags,
      metadata: {
        imported_from: 'mongodb',
        imported_at: new Date().toISOString(),
        original_id: mongoProduct._id?.toString(),
        sync_version: '1.0',
        ...this.extractAdditionalData(mongoProduct)
      }
    }
  }

  /**
   * Mapear usuário MongoDB → PostgreSQL
   */
  mapUser(mongoUser) {
    if (!mongoUser) return null
    
    const email = this.options.anonymizeUsers ? 
      this.anonymizeEmail(mongoUser.email) : 
      mongoUser.email
    
    return {
      // Identificação
      email: email,
      name: mongoUser.name || mongoUser.fullName || 'Usuário',
      
      // Autenticação
      password_hash: this.options.preservePasswords ? mongoUser.password : null,
      
      // Informações pessoais (anonimizadas se necessário)
      phone: this.options.anonymizeUsers ? null : mongoUser.phone,
      document: this.options.anonymizeUsers ? null : mongoUser.cpf || mongoUser.document,
      birth_date: this.options.anonymizeUsers ? null : mongoUser.birthDate,
      
      // Tipo e status
      role: this.mapUserRole(mongoUser),
      is_active: mongoUser.active !== false,
      is_verified: mongoUser.verified || mongoUser.emailVerified || false,
      
      // Endereços
      addresses: this.mapUserAddresses(mongoUser),
      
      // Preferências
      preferences: {
        newsletter: mongoUser.newsletter || false,
        notifications: mongoUser.notifications || true,
        language: mongoUser.language || 'pt-BR',
        currency: mongoUser.currency || 'BRL'
      },
      
      // Metadata
      metadata: {
        imported_from: 'mongodb',
        imported_at: new Date().toISOString(),
        original_id: mongoUser._id?.toString(),
        anonymized: this.options.anonymizeUsers
      },
      
      // Timestamps
      created_at: mongoUser.createdAt || mongoUser.created || new Date(),
      updated_at: mongoUser.updatedAt || mongoUser.updated || new Date()
    }
  }

  /**
   * Mapear pedido MongoDB → PostgreSQL
   */
  mapOrder(mongoOrder) {
    if (!mongoOrder) return null
    
    return {
      // Identificação
      order_number: mongoOrder.orderNumber || mongoOrder.number || this.generateOrderNumber(),
      
      // Cliente
      user_id: null, // Será resolvido depois
      customer_email: this.options.anonymizeUsers ? 
        this.anonymizeEmail(mongoOrder.customerEmail || mongoOrder.email) :
        mongoOrder.customerEmail || mongoOrder.email,
      customer_name: mongoOrder.customerName || mongoOrder.name || 'Cliente',
      
      // Status
      status: this.mapOrderStatus(mongoOrder),
      payment_status: this.mapPaymentStatus(mongoOrder),
      fulfillment_status: this.mapFulfillmentStatus(mongoOrder),
      
      // Valores
      subtotal: this.parsePrice(mongoOrder.subtotal),
      shipping_total: this.parsePrice(mongoOrder.shippingCost || mongoOrder.shipping),
      discount_total: this.parsePrice(mongoOrder.discount || mongoOrder.discountTotal),
      tax_total: this.parsePrice(mongoOrder.tax || mongoOrder.taxTotal),
      total: this.parsePrice(mongoOrder.total || mongoOrder.grandTotal),
      
      // Itens
      items: this.mapOrderItems(mongoOrder),
      
      // Entrega
      shipping_address: this.mapAddress(mongoOrder.shippingAddress),
      billing_address: this.mapAddress(mongoOrder.billingAddress),
      shipping_method: mongoOrder.shippingMethod || null,
      tracking_number: mongoOrder.trackingNumber || mongoOrder.tracking || null,
      
      // Pagamento
      payment_method: mongoOrder.paymentMethod || null,
      transaction_id: mongoOrder.transactionId || mongoOrder.paymentId || null,
      
      // Notas
      notes: mongoOrder.notes || mongoOrder.observations || null,
      
      // Metadata
      metadata: {
        imported_from: 'mongodb',
        imported_at: new Date().toISOString(),
        original_id: mongoOrder._id?.toString(),
        original_status: mongoOrder.status
      },
      
      // Timestamps
      created_at: mongoOrder.createdAt || mongoOrder.created || new Date(),
      updated_at: mongoOrder.updatedAt || mongoOrder.updated || new Date(),
      paid_at: mongoOrder.paidAt || null,
      shipped_at: mongoOrder.shippedAt || null,
      delivered_at: mongoOrder.deliveredAt || null
    }
  }

  // Métodos auxiliares

  createSlug(text) {
    if (!text) return ''
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  generateSKU() {
    return `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  generateOrderNumber() {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  }

  parsePrice(value) {
    if (!value) return 0
    if (typeof value === 'number') return value
    
    // Remover símbolos de moeda e converter
    const cleaned = value.toString()
      .replace(/[R$\s]/g, '')
      .replace(',', '.')
    
    return parseFloat(cleaned) || 0
  }

  parseWeight(product) {
    const weight = product.weight || product.peso || product.productWeight
    if (!weight) return null
    
    if (typeof weight === 'object') {
      return weight.value || weight.kg || null
    }
    
    return parseFloat(weight) || null
  }

  mapProductImages(product) {
    const images = []
    
    // Coletar todas as possíveis fontes de imagens
    const imageSources = [
      product.images,
      product.photos,
      product.productImages,
      product.image ? [product.image] : [],
      product.mainImage ? [product.mainImage] : []
    ].filter(Boolean).flat()
    
    for (const img of imageSources) {
      if (typeof img === 'string') {
        images.push({
          url: img,
          alt: product.name || 'Imagem do produto',
          is_primary: images.length === 0
        })
      } else if (img && img.url) {
        images.push({
          url: img.url || img.src,
          alt: img.alt || img.title || product.name || 'Imagem do produto',
          is_primary: img.isPrimary || img.isMain || images.length === 0
        })
      }
    }
    
    // Se não houver imagens, adicionar placeholder
    if (images.length === 0) {
      images.push({
        url: '/placeholder.jpg',
        alt: 'Imagem não disponível',
        is_primary: true,
        is_placeholder: true
      })
    }
    
    return images
  }

  mapProductTags(product) {
    const tags = []
    
    // Tag de sincronização
    tags.push(`${this.options.tagPrefix}mongodb`)
    tags.push(`${this.options.tagPrefix}${new Date().toISOString().split('T')[0]}`)
    
    // Tags do produto
    if (product.tags) {
      if (Array.isArray(product.tags)) {
        tags.push(...product.tags)
      } else if (typeof product.tags === 'string') {
        tags.push(...product.tags.split(',').map(t => t.trim()))
      }
    }
    
    // Tags baseadas em status
    if (!product.activeForSeo) tags.push('inativo')
    if (product.featured) tags.push('destaque')
    if (product.stock === 0) tags.push('sem-estoque')
    
    return [...new Set(tags)] // Remover duplicatas
  }

  mapDescription(product) {
    // Tentar várias fontes de descrição
    const description = product.description || 
                       product.longDescription || 
                       product.productDescription ||
                       product.detailedDescription ||
                       ''
    
    // Limpar HTML básico se necessário
    return description
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .trim()
  }

  mapCategoryId(product) {
    // Por enquanto retorna null, será resolvido em outro passo
    // quando tivermos o mapeamento de categorias
    return null
  }

  mapUserRole(user) {
    if (user.isAdmin || user.role === 'admin') return 'admin'
    if (user.isSeller || user.role === 'seller') return 'seller'
    return 'customer'
  }

  mapUserAddresses(user) {
    const addresses = []
    
    if (user.addresses && Array.isArray(user.addresses)) {
      addresses.push(...user.addresses.map(addr => this.mapAddress(addr)))
    }
    
    if (user.address) {
      addresses.push(this.mapAddress(user.address))
    }
    
    return addresses
  }

  mapAddress(address) {
    if (!address) return null
    
    return {
      street: address.street || address.logradouro || address.address || '',
      number: address.number || address.numero || '',
      complement: address.complement || address.complemento || '',
      neighborhood: address.neighborhood || address.bairro || '',
      city: address.city || address.cidade || '',
      state: address.state || address.estado || address.uf || '',
      postal_code: address.postalCode || address.cep || address.zipCode || '',
      country: address.country || address.pais || 'BR',
      reference: address.reference || address.referencia || '',
      is_default: address.isDefault || address.principal || false
    }
  }

  mapOrderStatus(order) {
    const statusMap = {
      'pending': 'pending',
      'processing': 'processing',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
      'aguardando': 'pending',
      'processando': 'processing',
      'enviado': 'shipped',
      'entregue': 'delivered',
      'cancelado': 'cancelled',
      'devolvido': 'refunded'
    }
    
    const status = order.status?.toLowerCase() || 'pending'
    return statusMap[status] || 'pending'
  }

  mapPaymentStatus(order) {
    if (order.paid || order.isPaid || order.paymentStatus === 'paid') return 'paid'
    if (order.paymentStatus === 'pending') return 'pending'
    if (order.paymentStatus === 'failed') return 'failed'
    return 'pending'
  }

  mapFulfillmentStatus(order) {
    if (order.delivered || order.isDelivered) return 'fulfilled'
    if (order.shipped || order.isShipped) return 'partial'
    return 'unfulfilled'
  }

  mapOrderItems(order) {
    const items = []
    
    if (order.items && Array.isArray(order.items)) {
      items.push(...order.items.map(item => ({
        product_id: null, // Será resolvido depois
        sku: item.sku || item.productId?.toString() || '',
        name: item.name || item.productName || 'Produto',
        quantity: item.quantity || item.qty || 1,
        price: this.parsePrice(item.price || item.unitPrice),
        total: this.parsePrice(item.total || (item.price * item.quantity)),
        metadata: {
          original_id: item._id?.toString(),
          original_product_id: item.productId?.toString()
        }
      })))
    }
    
    return items
  }

  anonymizeEmail(email) {
    if (!email) return 'anonimo@example.com'
    
    const [local, domain] = email.split('@')
    const hash = crypto.createHash('md5').update(email).digest('hex').substr(0, 8)
    return `user_${hash}@${domain}`
  }

  extractAdditionalData(product) {
    const additional = {}
    
    // Campos extras que podem ser úteis
    const extraFields = [
      'model', 'collection', 'season', 'year', 'color', 'size',
      'material', 'origin', 'warranty', 'condition'
    ]
    
    for (const field of extraFields) {
      if (product[field]) {
        additional[field] = product[field]
      }
    }
    
    return additional
  }
}

// Teste se executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testando mapeador de dados...\n')
  
  const mapper = new DataMapper({ anonymizeUsers: true })
  
  // Teste de produto
  const mongoProduct = {
    _id: '507f1f77bcf86cd799439011',
    productId: 12345,
    name: 'Produto Teste',
    price: 'R$ 99,90',
    stock: 50,
    activeForSeo: true,
    images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
  }
  
  const mappedProduct = mapper.mapProduct(mongoProduct)
  console.log('📦 Produto mapeado:', JSON.stringify(mappedProduct, null, 2))
  
  // Teste de usuário
  const mongoUser = {
    _id: '507f1f77bcf86cd799439012',
    email: 'teste@example.com',
    name: 'João Silva',
    phone: '11999999999',
    cpf: '12345678900'
  }
  
  const mappedUser = mapper.mapUser(mongoUser)
  console.log('\n👤 Usuário mapeado:', JSON.stringify(mappedUser, null, 2))
} 