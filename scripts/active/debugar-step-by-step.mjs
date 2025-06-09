#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 DEBUGANDO STEP-BY-STEP');
console.log('=' .repeat(40));

async function debugar() {
    try {
        // Passo 1: Produtos ativos
        const step1 = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true`;
        console.log(`1. Produtos ativos: ${step1[0].count}`);
        
        // Passo 2: Com attributes não null
        const step2 = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true AND attributes IS NOT NULL`;
        console.log(`2. Com attributes IS NOT NULL: ${step2[0].count}`);
        
        // Passo 3: Attributes != '{}'
        const step3 = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true AND attributes IS NOT NULL AND attributes != '{}'`;
        console.log(`3. Com attributes != '{}': ${step3[0].count}`);
        
        // Passo 4: Attributes != 'null'
        const step4 = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true AND attributes IS NOT NULL AND attributes != '{}' AND attributes != 'null'`;
        console.log(`4. Com attributes != 'null': ${step4[0].count}`);
        
        // Passo 5: attributes::text != 'null'
        const step5 = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true AND attributes IS NOT NULL AND attributes != '{}' AND attributes != 'null' AND attributes::text != 'null'`;
        console.log(`5. Com attributes::text != 'null': ${step5[0].count}`);
        
        // Passo 6: LENGTH(attributes::text) > 10
        const step6 = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true AND attributes IS NOT NULL AND attributes != '{}' AND attributes != 'null' AND attributes::text != 'null' AND LENGTH(attributes::text) > 10`;
        console.log(`6. Com LENGTH > 10: ${step6[0].count}`);
        
        // Passo 7: jsonb_typeof = 'object'
        const step7 = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true AND attributes IS NOT NULL AND attributes != '{}' AND attributes != 'null' AND attributes::text != 'null' AND LENGTH(attributes::text) > 10 AND jsonb_typeof(attributes) = 'object'`;
        console.log(`7. Com jsonb_typeof = 'object': ${step7[0].count}`);
        
        // Vamos ver alguns exemplos de attributes
        console.log('\n📋 EXEMPLOS DE ATTRIBUTES:');
        const examples = await sql`
            SELECT name, attributes, jsonb_typeof(attributes) as tipo
            FROM products 
            WHERE is_active = true AND attributes IS NOT NULL
            LIMIT 5
        `;
        
        examples.forEach((ex, i) => {
            console.log(`${i+1}. ${ex.name}`);
            console.log(`   Tipo: ${ex.tipo}`);
            console.log(`   Valor: ${JSON.stringify(ex.attributes)}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await sql.end();
    }
}

debugar(); 