#!/usr/bin/env node

import 'dotenv/config';
import { getXataClient } from '../packages/xata-client/dist/xata.js';

const xata = getXataClient();

async function insertWithSQL() {
  try {
    console.log('Inserindo dados via SQL do Xata...\n');
    
    // Primeiro, vamos verificar a estrutura das tabelas
    console.log('0. Verificando estrutura das tabelas:');
    try {
      const brandsInfo = await xata.sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'brands' AND column_name NOT LIKE 'xata%'`;
      console.log('Colunas de brands:', brandsInfo.records);
    } catch (error) {
      console.log('❌ Erro ao verificar estrutura:', error.message);
    }
    
    // Inserir marcas com todos os campos obrigatórios
    console.log('\n1. Inserindo marcas:');
    try {
      const result = await xata.sql`
        INSERT INTO brands (id, name, slug, description, is_active, created_at, updated_at)
        VALUES 
          ('brand_nike', 'Nike', 'nike', 'Just Do It', true, NOW(), NOW()),
          ('brand_adidas', 'Adidas', 'adidas', 'Impossible is Nothing', true, NOW(), NOW()),
          ('brand_puma', 'Puma', 'puma', 'Forever Faster', true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = NOW()
      `;
      console.log('✅ Marcas inseridas:', result);
    } catch (error) {
      console.log('❌ Erro ao inserir marcas:', error.message);
    }
    
    // Inserir categorias
    console.log('\n2. Inserindo categorias:');
    try {
      const result = await xata.sql`
        INSERT INTO categories (id, name, slug, description, is_active, position, created_at, updated_at)
        VALUES 
          ('cat_roupas', 'Roupas', 'roupas', 'Vestuário em geral', true, 1, NOW(), NOW()),
          ('cat_calcados', 'Calçados', 'calcados', 'Tênis e sapatos', true, 2, NOW(), NOW()),
          ('cat_acessorios', 'Acessórios', 'acessorios', 'Bolsas e mochilas', true, 3, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = NOW()
      `;
      console.log('✅ Categorias inseridas:', result);
    } catch (error) {
      console.log('❌ Erro ao inserir categorias:', error.message);
    }
    
    // Verificar dados inseridos
    console.log('\n3. Verificando dados inseridos:');
    
    try {
      const brands = await xata.sql`SELECT id, name, slug FROM brands LIMIT 5`;
      console.log('\nMarcas:', brands.records);
      
      const categories = await xata.sql`SELECT id, name, slug FROM categories LIMIT 5`;
      console.log('\nCategorias:', categories.records);
      
      // Agora testar se a ORM funciona
      console.log('\n4. Testando ORM após inserção SQL:');
      const brandsORM = await xata.db.brands.getAll();
      console.log('Marcas via ORM:', brandsORM.length);
      
      const categoriesORM = await xata.db.categories.getAll();
      console.log('Categorias via ORM:', categoriesORM.length);
      
    } catch (error) {
      console.log('❌ Erro ao verificar dados:', error.message);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

insertWithSQL(); 