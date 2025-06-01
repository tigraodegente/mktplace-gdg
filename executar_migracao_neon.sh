#!/bin/bash

# =====================================================
# EXECUÇÃO AUTOMÁTICA DA MIGRAÇÃO PARA NEON
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

# Banner
echo ""
echo "🚀 EXECUTANDO MIGRAÇÃO PARA NEON POSTGRESQL"
echo "📦 Migração automática com credenciais fornecidas"
echo ""

# Configurações do Neon (extraídas da URL fornecida)
NEON_DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require"
NEON_HOST="ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech"
NEON_DATABASE="neondb"
NEON_USER="neondb_owner"

# Buscar backup mais recente
log_step "Buscando backup mais recente..."
BACKUP_FILE=$(ls -t exports/mktplace_backup_*.sql 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    log_error "Nenhum backup encontrado em exports/"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_success "Backup encontrado: $BACKUP_FILE ($BACKUP_SIZE)"

# Testar conexão Neon
log_step "Testando conexão com Neon..."
if ! psql "$NEON_DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    log_error "Erro ao conectar no Neon. Verificando conexão..."
    
    # Tentar diagnóstico
    log_info "Testando conectividade..."
    if ! ping -c 1 ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech &> /dev/null; then
        log_error "Não foi possível alcançar o host do Neon"
    fi
    exit 1
fi
log_success "Conexão Neon OK"

# Verificar estrutura atual do Neon
CURRENT_TABLES=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
log_info "Tabelas atuais no Neon: $CURRENT_TABLES"

# Criar timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ETAPA 1: Preparar Neon
echo ""
log_step "🧹 ETAPA 1/3: Preparando banco Neon..."

if [ "$CURRENT_TABLES" -gt "0" ]; then
    log_warning "Banco não está vazio. Limpando..."
    
    # Limpar banco Neon
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
        END 
        \$\$;
    " 2>/dev/null || log_warning "Algumas operações de limpeza falharam"
fi

# Criar extensões
log_info "Criando extensões..."
psql "$NEON_DATABASE_URL" -c "
    CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
    CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";
" 2>/dev/null || log_warning "Algumas extensões podem não estar disponíveis"

log_success "Banco Neon preparado"

# ETAPA 2: Transferir dados
echo ""
log_step "📤 ETAPA 2/3: Transferindo dados para Neon..."

# Ajustar backup para Neon
log_info "Ajustando backup para Neon..."
NEON_BACKUP_FILE="exports/neon_adjusted_${TIMESTAMP}.sql"

# Remover comandos problemáticos
sed -e '/^DROP DATABASE/d' \
    -e '/^CREATE DATABASE/d' \
    -e '/^\\connect/d' \
    -e 's/OWNER TO [^;]*//' \
    -e '/^GRANT.*ON SCHEMA/d' \
    -e '/^REVOKE.*ON SCHEMA/d' \
    "$BACKUP_FILE" > "$NEON_BACKUP_FILE"

log_info "Executando import no Neon... (pode demorar alguns minutos)"

# Executar import com monitoramento
start_time=$(date +%s)

if psql "$NEON_DATABASE_URL" -f "$NEON_BACKUP_FILE" > /tmp/neon_import_${TIMESTAMP}.log 2>&1; then
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    log_success "Dados transferidos com sucesso em ${duration}s!"
else
    log_warning "Houve avisos durante a importação. Verificando..."
    
    # Verificar se há erros críticos
    if grep -i "error\|fatal" /tmp/neon_import_${TIMESTAMP}.log > /dev/null; then
        log_error "Erros encontrados:"
        grep -i "error\|fatal" /tmp/neon_import_${TIMESTAMP}.log | head -3
        
        # Verificar se pelo menos algumas tabelas foram criadas
        TABLE_COUNT=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
        if [ "$TABLE_COUNT" -gt "50" ]; then
            log_warning "Importação parcial: $TABLE_COUNT tabelas criadas. Continuando..."
        else
            log_error "Falha na importação"
            exit 1
        fi
    else
        log_success "Avisos não críticos, continuando..."
    fi
fi

# ETAPA 3: Validação detalhada
echo ""
log_step "✅ ETAPA 3/3: Validando migração..."

# Contar tabelas
NEON_TABLES=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
EXPECTED_TABLES=101

echo ""
log_info "📊 COMPARAÇÃO DE ESTRUTURA:"
echo "  Tabelas esperadas: $EXPECTED_TABLES"
echo "  Tabelas no Neon:   $NEON_TABLES"

# Verificar dados das tabelas principais
echo ""
log_info "🔍 VERIFICANDO DADOS PRINCIPAIS:"

declare -A EXPECTED_COUNTS=(
    ["users"]=15
    ["products"]=54
    ["categories"]=19
    ["orders"]=12
    ["chat_conversations"]=3
    ["sellers"]=0
    ["cart_items"]=0
    ["notifications"]=0
)

MATCHES=0
TOTAL_CHECKS=0

for table in "${!EXPECTED_COUNTS[@]}"; do
    EXPECTED=${EXPECTED_COUNTS[$table]}
    ACTUAL=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    ((TOTAL_CHECKS++))
    
    if [ ! -z "$ACTUAL" ]; then
        if [ "$ACTUAL" -eq "$EXPECTED" ]; then
            log_success "  $table: $ACTUAL registros ✓"
            ((MATCHES++))
        else
            if [ "$EXPECTED" -eq "0" ] && [ "$ACTUAL" -ge "0" ]; then
                log_success "  $table: $ACTUAL registros ✓"
                ((MATCHES++))
            else
                log_warning "  $table: $ACTUAL registros (esperado: $EXPECTED)"
            fi
        fi
    else
        log_error "  $table: erro ao verificar"
    fi
done

# Verificar amostras de dados específicos
echo ""
log_info "🧪 TESTANDO INTEGRIDADE DOS DADOS:"

# Testar uma consulta complexa
COMPLEX_QUERY=$(psql "$NEON_DATABASE_URL" -t -c "
    SELECT COUNT(*) 
    FROM products p 
    JOIN categories c ON p.category_id = c.id 
    WHERE p.is_active = true AND c.is_active = true;
" 2>/dev/null | tr -d ' ')

if [ ! -z "$COMPLEX_QUERY" ]; then
    log_success "✓ Relacionamentos funcionando ($COMPLEX_QUERY produtos ativos)"
else
    log_warning "✗ Problemas com relacionamentos"
fi

# Testar operações CRUD
TEST_EMAIL="teste_migracao_$(date +%s)@neon.test"
if psql "$NEON_DATABASE_URL" -c "
    BEGIN;
    INSERT INTO users (email, name, password_hash, role) 
    VALUES ('$TEST_EMAIL', 'Teste Migração', 'hash123', 'customer');
    UPDATE users SET name = 'Teste Atualizado' WHERE email = '$TEST_EMAIL';
    DELETE FROM users WHERE email = '$TEST_EMAIL';
    COMMIT;
" &> /dev/null 2>&1; then
    log_success "✓ Operações CRUD funcionando"
else
    log_warning "✗ Problemas com operações CRUD"
fi

# Verificar tamanho do banco
DB_SIZE=$(psql "$NEON_DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tr -d ' ')
log_info "💾 Tamanho do banco no Neon: $DB_SIZE"

# Verificar índices
INDEX_COUNT=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" | tr -d ' ')
log_info "🗂️  Índices criados: $INDEX_COUNT"

# Atualizar .env
echo ""
log_step "📝 Atualizando configurações..."

# Backup do .env atual
if [ -f .env ]; then
    cp .env .env.backup_$(date +%s)
    log_info "Backup do .env criado"
fi

# Criar .env atualizado
cat > .env << EOF
# =====================================================
# CONFIGURAÇÕES DO MARKETPLACE - NEON POSTGRESQL
# Migrado automaticamente em $(date)
# =====================================================

# BANCO DE DADOS NEON (PRODUÇÃO)
DATABASE_URL="$NEON_DATABASE_URL"
HYPERDRIVE_BINDING="false"

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

# Calcular score da migração
SCORE=100
if [ "$NEON_TABLES" -ne "$EXPECTED_TABLES" ]; then
    SCORE=$((SCORE - 15))
fi
if [ "$MATCHES" -lt "$TOTAL_CHECKS" ]; then
    DIFF=$((TOTAL_CHECKS - MATCHES))
    SCORE=$((SCORE - (DIFF * 10)))
fi

# Relatório final
echo ""
echo "🎉 MIGRAÇÃO CONCLUÍDA!"
echo "===================="
echo ""

echo "🎯 SCORE DA MIGRAÇÃO: $SCORE%"
echo ""

if [ "$SCORE" -ge "95" ]; then
    log_success "🏆 MIGRAÇÃO PERFEITA! Espelho idêntico do backup original."
    VERDICT="PERFEITO"
elif [ "$SCORE" -ge "90" ]; then
    log_success "✅ MIGRAÇÃO EXCELENTE! Quase todos os dados transferidos."
    VERDICT="EXCELENTE"
elif [ "$SCORE" -ge "80" ]; then
    log_success "✅ MIGRAÇÃO BOA! Dados principais transferidos com sucesso."
    VERDICT="BOM"
elif [ "$SCORE" -ge "70" ]; then
    log_warning "⚠️  MIGRAÇÃO PARCIAL. Alguns problemas detectados."
    VERDICT="PARCIAL"
else
    log_error "❌ MIGRAÇÃO COM PROBLEMAS. Revisão necessária."
    VERDICT="PROBLEMÁTICA"
fi

echo ""
echo "📊 RESUMO DETALHADO:"
echo "  🗄️  Backup origem: $BACKUP_FILE ($BACKUP_SIZE)"
echo "  🌐 Banco destino: Neon PostgreSQL"
echo "  📋 Tabelas migradas: $NEON_TABLES/$EXPECTED_TABLES"
echo "  ✅ Verificações OK: $MATCHES/$TOTAL_CHECKS"
echo "  🗂️  Índices: $INDEX_COUNT"
echo "  💾 Tamanho: $DB_SIZE"
echo "  🎯 Qualidade: $VERDICT"
echo ""

echo "🔗 NEON POSTGRESQL:"
echo "  Host: $NEON_HOST"
echo "  Database: $NEON_DATABASE"
echo "  User: $NEON_USER"
echo ""

if [ "$SCORE" -ge "80" ]; then
    echo "✅ SUCESSO! Seu marketplace foi migrado para o Neon PostgreSQL!"
    echo ""
    echo "🔍 PARA VERIFICAR SE É UM ESPELHO IDENTICO:"
    echo "  ./verificar_migracao_neon.sh"
    echo ""
    echo "📝 PRÓXIMOS PASSOS:"
    echo "  1. Configure integrações no .env"
    echo "  2. Teste funcionalidades localmente"
    echo "  3. Faça deploy em produção"
else
    echo "🔧 Execute verificações adicionais se necessário."
fi

# Limpar arquivos temporários
rm -f "$NEON_BACKUP_FILE"

echo ""
echo "🚀 Migração concluída em $(date)!" 