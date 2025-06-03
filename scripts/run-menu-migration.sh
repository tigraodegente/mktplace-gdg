#!/bin/bash

# Script para executar a migração dos campos de menu

echo "🚀 Executando migração para adicionar campos de menu featured..."

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não encontrada!"
    echo ""
    echo "Por favor, execute o comando com sua URL de conexão:"
    echo ""
    echo "DATABASE_URL='postgresql://usuario:senha@host:porta/banco' ./scripts/run-menu-migration.sh"
    echo ""
    echo "Ou defina a variável de ambiente DATABASE_URL primeiro:"
    echo "export DATABASE_URL='postgresql://usuario:senha@host:porta/banco'"
    echo ""
    exit 1
fi

# Executar o script SQL
echo "📝 Aplicando alterações no banco de dados..."
psql "$DATABASE_URL" -f scripts/add-menu-featured-fields.sql

if [ $? -eq 0 ]; then
    echo "✅ Migração executada com sucesso!"
    echo ""
    echo "As seguintes alterações foram aplicadas:"
    echo "- Campo 'is_featured' adicionado nas tabelas categories e pages"
    echo "- Campo 'menu_order' adicionado para controlar ordem no menu"
    echo "- Índices otimizados criados"
    echo "- Alguns dados de exemplo foram configurados"
    echo ""
    echo "🎉 O sistema de menu inteligente está pronto para uso!"
else
    echo "❌ Erro ao executar a migração"
    exit 1
fi 