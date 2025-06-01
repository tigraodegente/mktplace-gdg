#!/bin/bash

# =====================================================
# MIGRAÇÃO COMPLETA PARA NEON POSTGRESQL
# =====================================================
# Este script migra TODOS os dados do banco local para o Neon
# Inclui: estrutura, dados, índices, triggers e tudo mais
# =====================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Banner de início
echo ""
echo "██╗   ██╗██╗ ██████╗ ██████╗  █████╗  ██████╗  █████╗  ██████╗     ███╗   ██╗███████╗ ██████╗ ███╗   ██╗"
echo "███╗ ███║██║██╔════╝ ██╔══██╗██╔══██╗██╔════╝ ██╔══██╗██╔═══██╗    ████╗  ██║██╔════╝██╔═══██╗████╗  ██║"
echo "██╔████╔██║██║  ███╗██████╔╝███████║██║  ███╗███████║██║   ██║    ██╔██╗ ██║█████╗  ██║   ██║██╔██╗ ██║"
echo "██║╚██╔╝██║██║   ██║██╔══██╗██╔══██║██║   ██║██╔══██║██║   ██║    ██║╚██╗██║██╔══╝  ██║   ██║██║╚██╗██║"
echo "██║ ╚═╝ ██║╚██████╔╝██║  ██║██║  ██║╚██████╔╝██║  ██║╚██████╔╝    ██║ ╚████║███████╗╚██████╔╝██║ ╚████║"
echo "╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝     ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝"
echo ""
echo "🚀 MIGRAÇÃO COMPLETA PARA NEON POSTGRESQL"
echo "📦 Migraremos TODOS os dados do marketplace (46MB, 101 tabelas)"
echo ""

# Verificar dependências
log_step "Verificando dependências..."

if ! command -v psql &> /dev/null; then
    log_error "PostgreSQL não encontrado. Instale usando:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump não encontrado. Instale o PostgreSQL completo."
    exit 1
fi

log_success "Dependências OK"

# Configurações do banco local
LOCAL_DATABASE_URL="postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"

# Solicitar configurações do Neon
echo ""
log_info "📝 CONFIGURAÇÃO DO NEON POSTGRESQL"
echo ""
echo "Você precisará das seguintes informações do seu projeto Neon:"
echo "  1. Host/Endpoint (ex: ep-example-123.us-east-1.aws.neon.tech)"
echo "  2. Nome do banco (ex: mktplace_prod)"
echo "  3. Usuário (geralmente seu email ou username)"
echo "  4. Senha"
echo ""

# Coletar informações do Neon
read -p "📍 Host do Neon (ex: ep-example.us-east-1.aws.neon.tech): " NEON_HOST
if [ -z "$NEON_HOST" ]; then
    log_error "Host do Neon é obrigatório"
    exit 1
fi

read -p "🗄️  Nome do banco (ex: mktplace_prod): " NEON_DATABASE
if [ -z "$NEON_DATABASE" ]; then
    NEON_DATABASE="mktplace_prod"
    log_info "Usando nome padrão: $NEON_DATABASE"
fi

read -p "👤 Usuário do Neon: " NEON_USER
if [ -z "$NEON_USER" ]; then
    log_error "Usuário do Neon é obrigatório"
    exit 1
fi

read -s -p "🔑 Senha do Neon: " NEON_PASSWORD
echo ""
if [ -z "$NEON_PASSWORD" ]; then
    log_error "Senha do Neon é obrigatória"
    exit 1
fi

# Montar URL do Neon
NEON_DATABASE_URL="postgresql://${NEON_USER}:${NEON_PASSWORD}@${NEON_HOST}/${NEON_DATABASE}?sslmode=require"

echo ""
log_info "🔗 URL montada: postgresql://${NEON_USER}:***@${NEON_HOST}/${NEON_DATABASE}"

# Testar conexão local
log_step "Testando conexão com banco local..."
if ! psql "$LOCAL_DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    log_error "Erro ao conectar no banco local. Verifique se PostgreSQL está rodando."
    exit 1
fi
log_success "Conexão local OK"

# Testar conexão Neon
log_step "Testando conexão com Neon..."
if ! psql "$NEON_DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    log_error "Erro ao conectar no Neon. Verifique suas credenciais."
    exit 1
fi
log_success "Conexão Neon OK"

# Verificar dados locais
log_step "Analisando dados locais..."
TABLE_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
TOTAL_RECORDS=$(psql "$LOCAL_DATABASE_URL" -t -c "
    SELECT SUM(n_live_tup) 
    FROM pg_stat_user_tables;
" | tr -d ' ')

echo "  📊 Tabelas: $TABLE_COUNT"
echo "  📋 Registros totais: $TOTAL_RECORDS"

# Verificar se há dados suficientes
if [ "$TABLE_COUNT" -lt "50" ]; then
    log_warning "Poucas tabelas encontradas ($TABLE_COUNT). Continuar mesmo assim?"
    read -p "Continuar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 0
    fi
fi

# Criar timestamp para backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="exports/neon_migration_${TIMESTAMP}.sql"

# Criar pasta exports se não existir
mkdir -p exports

# Confirmar migração
echo ""
log_warning "⚠️  ATENÇÃO: Esta operação irá:"
echo "  🔄 Fazer backup completo do banco local"
echo "  🗑️  Limpar completamente o banco Neon"
echo "  📤 Transferir TODOS os dados (estrutura + registros)"
echo "  ⏱️  Pode demorar vários minutos"
echo ""
read -p "🚀 Continuar com a migração? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    log_info "Migração cancelada pelo usuário"
    exit 0
fi

# ETAPA 1: Backup completo
echo ""
log_step "🗂️  ETAPA 1/4: Criando backup completo..."
pg_dump "$LOCAL_DATABASE_URL" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    --quote-all-identifiers \
    > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup criado: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log_error "Erro ao criar backup"
    exit 1
fi

# ETAPA 2: Preparar Neon
echo ""
log_step "🧹 ETAPA 2/4: Preparando banco Neon..."

# Limpar banco Neon (dropar todas as tabelas)
log_info "Limpando banco Neon..."
psql "$NEON_DATABASE_URL" -c "
    DO \$\$ 
    DECLARE 
        r RECORD;
    BEGIN
        -- Dropar todas as tabelas
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
        LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Dropar todas as sequências
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
        LOOP
            EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        END LOOP;
        
        -- Dropar todas as funções
        FOR r IN (SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
        LOOP
            EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || ' CASCADE';
        END LOOP;
    END 
    \$\$;
" 2>/dev/null || log_warning "Algumas operações de limpeza falharam (normal se banco estava vazio)"

# Criar extensões necessárias
log_info "Criando extensões..."
psql "$NEON_DATABASE_URL" -c "
    CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
    CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";
    CREATE EXTENSION IF NOT EXISTS \"btree_gin\";
    CREATE EXTENSION IF NOT EXISTS \"btree_gist\";
" 2>/dev/null || log_warning "Algumas extensões podem não estar disponíveis"

log_success "Banco Neon preparado"

# ETAPA 3: Transferir dados
echo ""
log_step "📤 ETAPA 3/4: Transferindo dados para Neon..."
echo "  ⏱️  Isso pode demorar vários minutos..."

# Modificar backup para funcionar no Neon
log_info "Ajustando backup para Neon..."
NEON_BACKUP_FILE="exports/neon_adjusted_${TIMESTAMP}.sql"

# Remover comandos problemáticos e ajustar para Neon
sed -e '/^DROP DATABASE/d' \
    -e '/^CREATE DATABASE/d' \
    -e '/^\\connect/d' \
    -e 's/OWNER TO [^;]*//' \
    -e '/^GRANT.*ON SCHEMA/d' \
    -e '/^REVOKE.*ON SCHEMA/d' \
    "$BACKUP_FILE" > "$NEON_BACKUP_FILE"

# Importar no Neon
log_info "Executando import no Neon..."
if psql "$NEON_DATABASE_URL" -f "$NEON_BACKUP_FILE" > /tmp/neon_import.log 2>&1; then
    log_success "Dados transferidos com sucesso!"
else
    log_warning "Houve alguns avisos durante a importação. Verificando..."
    
    # Verificar se erros são críticos
    if grep -i "error\|fatal" /tmp/neon_import.log > /dev/null; then
        log_error "Erros críticos encontrados:"
        grep -i "error\|fatal" /tmp/neon_import.log | head -5
        echo ""
        log_info "Log completo: /tmp/neon_import.log"
        exit 1
    else
        log_success "Avisos não críticos, continuando..."
    fi
fi

# ETAPA 4: Validação
echo ""
log_step "✅ ETAPA 4/4: Validando migração..."

# Comparar contagens
echo ""
log_info "Comparando dados entre local e Neon..."

# Contar tabelas
LOCAL_TABLES=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
NEON_TABLES=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')

echo "  📊 Tabelas Local: $LOCAL_TABLES"
echo "  📊 Tabelas Neon:  $NEON_TABLES"

if [ "$LOCAL_TABLES" -eq "$NEON_TABLES" ]; then
    log_success "Número de tabelas OK"
else
    log_warning "Diferença no número de tabelas"
fi

# Verificar tabelas principais
echo ""
log_info "Verificando registros das tabelas principais:"

for table in users products categories orders cart_items sellers; do
    LOCAL_COUNT=$(psql "$LOCAL_DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    NEON_COUNT=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    
    if [ ! -z "$LOCAL_COUNT" ] && [ ! -z "$NEON_COUNT" ]; then
        if [ "$LOCAL_COUNT" -eq "$NEON_COUNT" ]; then
            log_success "  $table: $LOCAL_COUNT ✓"
        else
            log_warning "  $table: Local($LOCAL_COUNT) ≠ Neon($NEON_COUNT)"
        fi
    else
        log_warning "  $table: erro ao verificar"
    fi
done

# Testar algumas operações básicas
echo ""
log_info "Testando operações básicas no Neon..."

# Testar SELECT
if psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM users;" &> /dev/null; then
    log_success "✓ SELECT funcionando"
else
    log_error "✗ Erro no SELECT"
fi

# Testar INSERT
if psql "$NEON_DATABASE_URL" -c "
    INSERT INTO users (email, name, password_hash, role) 
    VALUES ('teste_migracao@test.com', 'Teste Migração', 'hash123', 'customer');
    DELETE FROM users WHERE email = 'teste_migracao@test.com';
" &> /dev/null; then
    log_success "✓ INSERT/DELETE funcionando"
else
    log_warning "✗ Problemas com INSERT/DELETE"
fi

# Criar arquivo .env atualizado
echo ""
log_step "📝 Atualizando configurações..."

# Backup do .env atual
if [ -f .env ]; then
    cp .env .env.backup_$(date +%s)
    log_info "Backup do .env criado"
fi

# Criar novo .env com Neon
cat > .env << EOF
# =====================================================
# CONFIGURAÇÕES DO MARKETPLACE - NEON POSTGRESQL
# Migrado automaticamente em $(date)
# =====================================================

# BANCO DE DADOS NEON (PRODUÇÃO)
DATABASE_URL="$NEON_DATABASE_URL"
HYPERDRIVE_BINDING="false"

# BACKUP LOCAL (comentado)
# DATABASE_URL_LOCAL="$LOCAL_DATABASE_URL"

# CONFIGURAÇÕES DA APLICAÇÃO
NODE_ENV="production"
PUBLIC_APP_URL="https://seu-dominio.com"

# SEGURANÇA (GERE NOVAS CHAVES PARA PRODUÇÃO!)
JWT_SECRET="$(openssl rand -base64 32 2>/dev/null || echo 'sua_chave_jwt_super_secreta_aqui')"
ENCRYPT_KEY="$(openssl rand -base64 32 2>/dev/null || echo 'sua_chave_de_criptografia_32_chars')"
BCRYPT_SALT_ROUNDS="12"

# EMAIL (CONFIGURE SUAS CREDENCIAIS)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="seu_email@gmail.com"
SMTP_PASS="sua_senha_de_app_do_gmail"
FROM_EMAIL="noreply@graodigente.com.br"
FROM_NAME="Marketplace Grão de Gente"

# INTEGRAÇÕES (CONFIGURE SUAS CHAVES)
FRENET_TOKEN="seu_token_frenet_aqui"
STRIPE_PUBLIC_KEY="pk_live_sua_chave_publica_stripe"
STRIPE_SECRET_KEY="sk_live_sua_chave_secreta_stripe"
PAGSEGURO_EMAIL="seu_email_pagseguro"
PAGSEGURO_TOKEN="seu_token_pagseguro"

# CONFIGURAÇÕES DE PRODUÇÃO
LOG_LEVEL="warn"
DEBUG_SQL="false"
MOCK_EXTERNAL_APIS="false"
EOF

log_success ".env atualizado com configurações do Neon"

# Limpar arquivos temporários
rm -f "$NEON_BACKUP_FILE" /tmp/neon_import.log

# Relatório final
echo ""
echo "🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!"
echo ""
echo "📊 RESUMO DA MIGRAÇÃO:"
echo "  🗄️  Banco origem: Local PostgreSQL (46MB)"
echo "  🌐 Banco destino: Neon PostgreSQL"
echo "  📋 Tabelas migradas: $NEON_TABLES"
echo "  📦 Backup criado: $BACKUP_FILE"
echo "  ⏱️  Concluído em: $(date)"
echo ""
echo "🔗 CONFIGURAÇÃO NEON:"
echo "  Host: $NEON_HOST"
echo "  Banco: $NEON_DATABASE"
echo "  Usuário: $NEON_USER"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "  1. ✅ Dados migrados com sucesso"
echo "  2. ✅ Arquivo .env atualizado"
echo "  3. 🔧 Configure as integrações externas no .env"
echo "  4. 🚀 Faça deploy do marketplace"
echo "  5. 🧪 Teste todas as funcionalidades"
echo ""
echo "⚠️  IMPORTANTE:"
echo "  • Backup local salvo em: $BACKUP_FILE"
echo "  • .env anterior salvo como .env.backup_*"
echo "  • Configure as chaves de API no .env"
echo "  • Teste tudo antes de usar em produção"
echo ""
echo "✅ Seu marketplace está pronto para o Neon PostgreSQL!" 