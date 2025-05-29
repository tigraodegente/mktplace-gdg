#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🚀 Criando schema básico no Neon Develop...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const schemas = [
  // 1. Extensões
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
  
  // 2. Usuários
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 3. Marcas
  `CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 4. Categorias
  `CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    position INTEGER,
    path UUID[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 5. Vendedores
  `CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_name VARCHAR(255) NOT NULL,
    company_document VARCHAR(50) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rating_average NUMERIC(3,2),
    rating_count INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 6. Produtos
  `CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    brand_id UUID REFERENCES brands(id),
    category_id UUID REFERENCES categories(id),
    seller_id UUID REFERENCES sellers(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    is_active BOOLEAN NOT NULL DEFAULT false,
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    cost NUMERIC(10,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
    quantity INTEGER NOT NULL DEFAULT 0,
    stock_location VARCHAR(255),
    track_inventory BOOLEAN NOT NULL DEFAULT true,
    allow_backorder BOOLEAN DEFAULT false,
    weight NUMERIC(8,3),
    height NUMERIC(8,2),
    width NUMERIC(8,2),
    length NUMERIC(8,2),
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT[],
    tags TEXT[],
    attributes JSONB,
    specifications JSONB,
    view_count INTEGER NOT NULL DEFAULT 0,
    sales_count INTEGER NOT NULL DEFAULT 0,
    rating_average NUMERIC(3,2),
    rating_count INTEGER NOT NULL DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    barcode VARCHAR(255),
    featuring JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP
  );`,
  
  // 7. Imagens de produtos
  `CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    position INTEGER,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 8. Índices importantes
  'CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);',
  'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);',
  'CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);',
  'CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);',
  'CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);',
  'CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);'
]

try {
  for (const [index, sql] of schemas.entries()) {
    console.log(`⚡ Executando step ${index + 1}/${schemas.length}...`)
    await pool.query(sql)
  }
  
  console.log('\n✅ Schema básico criado com sucesso!')
  
  // Verificar tabelas criadas
  const result = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)
  
  console.log(`\n📊 ${result.rows.length} tabelas criadas:`)
  result.rows.forEach(row => console.log(`   - ${row.tablename}`))
  
  console.log('\n🎉 Banco Develop pronto para receber produtos!')
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 