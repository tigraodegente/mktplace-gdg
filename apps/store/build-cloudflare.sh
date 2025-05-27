#!/bin/bash

# Build da aplicação
pnpm build

# Criar diretório de saída na raiz se não existir
mkdir -p ../../.svelte-kit/cloudflare

# Copiar os arquivos buildados para o diretório esperado pelo Cloudflare
cp -r .svelte-kit/cloudflare/* ../../.svelte-kit/cloudflare/

echo "Build copiado para o diretório raiz com sucesso!" 