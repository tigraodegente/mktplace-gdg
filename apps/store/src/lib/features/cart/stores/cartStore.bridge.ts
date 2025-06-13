/**
 * Cart Store Bridge - Teste A/B Seguro
 * 
 * Permite alternar entre implementação antiga e nova
 * sem quebrar funcionalidades existentes
 */

import { cartStore as oldCartStore } from '../../../stores/cartStore';
import { newCartStore } from './cartStore.new';

// Configuração de teste
const USE_NEW_STORE = false; // Alternar para true quando quiser testar

// Bridge simples - usando implementação escolhida
export const cartStoreBridge = USE_NEW_STORE ? newCartStore : oldCartStore;
export const advancedCartStoreBridge = cartStoreBridge;

// Utilitários para teste
if (typeof window !== 'undefined') {
  (window as any).__cartStoreVersion = USE_NEW_STORE ? 'new' : 'old';
  (window as any).__enableNewCartStore = () => {
    console.log('🆕 Para ativar o novo store, altere USE_NEW_STORE = true e recompile');
  };
}

// Para facilitar debug
console.log(`🛒 Cart Store ativo: ${USE_NEW_STORE ? 'NOVO' : 'ANTIGO'}`); 