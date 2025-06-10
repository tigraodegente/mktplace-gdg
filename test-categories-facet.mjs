// Test script para debugar categorias nos facets
// Execute: cd apps/store && npm run dev
// Depois acesse: http://localhost:5173/test-categories-facet

import { readFileSync } from 'fs';

// Simular request para endpoint local
async function testCategoriesFacet() {
  try {
    console.log('🧪 Testando getCategoriesFacet via API...');
    
    // Fazer request para a API local
    const response = await fetch('http://localhost:5173/api/products?q=&debug_categories=true');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 Response received:');
    console.log('Categories facet:', data.data?.facets?.categories || []);
    
    if (data.data?.facets?.categories?.length > 0) {
      console.log('\n✅ Categorias encontradas:');
      data.data.facets.categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (${cat.slug}) - ${cat.count} produtos`);
      });
    } else {
      console.log('\n❌ Nenhuma categoria encontrada nos facets!');
      console.log('Verificando outros facets...');
      console.log('Brands:', data.data?.facets?.brands?.length || 0);
      console.log('Price ranges:', data.data?.facets?.priceRanges?.length || 0);
      console.log('Dynamic options:', data.data?.facets?.dynamicOptions?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    // Fallback: verificar se o server está rodando
    console.log('\n🔍 Verificando se o servidor está rodando...');
    try {
      const pingResponse = await fetch('http://localhost:5173/');
      console.log('✅ Servidor está respondendo:', pingResponse.status);
    } catch (pingError) {
      console.log('❌ Servidor não está rodando. Execute: cd apps/store && npm run dev');
    }
  }
}

testCategoriesFacet(); 