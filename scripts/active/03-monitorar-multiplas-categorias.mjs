#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('📊 MONITORAMENTO - SISTEMA MÚLTIPLAS CATEGORIAS');

const progressFile = 'enriquecimento-ia-progress.json';

try {
    if (!fs.existsSync(progressFile)) {
        console.log('❌ Arquivo de progresso não encontrado');
        process.exit(1);
    }

    const progresso = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    
    // Calcular estatísticas
    const totalProcessados = Array.isArray(progresso.processados) ? progresso.processados.length : 0;
    const totalErros = Array.isArray(progresso.erros) ? progresso.erros.length : 0;
    const totalTentativas = totalProcessados + totalErros;
    const taxaSucesso = totalTentativas > 0 ? ((totalProcessados / totalTentativas) * 100).toFixed(1) : '0.0';
    
    // Calcular tempo
    const inicio = new Date(progresso.iniciadoEm || progresso.ultimaAtualizacao);
    const agora = new Date();
    const duracao = Math.floor((agora - inicio) / 1000 / 60); // minutos
    
    console.log('\n🕒 TEMPO:');
    console.log(`   Iniciado em: ${inicio.toLocaleString('pt-BR')}`);
    console.log(`   Última atualização: ${new Date(progresso.ultimaAtualizacao).toLocaleString('pt-BR')}`);
    console.log(`   Duração: ${Math.floor(duracao/60)}h ${duracao%60}m`);
    
    console.log('\n📈 PROGRESSO:');
    console.log(`   ✅ Produtos processados: ${totalProcessados}`);
    console.log(`   ❌ Erros: ${totalErros}`);
    console.log(`   🎯 Total de tentativas: ${totalTentativas}`);
    console.log(`   📊 Taxa de sucesso: ${taxaSucesso}%`);
    
    // Estimativa
    const produtosPorMinuto = totalProcessados > 0 && duracao > 0 ? totalProcessados / duracao : 0;
    const produtosRestantes = 2623 - totalProcessados;
    const tempoEstimado = produtosPorMinuto > 0 ? Math.floor(produtosRestantes / produtosPorMinuto) : 0;
    
    console.log('\n⏰ ESTIMATIVAS:');
    console.log(`   🚀 Velocidade: ${produtosPorMinuto.toFixed(2)} produtos/min`);
    console.log(`   📦 Produtos restantes: ${produtosRestantes}`);
    console.log(`   ⏳ Tempo estimado: ${Math.floor(tempoEstimado/60)}h ${tempoEstimado%60}m`);
    
    // Últimos erros
    if (totalErros > 0) {
        console.log('\n❌ ÚLTIMOS ERROS:');
        const ultimosErros = progresso.erros.slice(-5);
        ultimosErros.forEach((erro, index) => {
            console.log(`   ${index + 1}. SKU ${erro.sku}: ${erro.error}`);
        });
        if (totalErros > 5) {
            console.log(`   ... e mais ${totalErros - 5} erros`);
        }
    }
    
    // Status do sistema
    console.log('\n🎯 STATUS DO SISTEMA:');
    if (totalProcessados > 0) {
        console.log(`   ✅ Sistema funcionando - ${totalProcessados} produtos enriquecidos`);
        console.log(`   🔄 Sistema usando MÚLTIPLAS CATEGORIAS`);
    } else {
        console.log(`   ⏳ Sistema iniciando...`);
    }

} catch (error) {
    console.error('❌ Erro ao ler progresso:', error.message);
} 