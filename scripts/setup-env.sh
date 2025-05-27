#!/bin/bash

# Script para adicionar variáveis de ambiente faltantes

echo "📝 Adicionando variáveis de ambiente faltantes ao .env..."

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

# Adicionar variáveis se não existirem
if ! grep -q "JWT_SECRET" .env; then
    echo "" >> .env
    echo "# Autenticação" >> .env
    echo "JWT_SECRET=6XrIxP1BvoeHxYHSTxyoU6zKzf622a9yq4cRm0u5vFI=" >> .env
    echo "JWT_EXPIRES_IN=7d" >> .env
    echo "REFRESH_TOKEN_EXPIRES_IN=30d" >> .env
fi

if ! grep -q "VITE_PUBLIC_STORE_URL" .env; then
    echo "" >> .env
    echo "# URLs das aplicações" >> .env
    echo "VITE_PUBLIC_STORE_URL=http://localhost:5173" >> .env
    echo "VITE_PUBLIC_ADMIN_URL=http://localhost:5174" >> .env
    echo "VITE_PUBLIC_SELLER_URL=http://localhost:5175" >> .env
    echo "VITE_PUBLIC_API_URL=http://localhost:5173/api" >> .env
fi

if ! grep -q "NODE_ENV" .env; then
    echo "" >> .env
    echo "# Ambiente" >> .env
    echo "NODE_ENV=development" >> .env
    echo "LOG_LEVEL=info" >> .env
fi

if ! grep -q "SESSION_SECRET" .env; then
    echo "" >> .env
    echo "# Segurança (opcional por enquanto)" >> .env
    echo "SESSION_SECRET=temporario_mudar_em_producao" >> .env
    echo "CSRF_SECRET=temporario_mudar_em_producao" >> .env
    echo "CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175" >> .env
fi

echo "✅ Variáveis adicionadas com sucesso!"
echo ""
echo "🔍 Validando configuração..."
pnpm run check:env 