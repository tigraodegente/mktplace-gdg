#!/usr/bin/env node

import postgres from 'postgres';

console.log('🔄 MIGRANDO PRODUTOS EXISTENTES PARA MÚLTIPLAS CATEGORIAS...');

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('📊 Verificando situação atual...');
  
  // Verificar produtos com category_id
  const produtosComCategoria = await sql`
    SELECT COUNT(*) as total
    FROM products 
    WHERE category_id IS NOT NULL AND is_active = true
  `;
  
  // Verificar se já existem dados na tabela product_categories
  const jaExistemDados = await sql`
    SELECT COUNT(*) as total
    FROM product_categories
  `;
  
  console.log(`📦 Produtos com category_id: ${produtosComCategoria[0].total}`);
  console.log(`🔗 Registros em product_categories: ${jaExistemDados[0].total}`);
  
  if (produtosComCategoria[0].total === 0) {
    console.log('⚠️  Nenhum produto com category_id encontrado.');
    process.exit(0);
  }
  
  console.log('🚀 Iniciando migração...');
  
  // Migrar dados existentes
  const resultado = await sql`
    INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
    SELECT 
      p.id as product_id,
      p.category_id,
      true as is_primary,
      NOW() as created_at
    FROM products p
    WHERE p.category_id IS NOT NULL
      AND p.is_active = true
      AND NOT EXISTS (
        -- Evitar duplicatas
        SELECT 1 
        FROM product_categories pc 
        WHERE pc.product_id = p.id 
          AND pc.category_id = p.category_id
      )
    RETURNING product_id
  `;
  
  console.log(`✅ Migrados ${resultado.length} produtos para product_categories`);
  
  // Verificar resultado
  const verificacao = await sql`
    SELECT 
      (SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL AND is_active = true) as produtos_com_category_id,
      (SELECT COUNT(DISTINCT product_id) FROM product_categories) as produtos_na_tabela_nova,
      (SELECT COUNT(*) FROM product_categories) as total_relacoes_categoria,
      (SELECT COUNT(*) FROM product_categories WHERE is_primary = true) as categorias_primarias
  `;
  
  const stats = verificacao[0];
  
  console.log('\n📊 RESULTADO DA MIGRAÇÃO:');
  console.log(`📦 Produtos com category_id original: ${stats.produtos_com_category_id}`);
  console.log(`🔗 Produtos na tabela nova: ${stats.produtos_na_tabela_nova}`);
  console.log(`📈 Total de relações: ${stats.total_relacoes_categoria}`);
  console.log(`⭐ Categorias primárias: ${stats.categorias_primarias}`);
  
  if (stats.produtos_com_category_id === stats.produtos_na_tabela_nova) {
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('✅ Todos os produtos foram migrados corretamente');
    console.log('🚀 Agora você pode adaptar o sistema IA para usar product_categories');
  } else {
    console.log('\n⚠️  Alguns produtos podem não ter sido migrados');
    console.log('🔍 Verifique se existem problemas com UUIDs inválidos');
  }
  
} catch (error) {
  console.error('❌ Erro durante a migração:', error);
  process.exit(1);
} finally {
  await sql.end();
} 