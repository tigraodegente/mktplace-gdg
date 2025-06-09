#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 VERIFICANDO ATRIBUTOS REAIS DOS PRODUTOS');
console.log('=' .repeat(60));

async function verificarAtributos() {
    try {
        // Verificar produtos com atributos
        const produtos = await sql`
            SELECT 
                COUNT(*) as total_produtos,
                COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}' AND attributes != 'null' THEN 1 END) as com_attributes
            FROM products 
            WHERE is_active = true;
        `;
        
        console.log('\n📊 ESTATÍSTICAS:');
        console.log(`   Total de produtos ativos: ${produtos[0].total_produtos}`);
        console.log(`   Produtos com atributos: ${produtos[0].com_attributes}`);
        
        // Verificar exemplos de atributos
        const exemplos = await sql`
            SELECT name, attributes
            FROM products 
            WHERE is_active = true 
            AND attributes IS NOT NULL 
            AND attributes != '{}' 
            AND attributes != 'null'
            LIMIT 5;
        `;
        
        console.log('\n📋 EXEMPLOS DE ATRIBUTOS:');
        exemplos.forEach((produto, index) => {
            console.log(`\n${index + 1}. ${produto.name}`);
            console.log(`   Atributos: ${JSON.stringify(produto.attributes, null, 2)}`);
        });
        
        // Verificar todas as chaves de atributos que existem
        const chavesAtributos = await sql`
            WITH attribute_keys AS (
                SELECT 
                    p.id,
                    jsonb_object_keys(p.attributes) as chave
                FROM products p
                WHERE p.is_active = true
                AND p.attributes IS NOT NULL 
                AND p.attributes != '{}' 
                AND p.attributes != 'null'
                AND jsonb_typeof(p.attributes) = 'object'
            )
            SELECT 
                chave,
                COUNT(*) as quantidade_produtos
            FROM attribute_keys
            GROUP BY chave
            ORDER BY quantidade_produtos DESC;
        `;
        
        console.log('\n🔑 CHAVES DE ATRIBUTOS ENCONTRADAS:');
        chavesAtributos.forEach((chave, index) => {
            console.log(`   ${index + 1}. "${chave.chave}" - ${chave.quantidade_produtos} produtos`);
        });
        
        // Verificar valores de uma chave específica (se existir)
        if (chavesAtributos.length > 0) {
            const chaveExemplo = chavesAtributos[0].chave;
            console.log(`\n📝 VALORES DA CHAVE "${chaveExemplo}":`);
            
            const valores = await sql`
                WITH attribute_values AS (
                    SELECT 
                        p.id,
                        p.attributes->${chaveExemplo} as valor
                    FROM products p
                    WHERE p.is_active = true
                    AND p.attributes IS NOT NULL 
                    AND p.attributes->${chaveExemplo} IS NOT NULL
                    LIMIT 10
                )
                SELECT valor
                FROM attribute_values;
            `;
            
            valores.forEach((valor, index) => {
                console.log(`   ${index + 1}. ${JSON.stringify(valor.valor)}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await sql.end();
    }
}

verificarAtributos(); 