#!/bin/bash

# =====================================================
# VERIFICAÇÃO DA MIGRAÇÃO PARA NEON POSTGRESQL
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
    echo -e "${PURPLE}🔍 $1${NC}"
}

echo ""
echo "🔍 VERIFICAÇÃO DA MIGRAÇÃO NEON POSTGRESQL"
echo "============================================"
echo ""

# Verificar se .env existe
if [ ! -f .env ]; then
    log_error "Arquivo .env não encontrado. Execute a migração primeiro."
    exit 1
fi

# Carregar DATABASE_URL do .env
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL não encontrada no .env"
    exit 1
fi

# Verificar se é URL do Neon
if [[ $DATABASE_URL == *"neon.tech"* ]] || [[ $DATABASE_URL == *"sslmode=require"* ]]; then
    log_success "Detectado banco Neon PostgreSQL"
else
    log_warning "Parece ser um banco local. Verifique se a migração foi executada."
fi

echo "🔗 URL: $(echo $DATABASE_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')"
echo ""

# Teste de conectividade
log_step "Testando conectividade..."
if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    log_success "Conexão estabelecida com sucesso"
else
    log_error "Falha na conexão. Verifique suas credenciais."
    exit 1
fi

# Verificar extensões
log_step "Verificando extensões PostgreSQL..."
EXTENSIONS=$(psql "$DATABASE_URL" -t -c "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm');" | tr -d ' ' | tr '\n' ' ')
if [[ $EXTENSIONS == *"uuid-ossp"* ]]; then
    log_success "✓ uuid-ossp instalada"
else
    log_warning "✗ uuid-ossp não encontrada"
fi

if [[ $EXTENSIONS == *"pg_trgm"* ]]; then
    log_success "✓ pg_trgm instalada"
else
    log_warning "✗ pg_trgm não encontrada"
fi

# Contar tabelas
log_step "Verificando estrutura do banco..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
SEQUENCE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.sequences WHERE sequence_schema='public';" | tr -d ' ')

echo "  📊 Tabelas encontradas: $TABLE_COUNT"
echo "  🔢 Sequências encontradas: $SEQUENCE_COUNT"

if [ "$TABLE_COUNT" -gt "90" ]; then
    log_success "Número de tabelas adequado (esperado: ~101)"
elif [ "$TABLE_COUNT" -gt "50" ]; then
    log_warning "Número de tabelas abaixo do esperado"
else
    log_error "Muito poucas tabelas. Migração pode ter falhado."
fi

# Verificar tabelas essenciais
log_step "Verificando tabelas essenciais..."
ESSENTIAL_TABLES="users products categories orders cart_items sellers"

for table in $ESSENTIAL_TABLES; do
    if psql "$DATABASE_URL" -c "\dt $table" &> /dev/null; then
        COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
        if [ ! -z "$COUNT" ] && [ "$COUNT" -gt "0" ]; then
            log_success "  $table: $COUNT registros"
        else
            log_warning "  $table: tabela vazia"
        fi
    else
        log_error "  $table: tabela não encontrada"
    fi
done

# Verificar índices importantes
log_step "Verificando índices..."
INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" | tr -d ' ')
echo "  🗂️  Índices encontrados: $INDEX_COUNT"

# Verificar relacionamentos (foreign keys)
log_step "Verificando relacionamentos..."
FK_COUNT=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
" | tr -d ' ')
echo "  🔗 Foreign keys encontradas: $FK_COUNT"

# Testar operações CRUD básicas
log_step "Testando operações CRUD..."

# Teste SELECT
if psql "$DATABASE_URL" -c "SELECT email, name FROM users LIMIT 1;" &> /dev/null; then
    log_success "✓ SELECT funcionando"
else
    log_error "✗ Erro no SELECT"
fi

# Teste INSERT/UPDATE/DELETE
TEST_EMAIL="teste_verificacao_$(date +%s)@neon.test"
if psql "$DATABASE_URL" -c "
    BEGIN;
    INSERT INTO users (email, name, password_hash, role) 
    VALUES ('$TEST_EMAIL', 'Teste Verificação', 'hash123', 'customer');
    UPDATE users SET name = 'Teste Atualizado' WHERE email = '$TEST_EMAIL';
    DELETE FROM users WHERE email = '$TEST_EMAIL';
    COMMIT;
" &> /dev/null; then
    log_success "✓ INSERT/UPDATE/DELETE funcionando"
else
    log_warning "✗ Problemas com operações de escrita"
fi

# Verificar performance básica
log_step "Verificando performance..."
start_time=$(date +%s.%N)
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM products;" &> /dev/null
end_time=$(date +%s.%N)
query_time=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "N/A")

if [ "$query_time" != "N/A" ]; then
    echo "  ⏱️  Query simples: ${query_time}s"
    if (( $(echo "$query_time < 1.0" | bc -l 2>/dev/null || echo 0) )); then
        log_success "Performance adequada"
    else
        log_warning "Performance pode estar lenta"
    fi
else
    log_info "Tempo de query não medido"
fi

# Verificar espaço utilizado
log_step "Verificando utilização de espaço..."
DB_SIZE=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tr -d ' ')
if [ ! -z "$DB_SIZE" ]; then
    echo "  💾 Tamanho do banco: $DB_SIZE"
else
    log_warning "Não foi possível obter o tamanho do banco"
fi

# Verificar dados de exemplo
log_step "Verificando dados críticos..."

# Verificar se há produtos ativos
ACTIVE_PRODUCTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM products WHERE is_active = true;" 2>/dev/null | tr -d ' ')
if [ ! -z "$ACTIVE_PRODUCTS" ] && [ "$ACTIVE_PRODUCTS" -gt "0" ]; then
    log_success "  $ACTIVE_PRODUCTS produtos ativos encontrados"
else
    log_warning "  Nenhum produto ativo encontrado"
fi

# Verificar categorias
CATEGORIES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM categories WHERE is_active = true;" 2>/dev/null | tr -d ' ')
if [ ! -z "$CATEGORIES" ] && [ "$CATEGORIES" -gt "0" ]; then
    log_success "  $CATEGORIES categorias ativas encontradas"
else
    log_warning "  Nenhuma categoria ativa encontrada"
fi

# Verificar usuários
USERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE is_active = true;" 2>/dev/null | tr -d ' ')
if [ ! -z "$USERS" ] && [ "$USERS" -gt "0" ]; then
    log_success "  $USERS usuários ativos encontrados"
else
    log_warning "  Nenhum usuário ativo encontrado"
fi

# Verificar configurações do .env
log_step "Verificando configurações do .env..."

# Verificar chaves importantes
if grep -q "JWT_SECRET.*=" .env && ! grep -q "sua_chave_jwt" .env; then
    log_success "✓ JWT_SECRET configurado"
else
    log_warning "✗ JWT_SECRET precisa ser configurado"
fi

if grep -q "NODE_ENV.*production" .env; then
    log_success "✓ Ambiente configurado para produção"
else
    log_warning "✗ NODE_ENV não está em produção"
fi

# Relatório final
echo ""
echo "📋 RELATÓRIO DE VERIFICAÇÃO"
echo "=========================="
echo ""

# Resumo das verificações
TOTAL_CHECKS=8
PASSED_CHECKS=0

# Calcular checks que passaram (simplificado)
if [ "$TABLE_COUNT" -gt "50" ]; then ((PASSED_CHECKS++)); fi
if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then ((PASSED_CHECKS++)); fi
if [ ! -z "$ACTIVE_PRODUCTS" ] && [ "$ACTIVE_PRODUCTS" -gt "0" ]; then ((PASSED_CHECKS++)); fi
if [ ! -z "$CATEGORIES" ] && [ "$CATEGORIES" -gt "0" ]; then ((PASSED_CHECKS++)); fi
if [ ! -z "$USERS" ] && [ "$USERS" -gt "0" ]; then ((PASSED_CHECKS++)); fi
if [ "$FK_COUNT" -gt "10" ]; then ((PASSED_CHECKS++)); fi
if grep -q "neon.tech\|sslmode=require" .env; then ((PASSED_CHECKS++)); fi
if [ ! -z "$DB_SIZE" ]; then ((PASSED_CHECKS++)); fi

SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "🎯 SCORE: $SCORE% ($PASSED_CHECKS/$TOTAL_CHECKS checks)"
echo ""

if [ "$SCORE" -ge "90" ]; then
    log_success "🎉 MIGRAÇÃO EXCELENTE! Tudo funcionando perfeitamente."
    echo ""
    echo "✅ PRÓXIMOS PASSOS:"
    echo "  1. Configure as integrações externas no .env"
    echo "  2. Faça deploy do marketplace"
    echo "  3. Execute testes finais"
elif [ "$SCORE" -ge "70" ]; then
    log_success "✅ MIGRAÇÃO BOA! Algumas configurações podem ser ajustadas."
    echo ""
    echo "🔧 RECOMENDAÇÕES:"
    echo "  • Verifique configurações do .env"
    echo "  • Teste funcionalidades específicas"
    echo "  • Monitore performance"
elif [ "$SCORE" -ge "50" ]; then
    log_warning "⚠️  MIGRAÇÃO PARCIAL. Alguns problemas detectados."
    echo ""
    echo "🔧 AÇÕES NECESSÁRIAS:"
    echo "  • Revise os logs de migração"
    echo "  • Verifique dados críticos"
    echo "  • Execute nova migração se necessário"
else
    log_error "❌ MIGRAÇÃO COM PROBLEMAS. Revisão necessária."
    echo ""
    echo "🚨 AÇÕES URGENTES:"
    echo "  • Execute nova migração"
    echo "  • Verifique conectividade"
    echo "  • Revise credenciais do Neon"
fi

echo ""
echo "📊 DETALHES TÉCNICOS:"
echo "  Tabelas: $TABLE_COUNT"
echo "  Índices: $INDEX_COUNT"
echo "  Foreign Keys: $FK_COUNT"
echo "  Tamanho: $DB_SIZE"
echo "  Produtos: $ACTIVE_PRODUCTS"
echo "  Usuários: $USERS"
echo "  Categorias: $CATEGORIES"
echo ""

if [ "$SCORE" -ge "70" ]; then
    echo "🚀 Seu marketplace está pronto para o Neon PostgreSQL!"
else
    echo "🔧 Execute correções e rode este script novamente."
fi 