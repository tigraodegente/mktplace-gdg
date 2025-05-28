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
    
    if echo "$response" | grep -q '"message"'; then
        echo "❌ Erro: $response"
        return 1
    else
        echo "✅ Sucesso"
        return 0
    fi
}

echo "=== LIMPANDO TABELAS ANTIGAS RESTANTES ==="
echo ""

# Obter lista de todas as tabelas com sufixo _old
echo "Obtendo lista de tabelas antigas..."
response=$(curl -s -X POST "$DB_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"statement": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name LIKE '\''%_old'\'' ORDER BY table_name"}')

# Extrair nomes das tabelas
OLD_TABLES=$(echo "$response" | jq -r '.records[].table_name' 2>/dev/null)

if [ -z "$OLD_TABLES" ]; then
    echo "Nenhuma tabela antiga encontrada."
else
    echo "Tabelas antigas encontradas:"
    echo "$OLD_TABLES"
    echo ""
    
    # Dropar cada tabela
    while IFS= read -r table; do
        execute_sql "DROP TABLE IF EXISTS $table CASCADE" "Dropando $table"
    done <<< "$OLD_TABLES"
fi

# Dropar também outras tabelas desnecessárias
echo ""
echo "Removendo outras tabelas desnecessárias..."
UNNECESSARY_TABLES=(
    "active_payment_methods"
    "active_shipping_methods"
    "product_ratings"
    "valid_coupons"
)

for table in "${UNNECESSARY_TABLES[@]}"; do
    execute_sql "DROP TABLE IF EXISTS $table CASCADE" "Dropando $table"
done

echo ""
echo "Verificando tabelas finais..."
response=$(curl -s -X POST "$DB_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"statement": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name NOT LIKE '\''xata_%'\'' ORDER BY table_name"}')

echo ""
echo "TABELAS FINAIS NO BANCO:"
echo "========================"
echo "$response" | jq -r '.records[].table_name' 2>/dev/null

echo ""
echo "=== LIMPEZA CONCLUÍDA ===" 