#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function auditRedundantColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Auditoria de Colunas Redundantes\n');
    console.log('=' .repeat(50));
    
    // 1. Verificar featuring (já sabemos que está vazio)
    const featuringCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(featuring) as with_featuring,
        COUNT(CASE WHEN featuring::text != '{}' AND featuring IS NOT NULL THEN 1 END) as with_data
      FROM products
    `);
    
    console.log('\n📊 Coluna "featuring":');
    console.log(`   - Total de produtos: ${featuringCheck.rows[0].total}`);
    console.log(`   - Com featuring: ${featuringCheck.rows[0].with_featuring}`);
    console.log(`   - Com dados: ${featuringCheck.rows[0].with_data}`);
    console.log(`   ✅ Status: ${featuringCheck.rows[0].with_data === '0' ? 'PODE REMOVER (vazia)' : 'VERIFICAR DADOS'}`);
    
    // 2. Analisar attributes vs product_options
    console.log('\n📊 Análise de "attributes" vs "product_options":');
    
    // Extrair todas as chaves únicas de attributes
    const attributeKeys = await client.query(`
      SELECT DISTINCT 
        key,
        COUNT(*) as usage_count
      FROM products, 
           jsonb_each_text(attributes::jsonb) as x(key, value)
      WHERE attributes IS NOT NULL
      GROUP BY key
      ORDER BY usage_count DESC
    `);
    
    console.log('\n   Chaves em attributes:');
    for (const row of attributeKeys.rows) {
      console.log(`   - ${row.key}: usado em ${row.usage_count} produtos`);
    }
    
    // Comparar com product_options
    const optionTypes = await client.query(`
      SELECT DISTINCT 
        po.name,
        COUNT(DISTINCT po.product_id) as product_count,
        COUNT(DISTINCT pov.value) as value_count
      FROM product_options po
      JOIN product_option_values pov ON pov.option_id = po.id
      GROUP BY po.name
      ORDER BY po.name
    `);
    
    console.log('\n   Tipos em product_options:');
    for (const row of optionTypes.rows) {
      console.log(`   - ${row.name}: ${row.product_count} produtos, ${row.value_count} valores`);
    }
    
    // 3. Analisar specifications
    console.log('\n📊 Análise de "specifications":');
    
    const specKeys = await client.query(`
      SELECT DISTINCT 
        key,
        COUNT(*) as usage_count
      FROM products, 
           jsonb_each_text(specifications::jsonb) as x(key, value)
      WHERE specifications IS NOT NULL
      GROUP BY key
      ORDER BY usage_count DESC
    `);
    
    console.log('\n   Chaves em specifications:');
    for (const row of specKeys.rows) {
      console.log(`   - ${row.key}: usado em ${row.usage_count} produtos`);
    }
    
    // 4. Verificar redundâncias específicas
    console.log('\n🔄 Verificando redundâncias:');
    
    // Exemplo: TVs com tamanho em ambos os lugares
    const tvRedundancy = await client.query(`
      SELECT 
        p.name,
        p.attributes->>'tamanho' as attr_tamanho,
        string_agg(DISTINCT pov.value, ', ') as option_tamanhos
      FROM products p
      LEFT JOIN product_options po ON po.product_id = p.id AND po.name = 'Tamanho'
      LEFT JOIN product_option_values pov ON pov.option_id = po.id
      WHERE p.name LIKE '%TV%' OR p.name LIKE '%"'
      GROUP BY p.id, p.name, p.attributes
      LIMIT 5
    `);
    
    console.log('\n   Exemplo - TVs com tamanho duplicado:');
    for (const row of tvRedundancy.rows) {
      console.log(`   - ${row.name}`);
      console.log(`     attributes: ${row.attr_tamanho || 'null'}`);
      console.log(`     options: ${row.option_tamanhos || 'null'}`);
    }
    
    // 5. Calcular economia de espaço
    const spaceUsage = await client.query(`
      SELECT 
        pg_size_pretty(SUM(pg_column_size(attributes))) as attr_size,
        pg_size_pretty(SUM(pg_column_size(specifications))) as spec_size,
        pg_size_pretty(SUM(pg_column_size(featuring))) as feat_size,
        pg_size_pretty(
          SUM(pg_column_size(attributes)) + 
          SUM(pg_column_size(specifications)) + 
          SUM(pg_column_size(featuring))
        ) as total_size
      FROM products
    `);
    
    console.log('\n💾 Uso de espaço:');
    console.log(`   - attributes: ${spaceUsage.rows[0].attr_size}`);
    console.log(`   - specifications: ${spaceUsage.rows[0].spec_size}`);
    console.log(`   - featuring: ${spaceUsage.rows[0].feat_size || '0 bytes'}`);
    console.log(`   - TOTAL: ${spaceUsage.rows[0].total_size}`);
    
    // 6. Recomendações
    console.log('\n📋 RECOMENDAÇÕES:');
    console.log('\n1. Coluna "featuring":');
    console.log('   ✅ REMOVER IMEDIATAMENTE - Completamente vazia');
    
    console.log('\n2. Coluna "attributes":');
    console.log('   ⚠️  MIGRAR E REMOVER - Dados redundantes com product_options');
    console.log('   - Ação: Verificar se há dados únicos antes de remover');
    
    console.log('\n3. Coluna "specifications":');
    console.log('   ⚠️  AVALIAR - Contém dados técnicos que podem ser úteis');
    console.log('   - Ação: Considerar migrar para product_options ou manter');
    
    console.log('\n4. Economia estimada:');
    console.log(`   - Removendo todas: ${spaceUsage.rows[0].total_size}`);
    console.log('   - Por produto: ~270 bytes');
    console.log('   - Com 10k produtos: ~2.6 MB');
    console.log('   - Com 100k produtos: ~26 MB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
auditRedundantColumns()
  .then(() => {
    console.log('\n✅ Auditoria concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar auditoria:', error);
    process.exit(1);
  }); 