#!/usr/bin/env node

import 'dotenv/config';
import fetch from 'node-fetch';

const XATA_API_KEY = process.env.XATA_API_KEY;
const WORKSPACE = process.env.XATA_WORKSPACE || 'GUSTAVO-FERRO-s-workspace-787mk0';
const REGION = 'us-east-1';
const DATABASE = 'mktplace-gdg';
const BRANCH = 'main';

const API_URL = `https://api.xata.io/db/${WORKSPACE}:${REGION}/${DATABASE}:${BRANCH}`;

async function createTable(tableName, columns) {
  console.log(`\n📦 Criando tabela: ${tableName}`);
  
  try {
    const response = await fetch(`${API_URL}/tables/${tableName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${XATA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ columns })
    });
    
    if (response.ok) {
      console.log(`✅ Tabela ${tableName} criada com sucesso!`);
    } else {
      const error = await response.text();
      console.log(`❌ Erro ao criar tabela ${tableName}:`, error);
    }
  } catch (error) {
    console.log(`❌ Erro ao criar tabela ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Iniciando criação das tabelas do marketplace...\n');
  
  // 1. Users
  await createTable('users', [
    { name: 'email', type: 'email', unique: true, notNull: true },
    { name: 'name', type: 'string', notNull: true },
    { name: 'password_hash', type: 'string', notNull: true },
    { name: 'role', type: 'string', notNull: true, defaultValue: 'customer' },
    { name: 'is_active', type: 'bool', defaultValue: true },
    { name: 'email_verified', type: 'bool', defaultValue: false },
    { name: 'phone', type: 'string' },
    { name: 'avatar_url', type: 'string' },
    { name: 'last_login_at', type: 'datetime' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  // 2. Brands
  await createTable('brands', [
    { name: 'name', type: 'string', notNull: true },
    { name: 'slug', type: 'string', unique: true, notNull: true },
    { name: 'description', type: 'text' },
    { name: 'logo_url', type: 'string' },
    { name: 'website', type: 'string' },
    { name: 'is_active', type: 'bool', notNull: true, defaultValue: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  // 3. Categories
  await createTable('categories', [
    { name: 'name', type: 'string', notNull: true },
    { name: 'slug', type: 'string', unique: true, notNull: true },
    { name: 'description', type: 'text' },
    { name: 'parent_id', type: 'string' }, // Será link depois
    { name: 'image_url', type: 'string' },
    { name: 'is_active', type: 'bool', notNull: true, defaultValue: true },
    { name: 'position', type: 'int', defaultValue: 0 },
    { name: 'path', type: 'multiple' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  // 4. Sellers
  await createTable('sellers', [
    { name: 'user_id', type: 'link', link: { table: 'users' }, unique: true, notNull: true },
    { name: 'company_name', type: 'string', notNull: true },
    { name: 'company_document', type: 'string', unique: true, notNull: true },
    { name: 'description', type: 'text' },
    { name: 'logo_url', type: 'string' },
    { name: 'banner_url', type: 'string' },
    { name: 'is_verified', type: 'bool', defaultValue: false },
    { name: 'is_active', type: 'bool', defaultValue: true },
    { name: 'rating_average', type: 'float', defaultValue: 0 },
    { name: 'rating_count', type: 'int', defaultValue: 0 },
    { name: 'total_sales', type: 'int', defaultValue: 0 },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  // 5. Products
  await createTable('products', [
    { name: 'sku', type: 'string', unique: true, notNull: true },
    { name: 'name', type: 'string', notNull: true },
    { name: 'slug', type: 'string', unique: true, notNull: true },
    { name: 'description', type: 'text' },
    { name: 'brand_id', type: 'link', link: { table: 'brands' } },
    { name: 'category_id', type: 'link', link: { table: 'categories' } },
    { name: 'seller_id', type: 'link', link: { table: 'sellers' } },
    { name: 'status', type: 'string', notNull: true, defaultValue: 'active' },
    { name: 'is_active', type: 'bool', notNull: true, defaultValue: true },
    { name: 'price', type: 'float', notNull: true },
    { name: 'original_price', type: 'float' },
    { name: 'cost', type: 'float' },
    { name: 'currency', type: 'string', notNull: true, defaultValue: 'BRL' },
    { name: 'quantity', type: 'int', notNull: true, defaultValue: 0 },
    { name: 'stock_location', type: 'string' },
    { name: 'track_inventory', type: 'bool', notNull: true, defaultValue: true },
    { name: 'allow_backorder', type: 'bool', defaultValue: false },
    { name: 'weight', type: 'float' },
    { name: 'height', type: 'float' },
    { name: 'width', type: 'float' },
    { name: 'length', type: 'float' },
    { name: 'meta_title', type: 'string' },
    { name: 'meta_description', type: 'text' },
    { name: 'meta_keywords', type: 'multiple' },
    { name: 'tags', type: 'multiple' },
    { name: 'attributes', type: 'json' },
    { name: 'specifications', type: 'json' },
    { name: 'view_count', type: 'int', notNull: true, defaultValue: 0 },
    { name: 'sales_count', type: 'int', notNull: true, defaultValue: 0 },
    { name: 'rating_average', type: 'float' },
    { name: 'rating_count', type: 'int', notNull: true, defaultValue: 0 },
    { name: 'featured', type: 'bool', defaultValue: false },
    { name: 'barcode', type: 'string' },
    { name: 'featuring', type: 'json' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'published_at', type: 'datetime' }
  ]);
  
  // 6. Product Images
  await createTable('product_images', [
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'url', type: 'string', notNull: true },
    { name: 'alt_text', type: 'string' },
    { name: 'position', type: 'int', defaultValue: 0 },
    { name: 'is_primary', type: 'bool', defaultValue: false },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  // 7. Carts
  await createTable('carts', [
    { name: 'user_id', type: 'string' },
    { name: 'session_id', type: 'string' },
    { name: 'status', type: 'string', notNull: true, defaultValue: 'active' },
    { name: 'expires_at', type: 'datetime' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  // 8. Cart Items
  await createTable('cart_items', [
    { name: 'cart_id', type: 'link', link: { table: 'carts' }, notNull: true },
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'quantity', type: 'int', notNull: true },
    { name: 'price', type: 'float', notNull: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  // 9. Orders
  await createTable('orders', [
    { name: 'user_id', type: 'string', notNull: true },
    { name: 'order_number', type: 'string', unique: true, notNull: true },
    { name: 'status', type: 'string', notNull: true, defaultValue: 'pending' },
    { name: 'payment_status', type: 'string', notNull: true, defaultValue: 'pending' },
    { name: 'subtotal', type: 'float', notNull: true },
    { name: 'shipping_cost', type: 'float', defaultValue: 0 },
    { name: 'discount_amount', type: 'float', defaultValue: 0 },
    { name: 'tax_amount', type: 'float', defaultValue: 0 },
    { name: 'total', type: 'float', notNull: true },
    { name: 'currency', type: 'string', notNull: true, defaultValue: 'BRL' },
    { name: 'shipping_address', type: 'json' },
    { name: 'billing_address', type: 'json' },
    { name: 'notes', type: 'text' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  // 10. Order Items
  await createTable('order_items', [
    { name: 'order_id', type: 'link', link: { table: 'orders' }, notNull: true },
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'seller_id', type: 'link', link: { table: 'sellers' } },
    { name: 'quantity', type: 'int', notNull: true },
    { name: 'price', type: 'float', notNull: true },
    { name: 'total', type: 'float', notNull: true },
    { name: 'status', type: 'string', notNull: true, defaultValue: 'pending' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ]);
  
  console.log('\n✅ Todas as tabelas foram criadas!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Execute: npx xata pull main');
  console.log('2. Execute: npm run build -w packages/xata-client');
  console.log('3. Execute: node scripts/seed-all-xata.mjs');
}

// Verificar se temos a API key
if (!XATA_API_KEY) {
  console.error('❌ XATA_API_KEY não encontrada no .env');
  process.exit(1);
}

main().catch(console.error); 