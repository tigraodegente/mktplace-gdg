#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });

console.log('💰 VERIFICANDO SALDO OPENAI...\n');

async function verificarSaldo() {
    try {
        // Testar se a chave está funcionando
        const response = await fetch('http://localhost:5174/api/ai/enrich', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fetchCategories: true,
                id: 'teste',
                name: 'Produto Teste',
                description: '',
                tags: []
            })
        });

        if (response.ok) {
            console.log('✅ API OPENAI FUNCIONANDO');
            console.log('💳 Créditos disponíveis para processar');
        } else {
            const error = await response.text();
            
            if (response.status === 500 && error.includes('quota')) {
                console.log('❌ COTA OPENAI ESGOTADA');
                console.log('💰 Saldo insuficiente');
                console.log('\n🔗 VERIFICAR SALDO:');
                console.log('   https://platform.openai.com/account/billing');
                console.log('\n💡 SOLUÇÕES:');
                console.log('   1. Adicionar créditos ($5-20 recomendado)');
                console.log('   2. Aguardar reset mensal');
                console.log('   3. Verificar limites de uso');
            } else {
                console.log(`❌ ERRO NA API: ${response.status}`);
                console.log(error);
            }
        }

    } catch (error) {
        console.log('❌ ERRO DE CONEXÃO:', error.message);
        console.log('\n🔍 VERIFICAR:');
        console.log('   1. Admin panel rodando em localhost:5174');
        console.log('   2. Chave OpenAI configurada no .env.develop');
    }
}

async function mostrarProgresso() {
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        console.log('\n📊 PROGRESSO ATUAL:');
        const { stdout } = await execAsync('node scripts/active/02-gerenciar-progresso.mjs');
        console.log(stdout);
        
    } catch (error) {
        console.log('⚠️  Não foi possível verificar o progresso');
    }
}

// Executar verificações
await verificarSaldo();
await mostrarProgresso();

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('   node scripts/active/executar-100.mjs    # Se saldo OK');
console.log('   https://platform.openai.com/billing     # Se sem saldo'); 