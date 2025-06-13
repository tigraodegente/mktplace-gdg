#!/bin/bash

# 🔄 SCRIPT DE ROLLBACK AUTOMÁTICO - Cart Store Migration
# 
# Uso: ./rollback.sh [tipo]
# Tipos: 
#   - immediate: Rollback via bridge (30s)
#   - full: Rollback git completo (2min)
#   - old: Voltar para versão original

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
      
      # Alterar STORE_VERSION para 'new'
      sed -i.bak "s/const STORE_VERSION: StoreVersion = 'refactored'/const STORE_VERSION: StoreVersion = 'new'/" "$BRIDGE_FILE"
      
      echo "✅ Bridge alterado para store NEW (consolidado)"
      echo "🔄 Execute 'npm run build' para aplicar mudanças"
    else
      echo "❌ Arquivo bridge não encontrado: $BRIDGE_FILE"
      exit 1
    fi
    ;;
    
  "old")
    echo "⚡ ROLLBACK PARA VERSÃO ORIGINAL..."
    
    if [ -f "$BRIDGE_FILE" ]; then
      # Backup do arquivo atual
      cp "$BRIDGE_FILE" "${BRIDGE_FILE}.rollback-backup"
      
      # Alterar STORE_VERSION para 'old'
      sed -i.bak "s/const STORE_VERSION: StoreVersion = 'refactored'/const STORE_VERSION: StoreVersion = 'old'/" "$BRIDGE_FILE"
      sed -i.bak "s/const STORE_VERSION: StoreVersion = 'new'/const STORE_VERSION: StoreVersion = 'old'/" "$BRIDGE_FILE"
      
      echo "✅ Bridge alterado para store ORIGINAL (legacy)"
      echo "🔄 Execute 'npm run build' para aplicar mudanças"
    else
      echo "❌ Arquivo bridge não encontrado: $BRIDGE_FILE"
      exit 1
    fi
    ;;
    
  "full")
    echo "🔄 ROLLBACK COMPLETO - Git reset..."
    
    # Criar backup dos arquivos atuais
    mkdir -p "$BACKUP_DIR"
    echo "📦 Criando backup em: $BACKUP_DIR"
    
    # Backup da estrutura features
    if [ -d "./apps/store/src/lib/features" ]; then
      cp -r "./apps/store/src/lib/features" "$BACKUP_DIR/"
    fi
    
    # Git status
    echo "📊 Status atual do Git:"
    git status --short
    
    # Confirmar antes de prosseguir
    echo "⚠️  ATENÇÃO: Isso irá desfazer TODAS as mudanças não commitadas!"
    echo "   Backup salvo em: $BACKUP_DIR"
    read -p "   Continuar? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "🔄 Fazendo rollback git..."
      
      # Reset para último commit
      git checkout HEAD -- apps/store/src/lib/features/cart/
      git clean -fd apps/store/src/lib/features/cart/
      
      echo "✅ Rollback git concluído"
      echo "📦 Backup disponível em: $BACKUP_DIR"
    else
      echo "❌ Rollback cancelado pelo usuário"
      exit 0
    fi
    ;;
    
  "selective")
    echo "🎯 ROLLBACK SELETIVO..."
    echo "Opções disponíveis:"
    echo "1. Remover apenas services/"
    echo "2. Voltar bridge para 'new'"
    echo "3. Voltar bridge para 'old'"
    echo "4. Cancelar"
    
    read -p "Escolha (1-4): " -n 1 -r
    echo
    
    case $REPLY in
      1)
        if [ -d "./apps/store/src/lib/features/cart/services" ]; then
          mkdir -p "$BACKUP_DIR"
          cp -r "./apps/store/src/lib/features/cart/services" "$BACKUP_DIR/"
          rm -rf "./apps/store/src/lib/features/cart/services"
          echo "✅ Services removidos (backup em $BACKUP_DIR)"
        fi
        ;;
      2)
        sed -i.bak "s/const STORE_VERSION: StoreVersion = 'refactored'/const STORE_VERSION: StoreVersion = 'new'/" "$BRIDGE_FILE"
        echo "✅ Bridge alterado para 'new'"
        ;;
      3)
        sed -i.bak "s/const STORE_VERSION: StoreVersion = 'refactored'/const STORE_VERSION: StoreVersion = 'old'/" "$BRIDGE_FILE"
        sed -i.bak "s/const STORE_VERSION: StoreVersion = 'new'/const STORE_VERSION: StoreVersion = 'old'/" "$BRIDGE_FILE"
        echo "✅ Bridge alterado para 'old'"
        ;;
      4)
        echo "❌ Operação cancelada"
        exit 0
        ;;
      *)
        echo "❌ Opção inválida"
        exit 1
        ;;
    esac
    ;;
    
  *)
    echo "❌ Tipo de rollback inválido: $ROLLBACK_TYPE"
    echo "Tipos disponíveis:"
    echo "  - immediate: Alterar bridge para 'new' (30s)"
    echo "  - old: Alterar bridge para 'old' (30s)"
    echo "  - full: Reset git completo (2min)"
    echo "  - selective: Escolhas específicas"
    exit 1
    ;;
esac

echo ""
echo "🎉 ROLLBACK CONCLUÍDO!"
echo "⏰ Duração: ~30 segundos"
echo ""
echo "🔄 Próximos passos:"
echo "1. Execute: npm run build"
echo "2. Verifique o console do browser"
echo "3. Teste funcionamento básico"
echo ""
echo "📞 Em caso de problemas:"
echo "   - Restore backup: $BACKUP_DIR"
echo "   - Ou execute: ./rollback.sh full" 