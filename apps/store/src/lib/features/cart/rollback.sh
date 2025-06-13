#!/bin/bash

# 🔄 SCRIPT DE ROLLBACK AUTOMÁTICO - Cart Store Migration
# 
# Uso: ./rollback.sh [tipo]
# Tipos: 
#   - immediate: Rollback via bridge (30s)
#   - full: Rollback git completo (2min)
#   - selective: Rollback de arquivos específicos

set -e

echo "🔄 CART STORE ROLLBACK INICIADO"
echo "================================="

ROLLBACK_TYPE=${1:-"immediate"}
BRIDGE_FILE="./apps/store/src/lib/features/cart/stores/cartStore.bridge.ts"
BACKUP_DIR="./migration-backup-$(date +%Y%m%d_%H%M%S)"

case $ROLLBACK_TYPE in
  "immediate")
    echo "⚡ ROLLBACK IMEDIATO - Alterando bridge..."
    
    if [ -f "$BRIDGE_FILE" ]; then
      # Backup do arquivo atual
      cp "$BRIDGE_FILE" "${BRIDGE_FILE}.rollback-backup"
      
      # Alterar USE_NEW_STORE para false
      sed -i.bak 's/const USE_NEW_STORE = true/const USE_NEW_STORE = false/' "$BRIDGE_FILE"
      
      echo "✅ Bridge alterado para store antigo"
      echo "🔄 Recarregue o navegador para aplicar mudanças"
      echo ""
      echo "Para desfazer este rollback:"
      echo "sed -i.bak 's/const USE_NEW_STORE = false/const USE_NEW_STORE = true/' $BRIDGE_FILE"
    else
      echo "❌ Arquivo bridge não encontrado: $BRIDGE_FILE"
      exit 1
    fi
    ;;
    
  "full")
    echo "🔄 ROLLBACK COMPLETO - Git reset..."
    
    # Criar backup dos arquivos atuais
    mkdir -p "$BACKUP_DIR"
    echo "📁 Criando backup em: $BACKUP_DIR"
    
    # Backup dos arquivos modificados
    git diff --name-only HEAD^ | while read file; do
      if [ -f "$file" ]; then
        mkdir -p "$BACKUP_DIR/$(dirname "$file")"
        cp "$file" "$BACKUP_DIR/$file"
      fi
    done
    
    # Reset git
    echo "⚠️  ATENÇÃO: Fazendo git reset --hard HEAD^"
    echo "Pressione ENTER para continuar ou Ctrl+C para cancelar..."
    read
    
    git reset --hard HEAD^
    
    echo "✅ Rollback git completo realizado"
    echo "📁 Backup salvo em: $BACKUP_DIR"
    ;;
    
  "selective")
    echo "🎯 ROLLBACK SELETIVO - Arquivos específicos..."
    
    # Lista de arquivos críticos para reverter
    CRITICAL_FILES=(
      "apps/store/src/routes/+layout.svelte"
      "apps/store/src/routes/cart/+page.svelte"
      "apps/store/src/routes/checkout/+page.svelte"
      "apps/store/src/lib/components/cart/index.ts"
    )
    
    echo "Arquivos que serão revertidos:"
    for file in "${CRITICAL_FILES[@]}"; do
      echo "  - $file"
    done
    
    echo ""
    echo "Pressione ENTER para continuar ou Ctrl+C para cancelar..."
    read
    
    for file in "${CRITICAL_FILES[@]}"; do
      if [ -f "$file" ]; then
        echo "🔄 Revertendo: $file"
        git checkout HEAD^ -- "$file"
      else
        echo "⚠️  Arquivo não encontrado: $file"
      fi
    done
    
    echo "✅ Rollback seletivo concluído"
    ;;
    
  *)
    echo "❌ Tipo de rollback inválido: $ROLLBACK_TYPE"
    echo ""
    echo "Tipos disponíveis:"
    echo "  immediate - Rollback via bridge (30s)"
    echo "  full      - Rollback git completo (2min)"
    echo "  selective - Rollback arquivos críticos"
    exit 1
    ;;
esac

echo ""
echo "🎉 ROLLBACK CONCLUÍDO!"
echo "========================"
echo ""
echo "Próximos passos:"
echo "1. Recarregue o navegador"
echo "2. Teste funcionalidades básicas"
echo "3. Verifique se problemas foram resolvidos"
echo ""
echo "Para logs detalhados: git log --oneline -5" 