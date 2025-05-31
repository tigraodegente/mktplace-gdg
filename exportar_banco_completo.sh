#!/bin/bash

# =====================================================
# SCRIPT PARA EXPORTAR BANCO COMPLETO DO MARKETPLACE
# =====================================================

set -e

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

# Verificar se .env existe
if [ ! -f .env ]; then
    log_error "Arquivo .env não encontrado. Execute ./setup_banco_local.sh primeiro"
    exit 1
fi

# Carregar variáveis do .env
source .env

# Definir URL do banco se não estiver definida
if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL="postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"
    log_warning "DATABASE_URL não encontrada, usando padrão local"
fi

# Extrair informações da URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

log_info "Informações do banco:"
echo "  Host: $DB_HOST"
echo "  Porta: $DB_PORT"
echo "  Banco: $DB_NAME"
echo "  Usuário: $DB_USER"
echo ""

# Criar pasta de exports se não existir
mkdir -p exports

# Nome do arquivo com timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_FILE="exports/mktplace_backup_${TIMESTAMP}.sql"
EXPORT_DATA_ONLY="exports/mktplace_data_${TIMESTAMP}.sql"
EXPORT_SCHEMA_ONLY="exports/mktplace_schema_${TIMESTAMP}.sql"

log_info "Iniciando export completo do banco..."

# 1. Export completo (schema + dados)
log_info "Exportando banco completo (schema + dados)..."
pg_dump "$DATABASE_URL" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    > "$EXPORT_FILE"

if [ $? -eq 0 ]; then
    log_success "Export completo criado: $EXPORT_FILE"
else
    log_error "Erro no export completo"
    exit 1
fi

# 2. Export apenas dados
log_info "Exportando apenas dados..."
pg_dump "$DATABASE_URL" \
    --verbose \
    --data-only \
    --format=plain \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    > "$EXPORT_DATA_ONLY"

if [ $? -eq 0 ]; then
    log_success "Export de dados criado: $EXPORT_DATA_ONLY"
else
    log_warning "Erro no export de dados"
fi

# 3. Export apenas schema
log_info "Exportando apenas schema..."
pg_dump "$DATABASE_URL" \
    --verbose \
    --schema-only \
    --format=plain \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    > "$EXPORT_SCHEMA_ONLY"

if [ $? -eq 0 ]; then
    log_success "Export de schema criado: $EXPORT_SCHEMA_ONLY"
else
    log_warning "Erro no export de schema"
fi

# 4. Criar arquivo com estatísticas
STATS_FILE="exports/estatisticas_${TIMESTAMP}.txt"
log_info "Gerando estatísticas do banco..."

{
    echo "===========================================" 
    echo "ESTATÍSTICAS DO BANCO - $TIMESTAMP"
    echo "===========================================" 
    echo ""
    echo "🗄️ BANCO: $DB_NAME"
    echo "📊 HOST: $DB_HOST:$DB_PORT"
    echo "👤 USUÁRIO: $DB_USER"
    echo ""
    echo "📈 ESTATÍSTICAS POR TABELA:"
    echo "----------------------------------------"
    
    # Contar registros por tabela
    psql "$DATABASE_URL" -t -c "
        SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserções,
            n_tup_upd as atualizações,
            n_tup_del as deleções,
            n_live_tup as registros_ativos
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC;
    " | while IFS='|' read schema table ins upd del live; do
        if [ ! -z "$table" ]; then
            echo "📋 $table: $live registros"
        fi
    done
    
    echo ""
    echo "🔍 TABELAS PRINCIPAIS:"
    echo "----------------------------------------"
    
    # Tabelas principais com contagem exata
    for table in users products categories orders cart_items notifications chat_conversations support_tickets returns; do
        count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
        if [ ! -z "$count" ] && [ "$count" != "0" ]; then
            echo "  $table: $count registros"
        fi
    done
    
    echo ""
    echo "💾 TAMANHO DO BANCO:"
    echo "----------------------------------------"
    psql "$DATABASE_URL" -c "
        SELECT 
            pg_size_pretty(pg_database_size('$DB_NAME')) as tamanho_total;
    "
    
    echo ""
    echo "📋 TABELAS CRIADAS:"
    echo "----------------------------------------"
    psql "$DATABASE_URL" -c "
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
    "
    
} > "$STATS_FILE"

log_success "Estatísticas salvas: $STATS_FILE"

# 5. Criar arquivo compactado
log_info "Compactando arquivos..."
ZIP_FILE="exports/mktplace_backup_completo_${TIMESTAMP}.zip"

zip -r "$ZIP_FILE" \
    "$EXPORT_FILE" \
    "$EXPORT_DATA_ONLY" \
    "$EXPORT_SCHEMA_ONLY" \
    "$STATS_FILE" \
    "setup_banco_local.sh" \
    "MENSAGEM_PARA_DESENVOLVEDOR.md" \
    "SETUP_BANCO_LOCAL.md" \
    "env.example"

if [ $? -eq 0 ]; then
    log_success "Arquivo compactado criado: $ZIP_FILE"
else
    log_warning "Erro ao compactar arquivos"
fi

# Mostrar resumo final
echo ""
echo "🎉 EXPORT CONCLUÍDO COM SUCESSO!"
echo ""
echo "📦 ARQUIVOS CRIADOS:"
echo "  📄 $EXPORT_FILE ($(du -h "$EXPORT_FILE" | cut -f1))"
echo "  📊 $EXPORT_DATA_ONLY ($(du -h "$EXPORT_DATA_ONLY" | cut -f1))"
echo "  🏗️  $EXPORT_SCHEMA_ONLY ($(du -h "$EXPORT_SCHEMA_ONLY" | cut -f1))"
echo "  📈 $STATS_FILE ($(du -h "$STATS_FILE" | cut -f1))"
echo "  🗜️  $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"
echo ""
echo "📋 PARA ENVIAR PARA OUTRO DESENVOLVEDOR:"
echo "  1. Envie o arquivo: $ZIP_FILE"
echo "  2. Instrua a usar: ./importar_banco_completo.sh"
echo ""
echo "📊 DADOS EXPORTADOS:"
cat "$STATS_FILE" | grep "registros"
echo ""
echo "✅ Marketplace completo exportado e pronto para transferência!" 