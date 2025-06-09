import fs from 'fs/promises';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);

const PROGRESS_FILE = 'enriquecimento-ia-progress.json';

async function mostrarProgresso() {
    try {
        const data = await fs.readFile(PROGRESS_FILE, 'utf8');
        const progress = JSON.parse(data);
        
        console.log('📊 STATUS DO ENRIQUECIMENTO COMPLETO DO CATÁLOGO\n');
        
        console.log('🕒 TEMPO:');
        console.log(`   Iniciado em: ${progress.iniciado_em ? new Date(progress.iniciado_em).toLocaleString('pt-BR') : 'N/A'}`);
        console.log(`   Última atualização: ${progress.ultima_atualizacao ? new Date(progress.ultima_atualizacao).toLocaleString('pt-BR') : 'N/A'}`);
        
        // Calcular duração
        if (progress.iniciado_em) {
            const duracao = new Date() - new Date(progress.iniciado_em);
            const horas = Math.floor(duracao / (1000 * 60 * 60));
            const minutos = Math.floor((duracao % (1000 * 60 * 60)) / (1000 * 60));
            console.log(`   Duração total: ${horas}h ${minutos}m`);
        }
        
        console.log('\n📈 PROGRESSO:');
        console.log(`   Total de produtos: ${progress.total}`);
        console.log(`   Processados: ${progress.processados}/${progress.total} (${((progress.processados / progress.total) * 100).toFixed(1)}%)`);
        console.log(`   Sucessos: ${progress.sucessos}`);
        console.log(`   Erros: ${progress.erros}`);
        console.log(`   Taxa de sucesso: ${progress.processados > 0 ? ((progress.sucessos / progress.processados) * 100).toFixed(1) : 0}%`);
        
        console.log('\n🎯 STATUS:');
        console.log(`   Fase atual: ${progress.fase}`);
        console.log(`   Lote atual: ${progress.lote_atual}`);
        console.log(`   Produtos restantes: ${progress.total - progress.processados}`);
        
        // Estimar tempo restante
        if (progress.processados > 0 && progress.processados < progress.total && progress.iniciado_em) {
            const duracao = new Date() - new Date(progress.iniciado_em);
            const tempoMedioPorProduto = duracao / progress.processados;
            const produtosRestantes = progress.total - progress.processados;
            const tempoEstimado = tempoMedioPorProduto * produtosRestantes;
            
            const horasRestantes = Math.floor(tempoEstimado / (1000 * 60 * 60));
            const minutosRestantes = Math.floor((tempoEstimado % (1000 * 60 * 60)) / (1000 * 60));
            console.log(`   ⏰ Tempo estimado restante: ${horasRestantes}h ${minutosRestantes}m`);
        }
        
        if (progress.produtos_erro && progress.produtos_erro.length > 0) {
            console.log(`\n❌ PRODUTOS COM ERRO (${progress.produtos_erro.length}):`);
            progress.produtos_erro.slice(0, 10).forEach((erro, idx) => {
                console.log(`   ${idx + 1}. SKU ${erro.sku}: ${erro.erro}`);
            });
            if (progress.produtos_erro.length > 10) {
                console.log(`   ... e mais ${progress.produtos_erro.length - 10} erros`);
            }
        }
        
        console.log('\n💡 COMANDOS DISPONÍVEIS:');
        console.log('   node scripts/active/02-enriquecimento-completo-ia.mjs  # Continuar processamento');
        console.log('   node scripts/active/02-gerenciar-progresso.mjs reset   # Resetar progresso');
        console.log('   node scripts/active/02-gerenciar-progresso.mjs clean   # Limpar apenas erros');
        console.log('   node scripts/active/02-gerenciar-progresso.mjs stats   # Estatísticas detalhadas');
        
    } catch (error) {
        console.log('📋 Nenhum progresso encontrado. Mostrando status atual do banco...\n');
        await mostrarEstatisticasAtual();
    }
}

async function mostrarEstatisticasAtual() {
    try {
        console.log('📊 STATUS ATUAL DO CATÁLOGO (SEM PROCESSAMENTO EM ANDAMENTO)\n');
        
        // Estatísticas gerais
        const stats = await sql`
            SELECT 
                COUNT(*) as total_produtos,
                COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as com_categoria,
                COUNT(CASE WHEN description IS NOT NULL AND description != '' AND description != 'Descrição do produto' THEN 1 END) as com_description,
                COUNT(CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN 1 END) as com_meta_description,
                COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}' AND attributes != '[]' THEN 1 END) as com_attributes,
                COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' AND specifications != '[]' THEN 1 END) as com_specifications,
                COUNT(CASE WHEN short_description IS NOT NULL AND short_description != '' THEN 1 END) as com_short_description
            FROM products 
            WHERE is_active = true
        `;

        const dados = stats[0];
        console.log('📈 COMPLETUDE DO CATÁLOGO:');
        console.log(`   📦 Total de produtos ativos: ${dados.total_produtos}`);
        console.log(`   🏷️  Com categoria: ${dados.com_categoria} (${(dados.com_categoria/dados.total_produtos*100).toFixed(1)}%)`);
        console.log(`   📝 Com description: ${dados.com_description} (${(dados.com_description/dados.total_produtos*100).toFixed(1)}%)`);
        console.log(`   🔍 Com meta description: ${dados.com_meta_description} (${(dados.com_meta_description/dados.total_produtos*100).toFixed(1)}%)`);
        console.log(`   🏷️  Com attributes: ${dados.com_attributes} (${(dados.com_attributes/dados.total_produtos*100).toFixed(1)}%)`);
        console.log(`   📋 Com specifications: ${dados.com_specifications} (${(dados.com_specifications/dados.total_produtos*100).toFixed(1)}%)`);
        console.log(`   📄 Com short description: ${dados.com_short_description} (${(dados.com_short_description/dados.total_produtos*100).toFixed(1)}%)`);

        // Prioridades de enriquecimento
        const prioridades = await sql`
            SELECT 
                CASE 
                    WHEN category_id IS NULL THEN 'critica'
                    WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 'alta' 
                    WHEN meta_description IS NULL OR meta_description = '' THEN 'media'
                    WHEN attributes IS NULL OR attributes = '{}' OR attributes = '[]' THEN 'media'
                    WHEN specifications IS NULL OR specifications = '{}' OR specifications = '[]' THEN 'baixa'
                    ELSE 'melhoria'
                END as prioridade,
                COUNT(*) as quantidade
            FROM products 
            WHERE is_active = true
            GROUP BY 
                CASE 
                    WHEN category_id IS NULL THEN 'critica'
                    WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 'alta' 
                    WHEN meta_description IS NULL OR meta_description = '' THEN 'media'
                    WHEN attributes IS NULL OR attributes = '{}' OR attributes = '[]' THEN 'media'
                    WHEN specifications IS NULL OR specifications = '{}' OR specifications = '[]' THEN 'baixa'
                    ELSE 'melhoria'
                END
            ORDER BY 
                CASE 
                    WHEN (
                        CASE 
                            WHEN category_id IS NULL THEN 'critica'
                            WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 'alta' 
                            WHEN meta_description IS NULL OR meta_description = '' THEN 'media'
                            WHEN attributes IS NULL OR attributes = '{}' OR attributes = '[]' THEN 'media'
                            WHEN specifications IS NULL OR specifications = '{}' OR specifications = '[]' THEN 'baixa'
                            ELSE 'melhoria'
                        END
                    ) = 'critica' THEN 1
                    WHEN (
                        CASE 
                            WHEN category_id IS NULL THEN 'critica'
                            WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 'alta' 
                            WHEN meta_description IS NULL OR meta_description = '' THEN 'media'
                            WHEN attributes IS NULL OR attributes = '{}' OR attributes = '[]' THEN 'media'
                            WHEN specifications IS NULL OR specifications = '{}' OR specifications = '[]' THEN 'baixa'
                            ELSE 'melhoria'
                        END
                    ) = 'alta' THEN 2
                    WHEN (
                        CASE 
                            WHEN category_id IS NULL THEN 'critica'
                            WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 'alta' 
                            WHEN meta_description IS NULL OR meta_description = '' THEN 'media'
                            WHEN attributes IS NULL OR attributes = '{}' OR attributes = '[]' THEN 'media'
                            WHEN specifications IS NULL OR specifications = '{}' OR specifications = '[]' THEN 'baixa'
                            ELSE 'melhoria'
                        END
                    ) = 'media' THEN 3
                    WHEN (
                        CASE 
                            WHEN category_id IS NULL THEN 'critica'
                            WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 'alta' 
                            WHEN meta_description IS NULL OR meta_description = '' THEN 'media'
                            WHEN attributes IS NULL OR attributes = '{}' OR attributes = '[]' THEN 'media'
                            WHEN specifications IS NULL OR specifications = '{}' OR specifications = '[]' THEN 'baixa'
                            ELSE 'melhoria'
                        END
                    ) = 'baixa' THEN 4
                    ELSE 5
                END
        `;

        console.log('\n🎯 PRODUTOS POR PRIORIDADE DE ENRIQUECIMENTO:');
        prioridades.forEach(p => {
            const emoji = {
                'critica': '🔴',
                'alta': '🟠',
                'media': '🟡',
                'baixa': '🟢',
                'melhoria': '💎'
            }[p.prioridade] || '📝';
            console.log(`   ${emoji} ${p.prioridade.toUpperCase()}: ${p.quantidade} produtos`);
        });

        console.log('\n💡 PARA INICIAR O ENRIQUECIMENTO:');
        console.log('   node scripts/active/02-enriquecimento-completo-ia.mjs');
        
    } catch (error) {
        console.log('❌ Erro ao buscar estatísticas:', error.message);
    }
}

async function resetarProgresso() {
    try {
        await fs.unlink(PROGRESS_FILE);
        console.log('✅ Progresso resetado! Próxima execução será do zero.');
    } catch (error) {
        console.log('📋 Nenhum progresso para resetar.');
    }
}

async function limparErros() {
    try {
        const data = await fs.readFile(PROGRESS_FILE, 'utf8');
        const progress = JSON.parse(data);
        
        // Remover produtos com erro dos processados para reprocessar
        const produtosComErro = progress.produtos_erro.map(e => e.id);
        progress.produtos_processados = progress.produtos_processados.filter(id => 
            !produtosComErro.includes(id)
        );
        
        // Ajustar contadores
        progress.processados -= progress.produtos_erro.length;
        progress.erros = 0;
        progress.produtos_erro = [];
        
        await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
        
        console.log(`✅ ${produtosComErro.length} produtos com erro marcados para reprocessamento.`);
        
    } catch (error) {
        console.log('❌ Erro ao limpar:', error.message);
    }
}

// Verificar argumentos da linha de comando
const command = process.argv[2];

try {
    switch (command) {
        case 'reset':
            await resetarProgresso();
            break;
        case 'clean':
            await limparErros();
            break;
        case 'stats':
            await mostrarEstatisticasAtual();
            break;
        default:
            await mostrarProgresso();
            break;
    }
} finally {
    await sql.end();
} 