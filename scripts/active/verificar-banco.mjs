#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 VERIFICANDO DADOS REAIS NO BANCO POSTGRESQL...\n');

try {
    // Verificar produtos com dados enriquecidos
    const produtosEnriquecidos = await sql`
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as com_categoria,
            COUNT(CASE WHEN description IS NOT NULL AND description != '' AND description != 'Descrição do produto' THEN 1 END) as com_description,
            COUNT(CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN 1 END) as com_meta_description,
            COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}' AND attributes != '[]' THEN 1 END) as com_attributes,
            COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' AND specifications != '[]' THEN 1 END) as com_specifications
        FROM products 
        WHERE is_active = true
    `;

    const dados = produtosEnriquecidos[0];
    
    console.log('📊 DADOS REAIS NO BANCO:');
    console.log(`   📦 Total produtos ativos: ${dados.total}`);
    console.log(`   🏷️  Com categoria: ${dados.com_categoria} (${(dados.com_categoria/dados.total*100).toFixed(1)}%)`);
    console.log(`   📝 Com description: ${dados.com_description} (${(dados.com_description/dados.total*100).toFixed(1)}%)`);
    console.log(`   🔍 Com meta_description: ${dados.com_meta_description} (${(dados.com_meta_description/dados.total*100).toFixed(1)}%)`);
    console.log(`   🏷️  Com attributes: ${dados.com_attributes} (${(dados.com_attributes/dados.total*100).toFixed(1)}%)`);
    console.log(`   📋 Com specifications: ${dados.com_specifications} (${(dados.com_specifications/dados.total*100).toFixed(1)}%)`);

    // Verificar produtos recentemente atualizados
    const recentes = await sql`
        SELECT 
            id, sku, name, category_id,
            CASE 
                WHEN length(description) > 80 THEN concat(substring(description, 1, 80), '...')
                ELSE description 
            END as description_preview,
            updated_at
        FROM products 
        WHERE is_active = true 
          AND updated_at > NOW() - INTERVAL '4 hours'
          AND (
            description IS NOT NULL AND description != '' AND description != 'Descrição do produto'
            OR category_id IS NOT NULL
            OR meta_description IS NOT NULL AND meta_description != ''
          )
        ORDER BY updated_at DESC 
        LIMIT 8
    `;

    console.log('\n📝 PRODUTOS RECENTEMENTE ENRIQUECIDOS (últimas 4h):');
    if (recentes.length === 0) {
        console.log('   ⚠️  Nenhum produto encontrado com enriquecimento recente');
    } else {
        recentes.forEach((p, idx) => {
            console.log(`   ${idx+1}. SKU ${p.sku}: ${p.name}`);
            console.log(`      Categoria ID: ${p.category_id || 'NULL'}`);
            console.log(`      Description: ${p.description_preview || 'Vazia'}`);
            console.log(`      Atualizado: ${new Date(p.updated_at).toLocaleString('pt-BR')}`);
            console.log('');
        });
    }

    // Verificar se houve crescimento recente
    const crescimentoRecente = await sql`
        SELECT 
            DATE_TRUNC('hour', updated_at) as hora,
            COUNT(*) as produtos_atualizados
        FROM products 
        WHERE updated_at > NOW() - INTERVAL '6 hours'
          AND (
            description IS NOT NULL AND description != '' AND description != 'Descrição do produto'
            OR meta_description IS NOT NULL AND meta_description != ''
          )
        GROUP BY DATE_TRUNC('hour', updated_at)
        ORDER BY hora DESC
        LIMIT 6
    `;

    console.log('📈 ATIVIDADE DE ENRIQUECIMENTO POR HORA:');
    if (crescimentoRecente.length === 0) {
        console.log('   ⚠️  Nenhuma atividade de enriquecimento detectada nas últimas 6 horas');
    } else {
        crescimentoRecente.forEach(h => {
            console.log(`   ${new Date(h.hora).toLocaleString('pt-BR')}: ${h.produtos_atualizados} produtos enriquecidos`);
        });
    }

} catch (error) {
    console.log('❌ Erro ao verificar banco:', error.message);
} finally {
    await sql.end();
} 