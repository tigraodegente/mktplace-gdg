#!/bin/bash

# Migração Completa Local → Neon
# Este script espelha completamente o banco local no Neon

echo "🚀 Iniciando migração completa Local → Neon..."

# Configurações
LOCAL_DB="postgresql://postgres@localhost/mktplace_dev"
NEON_DB="postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb"

# Função para log
log() {
    echo "$(date '+%H:%M:%S') $1"
}

# Função para executar comando no Neon
exec_neon() {
    psql "$NEON_DB" -c "$1"
}

# Função para migrar tabela
migrate_table() {
    local table=$1
    local condition=$2
    
    log "📦 Migrando tabela: $table"
    
    # Limpar tabela no Neon primeiro
    exec_neon "TRUNCATE TABLE $table CASCADE;" 2>/dev/null || true
    
    # Exportar dados do local
    if [ -z "$condition" ]; then
        pg_dump "$LOCAL_DB" --data-only --table="$table" --no-owner --no-privileges | psql "$NEON_DB"
    else
        psql "$LOCAL_DB" -c "\copy (SELECT * FROM $table WHERE $condition) TO STDOUT" | psql "$NEON_DB" -c "\copy $table FROM STDIN"
    fi
    
    if [ $? -eq 0 ]; then
        local count=$(exec_neon "SELECT COUNT(*) FROM $table;" | tail -3 | head -1 | xargs)
        log "✅ $table: $count registros migrados"
    else
        log "❌ Erro ao migrar $table"
    fi
}

# === MIGRAÇÃO POR PRIORIDADE ===

log "🎯 Etapa 1: Tabelas Fundamentais"
migrate_table "brands"
migrate_table "categories" 
migrate_table "sellers"

log "🎯 Etapa 2: Produtos e Relacionados"
migrate_table "products"
migrate_table "product_images"
migrate_table "product_categories"
migrate_table "product_variants"

log "🎯 Etapa 3: Sistema de Shipping"
migrate_table "shipping_carriers"
migrate_table "shipping_zones"
migrate_table "shipping_modalities"
migrate_table "shipping_rates"
migrate_table "shipping_base_rates"

log "🎯 Etapa 4: Usuários e Endereços"
# Não migrar users pois já estão lá
migrate_table "addresses"

log "🎯 Etapa 5: Sistema de Pedidos"
migrate_table "carts"
migrate_table "cart_items"
migrate_table "orders"
migrate_table "order_items"

log "🎯 Etapa 6: Conteúdo e Configurações"
migrate_table "pages"
migrate_table "banners"
migrate_table "faqs"
migrate_table "system_settings"

log "🎯 Etapa 7: Marketing e Analytics"
migrate_table "coupons"
migrate_table "popular_searches"
migrate_table "search_suggestions"

log "🎯 Etapa 8: Notificações e Suporte"
migrate_table "notifications"
migrate_table "support_tickets"
migrate_table "email_queue"

# === VERIFICAÇÃO FINAL ===
log "🔍 Verificação final da migração..."

echo ""
echo "📊 COMPARAÇÃO LOCAL vs NEON:"
echo "================================"

# Principais tabelas para verificar
TABLES=("users" "products" "categories" "brands" "addresses" "shipping_zones" "shipping_modalities" "orders")

for table in "${TABLES[@]}"; do
    local_count=$(psql "$LOCAL_DB" -t -c "SELECT COUNT(*) FROM $table;" | xargs)
    neon_count=$(exec_neon "SELECT COUNT(*) FROM $table;" | tail -3 | head -1 | xargs)
    
    if [ "$local_count" = "$neon_count" ]; then
        echo "✅ $table: $local_count = $neon_count"
    else
        echo "⚠️  $table: Local($local_count) ≠ Neon($neon_count)"
    fi
done

echo ""
echo "🎉 Migração concluída!"
echo "🔗 Para testar: use o script use-neon-db.sh" 