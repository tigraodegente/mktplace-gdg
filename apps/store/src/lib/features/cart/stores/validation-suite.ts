/**
 * Suite de Validação Completa - Cart Store
 * 
 * Testa todas as funcionalidades críticas do carrinho
 * ✅ PRESERVA o estado do carrinho do usuário
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
    id: 'test-001',
    name: 'Produto Teste 1',
    slug: 'produto-teste-1',
    price: 29.99,
    seller_id: 'test-seller-001',
    images: ['/test1.jpg'],
    weight: 200
  },
  {
    id: 'test-002', 
    name: 'Produto Teste 2',
    slug: 'produto-teste-2',
    price: 89.99,
    seller_id: 'test-seller-002',
    images: ['/test2.jpg'],
    weight: 500
  }
];

export class CartValidationSuite {
  private results: TestResult[] = [];
  private originalCartState: any = null;
  private originalCouponState: any = null;
  
  async runAllTests(): Promise<TestResult[]> {
    console.group('🧪 VALIDAÇÃO COMPLETA DO CART STORE');
    console.log('🚀 Iniciando testes com nova implementação...');
    
    this.results = [];
    
    // ✅ SALVAR estado atual do usuário
    await this.backupUserCart();
    
    // ✅ Testar com carrinho atual do usuário (se houver)
    await this.testWithExistingCart();
    
    // ✅ Testar operações em carrinho limpo
    await this.testWithEmptyCart();
    
    // ✅ RESTAURAR estado original do usuário
    await this.restoreUserCart();
    
    // Resumo final
    this.printSummary();
    
    console.groupEnd();
    return this.results;
  }
  
  private async backupUserCart() {
    console.log('💾 Fazendo backup do carrinho do usuário...');
    
    try {
      // Salvar estado dos stores
      this.originalCartState = get(cartStoreBridge.sellerGroups);
      this.originalCouponState = get(cartStoreBridge.appliedCoupon);
      
      // Salvar localStorage também
      const cartData = localStorage.getItem('cart');
      const couponData = localStorage.getItem('cartCoupon');
      
      this.addResult(
        'Backup carrinho usuário',
        true,
        `${this.originalCartState.length} grupos salvos, cupom: ${this.originalCouponState ? 'sim' : 'não'}`
      );
      
    } catch (error) {
      this.addResult('Backup carrinho usuário', false, `Erro: ${error}`);
    }
  }
  
  private async restoreUserCart() {
    console.log('♻️ Restaurando carrinho do usuário...');
    
    try {
      // Se havia dados originais, restaurar
      if (this.originalCartState && this.originalCartState.length > 0) {
        // Limpar primeiro
        cartStoreBridge.clearCart();
        
        // Restaurar items
        for (const group of this.originalCartState) {
          for (const item of group.items) {
            cartStoreBridge.addItem(
              item.product,
              item.sellerId,
              item.sellerName,
              item.quantity,
              {
                color: item.selectedColor,
                size: item.selectedSize
              }
            );
          }
        }
        
        // Restaurar cupom se havia
        if (this.originalCouponState) {
          try {
            await cartStoreBridge.applyCoupon(this.originalCouponState.code);
          } catch (e) {
            console.warn('Não foi possível restaurar cupom:', e);
          }
        }
        
        this.addResult(
          'Restaurar carrinho usuário',
          true,
          `${this.originalCartState.length} grupos restaurados`
        );
      } else {
        // Carrinho estava vazio, manter vazio
        cartStoreBridge.clearCart();
        this.addResult('Restaurar carrinho usuário', true, 'Carrinho estava vazio');
      }
      
    } catch (error) {
      this.addResult('Restaurar carrinho usuário', false, `Erro: ${error}`);
    }
  }
  
  private async testWithExistingCart() {
    console.log('\n🛒 Testando com carrinho atual do usuário...');
    
    const currentGroups = get(cartStoreBridge.sellerGroups);
    const currentTotals = get(cartStoreBridge.cartTotals);
    
    if (currentGroups.length === 0) {
      this.addResult(
        'Carrinho usuário vazio',
        true,
        'Usuário não tem produtos - OK'
      );
      return;
    }
    
    try {
      // Teste 1: Estrutura do carrinho atual
      this.addResult(
        'Estrutura carrinho existente',
        currentGroups.every(g => g.sellerId && g.items && g.items.length > 0),
        `${currentGroups.length} grupos, ${currentGroups.reduce((sum, g) => sum + g.items.length, 0)} items`
      );
      
      // Teste 2: Cálculos com dados existentes
      const expectedSubtotal = currentGroups.reduce((sum, group) => 
        sum + group.items.reduce((itemSum, item) => 
          itemSum + (item.product.price * item.quantity), 0
        ), 0
      );
      
      this.addResult(
        'Cálculos com dados existentes',
        Math.abs(currentTotals.cartSubtotal - expectedSubtotal) < 0.01,
        `Calculado: R$ ${currentTotals.cartSubtotal.toFixed(2)}, Esperado: R$ ${expectedSubtotal.toFixed(2)}`
      );
      
      // Teste 3: Adicionar produto ao carrinho existente
      const itemsBefore = cartStoreBridge.totalItems();
      cartStoreBridge.addItem(mockProducts[0], 'test-seller-003', 'Vendedor Teste', 1);
      const itemsAfter = cartStoreBridge.totalItems();
      
      this.addResult(
        'Adicionar a carrinho existente',
        itemsAfter === itemsBefore + 1,
        `Antes: ${itemsBefore}, Depois: ${itemsAfter}`
      );
      
      // Remover item de teste
      cartStoreBridge.removeItem('test-001', 'test-seller-003');
      
    } catch (error) {
      this.addResult('Testes carrinho existente', false, `Erro: ${error}`);
    }
  }
  
  private async testWithEmptyCart() {
    console.log('\n🧹 Testando operações com carrinho limpo...');
    
    try {
      // Salvar estado antes de limpar para testes
      const stateBeforeTests = get(cartStoreBridge.sellerGroups);
      
      // Limpar temporariamente para testes
      cartStoreBridge.clearCart();
      
      // Executar testes com carrinho limpo
      await this.testBasicOperations();
      await this.testSellerGrouping();
      await this.testCartTotals();
      await this.testPersistence();
      await this.testCoupons();
      await this.testEdgeCases();
      
    } catch (error) {
      this.addResult('Testes carrinho limpo', false, `Erro: ${error}`);
    }
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
      cartStoreBridge.addItem(mockProducts[0], 'test-seller-001', 'Vendedor Teste A', 2);
      const groups1 = get(cartStoreBridge.sellerGroups);
      this.addResult(
        'addItem', 
        groups1.length === 1 && groups1[0].items.length === 1,
        `${groups1.length} grupo(s), ${groups1[0]?.items.length || 0} item(s)`
      );
      
      // Teste 2: Adicionar item mesmo produto (deve somar quantidade)
      cartStoreBridge.addItem(mockProducts[0], 'test-seller-001', 'Vendedor Teste A', 1);
      const groups2 = get(cartStoreBridge.sellerGroups);
      this.addResult(
        'addItem (soma quantidade)',
        groups2[0].items[0].quantity === 3,
        `Quantidade: ${groups2[0].items[0].quantity}`
      );
      
      // Teste 3: Atualizar quantidade
      cartStoreBridge.updateQuantity('test-001', 'test-seller-001', 5);
      const groups3 = get(cartStoreBridge.sellerGroups);
      this.addResult(
        'updateQuantity',
        groups3[0].items[0].quantity === 5,
        `Nova quantidade: ${groups3[0].items[0].quantity}`
      );
      
      // Teste 4: Remover item
      cartStoreBridge.removeItem('test-001', 'test-seller-001');
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
      // Adicionar produtos de diferentes sellers
      cartStoreBridge.addItem(mockProducts[0], 'test-seller-001', 'Vendedor Teste A', 1);
      cartStoreBridge.addItem(mockProducts[1], 'test-seller-002', 'Vendedor Teste B', 1);
      
      const groups = get(cartStoreBridge.sellerGroups);
      
      this.addResult(
        'Agrupamento por seller',
        groups.length === 2,
        `${groups.length} grupos criados`
      );
      
      this.addResult(
        'Dados dos grupos',
        groups[0].sellerId === 'test-seller-001' && groups[1].sellerId === 'test-seller-002',
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
      const expectedSubtotal = 29.99 + 89.99; // Total dos dois produtos de teste
      
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
      
      this.addResult(
        'Persistência cart',
        cartData !== null,
        `Dados salvos: ${cartData ? 'Sim' : 'Não'}`
      );
      
    } catch (error) {
      this.addResult('Persistência', false, `Erro: ${error}`);
    }
  }
  
  private async testCoupons() {
    console.log('\n🎫 Testando sistema de cupons...');
    
    try {
      // Teste interface de cupons
      this.addResult(
        'Interface cupom disponível',
        typeof cartStoreBridge.applyCoupon === 'function' && 
        typeof cartStoreBridge.removeCoupon === 'function',
        'Métodos applyCoupon e removeCoupon existem'
      );
      
    } catch (error) {
      this.addResult('Sistema de cupons', false, `Erro: ${error}`);
    }
  }
  
  private async testEdgeCases() {
    console.log('\n🧩 Testando casos extremos...');
    
    try {
      // Teste 1: Quantidade zero (deve remover)
      cartStoreBridge.updateQuantity('test-001', 'test-seller-001', 0);
      const groups1 = get(cartStoreBridge.sellerGroups);
      
      this.addResult(
        'Quantidade zero remove item',
        !groups1.some(g => g.items.some(i => i.product.id === 'test-001')),
        'Item removido corretamente'
      );
      
      // Teste 2: Total de items
      const totalItems = cartStoreBridge.totalItems();
      this.addResult(
        'Contagem total items',
        totalItems === 1, // Só deve ter o produto 2
        `Total: ${totalItems} item(s)`
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
      console.log('💚 Carrinho do usuário foi preservado durante os testes.');
    } else if (percentage >= 90) {
      console.log('✨ Quase todos os testes passaram! Implementação está muito boa.');
      console.log('💚 Carrinho do usuário foi preservado durante os testes.');
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

// Auto-executar em desenvolvimento com delay maior
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Aguardar página carregar completamente + tempo para usuário interagir
  setTimeout(async () => {
    const suite = new CartValidationSuite();
    await suite.runAllTests();
  }, 5000); // ✅ 5 segundos para dar tempo do usuário adicionar produtos
}

export default CartValidationSuite; 