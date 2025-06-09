#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });

console.log('🔍 TESTANDO RESPOSTA DA API DE ENRIQUECIMENTO...\n');

async function testarAPI() {
    try {
        const payload = {
            fetchCategories: true,
            fetchBrands: true,
            id: 'teste-debug',
            name: 'Almofada Amamentação Teste Debug',
            description: '',
            category_id: null,
            tags: ['sync-mongodb', 'entrega-rapida'],
            prioridade: 'critica',
            motivo: 'sem_categoria',
            price: '150.00',
            brand_id: null
        };

        console.log('📤 ENVIANDO PARA API:');
        console.log(JSON.stringify(payload, null, 2));
        
        console.log('\n🔄 Chamando API...');
        
        const response = await fetch('http://localhost:5174/api/ai/enrich', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        console.log(`📡 Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Erro:', errorText);
            return;
        }

        const result = await response.json();
        
        console.log('\n📥 RESPOSTA COMPLETA DA API:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success && result.data) {
            console.log('\n✅ CAMPOS RETORNADOS PELA IA:');
            const data = result.data;
            
            console.log(`🏷️  category_id: ${data.category_id || '❌ NULL'}`);
            console.log(`📝 description: ${data.description ? '✅ ' + data.description.length + ' chars' : '❌ NULL'}`);
            console.log(`📄 short_description: ${data.short_description ? '✅ ' + data.short_description.length + ' chars' : '❌ NULL'}`);
            console.log(`🔍 meta_description: ${data.meta_description ? '✅ ' + data.meta_description.length + ' chars' : '❌ NULL'}`);
            console.log(`🏷️  meta_title: ${data.meta_title ? '✅ Preenchido' : '❌ NULL'}`);
            console.log(`🔤 meta_keywords: ${data.meta_keywords && data.meta_keywords.length > 0 ? '✅ ' + data.meta_keywords.length + ' palavras' : '❌ NULL/Vazio'}`);
            console.log(`📋 attributes: ${data.attributes && Object.keys(data.attributes).length > 0 ? '✅ ' + Object.keys(data.attributes).length + ' attrs' : '❌ NULL/Vazio'}`);
            console.log(`🔧 specifications: ${data.specifications && Object.keys(data.specifications).length > 0 ? '✅ ' + Object.keys(data.specifications).length + ' specs' : '❌ NULL/Vazio'}`);
            
            // Mostrar conteúdo de alguns campos
            if (data.description) {
                console.log(`\n📝 DESCRIPTION (preview):`);
                console.log(`   "${data.description.substring(0, 100)}..."`);
            }
            
            if (data.attributes) {
                console.log(`\n📋 ATTRIBUTES:`);
                console.log(JSON.stringify(data.attributes, null, 2));
            }
            
            if (data.meta_keywords) {
                console.log(`\n🔤 META KEYWORDS:`);
                console.log(data.meta_keywords);
            }
        }
        
    } catch (error) {
        console.log('❌ Erro na requisição:', error.message);
    }
}

await testarAPI(); 