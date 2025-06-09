#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 VERIFICANDO TODOS OS CAMPOS DO ENRIQUECIMENTO IA...\n');

try {
    // Análise detalhada de TODOS os campos
    const analiseCompleta = await sql`
        SELECT 
            COUNT(*) as total_produtos,
            
            -- Campos principais
            COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as com_categoria,
            COUNT(CASE WHEN description IS NOT NULL AND description != '' AND description != 'Descrição do produto' THEN 1 END) as com_description,
            COUNT(CASE WHEN short_description IS NOT NULL AND short_description != '' THEN 1 END) as com_short_description,
            
            -- Campos SEO
            COUNT(CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN 1 END) as com_meta_description,
            COUNT(CASE WHEN meta_title IS NOT NULL AND meta_title != '' AND meta_title != name THEN 1 END) as com_meta_title,
            COUNT(CASE WHEN meta_keywords IS NOT NULL AND array_length(meta_keywords, 1) > 0 THEN 1 END) as com_meta_keywords,
            
            -- Campos estruturais
            COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}' AND attributes != '[]' THEN 1 END) as com_attributes,
            COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' AND specifications != '[]' THEN 1 END) as com_specifications,
            
            -- Campos de atualização
            COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 day' THEN 1 END) as atualizados_hoje
            
        FROM products 
        WHERE is_active = true
    `;

    const dados = analiseCompleta[0];
    
    console.log('📊 ANÁLISE COMPLETA DOS CAMPOS:');
    console.log(`   📦 Total produtos ativos: ${dados.total_produtos}`);
    console.log('');
    console.log('🏷️  CAMPOS PRINCIPAIS:');
    console.log(`   Category ID: ${dados.com_categoria} (${(dados.com_categoria/dados.total_produtos*100).toFixed(1)}%)`);
    console.log(`   Description: ${dados.com_description} (${(dados.com_description/dados.total_produtos*100).toFixed(1)}%)`);
    console.log(`   Short Description: ${dados.com_short_description} (${(dados.com_short_description/dados.total_produtos*100).toFixed(1)}%)`);
    console.log('');
    console.log('🔍 CAMPOS SEO:');
    console.log(`   Meta Description: ${dados.com_meta_description} (${(dados.com_meta_description/dados.total_produtos*100).toFixed(1)}%)`);
    console.log(`   Meta Title: ${dados.com_meta_title} (${(dados.com_meta_title/dados.total_produtos*100).toFixed(1)}%)`);
    console.log(`   Meta Keywords: ${dados.com_meta_keywords} (${(dados.com_meta_keywords/dados.total_produtos*100).toFixed(1)}%)`);
    console.log('');
    console.log('📋 CAMPOS ESTRUTURAIS:');
    console.log(`   Attributes: ${dados.com_attributes} (${(dados.com_attributes/dados.total_produtos*100).toFixed(1)}%)`);
    console.log(`   Specifications: ${dados.com_specifications} (${(dados.com_specifications/dados.total_produtos*100).toFixed(1)}%)`);
    console.log('');
    console.log(`📅 Atualizados hoje: ${dados.atualizados_hoje} produtos`);

    // Pegar exemplo de produto recém processado para ver TODOS os campos
    const exemploCompleto = await sql`
        SELECT 
            id, sku, name, category_id, brand_id,
            description, short_description,
            meta_description, meta_title, meta_keywords,
            attributes, specifications,
            updated_at
        FROM products 
        WHERE is_active = true 
          AND updated_at > NOW() - INTERVAL '2 hours'
          AND description IS NOT NULL 
          AND description != '' 
          AND description != 'Descrição do produto'
        ORDER BY updated_at DESC 
        LIMIT 1
    `;

    if (exemploCompleto.length > 0) {
        const produto = exemploCompleto[0];
        console.log('\n📝 EXEMPLO DE PRODUTO COMPLETAMENTE PROCESSADO:');
        console.log(`   SKU: ${produto.sku}`);
        console.log(`   Nome: ${produto.name}`);
        console.log(`   Category ID: ${produto.category_id || '❌ NULL'}`);
        console.log(`   Brand ID: ${produto.brand_id || '❌ NULL'}`);
        console.log(`   Description: ${produto.description ? '✅ PREENCHIDO (' + produto.description.length + ' chars)' : '❌ VAZIO'}`);
        console.log(`   Short Description: ${produto.short_description ? '✅ PREENCHIDO (' + produto.short_description.length + ' chars)' : '❌ VAZIO'}`);
        console.log(`   Meta Description: ${produto.meta_description ? '✅ PREENCHIDO (' + produto.meta_description.length + ' chars)' : '❌ VAZIO'}`);
        console.log(`   Meta Title: ${produto.meta_title ? '✅ PREENCHIDO' : '❌ VAZIO'}`);
        console.log(`   Meta Keywords: ${produto.meta_keywords && produto.meta_keywords.length > 0 ? '✅ PREENCHIDO (' + produto.meta_keywords.length + ' palavras)' : '❌ VAZIO'}`);
        console.log(`   Attributes: ${produto.attributes && Object.keys(produto.attributes).length > 0 ? '✅ PREENCHIDO (' + Object.keys(produto.attributes).length + ' attrs)' : '❌ VAZIO'}`);
        console.log(`   Specifications: ${produto.specifications && Object.keys(produto.specifications).length > 0 ? '✅ PREENCHIDO (' + Object.keys(produto.specifications).length + ' specs)' : '❌ VAZIO'}`);
        console.log(`   Atualizado: ${new Date(produto.updated_at).toLocaleString('pt-BR')}`);
    }

    // Verificar se category_id está sendo definido nos produtos SEM categoria
    const produtosSemCategoria = await sql`
        SELECT COUNT(*) as total
        FROM products 
        WHERE is_active = true 
          AND category_id IS NULL
    `;

    const produtosComCategoriaRecente = await sql`
        SELECT COUNT(*) as total
        FROM products 
        WHERE is_active = true 
          AND category_id IS NOT NULL
          AND updated_at > NOW() - INTERVAL '4 hours'
    `;

    console.log('\n🏷️  ANÁLISE DE CATEGORIZAÇÃO:');
    console.log(`   Produtos SEM categoria: ${produtosSemCategoria[0].total}`);
    console.log(`   Produtos categorizados hoje: ${produtosComCategoriaRecente[0].total}`);

    // Verificar campos que NÃO estão sendo preenchidos
    console.log('\n⚠️  CAMPOS COM BAIXO PREENCHIMENTO:');
    const campos = [
        { nome: 'Category ID', valor: dados.com_categoria, total: dados.total_produtos },
        { nome: 'Meta Description', valor: dados.com_meta_description, total: dados.total_produtos },
        { nome: 'Meta Title', valor: dados.com_meta_title, total: dados.total_produtos },
        { nome: 'Meta Keywords', valor: dados.com_meta_keywords, total: dados.total_produtos },
        { nome: 'Short Description', valor: dados.com_short_description, total: dados.total_produtos }
    ];

    campos
        .map(c => ({ ...c, percentual: (c.valor / c.total * 100) }))
        .filter(c => c.percentual < 50)
        .forEach(c => {
            console.log(`   ❌ ${c.nome}: ${c.percentual.toFixed(1)}% preenchido`);
        });

} catch (error) {
    console.log('❌ Erro ao verificar campos:', error.message);
} finally {
    await sql.end();
} 