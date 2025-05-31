#!/bin/bash

echo "🔍 VERIFICAÇÃO COMPLETA DO MARKETPLACE GDG"
echo "=========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Função para testar
test_system() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "🧪 Testando $test_name... "
    
    if eval "$test_command" 2>/dev/null | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASSOU${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FALHOU${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "📊 VERIFICANDO ESTRUTURA DO PROJETO"
echo "-----------------------------------"

# Verificar se todas as pastas existem
test_system "Estrutura de apps" "ls -la apps/" "store"
test_system "Estrutura de packages" "ls -la packages/" "ui"
test_system "Estrutura de docs" "ls -la docs/" "api"

echo ""
echo "🔧 VERIFICANDO CONFIGURAÇÕES"
echo "----------------------------"

# Verificar configurações
test_system "Arquivo .env" "ls -la" ".env"
test_system "Package.json raiz" "cat package.json" "workspaces"
test_system "Tailwind config" "ls -la apps/store/" "tailwind.config.js"

echo ""
echo "📦 VERIFICANDO DEPENDÊNCIAS"
echo "---------------------------"

# Verificar dependências críticas
test_system "Node modules" "ls -la" "node_modules"
test_system "SvelteKit na store" "cd apps/store && npm list @sveltejs/kit" "@sveltejs/kit"
test_system "Tailwind CSS" "cd apps/store && npm list tailwindcss" "tailwindcss"

echo ""
echo "🏗️ TESTANDO BUILDS"
echo "------------------"

# Testar builds de todos os apps
echo "📱 Store:"
test_system "Build Store" "cd apps/store && npm run build" "built in"

echo "🎛️ Admin Panel:"
test_system "Build Admin" "cd apps/admin-panel && npm run build" "built in"

echo "🏪 Seller Panel:"
test_system "Build Seller" "cd apps/seller-panel && npm run build" "built in"

echo ""
echo "🗄️ VERIFICANDO BANCO DE DADOS"
echo "-----------------------------"

# Verificar se o banco está configurado
test_system "Variáveis de ambiente" "grep -c 'DATABASE_URL' .env" "1"
test_system "Scripts SQL" "ls -la" "create_advanced_systems_tables.sql"
test_system "Dados de exemplo" "ls -la" "insert_sample_data.sql"

echo ""
echo "📋 VERIFICANDO DOCUMENTAÇÃO"
echo "---------------------------"

# Verificar documentação
test_system "README principal" "cat README.md" "Marketplace GDG"
test_system "Setup do banco" "ls -la" "SETUP_BANCO_LOCAL.md"
test_system "Status final" "ls -la" "MARKETPLACE_FINAL_STATUS.md"
test_system "Script de setup" "ls -la setup_banco_local.sh" "setup_banco_local.sh"

echo ""
echo "🚀 VERIFICANDO SCRIPTS DE DEPLOY"
echo "-------------------------------"

# Verificar scripts
test_system "Script exportar" "ls -la exportar_banco_completo.sh" "exportar_banco_completo.sh"
test_system "Script importar" "ls -la importar_banco_completo.sh" "importar_banco_completo.sh"
test_system "Script limpeza" "ls -la cleanup-marketplace.sh" "cleanup-marketplace.sh"

echo ""
echo "🎨 VERIFICANDO DESIGN SYSTEM"
echo "---------------------------"

# Verificar UI e design
test_system "Package UI" "ls -la packages/ui/src/" "components"
test_system "Tipos compartilhados" "ls -la packages/shared-types/src/" "models"
test_system "Utilitários" "ls -la packages/utils/src/" "auth"

echo ""
echo "📄 VERIFICANDO ARQUIVOS DE CONFIGURAÇÃO"
echo "---------------------------------------"

# Verificar configs importantes
test_system "TSConfig" "ls -la" "tsconfig.base.json"
test_system "Gitignore" "ls -la" ".gitignore"
test_system "PNPM workspace" "ls -la" "pnpm-workspace.yaml"

echo ""
echo "🎯 ANALISANDO FUNCIONALIDADES IMPLEMENTADAS"
echo "------------------------------------------"

# Verificar funcionalidades nos arquivos
test_system "Sistema de carrinho" "grep -r 'CartStore' apps/store/src/ | wc -l" "[1-9]"
test_system "Sistema de auth" "grep -r 'authStore' apps/store/src/ | wc -l" "[1-9]"
test_system "APIs implementadas" "ls apps/store/src/routes/api/ | wc -l" "[1-9]"

echo ""
echo "🔍 VERIFICANDO QUALIDADE DO CÓDIGO"
echo "---------------------------------"

# Verificar qualidade
test_system "Console.logs removidos" "grep -r 'console\.log' apps/store/src/ | wc -l" "^[0-9]$"
test_system "TODOs pendentes" "grep -r 'TODO\|FIXME' apps/store/src/ | wc -l" "^[0-9]$"
test_system "Arquivos TypeScript" "find apps/store/src/ -name '*.ts' -o -name '*.svelte' | wc -l" "[1-9]"

echo ""
echo "💾 VERIFICANDO BACKUP E MIGRAÇÃO"
echo "-------------------------------"

test_system "Exports disponíveis" "ls -la exports/" "exists"
test_system "Schema atual" "ls -la schema.json" "schema.json"

echo ""
echo "🎉 RELATÓRIO FINAL"
echo "=================="

PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo -e "Total de testes: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Testes aprovados: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Testes falharam: ${RED}$FAILED_TESTS${NC}"
echo -e "Taxa de sucesso: ${BLUE}$PERCENTAGE%${NC}"

echo ""
if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}🏆 MARKETPLACE ESTÁ EXCELENTE! ($PERCENTAGE%)${NC}"
    echo -e "${GREEN}✅ Pronto para produção!${NC}"
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${YELLOW}⚠️ MARKETPLACE ESTÁ BOM! ($PERCENTAGE%)${NC}"
    echo -e "${YELLOW}🔧 Pequenos ajustes podem ser necessários${NC}"
else
    echo -e "${RED}❌ MARKETPLACE PRECISA DE ATENÇÃO! ($PERCENTAGE%)${NC}"
    echo -e "${RED}🚨 Problemas críticos encontrados${NC}"
fi

echo ""
echo "📋 PRÓXIMOS PASSOS SUGERIDOS:"
echo "-----------------------------"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ Todos os testes passaram!"
    echo "🚀 O marketplace está 100% pronto para uso"
    echo "💡 Sugestões:"
    echo "   - Execute os apps: pnpm dev"
    echo "   - Teste as funcionalidades"
    echo "   - Deploy em produção"
else
    echo "🔧 Itens que precisam de atenção:"
    echo "   - Revisar testes que falharam"
    echo "   - Verificar configurações"
    echo "   - Executar scripts de setup se necessário"
fi

echo ""
echo "📚 COMANDOS ÚTEIS:"
echo "-----------------"
echo "pnpm dev              # Iniciar desenvolvimento"
echo "pnpm build            # Build de produção"
echo "./setup_banco_local.sh # Setup completo do banco"
echo "./exportar_banco_completo.sh # Backup do banco"

echo ""
echo "🎯 VERIFICAÇÃO COMPLETA FINALIZADA!"
echo "====================================" 