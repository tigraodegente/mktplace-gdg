#!/bin/bash

echo "🔄 Alternando para banco RAILWAY..."

# Backup do .env atual
cp .env .env.backup

# Configuração Railway
echo 'DATABASE_URL="postgresql://postgres:dUqxGkGhAnTYWRGWdmdfOGXMqhTQYPsx@shinkansen.proxy.rlwy.net:41615/railway"' > .env

echo "✅ Banco Railway configurado!"
echo "📍 DATABASE_URL: $(cat .env)"
echo ""
echo "🚀 Para reiniciar o servidor:"
echo "   cd apps/store && pnpm dev" 