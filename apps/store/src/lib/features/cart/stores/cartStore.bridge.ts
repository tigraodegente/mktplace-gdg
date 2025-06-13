/**
 * Cart Store Bridge - Teste A/B Seguro
 * 
 * Permite alternar entre implementação antiga e nova
 * sem quebrar funcionalidades existentes
 */

import { cartStore as oldCartStore } from '../../../stores/cartStore';
import { newCartStore } from './cartStore.new';
import { refactoredCartStore } from './cartStore.refactored';

// Configuração de teste com 3 opções
type StoreVersion = 'old' | 'new' | 'refactored';
const STORE_VERSION: StoreVersion = 'refactored'; // ✅ TESTANDO - Versão com services

// Bridge inteligente - suporta 3 implementações
function getActiveStore() {
  switch (STORE_VERSION) {
    case 'old':
      return oldCartStore;
    case 'new':
      return newCartStore;
    case 'refactored':
      return refactoredCartStore;
    default:
      return newCartStore; // fallback seguro
  }
}

export const cartStoreBridge = getActiveStore();
export const advancedCartStoreBridge = cartStoreBridge;

// Utilitários para teste
if (typeof window !== 'undefined') {
  (window as any).__cartStoreVersion = STORE_VERSION;
  (window as any).__availableStoreVersions = ['old', 'new', 'refactored'];
  (window as any).__switchCartStore = (version: StoreVersion) => {
    console.log(`🔄 Para alternar para versão '${version}', altere STORE_VERSION e recompile`);
  };
}

// Para facilitar debug
console.log(`🛒 Cart Store ativo: ${STORE_VERSION.toUpperCase()}`); 