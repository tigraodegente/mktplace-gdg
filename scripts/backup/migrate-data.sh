#!/bin/bash

# Configurações
API_KEY="xau_4YkLfHkfKWwzMmUzfLWuv1IfbS6M0r9D0"
DB_URL="https://GUSTAVO-FERRO-s-workspace-787mk0.us-east-1.xata.sh/db/mktplace-gdg:main/sql"

# Função para executar SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "Executando: $description"
    
    # Escapar aspas duplas no SQL
    sql_escaped=$(echo "$sql" | sed 's/"/\\"/g')
    
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"statement\": \"$sql_escaped\"}")
    
    if echo "$response" | grep -q "error"; then
        echo "❌ Erro: $response"
        return 1
    else
        echo "✅ Sucesso"
        return 0
    fi
}

echo "=== INICIANDO MIGRAÇÃO DE DADOS ==="
echo ""

# 1. Migrar Users
echo "PASSO 1: Migrando usuários..."
execute_sql "INSERT INTO users (xata_id, id, email, password_hash, name, role, is_active, phone, avatar_url, email_verified, created_at, updated_at, last_login_at, xata_createdat, xata_updatedat) SELECT id, id, email, password_hash, name, role, is_active, phone, avatar_url, email_verified, created_at, updated_at, last_login_at, COALESCE(xata_createdat, created_at), COALESCE(xata_updatedat, updated_at) FROM users_old" "Migrar users"

# 2. Migrar Brands
echo ""
echo "PASSO 2: Migrando marcas..."
execute_sql "INSERT INTO brands (xata_id, id, name, slug, description, logo_url, website, is_active, created_at, updated_at, xata_createdat, xata_updatedat) SELECT id, id, name, slug, description, logo_url, website, is_active, created_at, updated_at, COALESCE(xata_createdat, created_at), COALESCE(xata_updatedat, updated_at) FROM brands_old" "Migrar brands"

# 3. Migrar Categories
echo ""
echo "PASSO 3: Migrando categorias..."
execute_sql "INSERT INTO categories (xata_id, id, name, slug, description, image_url, parent_id, path, is_active, position, created_at, updated_at, xata_createdat, xata_updatedat) SELECT id, id, name, slug, description, image_url, parent_id, path, is_active, position, created_at, updated_at, COALESCE(xata_createdat, created_at), COALESCE(xata_updatedat, updated_at) FROM categories_old" "Migrar categories"

# 4. Migrar Sellers
echo ""
echo "PASSO 4: Migrando vendedores..."
execute_sql "INSERT INTO sellers (xata_id, id, user_id, company_name, slug, description, logo_url, is_active, created_at, updated_at, xata_createdat, xata_updatedat) SELECT s.id, s.id, s.user_id, s.company_name, s.slug, s.description, s.logo_url, s.is_active, s.created_at, s.updated_at, COALESCE(s.xata_createdat, s.created_at), COALESCE(s.xata_updatedat, s.updated_at) FROM sellers_old s WHERE EXISTS (SELECT 1 FROM users WHERE users.id = s.user_id)" "Migrar sellers"

# 5. Migrar Products
echo ""
echo "PASSO 5: Migrando produtos..."
execute_sql "INSERT INTO products (xata_id, id, sku, name, slug, description, brand_id, category_id, seller_id, status, is_active, price, original_price, cost, currency, quantity, stock_location, track_inventory, allow_backorder, weight, height, width, length, meta_title, meta_description, meta_keywords, tags, attributes, specifications, view_count, sales_count, rating_average, rating_count, featured, barcode, featuring, created_at, updated_at, published_at, xata_createdat, xata_updatedat) SELECT p.id, p.id, p.sku, p.name, p.slug, p.description, p.brand_id, p.category_id, p.seller_id, p.status, p.is_active, p.price::decimal, p.original_price::decimal, p.cost::decimal, p.currency, p.quantity, p.stock_location, p.track_inventory, p.allow_backorder, p.weight::decimal, p.height::decimal, p.width::decimal, p.length::decimal, p.meta_title, p.meta_description, p.meta_keywords, p.tags, p.attributes, p.specifications, p.view_count, p.sales_count, p.rating_average::decimal, p.rating_count, p.featured, p.barcode, p.featuring, p.created_at, p.updated_at, p.published_at, COALESCE(p.xata_createdat, p.created_at), COALESCE(p.xata_updatedat, p.updated_at) FROM products_old p" "Migrar products"

# 6. Migrar Product Images
echo ""
echo "PASSO 6: Migrando imagens de produtos..."
execute_sql "INSERT INTO product_images (xata_id, id, product_id, image_url, alt_text, display_order, is_primary, created_at, updated_at, xata_createdat, xata_updatedat) SELECT pi.id, pi.id, pi.product_id, pi.image_url, pi.alt_text, pi.display_order, pi.is_primary, pi.created_at, pi.updated_at, COALESCE(pi.xata_createdat, pi.created_at), COALESCE(pi.xata_updatedat, pi.updated_at) FROM product_images_old pi WHERE EXISTS (SELECT 1 FROM products WHERE products.id = pi.product_id)" "Migrar product_images"

echo ""
echo "=== MIGRAÇÃO DE DADOS CONCLUÍDA ==="

# Verificar contagens
echo ""
echo "VERIFICANDO CONTAGENS:"
echo ""

# Função para contar registros
count_records() {
    local table="$1"
    
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"statement\": \"SELECT COUNT(*) as total FROM $table\"}")
    
    echo "$table: $(echo $response | grep -o '"total":[0-9]*' | cut -d':' -f2)"
}

count_records "users"
count_records "brands"
count_records "categories"
count_records "sellers"
count_records "products"
count_records "product_images" 