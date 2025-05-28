#!/bin/bash

# Configurações
API_KEY="xau_4YkLfHkfKWwzMmUzfLWuv1IfbS6M0r9D0"
DB_URL="https://GUSTAVO-FERRO-s-workspace-787mk0.us-east-1.xata.sh/db/mktplace-gdg:main"

# Gerar dados únicos
TIMESTAMP=$(date +%s)
USER_ID="user_test_${TIMESTAMP}"
EMAIL="test_${TIMESTAMP}@example.com"

echo "=== TESTANDO CRIAÇÃO DE USUÁRIO VIA API REST ==="
echo ""
echo "ID: $USER_ID"
echo "Email: $EMAIL"
echo ""

# Criar usuário via API REST
curl -X POST "$DB_URL/tables/users/data" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$USER_ID\",
    \"email\": \"$EMAIL\",
    \"password_hash\": \"\$2a\$10\$YourHashHere\",
    \"name\": \"Test User\",
    \"role\": \"customer\",
    \"is_active\": true,
    \"email_verified\": false
  }" | jq '.'

echo ""
echo "=== TESTE CONCLUÍDO ===" 