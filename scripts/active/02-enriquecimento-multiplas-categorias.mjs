#!/usr/bin/env node

import postgres from 'postgres';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class EnriquecimentoMultiplasCategorias {
    constructor() {
        this.tentativasMaximas = 3;
        this.delayEntreTentativas = 2000;
        this.progressFile = 'enriquecimento-ia-progress.json';
        this.progresso = this.carregarProgresso();
    }

    carregarProgresso() {
        try {
            if (fs.existsSync(this.progressFile)) {
                const progresso = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
                // Garantir que arrays existam
                if (!Array.isArray(progresso.processados)) progresso.processados = [];
                if (!Array.isArray(progresso.erros)) progresso.erros = [];
                return progresso;
            }
        } catch (error) {
            console.log('⚠️ Erro ao carregar progresso, iniciando do zero');
        }
        return {
            processados: [],
            erros: [],
            ultimaAtualizacao: new Date().toISOString(),
            iniciadoEm: new Date().toISOString()
        };
    }

    salvarProgresso() {
        try {
            this.progresso.ultimaAtualizacao = new Date().toISOString();
            fs.writeFileSync(this.progressFile, JSON.stringify(this.progresso, null, 2));
        } catch (error) {
            console.log('⚠️ Erro ao salvar progresso:', error.message);
        }
    }

    async buscarCategorias() {
        const categorias = await sql`
            SELECT id, name, slug, parent_id
            FROM categories 
            WHERE is_active = true
            ORDER BY parent_id NULLS FIRST, name
        `;
        
        const categoriasFormatadas = categorias.map(cat => ({
            id: cat.id,
            nome: cat.name,
            slug: cat.slug,
            parent_id: cat.parent_id
        }));

        return categoriasFormatadas;
    }

    async chamarAPIEnriquecimento(produto, tentativa = 1) {
        const categorias = await this.buscarCategorias();
        
        const prompt = `Analise este produto de marketplace infantil e retorne APENAS um JSON válido:

PRODUTO: "${produto.name}"
SKU: ${produto.sku}
PREÇO: R$ ${produto.price || 'N/A'}
DESCRIÇÃO ATUAL: ${produto.description || 'Sem descrição'}

CATEGORIAS DISPONÍVEIS:
${categorias.map(cat => `- ${cat.nome} (ID: ${cat.id})`).join('\n')}

RETORNE APENAS um JSON com TODOS os campos:
{
  "category_ids": ["uuid1", "uuid2"],  // MÚLTIPLAS categorias (IDs dos UUIDs)
  "primary_category_id": "uuid",       // Categoria principal (UUID)
  "description": "descrição completa e detalhada",
  "short_description": "resumo em 1-2 frases",
  "meta_description": "meta descrição SEO (150-160 chars)",
  "meta_title": "título SEO otimizado",
  "meta_keywords": ["palavra1", "palavra2"],
  "attributes": {
    "Cor": ["opção1", "opção2"],
    "Tamanho": ["P", "M", "G"],
    "Material": ["algodão", "poliéster"]
  },
  "specifications": {
    "Dimensões": "valor",
    "Peso": "valor",
    "Composição": "valor"
  }
}

IMPORTANTE:
- category_ids: Array com 1-3 categorias relevantes
- primary_category_id: A categoria mais específica/importante
- Attributes com arrays para permitir filtros
- Gere conteúdo rico e relevante para marketplace infantil`;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 2000
            });

            const content = response.choices[0].message.content.trim();
            
            // Limpar e parsear JSON
            const jsonContent = this.limparJSON(content);
            return JSON.parse(jsonContent);

        } catch (error) {
            if (tentativa < this.tentativasMaximas) {
                console.log(`   ❌ Erro na tentativa ${tentativa}: ${error.message}`);
                console.log(`   ⏳ Aguardando ${this.delayEntreTentativas/1000}s antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, this.delayEntreTentativas));
                return this.chamarAPIEnriquecimento(produto, tentativa + 1);
            }
            throw error;
        }
    }

    limparJSON(content) {
        // Remove caracteres de controle e limpa JSON
        let cleaned = content
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .trim();

        // Extrair JSON se estiver em código markdown
        const jsonMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
            cleaned = jsonMatch[1];
        }

        // Se não começar com {, procurar o primeiro {
        if (!cleaned.startsWith('{')) {
            const firstBrace = cleaned.indexOf('{');
            if (firstBrace !== -1) {
                cleaned = cleaned.substring(firstBrace);
            }
        }

        return cleaned;
    }

    async aplicarEnriquecimento(produto, dadosIA) {
        try {
            console.log(`   💾 Aplicando enriquecimento no banco...`);

            // 1. Atualizar campos simples na tabela products
            const updates = {};
            
            if (dadosIA.description) updates.description = dadosIA.description;
            if (dadosIA.short_description) updates.short_description = dadosIA.short_description;
            if (dadosIA.meta_description) updates.meta_description = dadosIA.meta_description;
            if (dadosIA.meta_title) updates.meta_title = dadosIA.meta_title;
            if (dadosIA.meta_keywords && Array.isArray(dadosIA.meta_keywords)) {
                updates.meta_keywords = dadosIA.meta_keywords;
            }
            if (dadosIA.attributes && typeof dadosIA.attributes === 'object') {
                updates.attributes = dadosIA.attributes;
            }
            if (dadosIA.specifications && typeof dadosIA.specifications === 'object') {
                updates.specifications = dadosIA.specifications;
            }

            let camposAtualizados = [];

            // Atualizar campos simples
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
                camposAtualizados = [...camposAtualizados, ...Object.keys(updates)];
            }

            // 2. Gerenciar categorias (múltiplas)
            if (dadosIA.category_ids && Array.isArray(dadosIA.category_ids) && dadosIA.category_ids.length > 0) {
                // Remover categorias existentes
                await sql`
                    DELETE FROM product_categories 
                    WHERE product_id = ${produto.id}
                `;

                // Inserir novas categorias
                for (let i = 0; i < dadosIA.category_ids.length; i++) {
                    const categoryId = dadosIA.category_ids[i];
                    const isPrimary = categoryId === dadosIA.primary_category_id;

                    await sql`
                        INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
                        VALUES (${produto.id}, ${categoryId}, ${isPrimary}, NOW())
                    `;
                }

                camposAtualizados.push('categories');
                console.log(`   ✅ Aplicados ${Object.keys(updates).length + 1} campos: ${camposAtualizados.join(', ')}`);
            } else {
                console.log(`   ✅ Aplicados ${Object.keys(updates).length} campos: ${camposAtualizados.join(', ')}`);
            }

            return camposAtualizados;

        } catch (error) {
            console.error(`   ❌ Erro ao aplicar no banco:`, error);
            throw error;
        }
    }

    async processarProduto(produto, indice, total) {
        const inicio = Date.now();
        
        try {
            // Verificar se já foi processado
            if (this.progresso.processados.includes(produto.sku)) {
                console.log(`📦 [${indice}/${total}] ${produto.name} - ⏭️ JÁ PROCESSADO`);
                return { sucesso: true, campos: [], tempo: 0 };
            }

            console.log(`📦 [${indice}/${total}] ${produto.name}`);
            console.log(`   SKU: ${produto.sku} | Prioridade: ${produto.prioridade} | Motivo: ${produto.motivo}`);

            // Chamar IA
            console.log(`   🤖 Chamando IA para: "${produto.name}" (tentativa 1/${this.tentativasMaximas})`);
            const dadosIA = await this.chamarAPIEnriquecimento(produto);

            // Aplicar no banco
            const camposAtualizados = await this.aplicarEnriquecimento(produto, dadosIA);

            // Registrar sucesso
            this.progresso.processados.push(produto.sku);
            this.salvarProgresso();

            const tempo = Date.now() - inicio;
            console.log(`   ✅ Concluído em ${tempo}ms | Campos: ${camposAtualizados.length}`);

            return { sucesso: true, campos: camposAtualizados, tempo };

        } catch (error) {
            // Registrar erro
            const errorInfo = {
                sku: produto.sku,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.progresso.erros.push(errorInfo);
            this.salvarProgresso();

            const tempo = Date.now() - inicio;
            console.log(`   ❌ Erro em ${tempo}ms: ${error.message}`);

            return { sucesso: false, erro: error.message, tempo };
        }
    }

    async executar(limite = 100) {
        console.log('🎯 EXECUTANDO ENRIQUECIMENTO COM MÚLTIPLAS CATEGORIAS');
        console.log(`📊 Limite: ${limite} produtos por execução\n`);

        try {
            // Buscar produtos para processar
            const produtos = await sql`
                SELECT 
                    p.id, p.sku, p.name, p.price, p.description,
                    CASE 
                        WHEN NOT EXISTS(SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id) THEN 'critica'
                        WHEN p.description IS NULL OR p.description = '' THEN 'alta'
                        WHEN p.meta_description IS NULL OR p.meta_description = '' THEN 'media'
                        WHEN p.attributes IS NULL OR p.attributes = '{}' THEN 'baixa'
                        ELSE 'melhoria'
                    END as prioridade,
                    CASE 
                        WHEN NOT EXISTS(SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id) THEN 'sem_categoria'
                        WHEN p.description IS NULL OR p.description = '' THEN 'sem_description'
                        WHEN p.meta_description IS NULL OR p.meta_description = '' THEN 'sem_meta_description'
                        WHEN p.attributes IS NULL OR p.attributes = '{}' THEN 'sem_attributes'
                        ELSE 'padronizacao'
                    END as motivo
                FROM products p
                WHERE p.is_active = true
                  AND p.sku NOT IN (${this.progresso.processados.length > 0 ? this.progresso.processados : ['']})
                ORDER BY 
                    CASE 
                        WHEN NOT EXISTS(SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id) THEN 1
                        WHEN p.description IS NULL OR p.description = '' THEN 2
                        WHEN p.meta_description IS NULL OR p.meta_description = '' THEN 3
                        WHEN p.attributes IS NULL OR p.attributes = '{}' THEN 4
                        ELSE 5
                    END,
                    p.created_at DESC
                LIMIT ${limite}
            `;

            if (produtos.length === 0) {
                console.log('🎉 Todos os produtos foram processados!');
                return;
            }

            console.log(`🎯 ${produtos.length} produtos encontrados para processar\n`);

            let sucessos = 0;
            let erros = 0;

            // Processar em lotes de 5
            for (let i = 0; i < produtos.length; i += 5) {
                const lote = produtos.slice(i, i + 5);
                console.log(`📋 === LOTE ${Math.floor(i/5) + 1} (${lote.length} produtos) ===`);

                for (let j = 0; j < lote.length; j++) {
                    const produto = lote[j];
                    const indiceGlobal = i + j + 1;
                    
                    const resultado = await this.processarProduto(produto, indiceGlobal, produtos.length);
                    
                    if (resultado.sucesso) {
                        sucessos++;
                    } else {
                        erros++;
                    }
                }

                console.log(`📊 PROGRESSO: ${i + lote.length}/${produtos.length} (${((i + lote.length)/produtos.length*100).toFixed(1)}%)`);
                console.log(`   ✅ Sucessos: ${sucessos}`);
                console.log(`   ❌ Erros: ${erros}`);

                // Pausa entre lotes
                if (i + 5 < produtos.length) {
                    console.log(`⏳ Pausa de 3s entre lotes...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            // Relatório final
            console.log(`\n🎉 LOTE DE ${produtos.length} PRODUTOS CONCLUÍDO!`);
            console.log(`   ✅ Sucessos neste lote: ${sucessos}`);
            console.log(`   ❌ Erros neste lote: ${erros}`);
            console.log(`   📊 Taxa de sucesso: ${(sucessos/produtos.length*100).toFixed(1)}%`);

            console.log(`\n📊 PROGRESSO GERAL:`);
            console.log(`   📦 Total processado: ${this.progresso.processados.length} produtos`);

            if (this.progresso.erros.length > 0) {
                console.log(`\n❌ PRODUTOS COM ERRO (${this.progresso.erros.length}):`);
                this.progresso.erros.slice(-10).forEach((erro, index) => {
                    console.log(`   ${index + 1}. SKU ${erro.sku}: ${erro.error}`);
                });
                if (this.progresso.erros.length > 10) {
                    console.log(`   ... e mais ${this.progresso.erros.length - 10} erros`);
                }
            }

        } catch (error) {
            console.error('❌ Erro geral:', error);
        } finally {
            await sql.end();
        }
    }
}

// Executar
const enriquecimento = new EnriquecimentoMultiplasCategorias();
enriquecimento.executar(100); 