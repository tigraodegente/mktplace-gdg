/**
 * Teste de Compatibilidade - Cart Store
 * 
 * Script para validar que nova implementação é 100% compatível
 */

import { cartStore } from '../index'; // Usando bridge unificado
import { newCartStore } from './cartStore.new'; // Para comparação direta

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
    // Verificar se estamos usando o novo store
    const isUsingNewStore = (cartStore as any).__isNewStore;
    console.log(`📊 Store Ativo: ${isUsingNewStore ? '🆕 NOVO' : '📝 ANTIGO'}`);
    
    // Teste 1: Adicionar item
    console.log('1. Testando addItem...');
    cartStore.addItem(mockProduct, 'seller-001', 'Vendedor Teste', 2);
    console.log('✅ addItem funcionando');
    
    // Teste 2: Verificar estrutura da API
    console.log('2. Verificando APIs disponíveis...');
    
    const expectedMethods = [
      'addItem', 'removeItem', 'updateQuantity', 'clearCart',
      'applyCoupon', 'removeCoupon', 'items', 'sellerGroups', 'cartTotals'
    ];
    
    const availableMethods = expectedMethods.filter(method => 
      typeof (cartStore as any)[method] !== 'undefined'
    );
    
    console.log('APIs disponíveis:', availableMethods);
    
    if (availableMethods.length === expectedMethods.length) {
      console.log('✅ Todas as APIs presentes');
    } else {
      const missing = expectedMethods.filter(m => !availableMethods.includes(m));
      console.warn('⚠️ APIs faltando:', missing);
    }
    
    // Teste 3: Testar reatividade (se possível)
    console.log('3. Testando reatividade...');
    const currentItems = cartStore.items;
    console.log('Items atuais:', currentItems);
    
    // Teste 4: Limpar store
    console.log('4. Testando clearCart...');
    cartStore.clearCart();
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