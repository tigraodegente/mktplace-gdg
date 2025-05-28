#!/bin/bash

# Configurações
API_KEY="xau_4YkLfHkfKWwzMmUzfLWuv1IfbS6M0r9D0"
DB_URL="https://GUSTAVO-FERRO-s-workspace-787mk0.us-east-1.xata.sh/db/mktplace-gdg:main/sql"

# Função para executar SQL usando arquivo temporário
execute_sql_file() {
    local sql="$1"
    local description="$2"
    
    echo "Executando: $description"
    
    # Criar arquivo temporário com o JSON
    cat > /tmp/sql_query.json << EOF
{
  "statement": "$sql"
}
EOF
    
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d @/tmp/sql_query.json)
    
    if echo "$response" | grep -q '"message"'; then
        echo "❌ Erro: $response"
        return 1
    else
        # Extrair contagem se houver
        if echo "$response" | grep -q "rowCount"; then
            count=$(echo "$response" | grep -o '"rowCount":[0-9]*' | cut -d':' -f2)
            echo "✅ Sucesso: $count registros afetados"
        else
            echo "✅ Sucesso"
        fi
        return 0
    fi
}

echo "=== INICIANDO MIGRAÇÃO DE DADOS CORRIGIDA ==="
echo ""

# Limpar dados existentes primeiro (exceto os já migrados)
echo "Limpando dados existentes..."
execute_sql_file "DELETE FROM product_images" "Limpar product_images"
execute_sql_file "DELETE FROM products" "Limpar products"
execute_sql_file "DELETE FROM sellers" "Limpar sellers"
execute_sql_file "DELETE FROM users WHERE email != 'admin@marketplace.com'" "Limpar users (exceto admin)"

echo ""
echo "PASSO 1: Migrando usuários restantes..."
execute_sql_file "INSERT INTO users (xata_id, id, email, password_hash, name, role, is_active, phone, avatar_url, email_verified, created_at, updated_at, last_login_at, xata_createdat, xata_updatedat) SELECT id, id, email, password_hash, name, role, is_active, phone, avatar_url, email_verified, created_at, updated_at, last_login_at, COALESCE(xata_createdat, created_at), COALESCE(xata_updatedat, updated_at) FROM users_old WHERE email != 'admin@marketplace.com'" "Migrar users restantes"

echo ""
echo "PASSO 2: Verificando marcas..."
execute_sql_file "SELECT COUNT(*) FROM brands" "Contar brands"

echo ""
echo "PASSO 3: Verificando categorias..."
execute_sql_file "SELECT COUNT(*) FROM categories" "Contar categories"

echo ""
echo "PASSO 4: Migrando vendedores..."
execute_sql_file "INSERT INTO sellers (xata_id, id, user_id, company_name, slug, description, logo_url, is_active, created_at, updated_at, xata_createdat, xata_updatedat) SELECT s.id, s.id, s.user_id, s.company_name, s.slug, s.description, s.logo_url, s.is_active, s.created_at, s.updated_at, COALESCE(s.xata_createdat, s.created_at), COALESCE(s.xata_updatedat, s.updated_at) FROM sellers_old s WHERE EXISTS (SELECT 1 FROM users WHERE users.id = s.user_id)" "Migrar sellers"

echo ""
echo "PASSO 5: Migrando produtos..."
execute_sql_file "INSERT INTO products (xata_id, id, sku, name, slug, description, brand_id, category_id, seller_id, status, is_active, price, original_price, cost, currency, quantity, stock_location, track_inventory, allow_backorder, weight, height, width, length, meta_title, meta_description, meta_keywords, tags, attributes, specifications, view_count, sales_count, rating_average, rating_count, featured, barcode, featuring, created_at, updated_at, published_at, xata_createdat, xata_updatedat) SELECT p.id, p.id, p.sku, p.name, p.slug, p.description, p.brand_id, p.category_id, p.seller_id, p.status, p.is_active, p.price::decimal, p.original_price::decimal, p.cost::decimal, p.currency, p.quantity, p.stock_location, p.track_inventory, p.allow_backorder, p.weight::decimal, p.height::decimal, p.width::decimal, p.length::decimal, p.meta_title, p.meta_description, p.meta_keywords, p.tags, p.attributes, p.specifications, p.view_count, p.sales_count, p.rating_average::decimal, p.rating_count, p.featured, p.barcode, p.featuring, p.created_at, p.updated_at, p.published_at, COALESCE(p.xata_createdat, p.created_at), COALESCE(p.xata_updatedat, p.updated_at) FROM products_old p" "Migrar products"

echo ""
echo "PASSO 6: Migrando imagens de produtos..."
execute_sql_file "INSERT INTO product_images (xata_id, id, product_id, image_url, alt_text, display_order, is_primary, created_at, updated_at, xata_createdat, xata_updatedat) SELECT pi.id, pi.id, pi.product_id, pi.image_url, pi.alt_text, pi.display_order, pi.is_primary, pi.created_at, pi.updated_at, COALESCE(pi.xata_createdat, pi.created_at), COALESCE(pi.xata_updatedat, pi.updated_at) FROM product_images_old pi WHERE EXISTS (SELECT 1 FROM products WHERE products.id = pi.product_id)" "Migrar product_images"

echo ""
echo "=== MIGRAÇÃO CONCLUÍDA ==="

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "VERIFICAÇÃO FINAL:"
echo "------------------"

# Verificar contagens finais
for table in users brands categories sellers products product_images; do
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"statement\": \"SELECT COUNT(*) as total FROM $table\"}")
    
    count=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    printf "%-20s: %s registros\n" "$table" "${count:-0}"
done 