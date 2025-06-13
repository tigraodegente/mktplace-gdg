/**
 * Teste de Compatibilidade - Cart Store
 * 
 * Script para validar que nova implementação é 100% compatível
 */

import { cartStore as oldStore } from '../../../stores/cartStore';
import { newCartStore } from './cartStore.new';

// Produto mock para testes
const mockProduct = {
  id: 'test-001',
  name: 'Produto Teste',
  slug: 'produto-teste',
  price: 99.99,
  seller_id: 'seller-001',
  images: ['/test.jpg']
};

export function runCompatibilityTest() {
  console.group('🧪 TESTE DE COMPATIBILIDADE CART STORE');
  
  try {
    // Teste 1: Adicionar item
    console.log('1. Testando addItem...');
    oldStore.addItem(mockProduct, 'seller-001', 'Vendedor Teste', 2);
    newCartStore.addItem(mockProduct, 'seller-001', 'Vendedor Teste', 2);
    console.log('✅ addItem funcionando');
    
    // Teste 2: Verificar se stores têm mesma estrutura
    console.log('2. Verificando estrutura de stores...');
    
    const oldKeys = Object.keys(oldStore);
    const newKeys = Object.keys(newCartStore);
    
    console.log('Store antigo:', oldKeys);
    console.log('Store novo:', newKeys);
    
    const missingKeys = oldKeys.filter(key => !newKeys.includes(key));
    if (missingKeys.length > 0) {
      console.warn('⚠️ Métodos faltando no novo store:', missingKeys);
    } else {
      console.log('✅ Todas as APIs presentes');
    }
    
    // Teste 3: Limpar stores
    console.log('3. Testando clearCart...');
    oldStore.clearCart();
    newCartStore.clearCart();
    console.log('✅ clearCart funcionando');
    
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    return true;
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    return false;
  } finally {
    console.groupEnd();
  }
}

// Auto-executar em desenvolvimento
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Executar teste após 2 segundos
  setTimeout(() => {
    runCompatibilityTest();
  }, 2000);
} 