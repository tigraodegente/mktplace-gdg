#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 TESTANDO QUERY CORRIGIDA');
console.log('=' .repeat(40));

async function testar() {
    try {
        // Query corrigida
        const query = `
        WITH attribute_extraction AS (
          SELECT 
            p.id,
            p.attributes::text as attr_text,
            CASE 
              WHEN jsonb_typeof(p.attributes) = 'string' THEN p.attributes#>>'{}'::jsonb
              ELSE p.attributes
            END as attr_json
          FROM products p
          WHERE p.is_active = true
          AND p.attributes IS NOT NULL 
          AND p.attributes != '{}' 
          AND p.attributes != 'null'
          AND p.attributes::text != 'null'
          AND LENGTH(p.attributes::text) > 10
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
        LIMIT 20
        `;
        
        console.log('⚡ Executando query corrigida...');
        const results = await sql.unsafe(query);
        console.log('✅ Resultados:', results.length);
        
        if (results.length > 0) {
            console.log('\n🎯 FILTROS DINÂMICOS ENCONTRADOS:');
            results.forEach((result, index) => {
                console.log(`   ${index + 1}. ${result.filtro}: "${result.valor}" (${result.contagem} produtos)`);
            });
        } else {
            // Debugar extraction step
            const extraction = await sql.unsafe(`
                SELECT COUNT(*) as count
                FROM products p
                WHERE p.is_active = true
                AND p.attributes IS NOT NULL 
                AND p.attributes != '{}' 
                AND p.attributes != 'null'
                AND p.attributes::text != 'null'
                AND LENGTH(p.attributes::text) > 10
            `);
            console.log(`❌ Nenhum resultado. Produtos válidos: ${extraction[0].count}`);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await sql.end();
    }
}

testar(); 