/**
 * Suite de Validação Completa - Cart Store
 * 
 * Testa todas as funcionalidades críticas do carrinho
 */

import { cartStoreBridge } from './cartStore.bridge';
import { get } from 'svelte/store';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  data?: any;
}

// Produtos mock para testes
const mockProducts = [
  {
    id: 'prod-001',
    name: 'Camiseta Básica',
    slug: 'camiseta-basica',
    price: 29.99,
    seller_id: 'seller-001',
    images: ['/test1.jpg'],
    weight: 200
  },
  {
    id: 'prod-002', 
    name: 'Calça Jeans',
    slug: 'calca-jeans',
    price: 89.99,
    seller_id: 'seller-002',
    images: ['/test2.jpg'],
    weight: 500
  }
];

export class CartValidationSuite {
  private results: TestResult[] = [];
  
  async runAllTests(): Promise<TestResult[]> {
    console.group('🧪 VALIDAÇÃO COMPLETA DO CART STORE');
    console.log('🚀 Iniciando testes com nova implementação...');
    
    this.results = [];
    
    // Limpar carrinho antes dos testes
    cartStoreBridge.clearCart();
    
    // Executar todos os testes
    await this.testBasicOperations();
    await this.testSellerGrouping();
    await this.testCartTotals();
    await this.testPersistence();
    await this.testCoupons();
    await this.testEdgeCases();
    
    // Resumo final
    this.printSummary();
    
    console.groupEnd();
    return this.results;
  }
  
  private addResult(name: string, passed: boolean, message?: string, data?: any) {
    this.results.push({ name, passed, message, data });
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} ${name}${message ? ': ' + message : ''}`);
    if (data) console.log('   Data:', data);
  }
  
  private async testBasicOperations() {
    console.log('\n📝 Testando operações básicas...');
    
    try {
      // Teste 1: Adicionar item
      cartStoreBridge.addItem(mockProducts[0], 'seller-001', 'Vendedor A', 2);
      const groups1 = get(cartStoreBridge.sellerGroups);
      this.addResult(
        'addItem', 
        groups1.length === 1 && groups1[0].items.length === 1,
        `${groups1.length} grupo(s), ${groups1[0]?.items.length || 0} item(s)`
      );
      
      // Teste 2: Adicionar item mesmo produto (deve somar quantidade)
      cartStoreBridge.addItem(mockProducts[0], 'seller-001', 'Vendedor A', 1);
      const groups2 = get(cartStoreBridge.sellerGroups);
      this.addResult(
        'addItem (soma quantidade)',
        groups2[0].items[0].quantity === 3,
        `Quantidade: ${groups2[0].items[0].quantity}`
      );
      
      // Teste 3: Atualizar quantidade
      cartStoreBridge.updateQuantity('prod-001', 'seller-001', 5);
      const groups3 = get(cartStoreBridge.sellerGroups);
      this.addResult(
        'updateQuantity',
        groups3[0].items[0].quantity === 5,
        `Nova quantidade: ${groups3[0].items[0].quantity}`
      );
      
      // Teste 4: Remover item
      cartStoreBridge.removeItem('prod-001', 'seller-001');
      const groups4 = get(cartStoreBridge.sellerGroups);
      this.addResult(
        'removeItem',
        groups4.length === 0,
        `Grupos restantes: ${groups4.length}`
      );
      
    } catch (error) {
      this.addResult('Operações básicas', false, `Erro: ${error}`);
    }
  }
  
  private async testSellerGrouping() {
    console.log('\n👥 Testando agrupamento por seller...');
    
    try {
      // Limpar e adicionar produtos de diferentes sellers
      cartStoreBridge.clearCart();
      cartStoreBridge.addItem(mockProducts[0], 'seller-001', 'Vendedor A', 1);
      cartStoreBridge.addItem(mockProducts[1], 'seller-002', 'Vendedor B', 1);
      
      const groups = get(cartStoreBridge.sellerGroups);
      
      this.addResult(
        'Agrupamento por seller',
        groups.length === 2,
        `${groups.length} grupos criados`
      );
      
      this.addResult(
        'Dados dos grupos',
        groups[0].sellerId === 'seller-001' && groups[1].sellerId === 'seller-002',
        'IDs corretos dos sellers'
      );
      
    } catch (error) {
      this.addResult('Agrupamento por seller', false, `Erro: ${error}`);
    }
  }
  
  private async testCartTotals() {
    console.log('\n💰 Testando cálculos de totais...');
    
    try {
      const totals = get(cartStoreBridge.cartTotals);
      const expectedSubtotal = 29.99 + 89.99; // Total dos dois produtos
      
      this.addResult(
        'Cálculo subtotal',
        Math.abs(totals.cartSubtotal - expectedSubtotal) < 0.01,
        `Calculado: R$ ${totals.cartSubtotal.toFixed(2)}, Esperado: R$ ${expectedSubtotal.toFixed(2)}`
      );
      
      this.addResult(
        'Total sem frete',
        totals.totalShipping === 0,
        `Frete: R$ ${totals.totalShipping.toFixed(2)}`
      );
      
      this.addResult(
        'Valor da parcela',
        totals.installmentValue > 0,
        `R$ ${totals.installmentValue.toFixed(2)}`
      );
      
    } catch (error) {
      this.addResult('Cálculos de totais', false, `Erro: ${error}`);
    }
  }
  
  private async testPersistence() {
    console.log('\n💾 Testando persistência...');
    
    try {
      // Verificar se dados são salvos no localStorage
      const cartData = localStorage.getItem('cart');
      const couponData = localStorage.getItem('cartCoupon');
      
      this.addResult(
        'Persistência cart',
        cartData !== null,
        `Dados salvos: ${cartData ? 'Sim' : 'Não'}`
      );
      
      this.addResult(
        'Persistência cupom',
        couponData === null, // Deve ser null inicialmente
        `Cupom salvo: ${couponData ? 'Sim' : 'Não'}`
      );
      
    } catch (error) {
      this.addResult('Persistência', false, `Erro: ${error}`);
    }
  }
  
  private async testCoupons() {
    console.log('\n🎫 Testando sistema de cupons...');
    
    try {
      // Teste com cupom mock
      const appliedCoupon = get(cartStoreBridge.appliedCoupon);
      
      this.addResult(
        'Estado inicial cupom',
        appliedCoupon === null,
        'Nenhum cupom aplicado inicialmente'
      );
      
      // Testar aplicação de cupom (simulação)
      this.addResult(
        'Interface cupom disponível',
        typeof cartStoreBridge.applyCoupon === 'function',
        'Método applyCoupon existe'
      );
      
    } catch (error) {
      this.addResult('Sistema de cupons', false, `Erro: ${error}`);
    }
  }
  
  private async testEdgeCases() {
    console.log('\n🧩 Testando casos extremos...');
    
    try {
      // Teste 1: Quantidade zero (deve remover)
      cartStoreBridge.updateQuantity('prod-001', 'seller-001', 0);
      const groups1 = get(cartStoreBridge.sellerGroups);
      
      this.addResult(
        'Quantidade zero remove item',
        !groups1.some(g => g.items.some(i => i.product.id === 'prod-001')),
        'Item removido corretamente'
      );
      
      // Teste 2: Total de items
      const totalItems = cartStoreBridge.totalItems();
      this.addResult(
        'Contagem total items',
        totalItems === 1, // Só deve ter o produto 2
        `Total: ${totalItems} item(s)`
      );
      
      // Teste 3: Limpar carrinho
      cartStoreBridge.clearCart();
      const groups2 = get(cartStoreBridge.sellerGroups);
      const totals2 = get(cartStoreBridge.cartTotals);
      
      this.addResult(
        'clearCart',
        groups2.length === 0 && totals2.cartSubtotal === 0,
        'Carrinho completamente limpo'
      );
      
    } catch (error) {
      this.addResult('Casos extremos', false, `Erro: ${error}`);
    }
  }
  
  private printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log('\n📊 RESUMO DOS TESTES:');
    console.log(`✅ Aprovados: ${passed}/${total} (${percentage}%)`);
    console.log(`❌ Falharam: ${total - passed}`);
    
    if (percentage === 100) {
      console.log('🎉 TODOS OS TESTES PASSARAM! Nova implementação está funcionando perfeitamente.');
    } else {
      console.log('⚠️ Alguns testes falharam. Revisar implementação necessária.');
      
      // Mostrar testes que falharam
      const failed = this.results.filter(r => !r.passed);
      console.log('\n❌ Testes que falharam:');
      failed.forEach(test => {
        console.log(`   - ${test.name}: ${test.message || 'Erro desconhecido'}`);
      });
    }
  }
}

// Auto-executar em desenvolvimento
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Aguardar página carregar completamente
  setTimeout(async () => {
    const suite = new CartValidationSuite();
    await suite.runAllTests();
  }, 3000);
}

export default CartValidationSuite; 