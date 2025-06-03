#!/bin/bash

# Script de build para Cloudflare Pages
set -e

echo "🔧 Iniciando build para Cloudflare Pages..."

# Limpar cache
echo "🧹 Limpando cache..."
rm -rf .svelte-kit node_modules/.vite

# Sincronizar SvelteKit
echo "🔄 Sincronizando SvelteKit..."
npx svelte-kit sync

# Build principal
echo "🏗️ Executando build..."
npx vite build

echo "✅ Build concluído com sucesso!"
echo "📁 Output: .svelte-kit/cloudflare" 