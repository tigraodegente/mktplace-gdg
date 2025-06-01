#!/bin/bash

echo "🚀 MIGRAÇÃO COMPLETA: Local → Neon"
echo "=================================="
echo ""

# Configurações
LOCAL_DB="postgresql://postgres@localhost/mktplace_dev"
NEON_DB="postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

# Arquivo temporário para dump
DUMP_FILE="neon_migration_$(date +%Y%m%d_%H%M%S).sql"

echo "📊 1. VERIFICANDO BANCO LOCAL..."
echo "================================"

# Verificar dados locais
echo "Tabelas no banco local:"
psql "$LOCAL_DB" -c "\dt" -t | head -10

echo ""
echo "Contagem de dados:"
psql "$LOCAL_DB" -c "
  SELECT 'users' as tabela, COUNT(*) as total FROM users 
  UNION ALL 
  SELECT 'products', COUNT(*) FROM products 
  UNION ALL 
  SELECT 'categories', COUNT(*) FROM categories 
  UNION ALL 
  SELECT 'orders', COUNT(*) FROM orders;"

echo ""
echo "📤 2. GERANDO DUMP COMPLETO..."
echo "=============================="

# Gerar dump completo (schema + dados)
pg_dump "$LOCAL_DB" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --schema-only \
  > "${DUMP_FILE%.sql}_schema.sql"

echo "✅ Schema exportado para ${DUMP_FILE%.sql}_schema.sql"

# Gerar dump só dos dados
pg_dump "$LOCAL_DB" \
  --no-owner \
  --no-privileges \
  --data-only \
  --disable-triggers \
  > "${DUMP_FILE%.sql}_data.sql"

echo "✅ Dados exportados para ${DUMP_FILE%.sql}_data.sql"

echo ""
echo "🔄 3. APLICANDO NO NEON..."
echo "========================="

# Limpar e recriar schema no Neon
echo "Aplicando schema..."
psql "$NEON_DB" -f "${DUMP_FILE%.sql}_schema.sql" -v ON_ERROR_STOP=1

if [ $? -eq 0 ]; then
    echo "✅ Schema aplicado com sucesso"
else
    echo "❌ Erro ao aplicar schema"
    exit 1
fi

# Inserir dados no Neon
echo "Inserindo dados..."
psql "$NEON_DB" -f "${DUMP_FILE%.sql}_data.sql" -v ON_ERROR_STOP=1

if [ $? -eq 0 ]; then
    echo "✅ Dados inseridos com sucesso"
else
    echo "❌ Erro ao inserir dados"
    exit 1
fi

echo ""
echo "🔍 4. VERIFICAÇÃO FINAL..."
echo "========================="

# Verificar dados no Neon
echo "Verificando dados no Neon:"
psql "$NEON_DB" -c "
  SELECT 'users' as tabela, COUNT(*) as total FROM users 
  UNION ALL 
  SELECT 'products', COUNT(*) FROM products 
  UNION ALL 
  SELECT 'categories', COUNT(*) FROM categories 
  UNION ALL 
  SELECT 'orders', COUNT(*) FROM orders;"

echo ""
echo "✅ 5. CONFIGURANDO .ENV PARA NEON..."
echo "==================================="

# Backup .env atual
cp .env .env.backup_$(date +%Y%m%d_%H%M%S)

# Configurar para Neon
echo "DATABASE_URL=\"$NEON_DB\"" > .env

echo "✅ .env configurado para Neon"
echo ""

echo "🎉 MIGRAÇÃO COMPLETA!"
echo "===================="
echo ""
echo "📋 Próximos passos:"
echo "1. Reiniciar servidor: cd apps/store && pnpm dev"
echo "2. Testar APIs: curl http://localhost:5173/api/products/featured"
echo "3. Deploy remoto: pnpm run deploy"
echo ""
echo "📁 Arquivos gerados:"
echo "- ${DUMP_FILE%.sql}_schema.sql (esquema)"
echo "- ${DUMP_FILE%.sql}_data.sql (dados)"
echo "- .env.backup_* (backup do .env anterior)"
echo ""

# Limpeza opcional
read -p "🗑️ Remover arquivos temporários? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f "${DUMP_FILE%.sql}_schema.sql" "${DUMP_FILE%.sql}_data.sql"
    echo "✅ Arquivos temporários removidos"
fi

echo ""
echo "🚀 PARA VOLTAR AO BANCO LOCAL:"
echo "  ./use-local-db.sh"
echo ""
echo "🌐 PARA USAR NEON:"
echo "  ./use-neon-db.sh" 