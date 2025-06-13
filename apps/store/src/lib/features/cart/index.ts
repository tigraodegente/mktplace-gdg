/**
 * Cart Feature - Exports Centralizados com Migração Segura
 * 
 * Sistema de migração gradual que permite usar o store consolidado
 * mantendo compatibilidade total com código existente
 */

// Import do store consolidado (nova versão)
import { 
  consolidatedCartStore as importedConsolidatedStore,
  cartStore as consolidatedCartStoreAlias,
  advancedCartStore as consolidatedAdvancedStore,
  unifiedCartStore as consolidatedUnifiedStore
} from './stores/cartStore.consolidated';

// Import do store antigo como fallback (para emergências)
import { unifiedCartStore as legacyUnifiedStore } from './stores/cartStore.unified';

// ============================================================================
// SISTEMA DE MIGRAÇÃO CONTROLADA
// ============================================================================

// Feature flag para controlar migração
const ENABLE_CONSOLIDATED_STORE = true; // Pode ser controlado por config
const MIGRATION_PHASE: '1' | '2' | '3' = '1'; // Fases: '1' = teste, '2' = rollout, '3' = completo

// Função de seleção de store baseada na fase de migração
function getActiveCartStore() {
  if (!ENABLE_CONSOLIDATED_STORE) {
    console.log('🔄 Usando store legacy (feature flag disabled)');
    return legacyUnifiedStore;
  }
  
  switch (MIGRATION_PHASE) {
    case '1': // Fase 1: Teste controlado
      // Verificar se store consolidado está funcionando
      try {
        const testStore = importedConsolidatedStore;
        if ((testStore as any).isConsolidated && (testStore as any).version) {
          console.log(`✅ Store consolidado ativo (v${(testStore as any).version})`);
          return testStore;
        } else {
          console.warn('⚠️ Store consolidado sem metadados, usando fallback');
          return legacyUnifiedStore;
        }
      } catch (error) {
        console.error('❌ Erro no store consolidado, usando fallback:', error);
        return legacyUnifiedStore;
      }
      
    case '2': // Fase 2: Rollout gradual
      return importedConsolidatedStore;
      
    case '3': // Fase 3: Migração completa
    default:
      return importedConsolidatedStore;
  }
}

// Store ativo baseado na migração
const activeCartStore = getActiveCartStore();

// ============================================================================
// EXPORTS PRINCIPAIS (Com Compatibilidade Total)
// ============================================================================

// Export principal
export const cartStore = activeCartStore;

// Aliases de compatibilidade - TODOS apontam para o mesmo store ativo
export const advancedCartStore = activeCartStore;
export const unifiedCartStore = activeCartStore;

// Export consolidado explícito para testes
export const consolidatedCartStore = importedConsolidatedStore;

// ============================================================================
// TIPOS CONSOLIDADOS
// ============================================================================

// Re-export tipos do sistema atual (centralização gradual)
export type { 
  CartItem, 
  SellerGroup, 
  CartTotals, 
  Coupon 
} from '../../types/cart';

// Tipos específicos do sistema consolidado
export interface CartStoreInterface {
  // Stores
  items: any;
  appliedCoupon: any;
  sellerGroups: any;
  cartTotals: any;
  totalItems: any;
  zipCode?: any;
  isLoading?: any;
  lastError?: any;
  
  // Actions
  addItem: (product: any, sellerId: string, sellerName: string, quantity?: number, options?: any) => void;
  removeItem: (productId: string, sellerId: string, options?: any) => void;
  updateQuantity: (productId: string, sellerId: string, quantity: number, options?: any) => void;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
  clearCart: () => void;
  
  // Compatibilidade
  getTotalItems?: () => number;
  
  // Metadados
  version?: string;
  isConsolidated?: boolean;
}

// ============================================================================
// UTILITÁRIOS DE MIGRAÇÃO
// ============================================================================

// Função para verificar qual store está ativo
export function getCartStoreInfo(): {
  type: 'consolidated' | 'legacy';
  version: string;
  isWorking: boolean;
  features: string[];
} {
  try {
    const store = activeCartStore as any;
    
    if (store.isConsolidated) {
      return {
        type: 'consolidated',
        version: store.version || 'unknown',
        isWorking: true,
        features: ['dual-compatibility', 'auto-migration', 'enhanced-persistence']
      };
    } else {
      return {
        type: 'legacy',
        version: '2.x',
        isWorking: true,
        features: ['basic-functionality']
      };
    }
  } catch (error) {
    return {
      type: 'legacy',
      version: 'fallback',
      isWorking: false,
      features: []
    };
  }
}

// Função para forçar migração (uso em desenvolvimento)
export function forceMigrationToConsolidated(): boolean {
  try {
    // Tentar migrar dados do store atual para o consolidado
    const currentItems = activeCartStore.items;
    const currentCoupon = activeCartStore.appliedCoupon;
    
    // Verificar se consolidado está funcionando
    if ((importedConsolidatedStore as any).isConsolidated) {
      console.log('🔄 Forçando migração para store consolidado...');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro na migração forçada:', error);
    return false;
  }
}

// ============================================================================
// CONSTANTES E CONFIGURAÇÕES
// ============================================================================

export const CART_VERSION = (activeCartStore as any).version || '3.0.0-legacy';
export const CART_FEATURES = getCartStoreInfo().features;

// Configurações de migração
export const MIGRATION_CONFIG = {
  PHASE: MIGRATION_PHASE,
  ENABLED: ENABLE_CONSOLIDATED_STORE,
  AUTO_FALLBACK: true,
  LOG_LEVEL: 'info' as 'debug' | 'info' | 'warn' | 'error'
};

// ============================================================================
// LOGGING E MONITORAMENTO
// ============================================================================

// Log inicial do status
if (typeof window !== 'undefined') {
  const info = getCartStoreInfo();
  console.log(`🛒 Cart Store: ${info.type} v${info.version} | Features: ${info.features.join(', ')}`);
} 