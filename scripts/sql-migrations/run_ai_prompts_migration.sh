#!/bin/bash

# Script para migração completa do sistema de prompts IA
# Executa: criação de tabelas + população de dados iniciais

echo "🚀 Iniciando migração do sistema de prompts IA..."

# URL de conexão com o banco (usar variável de ambiente)
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: Variável DATABASE_URL não definida"
    echo "Por favor, defina a variável de ambiente DATABASE_URL com a string de conexão"
    exit 1
fi

DB_URL="$DATABASE_URL"

echo "📋 Executando migração das tabelas..."
psql "$DB_URL" -f scripts/sql-migrations/create_ai_prompts_tables.sql

echo "📋 Populando dados iniciais dos prompts..."
psql "$DB_URL" -f scripts/database/seed-ai-prompts.sql

echo "✅ Verificando resultados..."
psql "$DB_URL" -c "
SELECT 
    'ai_prompts' as tabela,
    count(*) as registros,
    CASE WHEN count(*) > 0 THEN '✅ OK' ELSE '❌ Vazia' END as status
FROM ai_prompts
UNION ALL
SELECT 
    'ai_prompts_history' as tabela,
    count(*) as registros,
    '✅ OK' as status
FROM ai_prompts_history;
"

echo "🎉 Migração concluída!" 