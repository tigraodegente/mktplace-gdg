#!/bin/bash

# Script para executar a migração dos filtros avançados

echo "🚀 Executando migração para adicionar colunas dos filtros avançados..."

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não encontrada!"
    echo ""
    echo "Por favor, execute o comando com sua URL de conexão:"
    echo ""
    echo "DATABASE_URL='postgresql://usuario:senha@host:porta/banco' ./scripts/run-migration.sh"
    echo ""
    echo "Ou defina a variável de ambiente DATABASE_URL primeiro:"
    echo "export DATABASE_URL='postgresql://usuario:senha@host:porta/banco'"
    echo ""
    exit 1
fi

# Executar o script SQL
echo "📝 Aplicando alterações no banco de dados..."
psql "$DATABASE_URL" -f scripts/add-new-filter-columns-with-data.sql

if [ $? -eq 0 ]; then
    echo "✅ Migração executada com sucesso!"
    echo ""
    echo "As seguintes alterações foram aplicadas:"
    echo "- Coluna 'condition' adicionada (novo/usado/recondicionado)"
    echo "- Coluna 'delivery_days' adicionada (tempo de entrega)"
    echo "- Colunas 'seller_state' e 'seller_city' adicionadas (localização)"
    echo "- Índices otimizados criados"
    echo "- Dados de teste populados"
    echo ""
    echo "🎉 Os filtros avançados estão prontos para uso!"
else
    echo "❌ Erro ao executar a migração"
    exit 1
fi 