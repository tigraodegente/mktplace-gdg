#!/bin/bash

echo "📋 Exportando schema atual do Xata..."

# Verificar se o Xata CLI está instalado
if ! command -v xata &> /dev/null; then
    echo "❌ Xata CLI não está instalado. Instalando..."
    npm install -g @xata.io/cli
fi

# Exportar schema
echo "🔍 Conectando ao Xata..."
xata schema dump --branch main -o schema/current-schema.json

if [ $? -eq 0 ]; then
    echo "✅ Schema exportado com sucesso para schema/current-schema.json"
    
    # Mostrar resumo
    echo ""
    echo "📊 Resumo do schema:"
    if command -v jq &> /dev/null; then
        echo "Tabelas encontradas:"
        jq -r '.tables[].name' schema/current-schema.json | sort | sed 's/^/  - /'
    else
        echo "Instale 'jq' para ver o resumo detalhado"
    fi
else
    echo "❌ Erro ao exportar schema"
    exit 1
fi 