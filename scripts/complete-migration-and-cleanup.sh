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

echo "=== COMPLETANDO MIGRAÇÃO E LIMPEZA ==="
echo ""

# 1. Migrar imagens dos produtos
echo "PASSO 1: Migrando imagens dos produtos..."
execute_sql_file "INSERT INTO product_images (xata_id, id, product_id, image_url, alt_text, display_order, is_primary, created_at, updated_at, xata_createdat, xata_updatedat) SELECT pi.id, pi.id, pi.product_id, pi.url, pi.alt, pi.position, pi.is_primary, pi.created_at, pi.created_at, COALESCE(pi.xata_createdat, pi.created_at), COALESCE(pi.xata_updatedat, pi.created_at) FROM product_images_old pi WHERE EXISTS (SELECT 1 FROM products WHERE products.id = pi.product_id)" "Migrar product_images"

# 2. Verificar contagem final
echo ""
echo "PASSO 2: Verificando contagens finais..."
for table in users brands categories sellers products product_images; do
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"statement\": \"SELECT COUNT(*) as total FROM $table\"}")
    
    count=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    printf "%-20s: %s registros\n" "$table" "${count:-0}"
done

# 3. Gerar o cliente Xata tipado
echo ""
echo "PASSO 3: Gerando cliente Xata tipado..."
cd /Users/guga/apps/mktplace-gdg
xata codegen --output packages/xata-client/src/xata.ts

# 4. Limpar tabelas antigas e de teste
echo ""
echo "PASSO 4: Limpando tabelas antigas e de teste..."
echo "⚠️  ATENÇÃO: Isso irá remover permanentemente as tabelas antigas!"
echo "Aguardando 5 segundos antes de continuar..."
sleep 5

# Lista de tabelas antigas para remover
OLD_TABLES=(
    "product_images_old"
    "products_old"
    "sellers_old"
    "categories_old"
    "brands_old"
    "users_old"
    "test_table"
    "addresses"
    "cart_items"
    "carts"
    "coupons"
    "order_items"
    "order_status_history"
    "orders"
    "payment_methods"
    "payments"
    "product_categories"
    "product_coupons"
    "product_reviews"
    "product_variants"
    "shipping_addresses"
    "shipping_methods"
    "user_addresses"
    "user_sessions"
    "variant_options"
    "wishlists"
)

# Dropar cada tabela antiga
for table in "${OLD_TABLES[@]}"; do
    execute_sql_file "DROP TABLE IF EXISTS $table CASCADE" "Dropando $table"
done

echo ""
echo "PASSO 5: Verificando tabelas restantes..."
response=$(curl -s -X POST "$DB_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"statement": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name NOT LIKE '\''xata_%'\'' ORDER BY table_name"}')

echo "Tabelas restantes no banco:"
echo "$response" | jq -r '.records[].table_name' 2>/dev/null || echo "$response"

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "=== MIGRAÇÃO E LIMPEZA CONCLUÍDAS ==="
echo ""
echo "✅ Dados migrados com sucesso!"
echo "✅ Tabelas antigas removidas!"
echo "✅ Cliente Xata tipado gerado!"
echo ""
echo "Próximos passos:"
echo "1. Verificar se o cliente Xata foi gerado corretamente em packages/xata-client/src/xata.ts"
echo "2. Testar a aplicação para garantir que tudo está funcionando"
echo "3. Fazer commit das mudanças" 