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
        echo "✅ Sucesso"
        return 0
    fi
}

echo "=== INICIANDO MIGRAÇÃO DE DADOS AJUSTADA ==="
echo ""

# Limpar dados existentes
echo "Limpando dados existentes..."
execute_sql_file "DELETE FROM product_images" "Limpar product_images"
execute_sql_file "DELETE FROM products" "Limpar products"
execute_sql_file "DELETE FROM sellers" "Limpar sellers"
execute_sql_file "DELETE FROM users" "Limpar todos users"

echo ""
echo "PASSO 1: Migrando usuários..."
# Ajustado para colunas existentes em users_old
execute_sql_file "INSERT INTO users (xata_id, id, email, password_hash, name, role, is_active, phone, email_verified, created_at, updated_at, xata_createdat, xata_updatedat) SELECT id, id, email, password_hash, name, role, is_active, phone, email_verified, created_at, updated_at, COALESCE(xata_createdat, created_at), COALESCE(xata_updatedat, updated_at) FROM users_old" "Migrar users"

echo ""
echo "PASSO 2: Verificando marcas e categorias..."
execute_sql_file "SELECT COUNT(*) as total FROM brands" "Contar brands"
execute_sql_file "SELECT COUNT(*) as total FROM categories" "Contar categories"

echo ""
echo "PASSO 3: Migrando vendedores..."
# Ajustado para colunas existentes em sellers_old (store_slug -> slug, store_name -> company_name)
execute_sql_file "INSERT INTO sellers (xata_id, id, user_id, company_name, slug, description, logo_url, banner_url, is_active, created_at, updated_at, xata_createdat, xata_updatedat) SELECT s.id, s.id, s.user_id, s.company_name, s.store_slug, s.description, s.logo_url, s.banner_url, (s.status = 'active'), s.created_at, s.updated_at, s.created_at, s.updated_at FROM sellers_old s WHERE EXISTS (SELECT 1 FROM users WHERE users.id = s.user_id)" "Migrar sellers"

echo ""
echo "PASSO 4: Verificando se há sellers..."
execute_sql_file "SELECT COUNT(*) as total FROM sellers" "Contar sellers"

echo ""
echo "PASSO 5: Migrando produtos..."
# Primeiro vamos verificar se há sellers
execute_sql_file "INSERT INTO products (xata_id, id, sku, name, slug, description, brand_id, category_id, seller_id, status, is_active, price, original_price, cost, currency, quantity, stock_location, track_inventory, allow_backorder, weight, height, width, length, meta_title, meta_description, meta_keywords, tags, attributes, specifications, view_count, sales_count, rating_average, rating_count, featured, barcode, featuring, created_at, updated_at, published_at, xata_createdat, xata_updatedat) SELECT p.id, p.id, p.sku, p.name, p.slug, p.description, p.brand_id, p.category_id, p.seller_id, p.status, p.is_active, p.price::decimal, p.original_price::decimal, p.cost::decimal, p.currency, p.quantity, p.stock_location, p.track_inventory, p.allow_backorder, p.weight::decimal, p.height::decimal, p.width::decimal, p.length::decimal, p.meta_title, p.meta_description, p.meta_keywords, p.tags, p.attributes, p.specifications, p.view_count, p.sales_count, p.rating_average::decimal, p.rating_count, p.featured, p.barcode, p.featuring, p.created_at, p.updated_at, p.published_at, COALESCE(p.xata_createdat, p.created_at), COALESCE(p.xata_updatedat, p.updated_at) FROM products_old p WHERE (p.seller_id IS NULL OR EXISTS (SELECT 1 FROM sellers WHERE sellers.id = p.seller_id))" "Migrar products"

echo ""
echo "PASSO 6: Verificando estrutura de product_images_old..."
execute_sql_file "SELECT column_name FROM information_schema.columns WHERE table_name = 'product_images_old' ORDER BY ordinal_position LIMIT 10" "Listar colunas product_images_old"

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

echo ""
echo "AMOSTRA DE PRODUTOS:"
echo "--------------------"
curl -s -X POST "$DB_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"statement": "SELECT name, price FROM products LIMIT 5"}' | jq -r '.records[] | "\(.name) - R$ \(.price)"' 2>/dev/null || echo "Nenhum produto encontrado" 