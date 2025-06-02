#!/bin/bash

echo "🔧 Aplicando melhores práticas de timeout..."

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Contador
FIXED=0
TOTAL=0

# Encontrar arquivos com timeouts longos
echo -e "\n🔍 Procurando arquivos com timeouts para otimizar..."

# Lista de arquivos com timeouts problemáticos
FILES_TO_FIX=$(grep -r "setTimeout.*reject.*[0-9]\{4,\}" apps/store/src --include="*.ts" | awk -F: '{print $1}' | sort -u)

if [ -z "$FILES_TO_FIX" ]; then
    echo -e "${GREEN}✓ Nenhum timeout problemático encontrado!${NC}"
    exit 0
fi

echo -e "${YELLOW}Encontrados $(echo "$FILES_TO_FIX" | wc -l) arquivos para otimizar${NC}"

# Criar backup
BACKUP_DIR="backup/timeout-fixes-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Processar cada arquivo
for file in $FILES_TO_FIX; do
    ((TOTAL++))
    echo -e "\n📄 Processando: $file"
    
    # Fazer backup
    cp "$file" "$BACKUP_DIR/$(basename $file)"
    
    # Identificar o tipo de operação pelo caminho
    OPERATION=""
    if [[ $file == *"/auth/"* ]]; then
        if [[ $file == *"login"* ]]; then
            OPERATION="auth/login"
            TIMEOUT="5000"
        elif [[ $file == *"register"* ]]; then
            OPERATION="auth/register"
            TIMEOUT="6000"
        elif [[ $file == *"logout"* ]]; then
            OPERATION="auth/logout"
            TIMEOUT="1000"
        else
            OPERATION="auth/default"
            TIMEOUT="3000"
        fi
    elif [[ $file == *"/products/"* ]]; then
        if [[ $file == *"search"* ]]; then
            OPERATION="products/search"
            TIMEOUT="4000"
        else
            OPERATION="products/single"
            TIMEOUT="3000"
        fi
    elif [[ $file == *"/orders/"* ]]; then
        if [[ $file == *"create"* ]]; then
            OPERATION="orders/create"
            TIMEOUT="8000"
        else
            OPERATION="orders/list"
            TIMEOUT="5000"
        fi
    elif [[ $file == *"/shipping/"* ]]; then
        OPERATION="shipping/calculate"
        TIMEOUT="5000"
    elif [[ $file == *"/payments/"* ]]; then
        OPERATION="payments/process"
        TIMEOUT="15000"
    elif [[ $file == *"/categories/"* ]]; then
        OPERATION="categories"
        TIMEOUT="3000"
    else
        OPERATION="default"
        TIMEOUT="5000"
    fi
    
    echo "  • Operação identificada: $OPERATION (timeout: ${TIMEOUT}ms)"
    
    # Verificar se já importa os helpers
    if ! grep -q "import.*TIMEOUT_CONFIG" "$file"; then
        # Adicionar imports necessários
        echo "  • Adicionando imports..."
        sed -i '' "1a\\
import { TIMEOUT_CONFIG, withTimeout } from '\$lib/config/timeouts';\\
" "$file"
    fi
    
    # Substituir timeouts hardcoded
    echo "  • Substituindo timeouts hardcoded..."
    
    # Padrão 1: setTimeout com reject
    sed -i '' "s/setTimeout(() => reject(new Error('\([^']*\)')), [0-9]\+)/setTimeout(() => reject(new Error('\1')), TIMEOUT_CONFIG.api.${OPERATION//\//.} || $TIMEOUT)/g" "$file"
    
    # Padrão 2: Promise.race com timeout
    if grep -q "Promise.race.*setTimeout.*reject" "$file"; then
        echo "  • Detectado Promise.race - recomendando uso de withTimeout()"
        echo -e "${YELLOW}  ⚠️  ATENÇÃO: Este arquivo usa Promise.race. Considere refatorar para usar withTimeout()${NC}"
    fi
    
    ((FIXED++))
    echo -e "${GREEN}  ✓ Arquivo processado${NC}"
done

echo -e "\n📊 Resumo:"
echo -e "${GREEN}✓ $FIXED de $TOTAL arquivos processados${NC}"
echo -e "📁 Backup salvo em: $BACKUP_DIR"

# Criar relatório
REPORT_FILE="timeout-optimization-report.md"
cat > "$REPORT_FILE" << EOF
# Relatório de Otimização de Timeouts

Data: $(date)

## Arquivos Processados

Total: $FIXED de $TOTAL arquivos

## Mudanças Aplicadas

1. Timeouts hardcoded substituídos por configuração centralizada
2. Imports adicionados quando necessário
3. Valores otimizados baseados no tipo de operação

## Próximos Passos

1. Revisar arquivos que usam Promise.race
2. Considerar usar withTimeout() ou queryWithTimeout()
3. Testar todas as APIs afetadas
4. Monitorar métricas de timeout em produção

## Valores de Timeout Aplicados

- Auth/Login: 5s
- Auth/Register: 6s
- Auth/Logout: 1s
- Products/List: 5s
- Products/Search: 4s
- Orders/Create: 8s
- Shipping: 5s
- Payments: 15s
- Default: 5s
EOF

echo -e "\n${GREEN}✓ Relatório salvo em: $REPORT_FILE${NC}"

# Sugestões finais
echo -e "\n💡 Sugestões:"
echo "1. Execute os testes para verificar se tudo continua funcionando"
echo "2. Revise manualmente arquivos complexos que usam Promise.race"
echo "3. Considere implementar métricas para monitorar timeouts em produção"
echo "4. Configure alertas para timeouts frequentes" 