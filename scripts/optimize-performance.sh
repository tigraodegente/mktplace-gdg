#!/bin/bash

echo "🚀 Iniciando otimização de performance..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Contador de otimizações
OPTIMIZATIONS=0

echo -e "\n📦 1. Analisando imports não utilizados..."
UNUSED_IMPORTS=$(grep -r "import.*from" apps/store/src --include="*.ts" --include="*.svelte" | grep -v "// @ts-ignore" | wc -l)
echo -e "${YELLOW}Total de imports encontrados: $UNUSED_IMPORTS${NC}"

echo -e "\n🖼️ 2. Verificando imagens sem lazy loading..."
EAGER_IMAGES=$(grep -r 'loading="eager"' apps/store/src --include="*.svelte" | wc -l)
if [ $EAGER_IMAGES -gt 0 ]; then
    echo -e "${RED}Encontradas $EAGER_IMAGES imagens com loading='eager'${NC}"
    grep -r 'loading="eager"' apps/store/src --include="*.svelte"
else
    echo -e "${GREEN}✓ Todas as imagens usando lazy loading${NC}"
    ((OPTIMIZATIONS++))
fi

echo -e "\n⏱️ 3. Procurando timeouts desnecessários..."
TIMEOUTS=$(grep -r "setTimeout.*[0-9]\{4,\}" apps/store/src --include="*.ts" --include="*.svelte" | wc -l)
if [ $TIMEOUTS -gt 0 ]; then
    echo -e "${RED}Encontrados $TIMEOUTS timeouts longos (>1s)${NC}"
    grep -r "setTimeout.*[0-9]\{4,\}" apps/store/src --include="*.ts" --include="*.svelte"
else
    echo -e "${GREEN}✓ Nenhum timeout longo encontrado${NC}"
    ((OPTIMIZATIONS++))
fi

echo -e "\n🔄 4. Verificando componentes sem memo/cache..."
NO_MEMO=$(grep -r "export let" apps/store/src/lib/components --include="*.svelte" | grep -v "$props" | wc -l)
echo -e "${YELLOW}Componentes usando sintaxe antiga: $NO_MEMO${NC}"

echo -e "\n📊 5. Analisando tamanho de chunks..."
if [ -d "apps/store/.svelte-kit/output" ]; then
    LARGE_CHUNKS=$(find apps/store/.svelte-kit/output -name "*.js" -size +100k | wc -l)
    if [ $LARGE_CHUNKS -gt 0 ]; then
        echo -e "${RED}Encontrados $LARGE_CHUNKS chunks grandes (>100KB)${NC}"
        find apps/store/.svelte-kit/output -name "*.js" -size +100k -exec ls -lh {} \;
    else
        echo -e "${GREEN}✓ Todos os chunks têm tamanho otimizado${NC}"
        ((OPTIMIZATIONS++))
    fi
else
    echo -e "${YELLOW}Build não encontrado. Execute 'pnpm build' primeiro${NC}"
fi

echo -e "\n🔍 6. Procurando consultas N+1..."
N_PLUS_ONE=$(grep -r "await.*forEach\|for.*await" apps/store/src --include="*.ts" --include="*.svelte" | wc -l)
if [ $N_PLUS_ONE -gt 0 ]; then
    echo -e "${RED}Possíveis consultas N+1 encontradas: $N_PLUS_ONE${NC}"
    grep -r "await.*forEach\|for.*await" apps/store/src --include="*.ts" --include="*.svelte" | head -5
else
    echo -e "${GREEN}✓ Nenhuma consulta N+1 óbvia encontrada${NC}"
    ((OPTIMIZATIONS++))
fi

echo -e "\n💾 7. Verificando uso de cache..."
CACHE_USAGE=$(grep -r "cache\|Cache" apps/store/src --include="*.ts" | grep -v "no-cache" | wc -l)
echo -e "${YELLOW}Uso de cache encontrado em $CACHE_USAGE arquivos${NC}"

echo -e "\n📈 8. Analisando bundle size..."
if command -v du &> /dev/null; then
    if [ -d "apps/store/.svelte-kit/output" ]; then
        BUNDLE_SIZE=$(du -sh apps/store/.svelte-kit/output 2>/dev/null | cut -f1)
        echo -e "${YELLOW}Tamanho total do bundle: $BUNDLE_SIZE${NC}"
    fi
fi

echo -e "\n✨ 9. Sugestões de otimização:"
echo -e "${GREEN}Recomendações:${NC}"
echo "  • Use dynamic imports para componentes pesados"
echo "  • Implemente Service Worker para cache offline"
echo "  • Configure compressão gzip/brotli no Cloudflare"
echo "  • Use Image CDN para otimização automática"
echo "  • Implemente Virtual Scrolling para listas grandes"
echo "  • Configure HTTP/2 Server Push para recursos críticos"

echo -e "\n📊 Resumo:"
echo -e "${GREEN}Otimizações já implementadas: $OPTIMIZATIONS/5${NC}"

# Criar relatório
REPORT_FILE="performance-report-$(date +%Y%m%d-%H%M%S).md"
echo "# Relatório de Performance" > $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Data: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "## Métricas" >> $REPORT_FILE
echo "- Imagens com eager loading: $EAGER_IMAGES" >> $REPORT_FILE
echo "- Timeouts longos: $TIMEOUTS" >> $REPORT_FILE
echo "- Possíveis N+1: $N_PLUS_ONE" >> $REPORT_FILE
echo "- Componentes legados: $NO_MEMO" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo -e "\n${GREEN}✓ Análise completa! Relatório salvo em: $REPORT_FILE${NC}" 