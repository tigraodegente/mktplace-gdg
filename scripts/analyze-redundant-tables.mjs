#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config()

async function analyzeRedundantTables() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 ANÁLISE DE TABELAS REDUNDANTES - MARKETPLACE GDG')
    console.log('================================================\n')
    
    await connector.connectNeon()
    
    // 1. LISTAR TODAS AS TABELAS COM CONTAGEM
    const tablesResult = await connector.queryNeon(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('📊 CATEGORIZAÇÃO DAS TABELAS')
    console.log('-----------------------------\n')
    
    // 2. CATEGORIZAR TABELAS
    const categories = {
      // ESSENCIAIS - NÃO REMOVER
      core: [
        'products', 'product_images', 'product_variants', 'product_categories',
        'product_collections', 'product_suppliers', 'product_stocks', 
        'product_related', 'product_downloads', 'product_upsells',
        'categories', 'brands', 'collections', 'suppliers', 'warehouses',
        'users', 'sellers', 'orders', 'order_items', 'order_status_history',
        'sessions', 'settings', 'permissions', 'role_permissions'
      ],
      
      // FUNCIONAIS - MANTER (vão ser usadas)
      functional: [
        // Marketing & Campaigns
        'marketing_campaigns', 'campaign_analytics', 'campaign_recipients',
        
        // A/B Testing
        'ab_tests', 'ab_test_variants', 'ab_test_assignments', 'ab_test_events',
        
        // Gift Lists & Presentes
        'gift_lists', 'gift_list_items', 'gift_list_invites', 'gift_list_comments',
        'gift_list_favorites', 'gift_list_analytics', 'gift_list_templates', 'gift_contributions',
        
        // Chat System
        'chat_conversations', 'chat_messages', 'chat_message_reads', 'chat_presence', 'chat_settings',
        
        // GDPR & Privacy
        'gdpr_requests', 'consent_records', 'data_processing_activities', 'tracking_consents',
        
        // Analytics & Reports
        'product_analytics', 'search_history', 'search_index', 'search_suggestions',
        'popular_searches', 'product_rankings',
        
        // Reviews & Ratings
        'reviews',
        
        // Notifications
        'notifications', 'notification_settings', 'notification_templates',
        
        // Coupons & Discounts
        'coupons', 'coupon_categories', 'coupon_conditions', 'coupon_products', 'coupon_usage', 'product_coupons',
        
        // Returns & Support
        'returns', 'return_items', 'return_reasons',
        'support_tickets', 'support_messages', 'support_categories',
        
        // Shipping
        'shipping_carriers', 'shipping_zones', 'shipping_rates', 'shipping_base_rates',
        'shipping_modality_configs', 'seller_shipping_configs', 'shipping_quotes', 'shipments',
        
        // Payment
        'payments', 'payment_transactions', 'payment_methods', 'payment_gateways', 'payment_gateways_metadata',
        
        // Inventory & Stock
        'stock_movements', 'stock_reservations', 'stock_reservation_items',
        
        // Cart & Wishlist
        'carts', 'cart_items', 'wishlists', 'wishlist_items', 'abandoned_carts',
        
        // User Management
        'addresses', 'password_resets', 'user_sessions_multi_role', 'users_backup_roles',
        
        // Content Management
        'pages', 'banners', 'faqs', 'faq', 'kb_articles',
        
        // Integrations
        'integrations', 'integration_providers', 'integration_environments',
        'integration_logs', 'integration_metrics', 'integration_retry_queue',
        'integration_provider_environments', 'integration_providers_status',
        
        // System
        'system_settings', 'audit_logs', 'email_queue', 'webhook_events', 'webhook_logs',
        'maintenance_log', 'performance_dashboard'
      ],
      
      // POTENCIALMENTE REDUNDANTES
      redundant: [],
      
      // TEMPORÁRIAS/BACKUP
      temporary: []
    }
    
    // 3. IDENTIFICAR TABELAS REDUNDANTES/TEMPORÁRIAS
    const allTables = tablesResult.rows.map(t => t.table_name)
    
    for (const tableName of allTables) {
      if (!categories.core.includes(tableName) && !categories.functional.includes(tableName)) {
        // Verificar padrões que indicam redundância
        if (tableName.includes('_temp') || tableName.includes('_backup') || tableName.includes('_old')) {
          categories.temporary.push(tableName)
        } else if (tableName.includes('_cache') || tableName.includes('pending_')) {
          categories.temporary.push(tableName)
        } else {
          categories.redundant.push(tableName)
        }
      }
    }
    
    // 4. MOSTRAR CATEGORIZAÇÃO
    console.log(`✅ ESSENCIAIS (${categories.core.length} tabelas):`)
    console.log('   → Sistema de produtos, usuários, pedidos, configurações')
    console.log(`   → Estas tabelas NÃO podem ser removidas\n`)
    
    console.log(`🔧 FUNCIONAIS (${categories.functional.length} tabelas):`)
    console.log('   → Marketing, A/B tests, listas de presente, chat, GDPR, analytics')
    console.log(`   → Serão implementadas no painel e site depois\n`)
    
    if (categories.temporary.length > 0) {
      console.log(`⚠️  TEMPORÁRIAS/CACHE (${categories.temporary.length} tabelas):`)
      for (const table of categories.temporary) {
        const count = await connector.queryNeon(`SELECT COUNT(*) as total FROM ${table}`)
        console.log(`   • ${table.padEnd(30)} (${count.rows[0].total} registros)`)
      }
      console.log('')
    }
    
    if (categories.redundant.length > 0) {
      console.log(`❓ PRECISAM ANÁLISE (${categories.redundant.length} tabelas):`)
      for (const table of categories.redundant) {
        const count = await connector.queryNeon(`SELECT COUNT(*) as total FROM ${table}`)
        console.log(`   • ${table.padEnd(30)} (${count.rows[0].total} registros)`)
      }
      console.log('')
    }
    
    // 5. ANÁLISE DETALHADA DAS SUSPEITAS
    console.log('🔍 ANÁLISE DETALHADA DAS TABELAS SUSPEITAS')
    console.log('==========================================\n')
    
    const suspiciousTables = [...categories.temporary, ...categories.redundant]
    
    for (const tableName of suspiciousTables) {
      try {
        const count = await connector.queryNeon(`SELECT COUNT(*) as total FROM ${tableName}`)
        const columns = await connector.queryNeon(`
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
          LIMIT 5
        `, [tableName])
        
        console.log(`📋 ${tableName.toUpperCase()}:`)
        console.log(`   • Registros: ${count.rows[0].total}`)
        console.log(`   • Primeiras colunas: ${columns.rows.map(c => c.column_name).join(', ')}`)
        
        // Verificar se é duplicata de outra tabela
        const similarTables = allTables.filter(t => 
          t !== tableName && 
          (t.includes(tableName.replace(/_temp|_backup|_old/g, '')) ||
           tableName.includes(t.replace(/_temp|_backup|_old/g, '')))
        )
        
        if (similarTables.length > 0) {
          console.log(`   ⚠️  Possível duplicata de: ${similarTables.join(', ')}`)
        }
        
        console.log('')
        
      } catch (error) {
        console.log(`   ❌ Erro ao analisar: ${error.message}\n`)
      }
    }
    
    // 6. RECOMENDAÇÕES
    console.log('💡 RECOMENDAÇÕES FINAIS')
    console.log('=======================\n')
    
    if (categories.temporary.length > 0) {
      console.log('🗑️  PODE REMOVER COM SEGURANÇA:')
      for (const table of categories.temporary) {
        console.log(`   • ${table} - (tabela temporária/cache)`)
      }
      console.log('')
    }
    
    if (categories.redundant.length > 0) {
      console.log('❓ PRECISA REVISAR MANUALMENTE:')
      for (const table of categories.redundant) {
        console.log(`   • ${table} - verificar se é realmente necessária`)
      }
      console.log('')
    }
    
    console.log('📊 RESUMO:')
    console.log(`   • Total de tabelas: ${allTables.length}`)
    console.log(`   • Essenciais: ${categories.core.length}`)
    console.log(`   • Funcionais (manter): ${categories.functional.length}`)
    console.log(`   • Temporárias (podem remover): ${categories.temporary.length}`)
    console.log(`   • Precisam análise: ${categories.redundant.length}`)
    
    await connector.disconnect()
    
  } catch (error) {
    console.error('❌ Erro na análise:', error.message)
    await connector.disconnect()
    process.exit(1)
  }
}

analyzeRedundantTables() 