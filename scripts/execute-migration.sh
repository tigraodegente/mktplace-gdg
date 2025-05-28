#!/bin/bash

# Configurações
API_KEY="xau_4YkLfHkfKWwzMmUzfLWuv1IfbS6M0r9D0"
DB_URL="https://GUSTAVO-FERRO-s-workspace-787mk0.us-east-1.xata.sh/db/mktplace-gdg:main/sql"

# Função para executar SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "Executando: $description"
    
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"statement\": \"$sql\"}")
    
    if echo "$response" | grep -q "error"; then
        echo "❌ Erro: $response"
        return 1
    else
        echo "✅ Sucesso"
        return 0
    fi
}

echo "=== INICIANDO MIGRAÇÃO XATA ==="
echo ""

# 1. Dropar tabelas existentes
echo "PASSO 1: Dropando tabelas existentes..."
execute_sql "DROP TABLE IF EXISTS product_images CASCADE" "Drop product_images"
execute_sql "DROP TABLE IF EXISTS products CASCADE" "Drop products"
execute_sql "DROP TABLE IF EXISTS sellers CASCADE" "Drop sellers"
execute_sql "DROP TABLE IF EXISTS categories CASCADE" "Drop categories"
execute_sql "DROP TABLE IF EXISTS brands CASCADE" "Drop brands"
execute_sql "DROP TABLE IF EXISTS users CASCADE" "Drop users"

echo ""
echo "PASSO 2: Criando novas tabelas..."

# 2. Criar tabela users
execute_sql "CREATE TABLE users (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', is_active BOOLEAN NOT NULL DEFAULT true, phone TEXT, avatar_url TEXT, email_verified BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_login_at TIMESTAMPTZ, xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\"version\":0}'::jsonb)" "Create users table"

# 3. Criar tabela brands
execute_sql "CREATE TABLE brands (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, logo_url TEXT, website TEXT, is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\"version\":0}'::jsonb)" "Create brands table"

# 4. Criar tabela categories
execute_sql "CREATE TABLE categories (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, image_url TEXT, parent_id TEXT, path TEXT[], is_active BOOLEAN NOT NULL DEFAULT true, position INTEGER DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\"version\":0}'::jsonb)" "Create categories table"

# 5. Criar tabela sellers
execute_sql "CREATE TABLE sellers (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), company_name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, logo_url TEXT, banner_url TEXT, is_active BOOLEAN NOT NULL DEFAULT true, is_verified BOOLEAN DEFAULT false, rating DECIMAL(3,2), total_sales INTEGER DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\"version\":0}'::jsonb)" "Create sellers table"

# 6. Criar tabela products
execute_sql "CREATE TABLE products (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, brand_id TEXT REFERENCES brands(id), category_id TEXT REFERENCES categories(id), seller_id TEXT REFERENCES sellers(id), status TEXT NOT NULL DEFAULT 'active', is_active BOOLEAN NOT NULL DEFAULT true, price DECIMAL(10,2) NOT NULL, original_price DECIMAL(10,2), cost DECIMAL(10,2), currency TEXT NOT NULL DEFAULT 'BRL', quantity INTEGER NOT NULL DEFAULT 0, stock_location TEXT, track_inventory BOOLEAN NOT NULL DEFAULT true, allow_backorder BOOLEAN NOT NULL DEFAULT false, weight DECIMAL(10,3), height DECIMAL(10,2), width DECIMAL(10,2), length DECIMAL(10,2), meta_title TEXT, meta_description TEXT, meta_keywords TEXT[], tags TEXT[], attributes JSONB DEFAULT '{}'::jsonb, specifications JSONB DEFAULT '{}'::jsonb, view_count INTEGER NOT NULL DEFAULT 0, sales_count INTEGER NOT NULL DEFAULT 0, rating_average DECIMAL(3,2), rating_count INTEGER NOT NULL DEFAULT 0, featured BOOLEAN DEFAULT false, barcode TEXT, featuring JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), published_at TIMESTAMPTZ, xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\"version\":0}'::jsonb)" "Create products table"

# 7. Criar tabela product_images
execute_sql "CREATE TABLE product_images (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, image_url TEXT NOT NULL, alt_text TEXT, display_order INTEGER NOT NULL DEFAULT 0, is_primary BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\"version\":0}'::jsonb)" "Create product_images table"

echo ""
echo "=== MIGRAÇÃO CONCLUÍDA ===" 