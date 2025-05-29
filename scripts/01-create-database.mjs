#!/usr/bin/env node

import 'dotenv/config'
import { Database } from '../packages/db-hyperdrive/dist/index.js'

console.log('🚀 Iniciando criação do banco de dados...\n')

// Criar conexão com o banco
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

async function createDatabase() {
  try {
    // Criar extensões necessárias
    console.log('📦 Criando extensões...')
    await db.execute`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
    await db.execute`CREATE EXTENSION IF NOT EXISTS "pg_trgm"` // Para busca fuzzy
    console.log('✅ Extensões criadas\n')

    // Criar conexão com o banco
    const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost/mktplace'
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

    // 1. USERS - Tabela base de usuários
    await db.execute`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        phone VARCHAR(20),
        avatar_url VARCHAR(500),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela users criada')

    // 2. SESSIONS - Gerenciamento de sessões
    await db.execute`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela sessions criada')

    // 3. ADDRESSES - Endereços dos usuários
    await db.execute`
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'shipping',
        is_default BOOLEAN DEFAULT false,
        street VARCHAR(255) NOT NULL,
        number VARCHAR(20) NOT NULL,
        complement VARCHAR(255),
        neighborhood VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        state VARCHAR(2) NOT NULL,
        postal_code VARCHAR(10) NOT NULL,
        country VARCHAR(2) NOT NULL DEFAULT 'BR',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela addresses criada')

    // 4. BRANDS - Marcas dos produtos
    await db.execute`
      CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        website VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela brands criada')

    // 5. CATEGORIES - Categorias de produtos
    await db.execute`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        image_url VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT true,
        position INTEGER DEFAULT 0,
        path TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela categories criada')

    // 6. SELLERS - Vendedores do marketplace
    await db.execute`
      CREATE TABLE IF NOT EXISTS sellers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        company_document VARCHAR(20) UNIQUE NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        banner_url VARCHAR(500),
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        rating_average DECIMAL(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        total_sales INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela sellers criada')

    // 7. PRODUCTS - Produtos principais
    await db.execute`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        description TEXT,
        brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        is_active BOOLEAN NOT NULL DEFAULT true,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        cost DECIMAL(10,2),
        currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
        quantity INTEGER NOT NULL DEFAULT 0,
        stock_location VARCHAR(255),
        track_inventory BOOLEAN NOT NULL DEFAULT true,
        allow_backorder BOOLEAN DEFAULT false,
        weight DECIMAL(10,3),
        height DECIMAL(10,2),
        width DECIMAL(10,2),
        length DECIMAL(10,2),
        meta_title VARCHAR(255),
        meta_description TEXT,
        meta_keywords TEXT[],
        tags TEXT[],
        attributes JSONB,
        specifications JSONB,
        view_count INTEGER NOT NULL DEFAULT 0,
        sales_count INTEGER NOT NULL DEFAULT 0,
        rating_average DECIMAL(3,2),
        rating_count INTEGER NOT NULL DEFAULT 0,
        featured BOOLEAN DEFAULT false,
        barcode VARCHAR(100),
        featuring JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        published_at TIMESTAMP
      )
    `
    console.log('✅ Tabela products criada')

    // 8. PRODUCT_IMAGES - Imagens dos produtos
    await db.execute`
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        alt_text VARCHAR(255),
        position INTEGER DEFAULT 0,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela product_images criada')

    // 9. PRODUCT_OPTIONS - Opções de produtos
    await db.execute`
      CREATE TABLE IF NOT EXISTS product_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela product_options criada')

    // 10. PRODUCT_OPTION_VALUES - Valores das opções
    await db.execute`
      CREATE TABLE IF NOT EXISTS product_option_values (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
        value VARCHAR(255) NOT NULL,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela product_option_values criada')

    // 11. PRODUCT_VARIANTS - Variações de produtos
    await db.execute`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku VARCHAR(100) UNIQUE NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        cost DECIMAL(10,2),
        quantity INTEGER NOT NULL DEFAULT 0,
        weight DECIMAL(10,3),
        barcode VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela product_variants criada')

    // 12. VARIANT_OPTION_VALUES - Relação variante-opção
    await db.execute`
      CREATE TABLE IF NOT EXISTS variant_option_values (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
        option_value_id UUID NOT NULL REFERENCES product_option_values(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(variant_id, option_value_id)
      )
    `
    console.log('✅ Tabela variant_option_values criada')

    // 13. PRODUCT_CATEGORIES - Múltiplas categorias por produto
    await db.execute`
      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(product_id, category_id)
      )
    `
    console.log('✅ Tabela product_categories criada')

    // 14. PRODUCT_PRICE_HISTORY - Histórico de preços
    await db.execute`
      CREATE TABLE IF NOT EXISTS product_price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        changed_by UUID REFERENCES users(id),
        reason VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela product_price_history criada')

    // 15. PRODUCT_ANALYTICS - Analytics de produtos
    await db.execute`
      CREATE TABLE IF NOT EXISTS product_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        views INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        add_to_cart INTEGER DEFAULT 0,
        purchases INTEGER DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        UNIQUE(product_id, date)
      )
    `
    console.log('✅ Tabela product_analytics criada')

    // 16. COUPONS - Cupons de desconto
    await db.execute`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'percentage',
        value DECIMAL(10,2) NOT NULL,
        minimum_amount DECIMAL(10,2),
        maximum_discount DECIMAL(10,2),
        usage_limit INTEGER,
        used_count INTEGER DEFAULT 0,
        valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela coupons criada')

    // 17. PRODUCT_COUPONS - Cupons específicos por produto
    await db.execute`
      CREATE TABLE IF NOT EXISTS product_coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(coupon_id, product_id)
      )
    `
    console.log('✅ Tabela product_coupons criada')

    // 18. COUPON_USAGE - Uso de cupons
    await db.execute`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id UUID,
        used_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela coupon_usage criada')

    // 19. CARTS - Carrinhos de compra
    await db.execute`
      CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela carts criada')

    // 20. CART_ITEMS - Itens do carrinho
    await db.execute`
      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela cart_items criada')

    // 21. ABANDONED_CARTS - Carrinhos abandonados
    await db.execute`
      CREATE TABLE IF NOT EXISTS abandoned_carts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255),
        total_value DECIMAL(10,2),
        reminder_sent_count INTEGER DEFAULT 0,
        last_reminder_at TIMESTAMP,
        recovered BOOLEAN DEFAULT false,
        recovered_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela abandoned_carts criada')

    // 22. WISHLISTS - Lista de desejos
    await db.execute`
      CREATE TABLE IF NOT EXISTS wishlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `
    console.log('✅ Tabela wishlists criada')

    // 23. ORDERS - Pedidos
    await db.execute`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50),
        subtotal DECIMAL(10,2) NOT NULL,
        shipping_cost DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
        shipping_address JSONB,
        billing_address JSONB,
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela orders criada')

    // 24. ORDER_ITEMS - Itens dos pedidos
    await db.execute`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        variant_id UUID REFERENCES product_variants(id),
        seller_id UUID REFERENCES sellers(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela order_items criada')

    // 25. REVIEWS - Avaliações de produtos
    await db.execute`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        is_verified BOOLEAN DEFAULT false,
        helpful_count INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela reviews criada')

    // 26. PAYMENT_METHODS - Métodos de pagamento
    await db.execute`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        configuration JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela payment_methods criada')

    // 27. PAYMENT_TRANSACTIONS - Transações de pagamento
    await db.execute`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
        transaction_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
        gateway_response JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela payment_transactions criada')

    // 28. SHIPPING_METHODS - Métodos de envio
    await db.execute`
      CREATE TABLE IF NOT EXISTS shipping_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        carrier VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        min_days INTEGER,
        max_days INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela shipping_methods criada')

    // 29. SHIPPING_ZONES - Zonas de envio
    await db.execute`
      CREATE TABLE IF NOT EXISTS shipping_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        shipping_method_id UUID NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
        regions TEXT[],
        price DECIMAL(10,2) NOT NULL,
        free_above DECIMAL(10,2),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela shipping_zones criada')

    // 30. BANNERS - Banners promocionais
    await db.execute`
      CREATE TABLE IF NOT EXISTS banners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        image_url VARCHAR(500) NOT NULL,
        link_url VARCHAR(500),
        position VARCHAR(50) NOT NULL DEFAULT 'home',
        display_order INTEGER DEFAULT 0,
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela banners criada')

    // 31. PAGES - Páginas estáticas
    await db.execute`
      CREATE TABLE IF NOT EXISTS pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        meta_title VARCHAR(255),
        meta_description TEXT,
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela pages criada')

    // 32. FAQ - Perguntas frequentes
    await db.execute`
      CREATE TABLE IF NOT EXISTS faq (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question VARCHAR(500) NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela faq criada')

    // 33. NOTIFICATIONS - Notificações
    await db.execute`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        read_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela notifications criada')

    // 34. SYSTEM_SETTINGS - Configurações do sistema
    await db.execute`
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'string',
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('✅ Tabela system_settings criada')

    // Criar índices para performance
    console.log('\n📊 Criando índices...')
    
    await db.execute`CREATE INDEX idx_users_email ON users(email)`
    await db.execute`CREATE INDEX idx_sessions_token ON sessions(token)`
    await db.execute`CREATE INDEX idx_sessions_user_id ON sessions(user_id)`
    await db.execute`CREATE INDEX idx_products_slug ON products(slug)`
    await db.execute`CREATE INDEX idx_products_sku ON products(sku)`
    await db.execute`CREATE INDEX idx_products_category ON products(category_id)`
    await db.execute`CREATE INDEX idx_products_seller ON products(seller_id)`
    await db.execute`CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true`
    await db.execute`CREATE INDEX idx_categories_slug ON categories(slug)`
    await db.execute`CREATE INDEX idx_categories_parent ON categories(parent_id)`
    await db.execute`CREATE INDEX idx_orders_user ON orders(user_id)`
    await db.execute`CREATE INDEX idx_orders_number ON orders(order_number)`
    await db.execute`CREATE INDEX idx_cart_items_cart ON cart_items(cart_id)`
    await db.execute`CREATE INDEX idx_reviews_product ON reviews(product_id)`
    await db.execute`CREATE INDEX idx_reviews_user ON reviews(user_id)`
    
    // Índice de busca full-text
    await db.execute`
      CREATE INDEX idx_products_search 
      ON products 
      USING GIN(to_tsvector('portuguese', name || ' ' || COALESCE(description, '')))
    `
    
    console.log('✅ Índices criados')

    console.log('\n✨ Banco de dados criado com sucesso!')
    console.log('📊 Total: 34 tabelas + índices de performance')

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error)
    throw error
  } finally {
    await db.close()
  }
}

// Executar
createDatabase().catch(console.error) 