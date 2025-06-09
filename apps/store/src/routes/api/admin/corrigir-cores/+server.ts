import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// Mapeamento de cores baseado no nome do produto (ordem importa!)
const CORES_MAPEAMENTO = {
  // Variações de Rosa/Rosé (mais específico primeiro)
  'rosé': 'Rosé',
  'rose': 'Rosé', 
  'rosa': 'Rosa',
  
  // Azuis (mais específico primeiro)
  'azul marinho': 'Azul Marinho',
  'azul escuro': 'Azul Escuro', 
  'azul bebe': 'Azul Bebê',
  'azul bebê': 'Azul Bebê',
  'azul claro': 'Azul Claro',
  'azul': 'Azul',
  
  // Verdes (mais específico primeiro)
  'verde escuro': 'Verde Escuro',
  'verde claro': 'Verde Claro', 
  'verde': 'Verde',
  
  // Marrons e similares
  'cappuccino': 'Marrom',
  'chocolate': 'Marrom',
  'marrom': 'Marrom',
  'bege': 'Bege',
  'caramelo': 'Caramelo',
  
  // Básicas (adicionar mais variações comuns)
  'branca': 'Branco',
  'branco': 'Branco',
  'preta': 'Preto', 
  'preto': 'Preto',
  'cinza': 'Cinza',
  'amarela': 'Amarelo',
  'amarelo': 'Amarelo',
  'vermelha': 'Vermelho',
  'vermelho': 'Vermelho',
  'roxa': 'Roxo',
  'roxo': 'Roxo',
  'violeta': 'Violeta',
  'laranja': 'Laranja'
};

function detectarCor(nomeProduto: string): string | null {
  const nome = nomeProduto.toLowerCase();
  
  // Procurar por cores no nome (ordem importa - mais específico primeiro)
  for (const [palavraChave, corPadrao] of Object.entries(CORES_MAPEAMENTO)) {
    if (nome.includes(palavraChave)) {
      return corPadrao;
    }
  }
  
  return null; // Não conseguiu detectar cor
}

async function buscarOuCriarOpcaoCor(db: any) {
  // Verificar se já existe a opção "Cor"
  const opcaoExistente = await db.query`
    SELECT id FROM product_options WHERE name = 'Cor' LIMIT 1
  `;
  
  if (opcaoExistente.length > 0) {
    return opcaoExistente[0].id;
  }
  
  // Criar opção "Cor" se não existir
  const novaOpcao = await db.query`
    INSERT INTO product_options (name, type, is_required, position)
    VALUES ('Cor', 'radio', false, 1)
    RETURNING id
  `;
  
  return novaOpcao[0].id;
}

async function buscarOuCriarValorCor(db: any, opcaoId: string, nomeCor: string) {
  // Verificar se o valor da cor já existe
  const valorExistente = await db.query`
    SELECT id FROM product_option_values 
    WHERE option_id = ${opcaoId} AND value = ${nomeCor}
    LIMIT 1
  `;
  
  if (valorExistente.length > 0) {
    return valorExistente[0].id;
  }
  
  // Criar valor da cor
  const novoValor = await db.query`
    INSERT INTO product_option_values (option_id, value, display_value)
    VALUES (${opcaoId}, ${nomeCor}, ${nomeCor})
    RETURNING id
  `;
  
  return novoValor[0].id;
}

async function criarRelacaoVarianteCor(db: any, variantId: string, valorCorId: string) {
  // Verificar se já existe a relação
  const relacaoExistente = await db.query`
    SELECT id FROM variant_option_values 
    WHERE variant_id = ${variantId} AND option_value_id = ${valorCorId}
    LIMIT 1
  `;
  
  if (relacaoExistente.length > 0) {
    return false; // Já existe
  }
  
  // Criar relação variant → valor da cor
  await db.query`
    INSERT INTO variant_option_values (variant_id, option_value_id)
    VALUES (${variantId}, ${valorCorId})
  `;
  
  return true; // Criado
}

export const POST: RequestHandler = async ({ platform, url }) => {
  try {
    const mode = url.searchParams.get('mode') || 'test'; // 'test' ou 'execute'
    
    console.log(`🎨 ===== CORREÇÃO DE CORES VIA API (${mode.toUpperCase()}) =====`);
    
    const db = getDatabase(platform);
    
    console.log('🔍 ETAPA 1: Identificando produtos principais sem cor...');
    
         // Buscar produtos principais que têm variações mas não têm cor definida
     let produtosSemCor: any[];
     
     if (mode === 'test') {
       produtosSemCor = await db.query`
         SELECT p.id, p.sku, p.name, 
                (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) as total_variacoes
         FROM products p
         WHERE p.is_variant = false 
           AND p.is_active = true
           AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true)
           AND NOT EXISTS (
             SELECT 1 FROM product_variants pv2
             INNER JOIN variant_option_values vov ON pv2.id = vov.variant_id
             INNER JOIN product_option_values pov ON vov.option_value_id = pov.id
             INNER JOIN product_options po ON pov.option_id = po.id
             WHERE pv2.product_id = p.id AND pv2.sku = p.sku AND po.name = 'Cor'
           )
         ORDER BY total_variacoes DESC
         LIMIT 20
       `;
     } else {
       produtosSemCor = await db.query`
         SELECT p.id, p.sku, p.name, 
                (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) as total_variacoes
         FROM products p
         WHERE p.is_variant = false 
           AND p.is_active = true
           AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true)
           AND NOT EXISTS (
             SELECT 1 FROM product_variants pv2
             INNER JOIN variant_option_values vov ON pv2.id = vov.variant_id
             INNER JOIN product_option_values pov ON vov.option_value_id = pov.id
             INNER JOIN product_options po ON pov.option_id = po.id
             WHERE pv2.product_id = p.id AND pv2.sku = p.sku AND po.name = 'Cor'
           )
         ORDER BY total_variacoes DESC
       `;
     }
    
    console.log(`📊 Encontrados ${produtosSemCor.length} produtos principais sem cor`);
    
    if (produtosSemCor.length === 0) {
      return json({
        success: true,
        message: 'Todos os produtos já têm cores definidas!',
        stats: { total: 0, corrigidos: 0, semCor: 0 }
      });
    }
    
    console.log('🎨 ETAPA 2: Detectando cores baseadas no nome...');
    
    const produtosComCorDetectada = [];
    const produtosSemCorDetectada = [];
    const coresDetectadas = new Set();
    
    for (const produto of produtosSemCor) {
      const corDetectada = detectarCor(produto.name);
      
      if (corDetectada) {
        produtosComCorDetectada.push({
          ...produto,
          cor_detectada: corDetectada
        });
        coresDetectadas.add(corDetectada);
      } else {
        produtosSemCorDetectada.push(produto);
      }
    }
    
    console.log(`📈 Detecção: ${produtosComCorDetectada.length} com cor, ${produtosSemCorDetectada.length} sem cor`);
    
    if (mode === 'test') {
      // Apenas retornar o que seria feito
      return json({
        success: true,
        mode: 'test',
        stats: {
          total: produtosSemCor.length,
          comCorDetectada: produtosComCorDetectada.length,
          semCorDetectada: produtosSemCorDetectada.length,
          coresUnicas: coresDetectadas.size
        },
        cores: Array.from(coresDetectadas).sort(),
        exemplos: produtosComCorDetectada.slice(0, 10).map(p => ({
          sku: p.sku,
          nome: p.name,
          corDetectada: p.cor_detectada
        }))
      });
    }
    
    // Modo executar - fazer as alterações
    if (produtosComCorDetectada.length === 0) {
      return json({
        success: false,
        message: 'Nenhuma cor foi detectada'
      });
    }
    
    console.log('🏗️ ETAPA 3: Preparando estruturas no banco...');
    
    // Garantir que existe a opção "Cor"
    const opcaoCorId = await buscarOuCriarOpcaoCor(db);
    
    console.log('🔧 ETAPA 4: Aplicando correções...');
    
    let corrigidos = 0;
    let erros = 0;
    
    for (const produto of produtosComCorDetectada) {
      try {
        // 1. Buscar ou criar valor da cor
        const valorCorId = await buscarOuCriarValorCor(db, opcaoCorId, produto.cor_detectada);
        
        // 2. Buscar a variante que corresponde ao produto principal
        const variant = await db.query`
          SELECT id FROM product_variants 
          WHERE product_id = ${produto.id} AND sku = ${produto.sku}
          LIMIT 1
        `;
        
        if (variant.length === 0) {
          // Criar variant para o produto principal se não existir
          const novaVariant = await db.query`
            INSERT INTO product_variants (product_id, sku, price, original_price, quantity, is_active)
            VALUES (${produto.id}, ${produto.sku}, 
                   (SELECT price FROM products WHERE id = ${produto.id}),
                   (SELECT original_price FROM products WHERE id = ${produto.id}),
                   (SELECT quantity FROM products WHERE id = ${produto.id}),
                   true)
            RETURNING id
          `;
          
          // 3. Criar relação variant → cor
          await criarRelacaoVarianteCor(db, novaVariant[0].id, valorCorId);
        } else {
          // 3. Criar relação variant → cor para variant existente
          await criarRelacaoVarianteCor(db, variant[0].id, valorCorId);
        }
        
        corrigidos++;
        
      } catch (error) {
        erros++;
        console.error(`❌ Erro ao processar ${produto.sku}:`, error);
      }
    }
    
    console.log(`🎉 Correção concluída: ${corrigidos} corrigidos, ${erros} erros`);
    
    return json({
      success: true,
      mode: 'execute',
      stats: {
        total: produtosSemCor.length,
        comCorDetectada: produtosComCorDetectada.length,
        semCorDetectada: produtosSemCorDetectada.length,
        corrigidos,
        erros,
        coresUnicas: coresDetectadas.size
      },
      cores: Array.from(coresDetectadas).sort()
    });
    
  } catch (error) {
    console.error('❌ Erro na correção de cores:', error);
    return json({
      success: false,
      error: 'Erro interno ao corrigir cores'
    }, { status: 500 });
  }
}; 