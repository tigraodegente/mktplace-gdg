import postgres from 'postgres';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Usar fetch nativo do Node.js 18+
const fetch = globalThis.fetch;

dotenv.config({ path: '.env.develop' });

const sql = postgres(process.env.DATABASE_URL);
const PROGRESS_FILE = 'enriquecimento-ia-progress.json';
const ADMIN_API_URL = 'http://localhost:5174/api/ai/enrich';

class EnriquecimentoIA {
    constructor(limiteProdutos = 100) {
        this.progress = {
            total: 0,
            processados: 0,
            sucessos: 0,
            erros: 0,
            iniciado_em: null,
            ultima_atualizacao: null,
            produtos_processados: [], // IDs dos produtos já processados
            produtos_erro: [], // IDs dos produtos com erro
            lote_atual: 0,
            fase: 'inicial', // inicial, categorizacao, enriquecimento, finalizado
            limite_execucao: limiteProdutos // Limite por execução
        };
        this.batchSize = 5; // Processar 5 por vez para não sobrecarregar IA
        this.retryAttempts = 3;
        this.retryDelay = 2000; // 2 segundos
        this.limiteProdutos = limiteProdutos;
    }

    async carregarProgresso() {
        try {
            const data = await fs.readFile(PROGRESS_FILE, 'utf8');
            this.progress = { ...this.progress, ...JSON.parse(data) };
            console.log(`📋 Progresso carregado: ${this.progress.processados}/${this.progress.total} produtos`);
        } catch (error) {
            console.log('📋 Novo processo iniciado - nenhum progresso anterior encontrado');
        }
    }

    async salvarProgresso() {
        this.progress.ultima_atualizacao = new Date().toISOString();
        await fs.writeFile(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
    }

    async obterProdutosParaProcessar() {
        console.log('🔍 Buscando TODOS os produtos para enriquecimento completo...\n');

        // TODOS os produtos ativos, classificados por prioridade
        const todosProdutos = await sql`
            SELECT 
                id, sku, name, category_id, description, short_description, 
                meta_description, meta_title, attributes, specifications, tags,
                price, brand_id, created_at, is_active,
                -- Calcular nível de necessidade
                CASE 
                    WHEN category_id IS NULL THEN 'critica'
                    WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 'alta' 
                    WHEN meta_description IS NULL OR meta_description = '' THEN 'media'
                    WHEN attributes IS NULL OR attributes = '{}' OR attributes = '[]' THEN 'media'
                    WHEN specifications IS NULL OR specifications = '{}' OR specifications = '[]' THEN 'baixa'
                    ELSE 'melhoria'
                END as prioridade,
                -- Calcular score de necessidade (0-100)
                (
                    CASE WHEN category_id IS NULL THEN 40 ELSE 0 END +
                    CASE WHEN description IS NULL OR description = '' OR description = 'Descrição do produto' THEN 25 ELSE 0 END +
                    CASE WHEN meta_description IS NULL OR meta_description = '' THEN 15 ELSE 0 END +
                    CASE WHEN attributes IS NULL OR attributes = '{}' OR attributes = '[]' THEN 10 ELSE 0 END +
                    CASE WHEN specifications IS NULL OR specifications = '{}' OR specifications = '[]' THEN 5 ELSE 0 END +
                    CASE WHEN short_description IS NULL OR short_description = '' THEN 3 ELSE 0 END +
                    CASE WHEN meta_title IS NULL OR meta_title = name THEN 2 ELSE 0 END
                ) as score_necessidade
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
                -- Depois por score de necessidade (maior primeiro)
                score_necessidade DESC,
                -- Por último por nome
                name ASC
        `;

        // Filtrar produtos já processados
        const produtosRestantes = todosProdutos.filter(p => 
            !this.progress.produtos_processados.includes(p.id)
        );

        // Adicionar motivos detalhados
        const produtosComMotivos = produtosRestantes.map(p => {
            const motivos = [];
            if (!p.category_id) motivos.push('sem_categoria');
            if (!p.description || p.description === '' || p.description === 'Descrição do produto') motivos.push('sem_description');
            if (!p.meta_description || p.meta_description === '') motivos.push('sem_meta_description');
            if (!p.attributes || Object.keys(p.attributes || {}).length === 0) motivos.push('sem_attributes');
            if (!p.specifications || Object.keys(p.specifications || {}).length === 0) motivos.push('sem_specifications');
            if (!p.short_description || p.short_description === '') motivos.push('sem_short_description');
            if (!p.meta_title || p.meta_title === p.name) motivos.push('meta_title_basico');
            
            if (motivos.length === 0) motivos.push('melhoria_geral');

            return {
                ...p,
                motivos: motivos,
                motivo: motivos[0] // Principal
            };
        });

        // Estatísticas por prioridade
        const stats = {
            critica: produtosComMotivos.filter(p => p.prioridade === 'critica').length,
            alta: produtosComMotivos.filter(p => p.prioridade === 'alta').length,
            media: produtosComMotivos.filter(p => p.prioridade === 'media').length,
            baixa: produtosComMotivos.filter(p => p.prioridade === 'baixa').length,
            melhoria: produtosComMotivos.filter(p => p.prioridade === 'melhoria').length
        };

        console.log(`📊 ANÁLISE COMPLETA DO CATÁLOGO:`);
        console.log(`   🔴 CRÍTICA (sem categoria): ${stats.critica} produtos`);
        console.log(`   🟠 ALTA (sem description): ${stats.alta} produtos`);
        console.log(`   🟡 MÉDIA (sem meta/attributes): ${stats.media} produtos`);
        console.log(`   🟢 BAIXA (sem specifications): ${stats.baixa} produtos`);
        console.log(`   💎 MELHORIA (padronização): ${stats.melhoria} produtos`);
        console.log(`   ✅ Já processados: ${this.progress.produtos_processados.length}`);
        console.log(`   📦 Total no catálogo: ${todosProdutos.length}`);
        console.log(`   🎯 Restantes para processar: ${produtosRestantes.length}`);

        if (produtosComMotivos.length > 0) {
            console.log(`\n🎯 PRÓXIMOS A PROCESSAR:`);
            produtosComMotivos.slice(0, 10).forEach((p, idx) => {
                console.log(`   ${idx + 1}. [${p.prioridade.toUpperCase()}] ${p.name} (${p.motivos.join(', ')})`);
            });
            if (produtosComMotivos.length > 10) {
                console.log(`   ... e mais ${produtosComMotivos.length - 10} produtos`);
            }
        }

        return produtosComMotivos;
    }

    async chamarAPIEnriquecimento(produto, tentativa = 1) {
        try {
            console.log(`   🤖 Chamando IA para: "${produto.name}" (tentativa ${tentativa}/${this.retryAttempts})`);

            // Para enriquecimento completo, usar o formato que a API espera
            const payload = {
                fetchCategories: true, // Isso faz chamar enrichCompleteProduct
                fetchBrands: true,
                id: produto.id,
                name: produto.name,
                description: produto.description,
                category_id: produto.category_id,
                tags: produto.tags || [],
                prioridade: produto.prioridade,
                motivo: produto.motivo,
                price: produto.price || 0,
                brand_id: produto.brand_id
            };

            const response = await fetch(ADMIN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(payload),
                timeout: 30000 // 30 segundos timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'IA retornou erro sem detalhes');
            }

            return result.data;

        } catch (error) {
            console.log(`   ❌ Erro na tentativa ${tentativa}: ${error.message}`);
            
            if (tentativa < this.retryAttempts) {
                console.log(`   ⏳ Aguardando ${this.retryDelay/1000}s antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.chamarAPIEnriquecimento(produto, tentativa + 1);
            }
            
            throw error;
        }
    }

    async aplicarEnriquecimento(produto, dadosIA) {
        try {
            console.log(`   💾 Aplicando enriquecimento no banco...`);

            const updates = {};

            // Categoria (SEMPRE atualizar se IA retornar)
            if (dadosIA.category_id) {
                updates.category_id = dadosIA.category_id;
            }

            // Descriptions (SEMPRE atualizar se IA retornar)
            if (dadosIA.description) {
                updates.description = dadosIA.description;
            }
            
            if (dadosIA.short_description) {
                updates.short_description = dadosIA.short_description;
            }

            // SEO (SEMPRE atualizar se IA retornar)
            if (dadosIA.meta_description) {
                updates.meta_description = dadosIA.meta_description;
            }

            if (dadosIA.meta_title) {
                updates.meta_title = dadosIA.meta_title;
            }

            if (dadosIA.meta_keywords && Array.isArray(dadosIA.meta_keywords)) {
                updates.meta_keywords = dadosIA.meta_keywords;
            }

            // Atributos e especificações
            if (dadosIA.attributes && typeof dadosIA.attributes === 'object') {
                updates.attributes = dadosIA.attributes;
            }

            if (dadosIA.specifications && typeof dadosIA.specifications === 'object') {
                updates.specifications = dadosIA.specifications;
            }

            // Montar query de update dinamicamente
            if (Object.keys(updates).length > 0) {
                const setClauses = [];
                const values = [produto.id];
                let paramIndex = 2;

                for (const [field, value] of Object.entries(updates)) {
                    if (field === 'meta_keywords') {
                        // meta_keywords é text[] no banco
                        setClauses.push(`${field} = $${paramIndex}::text[]`);
                        values.push(value); // Já é array
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

                console.log(`   ✅ Aplicados ${Object.keys(updates).length} campos: ${Object.keys(updates).join(', ')}`);
                return Object.keys(updates);
            } else {
                console.log(`   ⚠️ Nenhum campo novo para atualizar`);
                return [];
            }

        } catch (error) {
            console.error(`   ❌ Erro ao aplicar no banco:`, error);
            throw error;
        }
    }

    async processarProduto(produto) {
        const inicio = Date.now();
        
        try {
            console.log(`\n📦 [${this.progress.processados + 1}/${this.progress.total}] ${produto.name}`);
            console.log(`   SKU: ${produto.sku} | Prioridade: ${produto.prioridade} | Motivo: ${produto.motivo}`);

            // 1. Chamar IA
            const dadosIA = await this.chamarAPIEnriquecimento(produto);

            // 2. Aplicar no banco
            const camposAtualizados = await this.aplicarEnriquecimento(produto, dadosIA);

            // 3. Marcar como processado
            this.progress.produtos_processados.push(produto.id);
            this.progress.processados++;
            this.progress.sucessos++;

            const tempoDecorrido = Date.now() - inicio;
            console.log(`   ✅ Concluído em ${tempoDecorrido}ms | Campos: ${camposAtualizados.length}`);

            return { success: true, camposAtualizados };

        } catch (error) {
            this.progress.produtos_erro.push({
                id: produto.id,
                sku: produto.sku,
                nome: produto.name,
                erro: error.message,
                timestamp: new Date().toISOString()
            });
            this.progress.processados++;
            this.progress.erros++;

            const tempoDecorrido = Date.now() - inicio;
            console.log(`   ❌ Erro em ${tempoDecorrido}ms: ${error.message}`);

            return { success: false, error: error.message };
        }
    }

    async executar() {
        console.log('🚀 INICIANDO ENRIQUECIMENTO COMPLETO COM IA\n');

        try {
            // 1. Carregar progresso anterior
            await this.carregarProgresso();

            // 2. Obter produtos para processar
            const produtos = await this.obterProdutosParaProcessar();

            if (produtos.length === 0) {
                console.log('✅ Todos os produtos já foram processados!');
                return;
            }

            // 3. Atualizar totais
            this.progress.total = produtos.length + this.progress.produtos_processados.length;
            if (!this.progress.iniciado_em) {
                this.progress.iniciado_em = new Date().toISOString();
            }

            console.log(`\n🎯 INICIANDO PROCESSAMENTO (LIMITE: ${this.limiteProdutos} produtos):`);
            console.log(`   Total no catálogo: ${this.progress.total} produtos`);
            console.log(`   Restantes: ${produtos.length} produtos`);
            console.log(`   Para processar nesta execução: ${Math.min(this.limiteProdutos, produtos.length)} produtos`);
            console.log(`   Lote: ${this.batchSize} produtos por vez\n`);

            // 4. Processar em lotes (limitado)
            const produtosParaProcessar = produtos.slice(0, this.limiteProdutos);
            console.log(`📋 PROCESSANDO ${produtosParaProcessar.length} PRODUTOS DESTA VEZ\n`);

            for (let i = 0; i < produtosParaProcessar.length; i += this.batchSize) {
                const lote = produtosParaProcessar.slice(i, i + this.batchSize);
                this.progress.lote_atual = Math.floor(i / this.batchSize) + 1;

                console.log(`\n📋 === LOTE ${this.progress.lote_atual} (${lote.length} produtos) ===`);

                // Processar produtos do lote
                for (const produto of lote) {
                    await this.processarProduto(produto);
                    
                    // Salvar progresso a cada produto
                    await this.salvarProgresso();
                    
                    // Pequena pausa entre produtos
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Mostrar estatísticas do lote
                const percentual = ((this.progress.processados / this.progress.total) * 100).toFixed(1);
                console.log(`\n📊 PROGRESSO: ${this.progress.processados}/${this.progress.total} (${percentual}%)`);
                console.log(`   ✅ Sucessos: ${this.progress.sucessos}`);
                console.log(`   ❌ Erros: ${this.progress.erros}`);

                // Pausa entre lotes
                if (i + this.batchSize < produtosParaProcessar.length) {
                    console.log(`\n⏳ Pausa de 3s entre lotes...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            // 5. Verificar se há mais produtos para processar
            const produtosRestantesTotal = await this.obterProdutosParaProcessar();
            const temMaisProdutos = produtosRestantesTotal.length > 0;

            await this.salvarProgresso();

            console.log(`\n🎉 LOTE DE ${this.limiteProdutos} PRODUTOS CONCLUÍDO!`);
            console.log(`   ✅ Sucessos neste lote: ${this.progress.sucessos}`);
            console.log(`   ❌ Erros neste lote: ${this.progress.erros}`);
            console.log(`   📊 Taxa de sucesso: ${this.progress.processados > 0 ? ((this.progress.sucessos / this.progress.processados) * 100).toFixed(1) : 0}%`);
            
            console.log(`\n📊 PROGRESSO GERAL:`);
            console.log(`   📦 Total processado: ${this.progress.produtos_processados.length} produtos`);
            console.log(`   🎯 Restantes no catálogo: ${produtosRestantesTotal.length} produtos`);
            
            if (temMaisProdutos) {
                console.log(`\n🔄 PARA CONTINUAR:`);
                console.log(`   node scripts/active/02-enriquecimento-completo-ia.mjs`);
                console.log(`\n💡 VERIFICAR SALDO OPENAI:`);
                console.log(`   https://platform.openai.com/account/billing`);
            } else {
                console.log(`\n🎉 CATÁLOGO COMPLETAMENTE ENRIQUECIDO!`);
                this.progress.fase = 'finalizado';
                await this.salvarProgresso();
            }

            if (this.progress.produtos_erro.length > 0) {
                console.log(`\n❌ PRODUTOS COM ERRO (${this.progress.produtos_erro.length}):`);
                this.progress.produtos_erro.slice(0, 10).forEach((erro, idx) => {
                    console.log(`   ${idx + 1}. SKU ${erro.sku}: ${erro.erro}`);
                });
                if (this.progress.produtos_erro.length > 10) {
                    console.log(`   ... e mais ${this.progress.produtos_erro.length - 10} produtos com erro`);
                }
                console.log(`\n🔧 PARA REPROCESSAR ERROS:`);
                console.log(`   node scripts/active/02-gerenciar-progresso.mjs clean`);
            }

        } catch (error) {
            console.error('❌ Erro crítico:', error);
            await this.salvarProgresso();
        } finally {
            await sql.end();
        }
    }
}

// Executar com limite configurável (padrão: 100 produtos)
const limiteProdutos = parseInt(process.argv[2]) || 100;
console.log(`🎯 Configuração: Máximo ${limiteProdutos} produtos por execução\n`);

const enriquecimento = new EnriquecimentoIA(limiteProdutos);
enriquecimento.executar(); 