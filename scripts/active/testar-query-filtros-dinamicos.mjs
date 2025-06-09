#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 TESTANDO QUERY DE FILTROS DINÂMICOS');
console.log('=' .repeat(60));

async function testarQuery() {
    try {
        // Query exata da API
        const allValidProductsQuery = `
        WITH attribute_extraction AS (
          SELECT 
            p.id,
            p.attributes::text as attr_text,
            p.attributes::jsonb as attr_json
          FROM products p
          WHERE p.is_active = true
          AND p.attributes IS NOT NULL 
          AND p.attributes != '{}' 
          AND p.attributes != 'null'
          AND p.attributes::text != 'null'
          AND LENGTH(p.attributes::text) > 10
          AND jsonb_typeof(p.attributes) = 'object'
        ),
        parsed_attributes AS (
          SELECT 
            ae.id,
            kv.key as attribute_name,
            kv.value as attribute_value
          FROM attribute_extraction ae,
          LATERAL jsonb_each(ae.attr_json) as kv(key, value)
          WHERE jsonb_typeof(kv.value) = 'array'
            AND jsonb_array_length(kv.value) > 0
        )
        SELECT 
          pa.attribute_name as filtro,
          elem as valor,
          COUNT(DISTINCT pa.id) as contagem
        FROM parsed_attributes pa,
        LATERAL jsonb_array_elements_text(pa.attribute_value) as elem
        WHERE pa.attribute_name IN ('Cor', 'Material', 'Tamanho', 'Tema', 'Marca', 'Gênero', 'Faixa Etária', 'Faixa etária')
          AND LENGTH(TRIM(elem)) > 0
        GROUP BY pa.attribute_name, elem
        HAVING COUNT(DISTINCT pa.id) > 0
        ORDER BY pa.attribute_name, contagem DESC, elem
        LIMIT 50
      `;
      
      console.log('⚡ Executando query...');
      const results = await sql.unsafe(allValidProductsQuery);
      console.log('✅ Query executada. Resultados:', results.length);
      
      if (results.length > 0) {
          console.log('\n🎯 PRIMEIROS RESULTADOS:');
          results.slice(0, 10).forEach((result, index) => {
              console.log(`   ${index + 1}. ${result.filtro}: "${result.valor}" (${result.contagem} produtos)`);
          });
          
          // Agrupar por filtro
          const byFilter = {};
          results.forEach(result => {
              if (!byFilter[result.filtro]) {
                  byFilter[result.filtro] = [];
              }
              byFilter[result.filtro].push({
                  value: result.valor,
                  count: parseInt(result.contagem)
              });
          });
          
          console.log('\n📊 RESUMO POR FILTRO:');
          Object.entries(byFilter).forEach(([filterName, values]) => {
              console.log(`   ${filterName}: ${values.length} valores únicos`);
              values.slice(0, 3).forEach(value => {
                  console.log(`      - ${value.value} (${value.count})`);
              });
          });
          
      } else {
          console.log('❌ Nenhum resultado encontrado!');
          
          // Vamos debugar step by step
          console.log('\n🔍 DEBUGANDO...');
          
          const extraction = await sql.unsafe(`
              SELECT COUNT(*) as count
              FROM products p
              WHERE p.is_active = true
              AND p.attributes IS NOT NULL 
              AND p.attributes != '{}' 
              AND p.attributes != 'null'
              AND p.attributes::text != 'null'
              AND LENGTH(p.attributes::text) > 10
              AND jsonb_typeof(p.attributes) = 'object'
          `);
          console.log(`   Produtos com atributos válidos: ${extraction[0].count}`);
          
          const parsed = await sql.unsafe(`
              WITH attribute_extraction AS (
                SELECT 
                  p.id,
                  p.attributes::jsonb as attr_json
                FROM products p
                WHERE p.is_active = true
                AND p.attributes IS NOT NULL 
                AND p.attributes != '{}' 
                AND p.attributes != 'null'
                AND p.attributes::text != 'null'
                AND LENGTH(p.attributes::text) > 10
                AND jsonb_typeof(p.attributes) = 'object'
                LIMIT 1
              )
              SELECT 
                ae.id,
                kv.key as attribute_name,
                kv.value as attribute_value
              FROM attribute_extraction ae,
              LATERAL jsonb_each(ae.attr_json) as kv(key, value)
              WHERE jsonb_typeof(kv.value) = 'array'
                AND jsonb_array_length(kv.value) > 0
          `);
          console.log(`   Atributos parseados: ${parsed.length}`);
          if (parsed.length > 0) {
              console.log(`   Exemplo: ${parsed[0].attribute_name} = ${JSON.stringify(parsed[0].attribute_value)}`);
          }
      }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await sql.end();
    }
}

testarQuery(); 