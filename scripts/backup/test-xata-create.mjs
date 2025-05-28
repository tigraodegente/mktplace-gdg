#!/usr/bin/env node

import 'dotenv/config';
import { getXataClient } from '../packages/xata-client/dist/xata.js';

const xata = getXataClient();

async function test() {
  try {
    console.log('Testando criação de marca...');
    
    // Tentar criar sem ID
    console.log('\n1. Tentando criar sem ID:');
    try {
      const brand1 = await xata.db.brands.create({
        name: 'Test Brand 1',
        slug: 'test-brand-1',
        description: 'Test description',
        is_active: true
      });
      console.log('✅ Sucesso:', brand1);
    } catch (error) {
      console.log('❌ Erro:', error.message);
    }
    
    // Tentar criar com ID customizado
    console.log('\n2. Tentando criar com ID customizado:');
    try {
      const brand2 = await xata.db.brands.create({
        id: 'brand_test_123',
        name: 'Test Brand 2',
        slug: 'test-brand-2',
        description: 'Test description',
        is_active: true
      });
      console.log('✅ Sucesso:', brand2);
    } catch (error) {
      console.log('❌ Erro:', error.message);
    }
    
    // Tentar criar com ID vazio
    console.log('\n3. Tentando criar com ID vazio:');
    try {
      const brand3 = await xata.db.brands.create({
        id: '',
        name: 'Test Brand 3',
        slug: 'test-brand-3',
        description: 'Test description',
        is_active: true
      });
      console.log('✅ Sucesso:', brand3);
    } catch (error) {
      console.log('❌ Erro:', error.message);
    }
    
    // Listar marcas existentes
    console.log('\n4. Listando marcas existentes:');
    const brands = await xata.db.brands.getAll({ size: 5 });
    console.log(`Total de marcas: ${brands.length}`);
    brands.forEach(b => console.log(`- ${b.name} (ID: ${b.id})`));
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

test(); 