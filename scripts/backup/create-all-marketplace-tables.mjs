#!/usr/bin/env node

import 'dotenv/config';
import fetch from 'node-fetch';

const XATA_API_KEY = process.env.XATA_API_KEY;
const WORKSPACE = process.env.XATA_WORKSPACE || 'GUSTAVO-FERRO-s-workspace-787mk0';
const REGION = 'us-east-1';
const DATABASE = 'mktplace-gdg-orm';
const BRANCH = 'main';

// URL correta baseada no endpoint HTTP fornecido
const API_URL = `https://${WORKSPACE}.${REGION}.xata.sh/db/${DATABASE}:${BRANCH}`;

// Debug: mostrar configurações
console.log('🔧 Configurações:');
console.log(`   Workspace: ${WORKSPACE}`);
console.log(`   Region: ${REGION}`);
console.log(`   Database: ${DATABASE}`);
console.log(`   Branch: ${BRANCH}`);
console.log(`   API URL: ${API_URL}`);
console.log(`   API Key: ${XATA_API_KEY ? '✓ Configurada' : '✗ Não encontrada'}`);
console.log('');

async function createTable(tableName, columns) {
  console.log(`📦 Criando tabela: ${tableName}`);
  
  const url = `${API_URL}/tables/${tableName}`;
  const body = JSON.stringify({ columns });
  
  console.log(`   URL: ${url}`);
  console.log(`   Colunas: ${columns.length}`);
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${XATA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: body
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      console.log(`✅ Tabela ${tableName} criada com sucesso!`);
      return true;
    } else {
      console.log(`❌ Erro ao criar tabela ${tableName}:`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Resposta: ${responseText}`);
      
      // Tentar parsear como JSON para mostrar erro mais legível
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message) {
          console.log(`   Mensagem: ${errorJson.message}`);
        }
      } catch (e) {
        // Não é JSON, já mostramos o texto acima
      }
      
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro ao criar tabela ${tableName}:`);
    console.log(`   Erro: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando criação das 34 tabelas do marketplace...\n');
  
  let successCount = 0;
  
  // 1. USERS - Base para autenticação
  if (await createTable('users', [
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
  ])) successCount++;
  
  // 2. SESSIONS - Gerenciamento de sessões
  if (await createTable('sessions', [
    { name: 'user_id', type: 'string', notNull: true },
    { name: 'token', type: 'string', unique: true, notNull: true },
    { name: 'expires_at', type: 'datetime', notNull: true },
    { name: 'ip_address', type: 'string' },
    { name: 'user_agent', type: 'string' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 3. ADDRESSES - Endereços dos usuários
  if (await createTable('addresses', [
    { name: 'user_id', type: 'string', notNull: true },
    { name: 'type', type: 'string', notNull: true, defaultValue: 'shipping' },
    { name: 'is_default', type: 'bool', defaultValue: false },
    { name: 'street', type: 'string', notNull: true },
    { name: 'number', type: 'string', notNull: true },
    { name: 'complement', type: 'string' },
    { name: 'neighborhood', type: 'string', notNull: true },
    { name: 'city', type: 'string', notNull: true },
    { name: 'state', type: 'string', notNull: true },
    { name: 'postal_code', type: 'string', notNull: true },
    { name: 'country', type: 'string', notNull: true, defaultValue: 'BR' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 4. BRANDS - Marcas dos produtos
  if (await createTable('brands', [
    { name: 'name', type: 'string', notNull: true },
    { name: 'slug', type: 'string', unique: true, notNull: true },
    { name: 'description', type: 'text' },
    { name: 'logo_url', type: 'string' },
    { name: 'website', type: 'string' },
    { name: 'is_active', type: 'bool', notNull: true, defaultValue: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 5. CATEGORIES - Categorias de produtos
  if (await createTable('categories', [
    { name: 'name', type: 'string', notNull: true },
    { name: 'slug', type: 'string', unique: true, notNull: true },
    { name: 'description', type: 'text' },
    { name: 'parent_id', type: 'string' },
    { name: 'image_url', type: 'string' },
    { name: 'is_active', type: 'bool', notNull: true, defaultValue: true },
    { name: 'position', type: 'int', defaultValue: 0 },
    { name: 'path', type: 'multiple' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 6. SELLERS - Vendedores do marketplace
  if (await createTable('sellers', [
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
  ])) successCount++;
  
  // 7. PRODUCTS - Produtos principais
  if (await createTable('products', [
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
  ])) successCount++;
  
  // 8. PRODUCT_IMAGES - Imagens dos produtos
  if (await createTable('product_images', [
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'url', type: 'string', notNull: true },
    { name: 'alt_text', type: 'string' },
    { name: 'position', type: 'int', defaultValue: 0 },
    { name: 'is_primary', type: 'bool', defaultValue: false },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 9. PRODUCT_OPTIONS - Opções de produtos (cor, tamanho, etc)
  if (await createTable('product_options', [
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'name', type: 'string', notNull: true },
    { name: 'position', type: 'int', defaultValue: 0 },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 10. PRODUCT_OPTION_VALUES - Valores das opções
  if (await createTable('product_option_values', [
    { name: 'option_id', type: 'link', link: { table: 'product_options' }, notNull: true },
    { name: 'value', type: 'string', notNull: true },
    { name: 'position', type: 'int', defaultValue: 0 },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 11. PRODUCT_VARIANTS - Variações de produtos
  if (await createTable('product_variants', [
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'sku', type: 'string', unique: true, notNull: true },
    { name: 'price', type: 'float', notNull: true },
    { name: 'original_price', type: 'float' },
    { name: 'cost', type: 'float' },
    { name: 'quantity', type: 'int', notNull: true, defaultValue: 0 },
    { name: 'weight', type: 'float' },
    { name: 'barcode', type: 'string' },
    { name: 'is_active', type: 'bool', defaultValue: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 12. VARIANT_OPTION_VALUES - Relação variante-opção
  if (await createTable('variant_option_values', [
    { name: 'variant_id', type: 'link', link: { table: 'product_variants' }, notNull: true },
    { name: 'option_value_id', type: 'link', link: { table: 'product_option_values' }, notNull: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 13. PRODUCT_CATEGORIES - Múltiplas categorias por produto
  if (await createTable('product_categories', [
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'category_id', type: 'link', link: { table: 'categories' }, notNull: true },
    { name: 'is_primary', type: 'bool', defaultValue: false },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 14. PRODUCT_PRICE_HISTORY - Histórico de preços
  if (await createTable('product_price_history', [
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'price', type: 'float', notNull: true },
    { name: 'original_price', type: 'float' },
    { name: 'changed_by', type: 'string' },
    { name: 'reason', type: 'string' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 15. PRODUCT_ANALYTICS - Analytics de produtos
  if (await createTable('product_analytics', [
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'date', type: 'datetime', notNull: true },
    { name: 'views', type: 'int', defaultValue: 0 },
    { name: 'clicks', type: 'int', defaultValue: 0 },
    { name: 'add_to_cart', type: 'int', defaultValue: 0 },
    { name: 'purchases', type: 'int', defaultValue: 0 },
    { name: 'revenue', type: 'float', defaultValue: 0 }
  ])) successCount++;
  
  // 16. COUPONS - Cupons de desconto
  if (await createTable('coupons', [
    { name: 'code', type: 'string', unique: true, notNull: true },
    { name: 'description', type: 'text' },
    { name: 'type', type: 'string', notNull: true, defaultValue: 'percentage' },
    { name: 'value', type: 'float', notNull: true },
    { name: 'minimum_amount', type: 'float' },
    { name: 'maximum_discount', type: 'float' },
    { name: 'usage_limit', type: 'int' },
    { name: 'used_count', type: 'int', defaultValue: 0 },
    { name: 'valid_from', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'valid_until', type: 'datetime' },
    { name: 'is_active', type: 'bool', defaultValue: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 17. PRODUCT_COUPONS - Cupons específicos por produto
  if (await createTable('product_coupons', [
    { name: 'coupon_id', type: 'link', link: { table: 'coupons' }, notNull: true },
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 18. COUPON_USAGE - Uso de cupons
  if (await createTable('coupon_usage', [
    { name: 'coupon_id', type: 'link', link: { table: 'coupons' }, notNull: true },
    { name: 'user_id', type: 'string', notNull: true },
    { name: 'order_id', type: 'string' },
    { name: 'used_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 19. CARTS - Carrinhos de compra
  if (await createTable('carts', [
    { name: 'user_id', type: 'string' },
    { name: 'session_id', type: 'string' },
    { name: 'status', type: 'string', notNull: true, defaultValue: 'active' },
    { name: 'expires_at', type: 'datetime' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 20. CART_ITEMS - Itens do carrinho
  if (await createTable('cart_items', [
    { name: 'cart_id', type: 'link', link: { table: 'carts' }, notNull: true },
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'variant_id', type: 'link', link: { table: 'product_variants' } },
    { name: 'quantity', type: 'int', notNull: true },
    { name: 'price', type: 'float', notNull: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 21. ABANDONED_CARTS - Carrinhos abandonados
  if (await createTable('abandoned_carts', [
    { name: 'cart_id', type: 'link', link: { table: 'carts' }, notNull: true },
    { name: 'user_id', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'total_value', type: 'float' },
    { name: 'reminder_sent_count', type: 'int', defaultValue: 0 },
    { name: 'last_reminder_at', type: 'datetime' },
    { name: 'recovered', type: 'bool', defaultValue: false },
    { name: 'recovered_at', type: 'datetime' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 22. WISHLISTS - Lista de desejos
  if (await createTable('wishlists', [
    { name: 'user_id', type: 'string', notNull: true },
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 23. ORDERS - Pedidos
  if (await createTable('orders', [
    { name: 'user_id', type: 'string', notNull: true },
    { name: 'order_number', type: 'string', unique: true, notNull: true },
    { name: 'status', type: 'string', notNull: true, defaultValue: 'pending' },
    { name: 'payment_status', type: 'string', notNull: true, defaultValue: 'pending' },
    { name: 'payment_method', type: 'string' },
    { name: 'subtotal', type: 'float', notNull: true },
    { name: 'shipping_cost', type: 'float', defaultValue: 0 },
    { name: 'discount_amount', type: 'float', defaultValue: 0 },
    { name: 'tax_amount', type: 'float', defaultValue: 0 },
    { name: 'total', type: 'float', notNull: true },
    { name: 'currency', type: 'string', notNull: true, defaultValue: 'BRL' },
    { name: 'shipping_address', type: 'json' },
    { name: 'billing_address', type: 'json' },
    { name: 'notes', type: 'text' },
    { name: 'metadata', type: 'json' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 24. ORDER_ITEMS - Itens dos pedidos
  if (await createTable('order_items', [
    { name: 'order_id', type: 'link', link: { table: 'orders' }, notNull: true },
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'variant_id', type: 'link', link: { table: 'product_variants' } },
    { name: 'seller_id', type: 'link', link: { table: 'sellers' } },
    { name: 'quantity', type: 'int', notNull: true },
    { name: 'price', type: 'float', notNull: true },
    { name: 'total', type: 'float', notNull: true },
    { name: 'status', type: 'string', notNull: true, defaultValue: 'pending' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 25. REVIEWS - Avaliações de produtos
  if (await createTable('reviews', [
    { name: 'product_id', type: 'link', link: { table: 'products' }, notNull: true },
    { name: 'user_id', type: 'string', notNull: true },
    { name: 'order_id', type: 'link', link: { table: 'orders' } },
    { name: 'rating', type: 'int', notNull: true },
    { name: 'title', type: 'string' },
    { name: 'comment', type: 'text' },
    { name: 'is_verified', type: 'bool', defaultValue: false },
    { name: 'helpful_count', type: 'int', defaultValue: 0 },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 26. PAYMENT_METHODS - Métodos de pagamento
  if (await createTable('payment_methods', [
    { name: 'name', type: 'string', notNull: true },
    { name: 'code', type: 'string', unique: true, notNull: true },
    { name: 'type', type: 'string', notNull: true },
    { name: 'is_active', type: 'bool', defaultValue: true },
    { name: 'configuration', type: 'json' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 27. PAYMENT_TRANSACTIONS - Transações de pagamento
  if (await createTable('payment_transactions', [
    { name: 'order_id', type: 'link', link: { table: 'orders' }, notNull: true },
    { name: 'payment_method_id', type: 'link', link: { table: 'payment_methods' }, notNull: true },
    { name: 'transaction_id', type: 'string', unique: true },
    { name: 'status', type: 'string', notNull: true },
    { name: 'amount', type: 'float', notNull: true },
    { name: 'currency', type: 'string', notNull: true, defaultValue: 'BRL' },
    { name: 'gateway_response', type: 'json' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 28. SHIPPING_METHODS - Métodos de envio
  if (await createTable('shipping_methods', [
    { name: 'name', type: 'string', notNull: true },
    { name: 'code', type: 'string', unique: true, notNull: true },
    { name: 'carrier', type: 'string' },
    { name: 'is_active', type: 'bool', defaultValue: true },
    { name: 'min_days', type: 'int' },
    { name: 'max_days', type: 'int' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 29. SHIPPING_ZONES - Zonas de envio
  if (await createTable('shipping_zones', [
    { name: 'name', type: 'string', notNull: true },
    { name: 'shipping_method_id', type: 'link', link: { table: 'shipping_methods' }, notNull: true },
    { name: 'regions', type: 'multiple' },
    { name: 'price', type: 'float', notNull: true },
    { name: 'free_above', type: 'float' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 30. BANNERS - Banners promocionais
  if (await createTable('banners', [
    { name: 'title', type: 'string', notNull: true },
    { name: 'subtitle', type: 'text' },
    { name: 'image_url', type: 'string', notNull: true },
    { name: 'link_url', type: 'string' },
    { name: 'position', type: 'string', notNull: true, defaultValue: 'home' },
    { name: 'display_order', type: 'int', defaultValue: 0 },
    { name: 'starts_at', type: 'datetime' },
    { name: 'ends_at', type: 'datetime' },
    { name: 'is_active', type: 'bool', defaultValue: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 31. PAGES - Páginas estáticas
  if (await createTable('pages', [
    { name: 'title', type: 'string', notNull: true },
    { name: 'slug', type: 'string', unique: true, notNull: true },
    { name: 'content', type: 'text', notNull: true },
    { name: 'meta_title', type: 'string' },
    { name: 'meta_description', type: 'text' },
    { name: 'is_published', type: 'bool', defaultValue: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 32. FAQ - Perguntas frequentes
  if (await createTable('faq', [
    { name: 'question', type: 'string', notNull: true },
    { name: 'answer', type: 'text', notNull: true },
    { name: 'category', type: 'string' },
    { name: 'display_order', type: 'int', defaultValue: 0 },
    { name: 'is_active', type: 'bool', defaultValue: true },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 33. NOTIFICATIONS - Notificações
  if (await createTable('notifications', [
    { name: 'user_id', type: 'string', notNull: true },
    { name: 'type', type: 'string', notNull: true },
    { name: 'title', type: 'string', notNull: true },
    { name: 'message', type: 'text', notNull: true },
    { name: 'data', type: 'json' },
    { name: 'read_at', type: 'datetime' },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 34. SYSTEM_SETTINGS - Configurações do sistema
  if (await createTable('system_settings', [
    { name: 'key', type: 'string', unique: true, notNull: true },
    { name: 'value', type: 'text', notNull: true },
    { name: 'type', type: 'string', notNull: true, defaultValue: 'string' },
    { name: 'description', type: 'text' },
    { name: 'is_public', type: 'bool', defaultValue: false },
    { name: 'created_at', type: 'datetime', notNull: true, defaultValue: 'now()' },
    { name: 'updated_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  // 35. MIGRATION_TRACKING - Controle de migrações (opcional)
  if (await createTable('migration_tracking', [
    { name: 'version', type: 'string', unique: true, notNull: true },
    { name: 'name', type: 'string', notNull: true },
    { name: 'executed_at', type: 'datetime', notNull: true, defaultValue: 'now()' }
  ])) successCount++;
  
  console.log(`\n✅ Processo concluído! ${successCount} de 35 tabelas criadas com sucesso!`);
  
  if (successCount < 35) {
    console.log('\n⚠️  Algumas tabelas falharam. Verifique os erros acima.');
  }
  
  console.log('\n📝 Próximos passos:');
  console.log('1. Execute: npx xata pull main');
  console.log('2. Execute: cd packages/xata-client && npm run build && cd ../..');
  console.log('3. Execute: node scripts/seed-all-xata.mjs');
}

// Verificar se temos a API key
if (!XATA_API_KEY) {
  console.error('❌ XATA_API_KEY não encontrada no .env');
  process.exit(1);
}

main().catch(console.error); 