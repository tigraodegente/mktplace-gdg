#!/bin/bash

# =====================================================
# MIGRAÇÃO DE BACKUP EXISTENTE PARA NEON POSTGRESQL
# =====================================================
# Este script migra dados de um backup existente para o Neon
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
echo "🚀 MIGRAÇÃO DE BACKUP PARA NEON POSTGRESQL"
echo "📦 Migraremos backup existente (46MB, 101 tabelas)"
echo ""

# Buscar backup mais recente
log_step "Buscando backup mais recente..."
BACKUP_FILE=$(ls -t exports/mktplace_backup_*.sql 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    log_error "Nenhum backup encontrado em exports/"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_success "Backup encontrado: $BACKUP_FILE ($BACKUP_SIZE)"

# Verificar dependências
log_step "Verificando dependências..."

if ! command -v psql &> /dev/null; then
    log_error "PostgreSQL não encontrado. Instale usando:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

log_success "Dependências OK"

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

# Testar conexão Neon
log_step "Testando conexão com Neon..."
if ! psql "$NEON_DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    log_error "Erro ao conectar no Neon. Verifique suas credenciais."
    exit 1
fi
log_success "Conexão Neon OK"

# Confirmar migração
echo ""
log_warning "⚠️  ATENÇÃO: Esta operação irá:"
echo "  🗑️  Limpar completamente o banco Neon"
echo "  📤 Transferir backup completo ($BACKUP_SIZE)"
echo "  🔄 Recriar todas as 101 tabelas"
echo "  ⏱️  Pode demorar vários minutos"
echo ""
read -p "🚀 Continuar com a migração? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    log_info "Migração cancelada pelo usuário"
    exit 0
fi

# Criar timestamp para logs
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ETAPA 1: Preparar Neon
echo ""
log_step "🧹 ETAPA 1/3: Preparando banco Neon..."

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

# ETAPA 2: Transferir dados
echo ""
log_step "📤 ETAPA 2/3: Transferindo dados para Neon..."
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
        
        # Verificar se pelo menos algumas tabelas foram criadas
        TABLE_COUNT=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
        if [ "$TABLE_COUNT" -gt "50" ]; then
            log_warning "Importação parcial: $TABLE_COUNT tabelas criadas. Continuando..."
        else
            exit 1
        fi
    else
        log_success "Avisos não críticos, continuando..."
    fi
fi

# ETAPA 3: Validação completa
echo ""
log_step "✅ ETAPA 3/3: Validando migração..."

# Contar tabelas
NEON_TABLES=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
EXPECTED_TABLES=101

echo ""
log_info "Comparando estrutura:"
echo "  📊 Tabelas esperadas: $EXPECTED_TABLES"
echo "  📊 Tabelas no Neon:   $NEON_TABLES"

if [ "$NEON_TABLES" -eq "$EXPECTED_TABLES" ]; then
    log_success "✓ Número de tabelas correto!"
elif [ "$NEON_TABLES" -gt "90" ]; then
    log_warning "⚠️  Número de tabelas próximo ao esperado ($NEON_TABLES/$EXPECTED_TABLES)"
else
    log_error "❌ Muito poucas tabelas ($NEON_TABLES/$EXPECTED_TABLES)"
fi

# Verificar tabelas principais e contagens
echo ""
log_info "Verificando dados das tabelas principais:"

declare -A EXPECTED_COUNTS=(
    ["users"]=15
    ["products"]=54
    ["categories"]=19
    ["orders"]=12
    ["chat_conversations"]=3
)

ALL_GOOD=true
for table in "${!EXPECTED_COUNTS[@]}"; do
    EXPECTED=${EXPECTED_COUNTS[$table]}
    ACTUAL=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    
    if [ ! -z "$ACTUAL" ]; then
        if [ "$ACTUAL" -eq "$EXPECTED" ]; then
            log_success "  $table: $ACTUAL registros ✓"
        else
            log_warning "  $table: $ACTUAL registros (esperado: $EXPECTED)"
            ALL_GOOD=false
        fi
    else
        log_error "  $table: erro ao verificar"
        ALL_GOOD=false
    fi
done

# Verificar todas as 101 tabelas
echo ""
log_info "Verificando todas as tabelas do backup..."
MISSING_TABLES=0
TABLES_WITH_DATA=0

# Lista das 101 tabelas esperadas
EXPECTED_TABLE_LIST="ab_test_assignments ab_test_events ab_test_variants ab_tests abandoned_carts addresses audit_logs banners brands campaign_analytics campaign_recipients cart_items carts categories chat_conversations chat_message_reads chat_messages chat_presence chat_settings consent_records coupon_categories coupon_conditions coupon_products coupon_usage coupons data_processing_activities email_queue facet_cache faq faqs gdpr_requests gift_contributions gift_list_analytics gift_list_comments gift_list_favorites gift_list_invites gift_list_items gift_list_templates gift_lists kb_articles maintenance_log marketing_campaigns notification_settings notification_templates notifications order_items order_status_history order_tracking orders pages password_resets payment_methods payment_queue payment_transactions payments pending_refreshes popular_searches product_analytics product_categories product_coupons product_images product_option_values product_options product_price_history product_rankings product_variants products query_cache return_items return_reasons returns reviews search_history search_index search_suggestions seller_shipping_configs sellers sessions shipping_base_rates shipping_calculated_options shipping_carriers shipping_modalities shipping_modality_configs shipping_quotes shipping_rates shipping_zones stock_movements stock_reservation_items stock_reservations store_credits support_categories support_messages support_tickets system_settings tracking_consents user_sessions_multi_role users users_backup_roles variant_option_values webhook_events wishlists"

for table in $EXPECTED_TABLE_LIST; do
    if psql "$NEON_DATABASE_URL" -c "\dt $table" &> /dev/null; then
        COUNT=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
        if [ ! -z "$COUNT" ] && [ "$COUNT" -gt "0" ]; then
            ((TABLES_WITH_DATA++))
        fi
    else
        echo "  ❌ $table: não encontrada"
        ((MISSING_TABLES++))
    fi
done

echo "  📊 Tabelas com dados: $TABLES_WITH_DATA"
echo "  ❌ Tabelas faltando: $MISSING_TABLES"

# Testar operações básicas
echo ""
log_info "Testando operações básicas no Neon..."

# Testar SELECT
if psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM users;" &> /dev/null; then
    log_success "✓ SELECT funcionando"
else
    log_error "✗ Erro no SELECT"
    ALL_GOOD=false
fi

# Testar INSERT
TEST_EMAIL="teste_migracao_$(date +%s)@neon.test"
if psql "$NEON_DATABASE_URL" -c "
    INSERT INTO users (email, name, password_hash, role) 
    VALUES ('$TEST_EMAIL', 'Teste Migração', 'hash123', 'customer');
    DELETE FROM users WHERE email = '$TEST_EMAIL';
" &> /dev/null; then
    log_success "✓ INSERT/DELETE funcionando"
else
    log_warning "✗ Problemas com INSERT/DELETE"
    ALL_GOOD=false
fi

# Verificar tamanho do banco
DB_SIZE=$(psql "$NEON_DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tr -d ' ')
if [ ! -z "$DB_SIZE" ]; then
    echo "  💾 Tamanho do banco no Neon: $DB_SIZE"
else
    log_warning "Não foi possível obter o tamanho do banco"
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
echo "🎉 MIGRAÇÃO CONCLUÍDA!"
echo "===================="
echo ""

# Calcular score da migração
SCORE=100
if [ "$NEON_TABLES" -ne "$EXPECTED_TABLES" ]; then
    SCORE=$((SCORE - 20))
fi
if [ "$MISSING_TABLES" -gt "0" ]; then
    SCORE=$((SCORE - 10))
fi
if [ "$ALL_GOOD" = false ]; then
    SCORE=$((SCORE - 15))
fi

echo "🎯 SCORE DA MIGRAÇÃO: $SCORE%"
echo ""

if [ "$SCORE" -ge "90" ]; then
    log_success "🏆 MIGRAÇÃO EXCELENTE! Espelho quase perfeito do backup original."
elif [ "$SCORE" -ge "80" ]; then
    log_success "✅ MIGRAÇÃO BOA! Dados principais transferidos com sucesso."
elif [ "$SCORE" -ge "70" ]; then
    log_warning "⚠️  MIGRAÇÃO PARCIAL. Alguns problemas detectados."
else
    log_error "❌ MIGRAÇÃO COM PROBLEMAS. Revisão necessária."
fi

echo ""
echo "📊 RESUMO FINAL:"
echo "  🗄️  Backup origem: $BACKUP_FILE ($BACKUP_SIZE)"
echo "  🌐 Banco destino: Neon PostgreSQL"
echo "  📋 Tabelas migradas: $NEON_TABLES/$EXPECTED_TABLES"
echo "  📊 Tabelas com dados: $TABLES_WITH_DATA"
echo "  💾 Tamanho no Neon: $DB_SIZE"
echo "  ⏱️  Concluído em: $(date)"
echo ""
echo "🔗 CONFIGURAÇÃO NEON:"
echo "  Host: $NEON_HOST"
echo "  Banco: $NEON_DATABASE"
echo "  Usuário: $NEON_USER"
echo ""

if [ "$SCORE" -ge "80" ]; then
    echo "✅ Seu marketplace foi migrado com sucesso para o Neon PostgreSQL!"
    echo ""
    echo "📝 PRÓXIMOS PASSOS:"
    echo "  1. Configure as integrações externas no .env"
    echo "  2. Execute: ./verificar_migracao_neon.sh"
    echo "  3. Teste o marketplace localmente"
    echo "  4. Faça o deploy em produção"
else
    echo "🔧 Execute correções e tente novamente se necessário."
fi 