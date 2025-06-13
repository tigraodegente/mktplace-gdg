/**
 * Services Validation Suite
 * 
 * Compara funcionamento das versões com e sem services
 * para garantir compatibilidade 100%
 */

import { get } from 'svelte/store';
import { newCartStore } from '../stores/cartStore.new';
import { refactoredCartStore } from '../stores/cartStore.refactored';

// =============================================================================
// TIPOS
// =============================================================================

interface ValidationResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
}

interface ComparisonResult {
  passed: number;
  failed: number;
  total: number;
  results: ValidationResult[];
  summary: string;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockProduct1 = {
  id: 'prod-001',
  name: 'Produto Teste 1',
  slug: 'produto-teste-1',
  price: 100.00,
  seller_id: 'seller-001',
  images: ['/test1.jpg']
};

const mockProduct2 = {
  id: 'prod-002',
  name: 'Produto Teste 2',
  slug: 'produto-teste-2',
  price: 50.00,
  seller_id: 'seller-002',
  images: ['/test2.jpg']
};

const mockCoupon = {
  code: 'TEST10',
  type: 'percentage' as const,
  value: 10,
  scope: 'cart' as const,
  description: 'Desconto de 10%',
  minValue: 80
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function compareStoreStates(store1: any, store2: any, testName: string): ValidationResult {
  try {
    const items1: any[] = get(store1.items);
    const items2: any[] = get(store2.items);
    
    const groups1: any[] = get(store1.sellerGroups);
    const groups2: any[] = get(store2.sellerGroups);
    
    const totals1: any = get(store1.cartTotals);
    const totals2: any = get(store2.cartTotals);
    
    // Comparar items
    if (items1.length !== items2.length) {
      throw new Error(`Items count differs: ${items1.length} vs ${items2.length}`);
    }
    
    // Comparar groups
    if (groups1.length !== groups2.length) {
      throw new Error(`Groups count differs: ${groups1.length} vs ${groups2.length}`);
    }
    
    // Comparar totais (com tolerância para arredondamento)
    const tolerance = 0.01;
    if (Math.abs(totals1.cartTotal - totals2.cartTotal) > tolerance) {
      throw new Error(`Cart total differs: ${totals1.cartTotal} vs ${totals2.cartTotal}`);
    }
    
    if (Math.abs(totals1.cartSubtotal - totals2.cartSubtotal) > tolerance) {
      throw new Error(`Subtotal differs: ${totals1.cartSubtotal} vs ${totals2.cartSubtotal}`);
    }
    
    return {
      testName,
      success: true,
      details: {
        items: items1.length,
        groups: groups1.length,
        cartTotal: totals1.cartTotal,
        subtotal: totals1.cartSubtotal
      }
    };
    
  } catch (error) {
    return {
      testName,
      success: false,
      error: (error as Error).message
    };
  }
}

function testAddItem(): ValidationResult {
  try {
    // Reset stores
    newCartStore.clearCart();
    refactoredCartStore.clearCart();
    
    // Add same item to both
    newCartStore.addItem(mockProduct1, 'seller-001', 'Loja Teste', 2);
    refactoredCartStore.addItem(mockProduct1, 'seller-001', 'Loja Teste', 2);
    
    return compareStoreStates(newCartStore, refactoredCartStore, 'Add Item');
    
  } catch (error) {
    return {
      testName: 'Add Item',
      success: false,
      error: (error as Error).message
    };
  }
}

function testMultipleItems(): ValidationResult {
  try {
    // Reset stores
    newCartStore.clearCart();
    refactoredCartStore.clearCart();
    
    // Add multiple items
    newCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1);
    newCartStore.addItem(mockProduct2, 'seller-002', 'Loja 2', 3);
    
    refactoredCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1);
    refactoredCartStore.addItem(mockProduct2, 'seller-002', 'Loja 2', 3);
    
    return compareStoreStates(newCartStore, refactoredCartStore, 'Multiple Items');
    
  } catch (error) {
    return {
      testName: 'Multiple Items',
      success: false,
      error: (error as Error).message
    };
  }
}

function testUpdateQuantity(): ValidationResult {
  try {
    // Reset stores
    newCartStore.clearCart();
    refactoredCartStore.clearCart();
    
    // Add item
    newCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1);
    refactoredCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1);
    
    // Update quantity
    newCartStore.updateQuantity('prod-001', 'seller-001', 5);
    refactoredCartStore.updateQuantity('prod-001', 'seller-001', 5);
    
    return compareStoreStates(newCartStore, refactoredCartStore, 'Update Quantity');
    
  } catch (error) {
    return {
      testName: 'Update Quantity',
      success: false,
      error: (error as Error).message
    };
  }
}

function testRemoveItem(): ValidationResult {
  try {
    // Reset stores
    newCartStore.clearCart();
    refactoredCartStore.clearCart();
    
    // Add items
    newCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1);
    newCartStore.addItem(mockProduct2, 'seller-002', 'Loja 2', 2);
    
    refactoredCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1);
    refactoredCartStore.addItem(mockProduct2, 'seller-002', 'Loja 2', 2);
    
    // Remove one item
    newCartStore.removeItem('prod-001', 'seller-001');
    refactoredCartStore.removeItem('prod-001', 'seller-001');
    
    return compareStoreStates(newCartStore, refactoredCartStore, 'Remove Item');
    
  } catch (error) {
    return {
      testName: 'Remove Item',
      success: false,
      error: (error as Error).message
    };
  }
}

function testItemVariations(): ValidationResult {
  try {
    // Reset stores
    newCartStore.clearCart();
    refactoredCartStore.clearCart();
    
    // Add same product with different variations
    newCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1, { color: 'Azul', size: 'M' });
    newCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 2, { color: 'Vermelho', size: 'G' });
    
    refactoredCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1, { color: 'Azul', size: 'M' });
    refactoredCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 2, { color: 'Vermelho', size: 'G' });
    
    return compareStoreStates(newCartStore, refactoredCartStore, 'Item Variations');
    
  } catch (error) {
    return {
      testName: 'Item Variations',
      success: false,
      error: (error as Error).message
    };
  }
}

function testClearCart(): ValidationResult {
  try {
    // Add items to both
    newCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1);
    refactoredCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 1);
    
    // Clear both
    newCartStore.clearCart();
    refactoredCartStore.clearCart();
    
    return compareStoreStates(newCartStore, refactoredCartStore, 'Clear Cart');
    
  } catch (error) {
    return {
      testName: 'Clear Cart',
      success: false,
      error: (error as Error).message
    };
  }
}

function testTotalItems(): ValidationResult {
  try {
    // Reset stores
    newCartStore.clearCart();
    refactoredCartStore.clearCart();
    
    // Add items
    newCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 3);
    newCartStore.addItem(mockProduct2, 'seller-002', 'Loja 2', 2);
    
    refactoredCartStore.addItem(mockProduct1, 'seller-001', 'Loja 1', 3);
    refactoredCartStore.addItem(mockProduct2, 'seller-002', 'Loja 2', 2);
    
    const total1 = newCartStore.totalItems();
    const total2 = refactoredCartStore.totalItems();
    
    if (total1 !== total2) {
      throw new Error(`Total items differs: ${total1} vs ${total2}`);
    }
    
    return {
      testName: 'Total Items',
      success: true,
      details: { totalItems: total1 }
    };
    
  } catch (error) {
    return {
      testName: 'Total Items',
      success: false,
      error: (error as Error).message
    };
  }
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

export async function validateServices(): Promise<ComparisonResult> {
  console.group('🔬 VALIDAÇÃO DE SERVICES - Cart Store');
  console.log('Comparando implementação com services vs sem services...');
  
  const tests = [
    testAddItem,
    testMultipleItems,
    testUpdateQuantity,
    testRemoveItem,
    testItemVariations,
    testClearCart,
    testTotalItems
  ];
  
  const results: ValidationResult[] = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = test();
      results.push(result);
      
      if (result.success) {
        passed++;
        console.log(`✅ ${result.testName}`);
      } else {
        failed++;
        console.error(`❌ ${result.testName}: ${result.error}`);
      }
      
    } catch (error) {
      failed++;
      results.push({
        testName: 'Unknown Test',
        success: false,
        error: (error as Error).message
      });
      console.error(`❌ Erro inesperado:`, error);
    }
  }
  
  const total = passed + failed;
  const summary = `${passed}/${total} testes passaram (${((passed/total)*100).toFixed(1)}%)`;
  
  console.log(`\n📊 RESULTADO FINAL: ${summary}`);
  
  if (failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Services estão funcionando corretamente.');
  } else {
    console.warn(`⚠️ ${failed} teste(s) falharam. Revisar implementação dos services.`);
  }
  
  console.groupEnd();
  
  return {
    passed,
    failed,
    total,
    results,
    summary
  };
}

// =============================================================================
// AUTO-EXECUTION
// =============================================================================

// Executar validação automaticamente em desenvolvimento
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  setTimeout(() => {
    validateServices().then(result => {
      // Disponibilizar resultado globalmente para debug
      (window as any).__servicesValidationResult = result;
    });
  }, 3000);
} 