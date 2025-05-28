#!/bin/bash

echo "=== TESTANDO SISTEMA DE AUTENTICAÇÃO ==="
echo ""

# URL base
BASE_URL="http://localhost:5173"

# Gerar email único
EMAIL="teste_$(date +%s)@example.com"

echo "1. Testando registro de novo usuário..."
echo "   Email: $EMAIL"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"123456\",\"name\":\"Usuário Teste\"}")

echo "Resposta do registro:"
echo "$REGISTER_RESPONSE" | jq '.' || echo "$REGISTER_RESPONSE"
echo ""

# Extrair cookie de sessão
SESSION_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.sessionToken // empty')

if [ -z "$SESSION_TOKEN" ]; then
  echo "❌ Erro: Não foi possível obter token de sessão"
  echo ""
fi

echo "2. Testando login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"123456\"}")

echo "Resposta do login:"
echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"
echo ""

echo "3. Testando endpoint /me..."
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Resposta do /me:"
echo "$ME_RESPONSE" | jq '.' || echo "$ME_RESPONSE"
echo ""

echo "4. Testando logout..."
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Cookie: session_token=$SESSION_TOKEN")

echo "Resposta do logout:"
echo "$LOGOUT_RESPONSE" | jq '.' || echo "$LOGOUT_RESPONSE"
echo ""

echo "=== TESTE CONCLUÍDO ===" 