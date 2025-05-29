#!/bin/bash

echo "🚀 Configurando Cloudflare KV para o Marketplace GDG"
echo ""

# Verificar se wrangler está instalado
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler não está instalado!"
    echo "Instale com: npm install -g wrangler"
    exit 1
fi

# Verificar se está logado no Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "📝 Você precisa fazer login no Cloudflare primeiro:"
    wrangler login
fi

echo ""
echo "📦 Criando KV namespace para produção..."

# Criar namespace de produção
PROD_KV_ID=$(wrangler kv:namespace create "CACHE_KV" 2>&1 | grep -oE '[a-f0-9]{32}' | head -1)

if [ -z "$PROD_KV_ID" ]; then
    echo "❌ Erro ao criar KV namespace de produção"
    exit 1
fi

echo "✅ KV namespace de produção criado: $PROD_KV_ID"

# Criar namespace de preview
echo ""
echo "📦 Criando KV namespace para preview..."

PREVIEW_KV_ID=$(wrangler kv:namespace create "CACHE_KV" --preview 2>&1 | grep -oE '[a-f0-9]{32}' | head -1)

if [ -z "$PREVIEW_KV_ID" ]; then
    echo "❌ Erro ao criar KV namespace de preview"
    exit 1
fi

echo "✅ KV namespace de preview criado: $PREVIEW_KV_ID"

# Atualizar wrangler.toml
echo ""
echo "📝 Atualizando wrangler.toml..."

# Fazer backup do wrangler.toml
cp apps/store/wrangler.toml apps/store/wrangler.toml.bak

# Atualizar os IDs no arquivo
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/YOUR_KV_NAMESPACE_ID/$PROD_KV_ID/g" apps/store/wrangler.toml
    sed -i '' "s/YOUR_PREVIEW_KV_ID/$PREVIEW_KV_ID/g" apps/store/wrangler.toml
else
    # Linux
    sed -i "s/YOUR_KV_NAMESPACE_ID/$PROD_KV_ID/g" apps/store/wrangler.toml
    sed -i "s/YOUR_PREVIEW_KV_ID/$PREVIEW_KV_ID/g" apps/store/wrangler.toml
fi

echo "✅ wrangler.toml atualizado com os IDs dos namespaces"

# Mostrar resumo
echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "KV Namespaces criados:"
echo "- Produção: $PROD_KV_ID"
echo "- Preview: $PREVIEW_KV_ID"
echo ""
echo "Para testar localmente, use:"
echo "cd apps/store && npm run dev"
echo ""
echo "O Wrangler criará um namespace local automaticamente."
echo ""
echo "Para fazer deploy:"
echo "cd apps/store && npm run deploy" 