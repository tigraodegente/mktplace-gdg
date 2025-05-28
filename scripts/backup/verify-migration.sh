#!/bin/bash

# Configurações
API_KEY="xau_4YkLfHkfKWwzMmUzfLWuv1IfbS6M0r9D0"
DB_URL="https://GUSTAVO-FERRO-s-workspace-787mk0.us-east-1.xata.sh/db/mktplace-gdg:main/sql"

echo "=== VERIFICANDO MIGRAÇÃO ==="
echo ""

# Função para executar query e mostrar resultado
check_table() {
    local table="$1"
    
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"statement\": \"SELECT COUNT(*) as total FROM $table\"}")
    
    # Extrair o valor usando jq se disponível, senão usar grep
    if command -v jq &> /dev/null; then
        count=$(echo "$response" | jq -r '.records[0].total // 0')
    else
        count=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2 | head -1)
    fi
    
    printf "%-20s: %s registros\n" "$table" "${count:-0}"
}

echo "CONTAGEM DE REGISTROS:"
echo "----------------------"
check_table "users"
check_table "brands"
check_table "categories"
check_table "sellers"
check_table "products"
check_table "product_images"

echo ""
echo "VERIFICANDO ALGUNS PRODUTOS:"
echo "----------------------------"

# Verificar alguns produtos
response=$(curl -s -X POST "$DB_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"statement": "SELECT id, name, price FROM products LIMIT 5"}')

echo "$response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | head -5

echo ""
echo "VERIFICANDO INTEGRIDADE REFERENCIAL:"
echo "------------------------------------"

# Verificar produtos sem categoria
response=$(curl -s -X POST "$DB_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"statement": "SELECT COUNT(*) as total FROM products WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories)"}')

if command -v jq &> /dev/null; then
    orphan_products=$(echo "$response" | jq -r '.records[0].total // 0')
else
    orphan_products=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2 | head -1)
fi

echo "Produtos com categoria inválida: ${orphan_products:-0}"

# Verificar produtos sem marca
response=$(curl -s -X POST "$DB_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"statement": "SELECT COUNT(*) as total FROM products WHERE brand_id IS NOT NULL AND brand_id NOT IN (SELECT id FROM brands)"}')

if command -v jq &> /dev/null; then
    orphan_brands=$(echo "$response" | jq -r '.records[0].total // 0')
else
    orphan_brands=$(echo "$response" | grep -o '"total":[0-9]*' | cut -d':' -f2 | head -1)
fi

echo "Produtos com marca inválida: ${orphan_brands:-0}"

echo ""
echo "=== VERIFICAÇÃO CONCLUÍDA ===" 