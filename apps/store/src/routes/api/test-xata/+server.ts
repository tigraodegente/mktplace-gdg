import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

export const GET: RequestHandler = async () => {
  try {
    const xata = getXataClient();
    
    // Testar se conseguimos acessar as tabelas
    const testResults = {
      products: false,
      categories: false,
      brands: false,
      users: false
    };
    
    try {
      // Testar tabela products
      const products = await xata.db.products
        .select(['id', 'name'])
        .getFirst();
      testResults.products = true;
    } catch (e) {
      console.error('Erro em products:', e);
    }
    
    try {
      // Testar tabela categories
      const categories = await xata.db.categories
        .select(['id', 'name'])
        .getFirst();
      testResults.categories = true;
    } catch (e) {
      console.error('Erro em categories:', e);
    }
    
    try {
      // Testar tabela brands
      const brands = await xata.db.brands
        .select(['id', 'name'])
        .getFirst();
      testResults.brands = true;
    } catch (e) {
      console.error('Erro em brands:', e);
    }
    
    try {
      // Testar tabela users
      const users = await xata.db.users
        .select(['id', 'email'])
        .getFirst();
      testResults.users = true;
    } catch (e) {
      console.error('Erro em users:', e);
    }
    
    return json({
      success: true,
      message: 'Teste do Xata ORM',
      results: testResults,
      xataConfigured: !!xata
    });
    
  } catch (error) {
    console.error('Erro no teste:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 