#!/bin/bash

# Script para popular dados de FAQ no banco de dados usando curl
# USO: ./scripts/populate-faq.sh [URL_BASE]
# 
# Exemplo:
# ./scripts/populate-faq.sh http://localhost:5173
# ./scripts/populate-faq.sh https://store.graodegente.com

BASE_URL=${1:-"http://localhost:5173"}
ENDPOINT="$BASE_URL/api/admin/populate-faq"

echo "🌱 Populando dados de FAQ..."
echo "📡 Endpoint: $ENDPOINT"

# Fazer requisição POST com curl
response=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "gdg-populate-2024"}')

# Verificar se curl executou com sucesso
if [ $? -ne 0 ]; then
  echo "❌ Erro ao conectar com o endpoint"
  echo "💡 Verifique se o servidor está rodando em $BASE_URL"
  exit 1
fi

# Verificar se resposta contém sucesso
if echo "$response" | grep -q '"success":true'; then
  echo "✅ Dados populados com sucesso!"
  echo "📊 Resposta do servidor:"
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  echo ""
  echo "🎉 Pronto! Acesse $BASE_URL/atendimento para ver os dados."
else
  echo "❌ Erro na resposta:"
  echo "$response"
  exit 1
fi 