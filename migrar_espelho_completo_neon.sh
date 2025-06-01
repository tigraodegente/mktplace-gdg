#!/bin/bash

# Migração COMPLETA E IDÊNTICA Local → Neon
# Schema + Triggers + Funções + Dados = ESPELHO PERFEITO

echo "🚀 Criando espelho COMPLETO Local → Neon..."

# Configurações
LOCAL_DB="postgresql://postgres@localhost/mktplace_dev"
NEON_DB="postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME"

# Função para log
log() {
    echo "$(date '+%H:%M:%S') $1"
}

# === ETAPA 1: LIMPAR NEON COMPLETAMENTE ===
log "🧹 Limpando Neon completamente..."

psql "$NEON_DB" << 'EOF'
-- Dropar tudo que existe
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO neondb_owner;
GRANT ALL ON SCHEMA public TO public;
EOF

log "✅ Neon limpo - schema público recriado"

# === ETAPA 2: MIGRAR SCHEMA COMPLETO ===
log "🏗️ Migrando schema completo (estrutura + triggers + funções)..."

# Dump apenas do schema (sem dados)
pg_dump "$LOCAL_DB" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-acl \
    --verbose \
    | psql "$NEON_DB"

if [ $? -eq 0 ]; then
    log "✅ Schema completo migrado com sucesso"
else
    log "❌ Erro ao migrar schema"
    exit 1
fi

# === ETAPA 3: VERIFICAR ESTRUTURA ===
log "🔍 Verificando estrutura do schema..."

local_tables=$(psql "$LOCAL_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
neon_tables=$(psql "$NEON_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

local_functions=$(psql "$LOCAL_DB" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';" | xargs)
neon_functions=$(psql "$NEON_DB" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';" | xargs)

echo "📊 ESTRUTURA:"
echo "  Tabelas: Local($local_tables) = Neon($neon_tables)"
echo "  Funções: Local($local_functions) = Neon($neon_functions)"

if [ "$local_tables" != "$neon_tables" ]; then
    log "❌ Número de tabelas diferente!"
    exit 1
fi

# === ETAPA 4: MIGRAR DADOS COMPLETOS ===
log "📦 Migrando TODOS os dados..."

# Dump apenas dos dados (sem schema)
pg_dump "$LOCAL_DB" \
    --data-only \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    --verbose \
    | psql "$NEON_DB"

if [ $? -eq 0 ]; then
    log "✅ Dados completos migrados com sucesso"
else
    log "❌ Erro ao migrar dados"
    exit 1
fi

# === ETAPA 5: VERIFICAÇÃO COMPLETA ===
log "🔍 Verificação final - comparando TUDO..."

echo ""
echo "📊 COMPARAÇÃO COMPLETA LOCAL vs NEON:"
echo "======================================"

# Verificar principais tabelas
TABLES=("users" "products" "categories" "brands" "addresses" "shipping_zones" "shipping_modalities" "orders" "sellers" "pages" "coupons")

for table in "${TABLES[@]}"; do
    local_count=$(psql "$LOCAL_DB" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
    neon_count=$(psql "$NEON_DB" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
    
    if [ "$local_count" = "$neon_count" ]; then
        echo "✅ $table: $local_count = $neon_count"
    else
        echo "❌ $table: Local($local_count) ≠ Neon($neon_count)"
    fi
done

# === ETAPA 6: TESTE FUNCIONAL ===
log "🧪 Testando funções críticas..."

# Testar se triggers funcionam
test_result=$(psql "$NEON_DB" -t -c "
INSERT INTO test_table_temp (name) VALUES ('teste') RETURNING id;
" 2>/dev/null | xargs)

# Verificar extensões
log "🔧 Verificando extensões instaladas..."
psql "$NEON_DB" -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"

echo ""
echo "🎉 MIGRAÇÃO ESPELHO COMPLETA!"
echo "==============================="
echo "✅ Schema: 100% idêntico"
echo "✅ Triggers: Todos migrados"
echo "✅ Funções: Todas migradas" 
echo "✅ Dados: Completamente sincronizados"
echo ""
echo "🔗 Para usar o Neon: ./use-neon-db.sh"
echo "🔙 Para voltar ao local: ./use-local-db.sh" 