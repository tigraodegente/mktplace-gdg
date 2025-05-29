#!/bin/bash

echo "🚨 ATENÇÃO: Este script irá DELETAR e RECRIAR todo o banco de dados!"
echo "Isso removerá TODOS os dados existentes."
echo ""
read -p "Tem certeza que deseja continuar? (digite 'sim' para confirmar): " confirm

if [ "$confirm" != "sim" ]; then
    echo "Operação cancelada."
    exit 1
fi

echo ""
echo "📋 Passo 1: Exportando schema atual..."
xata schema dump --file schema/backup-schema-$(date +%Y%m%d-%H%M%S).json
echo "✅ Backup do schema salvo"

echo ""
echo "🗑️  Passo 2: Deletando banco de dados atual..."
echo "Por segurança, você precisa fazer isso manualmente:"
echo ""
echo "1. Acesse https://app.xata.io"
echo "2. Vá para Settings > Database"
echo "3. Delete o banco 'mktplace-gdg'"
echo "4. Crie um novo banco com o mesmo nome 'mktplace-gdg'"
echo ""
read -p "Pressione ENTER quando tiver completado os passos acima..."

echo ""
echo "🔄 Passo 3: Recriando estrutura..."
echo "Aguarde enquanto criamos as tabelas..."

# Criar novo schema limpo
cat > schema/fresh-schema.json << 'EOF'
{
  "tables": []
}
EOF

# Upload do schema vazio primeiro
xata schema upload schema/fresh-schema.json --branch main

echo ""
echo "📦 Passo 4: Criando tabelas uma por uma..."
echo "Agora vamos criar as tabelas via API do Xata"
echo ""
echo "Execute o próximo script: node scripts/create-tables-xata.mjs"
echo ""
echo "✅ Preparação concluída!" 