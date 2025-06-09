#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 TESTANDO CONVERSÃO SIMPLES');
console.log('=' .repeat(40));

async function testar() {
    try {
        // Versão mais simples - converter strings JSON diretamente
        const query = `
        WITH attribute_extraction AS (
          SELECT 
            p.id,
            p.name,
            p.attributes,
            CASE 
              WHEN jsonb_typeof(p.attributes) = 'string' THEN (p.attributes#>>'{}'::text)::jsonb
              ELSE p.attributes
            END as attr_json
          FROM products p
          WHERE p.is_active = true
          AND p.attributes IS NOT NULL 
          AND p.attributes != '{}'
          AND LENGTH(p.attributes::text) > 10
          LIMIT 3
        )
        SELECT 
          id, name, attributes, jsonb_typeof(attributes), attr_json, jsonb_typeof(attr_json)
        FROM attribute_extraction
        `;
        
        console.log('⚡ Testando conversão...');
        const results = await sql.unsafe(query);
        console.log('✅ Resultados:', results.length);
        
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.name}`);
            console.log(`   Original tipo: ${result.jsonb_typeof}`);
            console.log(`   Original: ${JSON.stringify(result.attributes)}`);
            console.log(`   Convertido tipo: ${result.jsonb_typeof_1}`);
            console.log(`   Convertido: ${JSON.stringify(result.attr_json)}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        console.log('\n🔄 Tentando abordagem ainda mais simples...');
        
        try {
            // Se não funcionar, vamos só usar os dados como estão
            const simpleQuery = `
                SELECT 
                    id, name, attributes, jsonb_typeof(attributes)
                FROM products 
                WHERE is_active = true 
                AND attributes IS NOT NULL 
                AND attributes != '{}'
                AND LENGTH(attributes::text) > 10
                LIMIT 3
            `;
            
            const simpleResults = await sql.unsafe(simpleQuery);
            console.log('\n📋 DADOS COMO ESTÃO:');
            simpleResults.forEach((result, index) => {
                console.log(`${index + 1}. ${result.name}`);
                console.log(`   Tipo: ${result.jsonb_typeof}`);
                console.log(`   Valor: ${JSON.stringify(result.attributes)}`);
                
                // Tentar converter em JavaScript
                if (result.jsonb_typeof === 'string') {
                    try {
                        const parsed = JSON.parse(result.attributes);
                        console.log(`   Convertido em JS: ${JSON.stringify(parsed)}`);
                    } catch (e) {
                        console.log(`   Erro ao converter: ${e.message}`);
                    }
                }
            });
            
        } catch (error2) {
            console.error('❌ Erro na query simples:', error2);
        }
    } finally {
        await sql.end();
    }
}

testar(); 