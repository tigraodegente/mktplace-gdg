#!/bin/bash

# =====================================================
# SCRIPT DE SUBSTITUIÇÃO DE CONSOLE.LOGS
# Marketplace GDG - Logging
# =====================================================

set -e

echo "📝 Substituindo console.logs pelo sistema de logger..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Contador de arquivos modificados
count=0

# =====================================================
# FUNÇÃO PARA SUBSTITUIR LOGS EM UM ARQUIVO
# =====================================================

process_file() {
    local file="$1"
    local modified=false
    
    # Fazer backup do arquivo
    cp "$file" "$file.backup"
    
    # Verificar se já importa o logger
    if ! grep -q "from.*utils/logger" "$file" && ! grep -q "import.*logger" "$file"; then
        # Adicionar import do logger após os outros imports
        if grep -q "^import" "$file"; then
            # Encontrar a última linha de import e adicionar o logger depois
            sed -i '' '/^import.*from/a\
import { logger } from '\''$lib/utils/logger'\'';
' "$file"
            modified=true
        fi
    fi
    
    # Substituições específicas para diferentes tipos de log
    
    # 1. Logs de API/Operações (manter emojis e contexto)
    if sed -i '' 's/console\.log(`🔐 Login attempt for: \${email}`);/logger.auth("attempt", true, { email });/g' "$file"; then
        modified=true
    fi
    
    if sed -i '' 's/console\.log(`✅ Login success: \${.*\.email}`);/logger.auth("success", true, { email: result.user.email });/g' "$file"; then
        modified=true
    fi
    
    if sed -i '' 's/console\.log(`❌ Login failed: \${.*}`);/logger.operation(false, "Login failed", { reason: result.error.message });/g' "$file"; then
        modified=true
    fi
    
    # 2. Logs informativos genéricos com emojis
    if sed -i '' 's/console\.log(`✅ \([^`]*\)`);/logger.info("\1");/g' "$file"; then
        modified=true
    fi
    
    if sed -i '' 's/console\.log(`⚠️ \([^`]*\)`);/logger.warn("\1");/g' "$file"; then
        modified=true
    fi
    
    if sed -i '' 's/console\.log(`🔍 \([^`]*\)`);/logger.debug("\1");/g' "$file"; then
        modified=true
    fi
    
    # 3. Logs com templates literals simples
    if sed -i '' 's/console\.log(`\([^$]*\)`);/logger.info("\1");/g' "$file"; then
        modified=true
    fi
    
    # 4. Logs de erro
    if sed -i '' 's/console\.error(\([^)]*\));/logger.error(\1);/g' "$file"; then
        modified=true
    fi
    
    # 5. Console.warn
    if sed -i '' 's/console\.warn(\([^)]*\));/logger.warn(\1);/g' "$file"; then
        modified=true
    fi
    
    # 6. Console.log simples com strings
    if sed -i '' "s/console\.log('\([^']*\)');/logger.info('\1');/g" "$file"; then
        modified=true
    fi
    
    if sed -i '' 's/console\.log("\([^"]*\)");/logger.info("\1");/g' "$file"; then
        modified=true
    fi
    
    # 7. Console.log com variáveis
    if sed -i '' 's/console\.log(\([^)]*\));/logger.debug(\1);/g' "$file"; then
        modified=true
    fi
    
    # Se o arquivo foi modificado
    if [ "$modified" = true ]; then
        # Verificar se a modificação foi válida
        if node -c "$file" 2>/dev/null; then
            rm "$file.backup"
            log_success "Logs substituídos em: $(basename "$file")"
            ((count++))
        else
            # Restaurar backup se houve erro de sintaxe
            mv "$file.backup" "$file"
            log_warning "Erro de sintaxe em $(basename "$file"), restaurando backup"
        fi
    else
        rm "$file.backup"
    fi
}

# =====================================================
# PROCESSAR TODOS OS ARQUIVOS TS/JS
# =====================================================

log_info "Processando arquivos TypeScript/JavaScript..."

# Encontrar arquivos .ts e .js (excluindo node_modules, .svelte-kit, etc.)
find . -name "*.ts" -o -name "*.js" | \
    grep -v node_modules | \
    grep -v ".svelte-kit" | \
    grep -v ".wrangler" | \
    grep -v ".git" | \
    while read -r file; do
        # Verificar se o arquivo contém console.log
        if grep -q "console\." "$file"; then
            process_file "$file"
        fi
    done

# =====================================================
# CRIAR ARQUIVO DE MIGRAÇÃO PARA CASOS COMPLEXOS
# =====================================================

log_info "Criando guia para casos complexos..."

cat > scripts/manual-logger-migration.md << 'EOF'
# Migração Manual de Logs Complexos

## Casos que requerem atenção manual:

### 1. Logs com interpolação complexa
```typescript
// ANTES
console.log(`User ${user.id} performed ${action} at ${new Date()}`);

// DEPOIS  
logger.info('User performed action', { 
  userId: user.id, 
  action, 
  timestamp: new Date() 
});
```

### 2. Logs condicionais
```typescript
// ANTES
if (isDev) console.log('Debug info');

// DEPOIS
logger.debug('Debug info');  // já é condicional
```

### 3. Logs com dados sensíveis
```typescript
// ANTES
console.log('Login data:', { email, password });

// DEPOIS
logger.auth('login_attempt', true, { email }); // senha removida automaticamente
```

### 4. Performance logs
```typescript
// ANTES
console.log(`Operation took ${Date.now() - start}ms`);

// DEPOIS
logger.performance('operation_name', start);
```

### 5. API logs
```typescript
// ANTES
console.log(`${method} ${url} -> ${status}`);

// DEPOIS
logger.api(method, url, status, duration);
```

## Padrões recomendados:

- **Sucessos**: `logger.operation(true, message, data)`
- **Erros**: `logger.operation(false, message, data)` 
- **Auth**: `logger.auth(action, success, data)`
- **APIs**: `logger.api(method, endpoint, status, duration)`
- **Performance**: `logger.performance(label, startTime)`
- **Debug geral**: `logger.debug(message, data)`
- **Informações**: `logger.info(message, data)`
- **Warnings**: `logger.warn(message, data)`
- **Erros críticos**: `logger.error(message, data)`
EOF

# =====================================================
# FINALIZAÇÃO
# =====================================================

log_success "Substituição de console.logs concluída!"

echo ""
echo "📊 ESTATÍSTICAS:"
echo "   • Arquivos modificados: $count"
echo "   • Guia para casos complexos: scripts/manual-logger-migration.md"
echo ""

if [ $count -gt 0 ]; then
    log_info "PRÓXIMOS PASSOS:"
    echo "   1. Revisar arquivos modificados"
    echo "   2. Testar se não há erros de sintaxe"
    echo "   3. Consultar guia para casos complexos"
    echo "   4. Fazer commit das mudanças"
else
    log_info "Nenhum arquivo precisou ser modificado"
fi 