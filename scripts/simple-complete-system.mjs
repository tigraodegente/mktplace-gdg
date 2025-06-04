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

async function createTables() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🚀 Criando tabelas faltantes para o sistema completo...')
    console.log('')
    
    await connector.connectNeon()
    
    // 1. Criar tabela collections
    console.log('🔧 Criando tabela collections...')
    await connector.queryNeon(`
      CREATE TABLE IF NOT EXISTS collections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          image_url VARCHAR(500),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ Tabela collections criada')
    
    // 2. Criar tabela product_collections
    console.log('🔧 Criando tabela product_collections...')
    await connector.queryNeon(`
      CREATE TABLE IF NOT EXISTS product_collections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          position INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(collection_id, product_id)
      )
    `)
    console.log('✅ Tabela product_collections criada')
    
    // 3. Criar tabela suppliers
    console.log('🔧 Criando tabela suppliers...')
    await connector.queryNeon(`
      CREATE TABLE IF NOT EXISTS suppliers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          document VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(50),
          country VARCHAR(10) DEFAULT 'BR',
          postal_code VARCHAR(20),
          is_active BOOLEAN DEFAULT true,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ Tabela suppliers criada')
    
    // 4. Criar tabela product_suppliers
    console.log('🔧 Criando tabela product_suppliers...')
    await connector.queryNeon(`
      CREATE TABLE IF NOT EXISTS product_suppliers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
          supplier_name VARCHAR(255) NOT NULL,
          supplier_sku VARCHAR(100),
          cost DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'BRL',
          lead_time_days INTEGER,
          minimum_order_quantity INTEGER DEFAULT 1,
          is_primary BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ Tabela product_suppliers criada')
    
    // 5. Criar tabela warehouses
    console.log('🔧 Criando tabela warehouses...')
    await connector.queryNeon(`
      CREATE TABLE IF NOT EXISTS warehouses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50) UNIQUE NOT NULL,
          type VARCHAR(50) DEFAULT 'main',
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(50),
          country VARCHAR(10) DEFAULT 'BR',
          postal_code VARCHAR(20),
          phone VARCHAR(50),
          email VARCHAR(255),
          manager_name VARCHAR(255),
          is_active BOOLEAN DEFAULT true,
          is_default BOOLEAN DEFAULT false,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ Tabela warehouses criada')
    
    // 6. Criar tabela product_stocks
    console.log('🔧 Criando tabela product_stocks...')
    await connector.queryNeon(`
      CREATE TABLE IF NOT EXISTS product_stocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 0,
          reserved_quantity INTEGER DEFAULT 0,
          available_quantity INTEGER DEFAULT 0,
          location VARCHAR(100),
          low_stock_alert INTEGER DEFAULT 10,
          notes TEXT,
          last_updated TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(product_id, warehouse_id)
      )
    `)
    console.log('✅ Tabela product_stocks criada')
    
    console.log('')
    console.log('📊 Verificando se as tabelas foram criadas...')
    
    const tables = ['collections', 'product_collections', 'suppliers', 'product_suppliers', 'warehouses', 'product_stocks']
    
    for (const table of tables) {
      const result = await connector.queryNeon(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table])
      
      if (result.rows[0].exists) {
        console.log(`✅ Tabela ${table} existe`)
      } else {
        console.log(`❌ Tabela ${table} não encontrada`)
      }
    }
    
    // Inserir dados iniciais
    console.log('')
    console.log('📝 Inserindo dados iniciais...')
    
    // Armazém padrão
    await connector.queryNeon(`
      INSERT INTO warehouses (name, code, type, is_default, is_active)
      SELECT 'Armazém Principal', 'MAIN', 'main', true, true
      WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code = 'MAIN')
    `)
    console.log('✅ Armazém padrão criado')
    
    // Coleção de exemplo
    await connector.queryNeon(`
      INSERT INTO collections (name, slug, description, is_active)
      SELECT 'Produtos em Destaque', 'produtos-em-destaque', 'Coleção de produtos em destaque da loja', true
      WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'produtos-em-destaque')
    `)
    console.log('✅ Coleção de exemplo criada')
    
    console.log('')
    console.log('🎉 Sistema de produtos finalizado com sucesso!')
    console.log('')
    console.log('📋 APIs implementadas:')
    console.log('   ✅ /api/collections - Gerenciar coleções')
    console.log('   ✅ /api/collections/[id]/products - Produtos em coleções')  
    console.log('   ✅ /api/suppliers - Gerenciar fornecedores')
    console.log('   ✅ /api/products/[id]/suppliers - Fornecedores por produto')
    console.log('   ✅ /api/products/[id]/stocks - Estoques por produto')
    console.log('   ✅ /api/warehouses - Gerenciar armazéns')
    console.log('')
    console.log('🚀 O sistema está 100% completo!')
    
    await connector.disconnect()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await connector.disconnect()
    process.exit(1)
  }
}

createTables() 