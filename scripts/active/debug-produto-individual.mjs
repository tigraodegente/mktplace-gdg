#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

// Usar fetch nativo do Node.js 18+
const fetch = globalThis.fetch;

dotenv.config({ path: '.env.develop' });

const sql = postgres(process.env.DATABASE_URL);
const ADMIN_API_URL = 'http://localhost:5174/api/ai/enrich';

async function obterProximoProduto() {
    console.log('🔍 Buscando próximo produto para processar...\n');

    const produtos = await sql`
        SELECT 
            id, sku, name, category_id, description, short_description, 
            meta_description, meta_title, meta_keywords, attributes, specifications, tags,
            price, brand_id, created_at, is_active
        FROM products 
        WHERE is_active = true
        ORDER BY 
            -- Prioridade por necessidade
            CASE 
                WHEN category_id IS NULL THEN 1
                WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 2
                WHEN meta_description IS NULL OR meta_description = '' THEN 3
                ELSE 4
            END ASC,
            name ASC
        LIMIT 1
    `;

    return produtos[0] || null;
}

function mostrarCamposProduto(produto, titulo) {
    console.log(`\n📊 ${titulo.toUpperCase()}`);
    console.log('=' .repeat(60));
    console.log(`🏷️  ID: ${produto.id}`);
    console.log(`📦 SKU: ${produto.sku}`);
    console.log(`📝 Nome: ${produto.name}`);
    console.log(`💰 Preço: R$ ${produto.price || 'N/A'}`);
    console.log(`🏢 Brand ID: ${produto.brand_id || '❌ Não definido'}`);
    console.log(`🗂️  Category ID: ${produto.category_id || '❌ Não definido'}`);
    
    console.log(`\n📋 CAMPOS DE CONTEÚDO:`);
    console.log(`   Description: ${produto.description ? '✅ ' + produto.description.length + ' chars' : '❌ Vazio'}`);
    console.log(`   Short Description: ${produto.short_description ? '✅ ' + produto.short_description.length + ' chars' : '❌ Vazio'}`);
    
    console.log(`\n🔍 CAMPOS SEO:`);
    console.log(`   Meta Description: ${produto.meta_description ? '✅ ' + produto.meta_description.length + ' chars' : '❌ Vazio'}`);
    console.log(`   Meta Title: ${produto.meta_title ? '✅ ' + produto.meta_title.length + ' chars' : '❌ Vazio'}`);
    console.log(`   Meta Keywords: ${produto.meta_keywords && produto.meta_keywords.length > 0 ? '✅ ' + produto.meta_keywords.length + ' keywords' : '❌ Vazio'}`);
    
    console.log(`\n📋 CAMPOS ESTRUTURAIS:`);
    
    // Parse JSON fields se necessário
    let attributesObj = produto.attributes;
    if (typeof produto.attributes === 'string') {
        try {
            attributesObj = JSON.parse(produto.attributes);
        } catch (e) {
            attributesObj = null;
        }
    }
    
    let specificationsObj = produto.specifications;
    if (typeof produto.specifications === 'string') {
        try {
            specificationsObj = JSON.parse(produto.specifications);
        } catch (e) {
            specificationsObj = null;
        }
    }
    
    const attributesCount = attributesObj && typeof attributesObj === 'object' ? Object.keys(attributesObj).length : 0;
    const specificationsCount = specificationsObj && typeof specificationsObj === 'object' ? Object.keys(specificationsObj).length : 0;
    console.log(`   Attributes: ${attributesCount > 0 ? '✅ ' + attributesCount + ' atributos' : '❌ Vazio'}`);
    console.log(`   Specifications: ${specificationsCount > 0 ? '✅ ' + specificationsCount + ' especificações' : '❌ Vazio'}`);
    
    console.log(`   Tags: ${produto.tags && produto.tags.length > 0 ? '✅ ' + produto.tags.length + ' tags' : '❌ Vazio'}`);
}

async function chamarAPIEnriquecimento(produto) {
    try {
        console.log(`\n🤖 Chamando IA para enriquecer: "${produto.name}"`);

        const payload = {
            fetchCategories: true,
            fetchBrands: true,
            id: produto.id,
            name: produto.name,
            description: produto.description || '',
            category_id: produto.category_id,
            tags: produto.tags || [],
            price: produto.price || 0,
            brand_id: produto.brand_id
        };

        console.log(`🔄 Enviando para API...`);

        const response = await fetch(ADMIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(payload),
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'IA retornou erro sem detalhes');
        }

        console.log(`✅ IA processou com sucesso!`);
        
        // Mostrar dados retornados pela IA
        console.log(`\n🤖 DADOS RETORNADOS PELA IA:`);
        console.log('=' .repeat(40));
        Object.entries(result.data).forEach(([campo, valor]) => {
            if (typeof valor === 'string') {
                console.log(`   ${campo}: "${valor.substring(0, 100)}${valor.length > 100 ? '...' : ''}"`);
            } else if (Array.isArray(valor)) {
                console.log(`   ${campo}: [${valor.length} itens] ${JSON.stringify(valor).substring(0, 100)}...`);
            } else if (typeof valor === 'object' && valor !== null) {
                console.log(`   ${campo}: {${Object.keys(valor).length} campos} ${JSON.stringify(valor).substring(0, 100)}...`);
            } else {
                console.log(`   ${campo}: ${valor}`);
            }
        });

        return result.data;

    } catch (error) {
        console.log(`❌ Erro na API: ${error.message}`);
        throw error;
    }
}

async function aplicarEnriquecimento(produto, dadosIA) {
    try {
        console.log(`\n💾 Aplicando enriquecimento no banco...`);

        const updates = {};

        // Mapear campos da IA para campos do banco
        if (dadosIA.category_id) {
            updates.category_id = dadosIA.category_id;
        }

        if (dadosIA.description) {
            updates.description = dadosIA.description;
        }
        
        if (dadosIA.short_description) {
            updates.short_description = dadosIA.short_description;
        }

        if (dadosIA.meta_description) {
            updates.meta_description = dadosIA.meta_description;
        }

        if (dadosIA.meta_title) {
            updates.meta_title = dadosIA.meta_title;
        }

        if (dadosIA.meta_keywords && Array.isArray(dadosIA.meta_keywords)) {
            updates.meta_keywords = dadosIA.meta_keywords;
        }

        if (dadosIA.attributes && typeof dadosIA.attributes === 'object') {
            updates.attributes = dadosIA.attributes;
        }

        if (dadosIA.specifications && typeof dadosIA.specifications === 'object') {
            updates.specifications = dadosIA.specifications;
        }

        console.log(`📋 Campos para atualizar: ${Object.keys(updates).join(', ')}`);

        if (Object.keys(updates).length > 0) {
            const setClauses = [];
            const values = [produto.id];
            let paramIndex = 2;

            for (const [field, value] of Object.entries(updates)) {
                if (field === 'meta_keywords') {
                    setClauses.push(`${field} = $${paramIndex}::text[]`);
                    values.push(value);
                } else if (field === 'attributes' || field === 'specifications') {
                    setClauses.push(`${field} = $${paramIndex}::jsonb`);
                    values.push(JSON.stringify(value));
                } else {
                    setClauses.push(`${field} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }

            const query = `
                UPDATE products 
                SET ${setClauses.join(', ')}, updated_at = NOW()
                WHERE id = $1
            `;

            await sql.unsafe(query, values);

            console.log(`✅ ${Object.keys(updates).length} campos aplicados no banco!`);
            return Object.keys(updates);
        } else {
            console.log(`⚠️ Nenhum campo novo para atualizar`);
            return [];
        }

    } catch (error) {
        console.error(`❌ Erro ao aplicar no banco:`, error);
        throw error;
    }
}

async function buscarProdutoAtualizado(id) {
    const [produto] = await sql`
        SELECT 
            id, sku, name, category_id, description, short_description, 
            meta_description, meta_title, meta_keywords, attributes, specifications, tags,
            price, brand_id, updated_at
        FROM products 
        WHERE id = ${id}
    `;
    return produto;
}

async function processarProdutoIndividual() {
    console.log('🎯 PROCESSAMENTO INDIVIDUAL DE PRODUTO\n');

    try {
        // 1. Obter próximo produto
        const produto = await obterProximoProduto();
        if (!produto) {
            console.log('✅ Nenhum produto encontrado para processar!');
            return;
        }

        // 2. Mostrar estado ANTES
        mostrarCamposProduto(produto, 'Estado ANTES do enriquecimento');

        // 3. Confirmar processamento
        console.log(`\n❓ CONFIRMA processamento deste produto? (pressione ENTER para continuar ou Ctrl+C para sair)`);
        
        // Aguardar confirmação do usuário
        await new Promise((resolve) => {
            process.stdin.once('data', resolve);
        });

        // 4. Chamar IA
        const dadosIA = await chamarAPIEnriquecimento(produto);

        // 5. Aplicar no banco
        const camposAtualizados = await aplicarEnriquecimento(produto, dadosIA);

        // 6. Buscar produto atualizado
        const produtoAtualizado = await buscarProdutoAtualizado(produto.id);

        // 7. Mostrar estado DEPOIS
        mostrarCamposProduto(produtoAtualizado, `Estado DEPOIS do enriquecimento`);

        console.log(`\n🎉 RESULTADO:`);
        console.log(`   ✅ Campos atualizados: ${camposAtualizados.length}`);
        console.log(`   📋 Lista: ${camposAtualizados.join(', ')}`);
        console.log(`   🕒 Atualizado em: ${produtoAtualizado.updated_at}`);

        console.log(`\n🔄 PRÓXIMOS PASSOS:`);
        console.log(`   node scripts/active/debug-produto-individual.mjs  # Processar próximo produto`);
        console.log(`   node scripts/active/executar-100.mjs             # Processar lote de 100`);

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    } finally {
        await sql.end();
    }
}

// Executar
processarProdutoIndividual(); 