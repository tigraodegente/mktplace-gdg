#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA MARKETPLACE (CORRIGIDO)');
console.log('=' .repeat(60));

async function diagnosticoCompleto() {
    try {
        console.log('\n📊 1. ANÁLISE DO BANCO DE DADOS');
        console.log('-'.repeat(40));
        
        // Verificar produtos enriquecidos
        const produtosStats = await sql`
            SELECT 
                COUNT(*) as total_produtos,
                COUNT(description) as com_description,
                COUNT(short_description) as com_short_description,
                COUNT(meta_description) as com_meta_description,
                COUNT(meta_title) as com_meta_title,
                COUNT(meta_keywords) as com_meta_keywords,
                COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}' THEN 1 END) as com_attributes,
                COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' THEN 1 END) as com_specifications,
                COUNT(CASE WHEN is_active = true THEN 1 END) as produtos_ativos
            FROM products;
        `;
        
        console.log('📦 SITUAÇÃO DOS PRODUTOS:');
        const stats = produtosStats[0];
        console.log(`   Total de produtos: ${stats.total_produtos}`);
        console.log(`   Produtos ativos: ${stats.produtos_ativos}`);
        console.log(`   Com description: ${stats.com_description} (${((stats.com_description/stats.total_produtos)*100).toFixed(1)}%)`);
        console.log(`   Com short_description: ${stats.com_short_description} (${((stats.com_short_description/stats.total_produtos)*100).toFixed(1)}%)`);
        console.log(`   Com meta_description: ${stats.com_meta_description} (${((stats.com_meta_description/stats.total_produtos)*100).toFixed(1)}%)`);
        console.log(`   Com meta_title: ${stats.com_meta_title} (${((stats.com_meta_title/stats.total_produtos)*100).toFixed(1)}%)`);
        console.log(`   Com meta_keywords: ${stats.com_meta_keywords} (${((stats.com_meta_keywords/stats.total_produtos)*100).toFixed(1)}%)`);
        console.log(`   Com attributes: ${stats.com_attributes} (${((stats.com_attributes/stats.total_produtos)*100).toFixed(1)}%)`);
        console.log(`   Com specifications: ${stats.com_specifications} (${((stats.com_specifications/stats.total_produtos)*100).toFixed(1)}%)`);

        // Verificar relação product_categories
        const categoriesRelation = await sql`
            SELECT 
                COUNT(DISTINCT product_id) as produtos_na_tabela_nova,
                COUNT(*) as total_relacoes,
                COUNT(CASE WHEN is_primary = true THEN 1 END) as categorias_primarias
            FROM product_categories;
        `;

        console.log('\n🏷️ SISTEMA DE CATEGORIAS:');
        const catRel = categoriesRelation[0];
        console.log(`   Produtos na tabela product_categories: ${catRel.produtos_na_tabela_nova} (${((catRel.produtos_na_tabela_nova/stats.total_produtos)*100).toFixed(1)}%)`);
        console.log(`   Total de relações produto-categoria: ${catRel.total_relacoes}`);
        console.log(`   Categorias primárias: ${catRel.categorias_primarias}`);

        // Verificar categorias ativas
        const categoriasAtivas = await sql`
            SELECT 
                COUNT(*) as total_categorias,
                COUNT(CASE WHEN is_active = true THEN 1 END) as categorias_ativas
            FROM categories;
        `;

        console.log(`   Total de categorias: ${categoriasAtivas[0].total_categorias}`);
        console.log(`   Categorias ativas: ${categoriasAtivas[0].categorias_ativas}`);

        // Verificar exemplos de produtos enriquecidos
        console.log('\n📋 EXEMPLOS DE PRODUTOS ENRIQUECIDOS:');
        const exemplosProdutos = await sql`
            SELECT 
                p.name, p.sku, 
                CASE WHEN EXISTS(SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id) THEN 'SIM' ELSE 'NÃO' END as tem_categoria,
                CASE WHEN p.description IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_descricao,
                CASE WHEN p.attributes IS NOT NULL AND p.attributes != '{}' THEN 'SIM' ELSE 'NÃO' END as tem_attributes
            FROM products p
            WHERE p.is_active = true
            ORDER BY 
                CASE WHEN EXISTS(SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id) THEN 1 ELSE 2 END,
                CASE WHEN p.description IS NOT NULL THEN 1 ELSE 2 END
            LIMIT 10;
        `;

        exemplosProdutos.forEach((produto, index) => {
            console.log(`   ${index + 1}. ${produto.name.slice(0, 40)}... | Cat: ${produto.tem_categoria} | Desc: ${produto.tem_descricao} | Attr: ${produto.tem_attributes}`);
        });

        // Verificar produtos sem categorização
        console.log('\n❌ PRODUTOS SEM CATEGORIZAÇÃO:');
        const semCategoria = await sql`
            SELECT p.name, p.sku 
            FROM products p
            WHERE NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id)
            AND p.is_active = true
            LIMIT 5;
        `;

        if (semCategoria.length > 0) {
            semCategoria.forEach((produto, index) => {
                console.log(`   ${index + 1}. ${produto.name} (SKU: ${produto.sku})`);
            });
        } else {
            console.log('   ✅ Todos os produtos ativos têm categoria!');
        }

        // Verificar marcas
        console.log('\n🏷️ MARCAS:');
        const marcasStats = await sql`
            SELECT 
                COUNT(*) as total_marcas,
                COUNT(CASE WHEN is_active = true THEN 1 END) as marcas_ativas,
                (SELECT COUNT(*) FROM products WHERE brand_id IS NOT NULL) as produtos_com_marca
            FROM brands;
        `;

        const marcas = marcasStats[0];
        console.log(`   Total de marcas: ${marcas.total_marcas}`);
        console.log(`   Marcas ativas: ${marcas.marcas_ativas}`);
        console.log(`   Produtos com marca: ${marcas.produtos_com_marca}`);

        // Verificar imagens de produtos
        console.log('\n🖼️ IMAGENS:');
        const imagensStats = await sql`
            SELECT 
                COUNT(DISTINCT product_id) as produtos_com_imagem,
                COUNT(*) as total_imagens,
                (SELECT COUNT(*) FROM products WHERE is_active = true) as total_produtos_ativos
            FROM product_images;
        `;

        const imgs = imagensStats[0];
        console.log(`   Produtos com imagem: ${imgs.produtos_com_imagem}/${imgs.total_produtos_ativos} (${((imgs.produtos_com_imagem/imgs.total_produtos_ativos)*100).toFixed(1)}%)`);
        console.log(`   Total de imagens: ${imgs.total_imagens}`);

        // Verificar variações de produto
        console.log('\n🔄 VARIAÇÕES:');
        const variacoesStats = await sql`
            SELECT 
                COUNT(DISTINCT product_id) as produtos_com_variacao,
                COUNT(*) as total_variacoes
            FROM product_variants
            WHERE is_active = true;
        `;

        const vars = variacoesStats[0];
        console.log(`   Produtos com variações: ${vars.produtos_com_variacao}`);
        console.log(`   Total de variações: ${vars.total_variacoes}`);

        console.log('\n📊 2. PROBLEMAS IDENTIFICADOS');
        console.log('-'.repeat(40));

        const problemas = [];

        // Verificar problemas comuns
        if (catRel.produtos_na_tabela_nova < stats.total_produtos * 0.9) {
            problemas.push(`❌ ${stats.total_produtos - catRel.produtos_na_tabela_nova} produtos sem categoria`);
        }

        if (stats.com_description < stats.total_produtos * 0.8) {
            problemas.push(`❌ ${stats.total_produtos - stats.com_description} produtos sem descrição`);
        }

        if (imgs.produtos_com_imagem < imgs.total_produtos_ativos * 0.8) {
            problemas.push(`❌ ${imgs.total_produtos_ativos - imgs.produtos_com_imagem} produtos sem imagem`);
        }

        if (problemas.length === 0) {
            console.log('✅ Nenhum problema crítico encontrado!');
        } else {
            problemas.forEach(problema => console.log(problema));
        }

        console.log('\n🔧 3. RECOMENDAÇÕES');
        console.log('-'.repeat(40));

        if (catRel.produtos_na_tabela_nova < stats.total_produtos) {
            console.log('1. 📋 Continuar enriquecimento por IA para produtos sem categoria');
        }

        if (imgs.produtos_com_imagem < imgs.total_produtos_ativos * 0.9) {
            console.log('2. 🖼️ Adicionar imagens para produtos sem fotos');
        }

        console.log('3. 🧪 Testar filtros no front-end');
        console.log('4. 🔍 Verificar busca e performance');
        console.log('5. 🔧 Atualizar APIs para usar product_categories');

        console.log('\n🚨 4. PROBLEMA CRÍTICO ENCONTRADO');
        console.log('-'.repeat(40));
        console.log('❌ COLUNA category_id FOI REMOVIDA DA TABELA products!');
        console.log('❌ APIs e front-end podem estar tentando usar category_id inexistente');
        console.log('✅ Sistema deve usar APENAS product_categories (relação N:N)');

        console.log('\n✅ DIAGNÓSTICO CONCLUÍDO');

    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
    } finally {
        await sql.end();
    }
}

// Executar diagnóstico
diagnosticoCompleto(); 