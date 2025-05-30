#!/bin/bash
# Script para criar a tabela addresses no banco de dados

echo "🏗️ Criando tabela addresses..."

# Executar o script SQL
psql $DATABASE_URL -f scripts/create-addresses-table.sql

if [ $? -eq 0 ]; then
    echo "✅ Tabela addresses criada com sucesso!"
else
    echo "❌ Erro ao criar tabela addresses"
    exit 1
fi

echo "🔍 Verificando estrutura da tabela..."
psql $DATABASE_URL -c "\d addresses"

echo "✨ Pronto! Agora você pode usar o sistema de endereços." 