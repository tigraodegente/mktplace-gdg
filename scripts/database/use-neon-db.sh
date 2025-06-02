#!/bin/bash

echo "🔄 Alternando para banco NEON..."

# Backup do .env atual
cp .env .env.backup

# Usar configuração Neon
cp .env.backup_neon .env

echo "✅ Banco Neon configurado!"
echo "📍 DATABASE_URL: $(cat .env)"
echo ""
echo "🚀 Para reiniciar o servidor:"
echo "   cd apps/store && pnpm dev" 