#!/bin/bash

# =====================================================
# SCRIPT DE LIMPEZA DE DADOS SENSÍVEIS
# Marketplace GDG - Segurança
# =====================================================

set -e

echo "🔒 Iniciando limpeza de dados sensíveis..."

# Cores para output
RED='\033[0;31m'
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

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# =====================================================
# 1. REMOVER CREDENCIAIS HARDCODED
# =====================================================

log_info "1. Removendo credenciais hardcoded..."

# Função para substituir URLs de banco por placeholders
replace_db_urls() {
    local file="$1"
    
    # Neon DB credentials
    sed -i.bak 's/postgresql:\/\/neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler\.sa-east-1\.aws\.neon\.tech\/neondb/postgresql:\/\/DB_USER:DB_PASSWORD@DB_HOST\/DB_NAME/g' "$file"
    
    # Railway credentials 
    sed -i.bak 's/postgresql:\/\/postgres:dUqxGkGhAnTYWRGWdmdfOGXMqhTQYPsx@shinkansen\.proxy\.rlwy\.net:41615\/railway/postgresql:\/\/DB_USER:DB_PASSWORD@DB_HOST:DB_PORT\/DB_NAME/g' "$file"
    
    # Xata credentials
    sed -i.bak 's/postgresql:\/\/787mk0:xau_dVL4yNzXLHrGYTmaUbvg00sGLUrZp4at1@us-east-1\.sql\.xata\.sh\/mktplace-gdg:main/postgresql:\/\/DB_USER:DB_PASSWORD@DB_HOST\/DB_NAME/g' "$file"
    
    # Local dev credentials (manter estrutura mas alterar senha)
    sed -i.bak 's/postgresql:\/\/mktplace_user:123456@localhost:5432\/mktplace_dev/postgresql:\/\/mktplace_user:YOUR_PASSWORD@localhost:5432\/mktplace_dev/g' "$file"
    
    # Remover backup se não houve mudanças significativas
    if cmp -s "$file" "$file.bak"; then
        rm "$file.bak"
    else
        log_success "Credenciais sanitizadas em: $(basename "$file")"
        rm "$file.bak"
    fi
}

# Aplicar limpeza em todos os arquivos relevantes
find . -name "*.sh" -o -name "*.md" -o -name "*.mjs" -o -name "*.sql" | while read -r file; do
    if [[ ! "$file" =~ \.git/ ]] && [[ ! "$file" =~ node_modules/ ]]; then
        replace_db_urls "$file"
    fi
done

# =====================================================
# 2. ATUALIZAR .GITIGNORE
# =====================================================

log_info "2. Atualizando .gitignore..."

cat >> .gitignore << 'EOF'

# Dados sensíveis
cookies.txt
*.session
*.token
.env.backup*
.env.local*
.env.production*

# Arquivos do sistema
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Arquivos de backup
*.backup
*.bak
*~

# Arquivos de build temporários
tsconfig.tsbuildinfo
.tsbuildinfo

# Cache de dependências
.pnpm-debug.log*
EOF

# =====================================================
# 3. REMOVER ARQUIVOS SENSÍVEIS EXISTENTES
# =====================================================

log_info "3. Removendo arquivos sensíveis..."

# Remover arquivos de backup do .env
find . -name ".env.backup*" -type f -delete 2>/dev/null || true

# Remover arquivos .DS_Store
find . -name ".DS_Store" -type f -delete 2>/dev/null || true

# Remover logs na raiz
rm -f *.log 2>/dev/null || true

# Remover arquivos de backup de scripts
find . -name "*.backup" -type f -delete 2>/dev/null || true

# Remover tsbuildinfo
find . -name "tsconfig.tsbuildinfo" -type f -delete 2>/dev/null || true

# =====================================================
# 4. CRIAR ARQUIVO DE EXEMPLO PARA CREDENCIAIS
# =====================================================

log_info "4. Criando arquivo de exemplo para credenciais..."

cat > .env.example << 'EOF'
# =====================================================
# CONFIGURAÇÃO DE AMBIENTE - EXEMPLO
# Copie para .env e configure com seus valores
# =====================================================

# Database
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST:DB_PORT/DB_NAME?sslmode=require"
HYPERDRIVE_BINDING="true"

# Auth
JWT_SECRET="your-super-secret-jwt-key-32-chars-min"
SESSION_SECRET="your-session-secret-key"

# Email
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
FROM_EMAIL="noreply@yourdomain.com"

# Cloudflare
CLOUDFLARE_ACCOUNT_ID="your_account_id"
CLOUDFLARE_API_TOKEN="your_api_token"

# Shipping
SHIPPING_INTEGRATION_ENABLED="false"
SHIPPING_DEFAULT_PROVIDER="cubbo"
CUBBO_API_TOKEN="your_cubbo_token"
CORREIOS_USER="your_correios_user"
CORREIOS_PASSWORD="your_correios_password"

# Payment
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx"

# Analytics
GA_TRACKING_ID="UA-XXXXXXXXX-X"
GTM_ID="GTM-XXXXXXX"

# Redis/Cache
REDIS_URL="redis://localhost:6379"
CACHE_TTL="3600"

# Monitoring
SENTRY_DSN="https://xxx@sentry.io/xxx"
LOG_LEVEL="info"

# Development
NODE_ENV="development"
DEBUG="false"
EOF

# =====================================================
# 5. CRIAR DOCUMENTAÇÃO DE SEGURANÇA
# =====================================================

log_info "5. Criando documentação de segurança..."

mkdir -p docs/seguranca

cat > docs/seguranca/dados-sensiveis.md << 'EOF'
# Tratamento de Dados Sensíveis

## ⚠️ NUNCA COMMIT
- Credenciais de banco de dados
- Tokens de API
- Chaves secretas
- Cookies com tokens
- URLs com senhas
- Arquivos .env com dados reais

## ✅ SEMPRE USE
- Variáveis de ambiente
- Arquivos .env.example
- Placeholders genéricos
- Sanitização de logs

## 🔍 VERIFICAÇÃO

### Antes de cada commit:
```bash
# Verificar credenciais expostas
git diff --cached | grep -i "password\|token\|secret\|key"

# Verificar URLs de banco
git diff --cached | grep "postgresql://"

# Verificar arquivos sensíveis
git status | grep -E "\.(env|log|session|token)$"
```

### Limpar historico (se necessário):
```bash
# Remover arquivo do histórico
git filter-branch --force --index-filter \
"git rm --cached --ignore-unmatch sensitive-file.txt" \
--prune-empty --tag-name-filter cat -- --all

# Forçar push
git push origin --force --all
```

## 📋 CHECKLIST DE SEGURANÇA

- [ ] .gitignore configurado
- [ ] Credenciais em variáveis de ambiente
- [ ] Logs sanitizados
- [ ] URLs parametrizadas
- [ ] Arquivos sensíveis removidos
- [ ] .env.example criado
- [ ] Documentação atualizada
EOF

# =====================================================
# FINALIZAÇÃO
# =====================================================

log_success "Limpeza de dados sensíveis concluída!"

echo ""
echo "📋 RESUMO:"
echo "   • Credenciais hardcoded substituídas por placeholders"
echo "   • .gitignore atualizado"
echo "   • Arquivos sensíveis removidos"
echo "   • .env.example criado"
echo "   • Documentação de segurança criada"
echo ""

log_warning "IMPORTANTE:"
echo "   1. Configure suas credenciais reais no arquivo .env"
echo "   2. Revise os arquivos modificados antes do commit"
echo "   3. Nunca comite dados sensíveis novamente"
echo ""

log_info "Para configurar o ambiente, copie:"
echo "   cp .env.example .env"
echo "   # Edite .env com suas credenciais reais" 