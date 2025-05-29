#!/usr/bin/env node

import 'dotenv/config';
import { getXataClient } from '../packages/xata-client/dist/xata.js';

const xata = getXataClient();

async function test() {
  try {
    console.log('Testando inserção simples no Xata...\n');
    
    // Testar com brands usando createOrUpdate
    console.log('1. Testando brands com createOrUpdate:');
    try {
      const brand = await xata.db.brands.createOrUpdate('brand_nike_test', {
        name: 'Nike Test',
        slug: 'nike-test',
        description: 'Just Do It',
        is_active: true
      });
      console.log('✅ Marca criada:', brand.id);
    } catch (error) {
      console.log('❌ Erro em brands:', error.message);
    }
    
    // Testar com categories
    console.log('\n2. Testando categories com createOrUpdate:');
    try {
      const category = await xata.db.categories.createOrUpdate('cat_roupas_test', {
        name: 'Roupas Test',
        slug: 'roupas-test',
        description: 'Vestuário em geral',
        is_active: true,
        position: 1
      });
      console.log('✅ Categoria criada:', category.id);
    } catch (error) {
      console.log('❌ Erro em categories:', error.message);
    }
    
    // Testar com users (sem ID customizado)
    console.log('\n3. Testando users com create (sem ID):');
    try {
      const user = await xata.db.users.create({
        email: `test${Date.now()}@example.com`,
        name: 'Test User',
        password_hash: 'hash123',
        role: 'customer',
        is_active: true
      });
      console.log('✅ Usuário criado:', user.id);
    } catch (error) {
      console.log('❌ Erro em users:', error.message);
    }
    
    // Listar alguns registros
    console.log('\n4. Listando registros existentes:');
    
    const brands = await xata.db.brands.getMany({ pagination: { size: 3 } });
    console.log(`\nMarcas (${brands.length}):`, brands.map(b => b.name).join(', '));
    
    const categories = await xata.db.categories.getMany({ pagination: { size: 3 } });
    console.log(`Categorias (${categories.length}):`, categories.map(c => c.name).join(', '));
    
    const users = await xata.db.users.getMany({ pagination: { size: 3 } });
    console.log(`Usuários (${users.length}):`, users.map(u => u.email).join(', '));
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

test(); 