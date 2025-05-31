#!/bin/bash

echo "🔍 VALIDANDO IMPLEMENTAÇÕES DE PERFORMANCE"
echo "========================================="

# Verificar se os arquivos foram criados
files=(
    "apps/store/src/lib/components/ui/OptimizedImage.svelte"
    "apps/store/src/lib/utils/lazyLoad.ts"
    "apps/store/src/lib/analytics/ecommerce.ts"
    "apps/store/src/lib/monitoring/rum.ts"
    "apps/store/static/sw.js"
    "apps/store/static/offline.html"
)

echo "Verificando arquivos:"
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file"
    fi
done

echo ""
echo "Próximos passos:"
echo "1. Configure GA_MEASUREMENT_ID no app.html"
echo "2. Configure Sentry DSN se usar error tracking"
echo "3. Teste o service worker em produção"
echo "4. Valide com Lighthouse"
echo ""
echo "Comandos úteis:"
echo "  pnpm build && pnpm preview"
echo "  lighthouse http://localhost:4173 --view"
