#!/bin/bash

echo "🔄 Alternando para banco LOCAL..."

# Backup do .env atual
cp .env .env.backup

# Usar configuração local
cp .env.local .env

echo "✅ Banco local configurado!"
echo "📍 DATABASE_URL: $(cat .env)"
echo ""
echo "🚀 Para reiniciar o servidor:"
echo "   cd apps/store && pnpm dev" 