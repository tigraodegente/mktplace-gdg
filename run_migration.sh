#!/bin/bash

# Configurações do banco
DB_HOST="us-east-1.sql.xata.sh"
DB_USER="787mk0"
DB_NAME="mktplace-gdg"
PASSWORD="xau_dVL4yNzXLHrGYTmaUbvg00sGLUrZp4at1"
MIGRATION_DIR="/Users/guga/apps/mktplace-gdg/scripts/migrate"

# Função para executar SQL
run_sql() {
  PGPASSWORD="$PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

# Função para executar um arquivo SQL
run_sql_file() {
  local file="$1"
  echo -e "\n🏃 Executando $file..."
  PGPASSWORD="$PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$file"
  if [ $? -eq 0 ]; then
    echo -e "✅ $file executado com sucesso!"
  else
    echo -e "❌ Erro ao executar $file"
    exit 1
  fi
}

# Criar tabela de rastreamento
echo "🔧 Criando tabela de rastreamento..."
run_sql "CREATE TABLE IF NOT EXISTS migration_tracking (
  id TEXT PRIMARY KEY,
  type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);"

# Executar migrações
for script in \
  "01_categories.sql" \
  "02_brands.sql" \
  "03_product_options.sql" \
  "04_products_simple.sql" \
  "05_deactivate_old_products_simple.sql"; do
  if [ -f "$MIGRATION_DIR/$script" ]; then
    run_sql_file "$MIGRATION_DIR/$script"
  else
    echo -e "❌ Arquivo $script não encontrado!"
    exit 1
  fi
done

# Mostrar resumo
echo -e "\n📊 Resumo da migração:"
run_sql "SELECT type, COUNT(*) as total FROM migration_tracking GROUP BY type ORDER BY type;"
echo -e "\n✨ Migração concluída com sucesso!"
