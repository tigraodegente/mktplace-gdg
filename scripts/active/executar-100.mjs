#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🎯 EXECUTANDO ENRIQUECIMENTO: 100 PRODUTOS POR VEZ\n');

try {
    const { stdout, stderr } = await execAsync('node scripts/active/02-enriquecimento-completo-ia.mjs 100');
    
    console.log(stdout);
    
    if (stderr) {
        console.error('⚠️  Avisos:', stderr);
    }
    
} catch (error) {
    console.error('❌ Erro na execução:', error.message);
    
    // Se for erro de quota da OpenAI, mostrar ajuda específica
    if (error.message.includes('insufficient_quota') || error.message.includes('quota')) {
        console.log('\n💡 COTA OPENAI ESGOTADA:');
        console.log('   1. Verificar saldo: https://platform.openai.com/account/billing');
        console.log('   2. Adicionar créditos ou aguardar reset');
        console.log('   3. Continuar: node scripts/active/executar-100.mjs');
    }
}

console.log('\n📊 COMANDOS ÚTEIS:');
console.log('   node scripts/active/02-gerenciar-progresso.mjs        # Ver progresso');
console.log('   node scripts/active/executar-100.mjs                 # Próximo lote');
console.log('   node scripts/active/02-gerenciar-progresso.mjs clean # Limpar erros'); 