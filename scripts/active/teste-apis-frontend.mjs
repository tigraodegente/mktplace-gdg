#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🧪 TESTE DAS APIs E FUNCIONALIDADES DO FRONT-END');
console.log('=' .repeat(60));

const BASE_URL = 'http://localhost:5174'; // Store
const ADMIN_URL = 'http://localhost:5175'; // Admin Panel

async function testarAPIs() {
    console.log('\n📡 1. TESTANDO APIs DA LOJA');
    console.log('-'.repeat(40));

    // Teste 1: API de produtos (listagem)
    try {
        console.log('🔍 Testando GET /api/products...');
        const response = await fetch(`${BASE_URL}/api/products?limit=5`);
        const data = await response.json();
        
        if (data.success) {
            console.log(`   ✅ API produtos funcionando`);
            console.log(`   📦 ${data.data.products.length} produtos retornados`);
            console.log(`   📊 Total no banco: ${data.data.pagination.total}`);
            
            // Verificar estrutura dos produtos
            if (data.data.products.length > 0) {
                const produto = data.data.products[0];
                console.log(`   📋 Exemplo: ${produto.name}`);
                console.log(`   🏷️ Categoria: ${produto.category_name || 'SEM CATEGORIA'}`);
                console.log(`   💰 Preço: R$ ${produto.price}`);
                console.log(`   🖼️ Imagem: ${produto.image ? 'SIM' : 'NÃO'}`);
            }
        } else {
            console.log(`   ❌ API produtos com erro: ${data.error?.message}`);
        }
    } catch (error) {
        console.log(`   ❌ Erro ao testar API produtos: ${error.message}`);
    }

    // Teste 2: API de categorias
    try {
        console.log('\n🔍 Testando GET /api/categories...');
        const response = await fetch(`${BASE_URL}/api/categories`);
        const data = await response.json();
        
        if (data.success) {
            console.log(`   ✅ API categorias funcionando`);
            console.log(`   📂 ${data.data.length} categorias retornadas`);
            
            // Verificar se há categorias com produtos
            const categoriasComProdutos = data.data.filter(cat => cat.product_count > 0);
            console.log(`   📦 ${categoriasComProdutos.length} categorias com produtos`);
        } else {
            console.log(`   ❌ API categorias com erro: ${data.error?.message}`);
        }
    } catch (error) {
        console.log(`   ❌ Erro ao testar API categorias: ${error.message}`);
    }

    // Teste 3: API de busca
    try {
        console.log('\n🔍 Testando GET /api/products?q=almofada...');
        const response = await fetch(`${BASE_URL}/api/products?q=almofada&limit=5`);
        const data = await response.json();
        
        if (data.success) {
            console.log(`   ✅ API busca funcionando`);
            console.log(`   🔍 ${data.data.products.length} produtos encontrados para "almofada"`);
            
            if (data.data.facets) {
                console.log(`   🎛️ Filtros disponíveis:`);
                if (data.data.facets.categories) {
                    console.log(`      📂 ${data.data.facets.categories.length} categorias`);
                }
                if (data.data.facets.brands) {
                    console.log(`      🏷️ ${data.data.facets.brands.length} marcas`);
                }
                if (data.data.facets.priceRange) {
                    console.log(`      💰 Faixa preço: R$ ${data.data.facets.priceRange.min} - R$ ${data.data.facets.priceRange.max}`);
                }
            }
        } else {
            console.log(`   ❌ API busca com erro: ${data.error?.message}`);
        }
    } catch (error) {
        console.log(`   ❌ Erro ao testar API busca: ${error.message}`);
    }

    // Teste 4: API de produto individual
    try {
        console.log('\n🔍 Testando produto individual...');
        
        // Primeiro pegar um slug de produto
        const produtosResponse = await fetch(`${BASE_URL}/api/products?limit=1`);
        const produtosData = await produtosResponse.json();
        
        if (produtosData.success && produtosData.data.products.length > 0) {
            const slug = produtosData.data.products[0].slug;
            
            const response = await fetch(`${BASE_URL}/api/products/${slug}`);
            const data = await response.json();
            
            if (data.success) {
                console.log(`   ✅ API produto individual funcionando`);
                console.log(`   📦 Produto: ${data.data.name}`);
                console.log(`   🏷️ Categoria: ${data.data.category_name || 'SEM CATEGORIA'}`);
                console.log(`   📝 Descrição: ${data.data.description ? 'SIM' : 'NÃO'}`);
                console.log(`   🏷️ Atributos: ${data.data.attributes ? 'SIM' : 'NÃO'}`);
                console.log(`   🔧 Especificações: ${data.data.specifications ? 'SIM' : 'NÃO'}`);
            } else {
                console.log(`   ❌ API produto individual com erro: ${data.error?.message}`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Erro ao testar API produto individual: ${error.message}`);
    }

    console.log('\n🎯 2. TESTANDO FILTROS');
    console.log('-'.repeat(40));

    // Teste filtro por categoria
    try {
        console.log('🔍 Testando filtro por categoria...');
        const response = await fetch(`${BASE_URL}/api/products?categoria=decoracao&limit=5`);
        const data = await response.json();
        
        if (data.success) {
            console.log(`   ✅ Filtro categoria funcionando`);
            console.log(`   📦 ${data.data.products.length} produtos na categoria "decoracao"`);
        } else {
            console.log(`   ❌ Filtro categoria com erro: ${data.error?.message}`);
        }
    } catch (error) {
        console.log(`   ❌ Erro filtro categoria: ${error.message}`);
    }

    // Teste filtro por preço
    try {
        console.log('\n🔍 Testando filtro por preço...');
        const response = await fetch(`${BASE_URL}/api/products?preco_min=50&preco_max=200&limit=5`);
        const data = await response.json();
        
        if (data.success) {
            console.log(`   ✅ Filtro preço funcionando`);
            console.log(`   📦 ${data.data.products.length} produtos entre R$ 50-200`);
        } else {
            console.log(`   ❌ Filtro preço com erro: ${data.error?.message}`);
        }
    } catch (error) {
        console.log(`   ❌ Erro filtro preço: ${error.message}`);
    }

    console.log('\n📊 3. RELATÓRIO DE PROBLEMAS IDENTIFICADOS');
    console.log('-'.repeat(40));

    const problemas = [];

    // Verificar produtos sem categoria
    try {
        const response = await fetch(`${BASE_URL}/api/products?limit=100`);
        const data = await response.json();
        
        if (data.success) {
            const semCategoria = data.data.products.filter(p => !p.category_name || p.category_name === 'Categoria');
            const semImagem = data.data.products.filter(p => !p.image || p.image.includes('placeholder'));
            const semDescricao = data.data.products.filter(p => !p.description);

            if (semCategoria.length > 0) {
                problemas.push(`❌ ${semCategoria.length} produtos sem categoria nos primeiros 100`);
            }

            if (semImagem.length > 0) {
                problemas.push(`❌ ${semImagem.length} produtos sem imagem nos primeiros 100`);
            }

            if (semDescricao.length > 0) {
                problemas.push(`❌ ${semDescricao.length} produtos sem descrição nos primeiros 100`);
            }
        }
    } catch (error) {
        problemas.push(`❌ Erro ao verificar qualidade dos produtos: ${error.message}`);
    }

    if (problemas.length === 0) {
        console.log('✅ Nenhum problema identificado nas APIs!');
    } else {
        problemas.forEach(problema => console.log(problema));
    }

    console.log('\n🎯 4. RECOMENDAÇÕES');
    console.log('-'.repeat(40));

    console.log('1. 🧪 Teste manual no navegador:');
    console.log(`   - Loja: ${BASE_URL}`);
    console.log(`   - Admin: ${ADMIN_URL}`);
    console.log('2. 🔍 Verificar página de busca/filtros');
    console.log('3. 📦 Verificar página individual de produto');
    console.log('4. 🏷️ Verificar página de categoria');
    console.log('5. ⚙️ Verificar painel administrativo');

    console.log('\n✅ TESTE DAS APIs CONCLUÍDO');
}

// Executar testes
testarAPIs().catch(console.error); 