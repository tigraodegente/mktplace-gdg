#!/usr/bin/env node

import postgres from 'postgres';

// Database connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1
});

console.log('🎨 ===== CORREÇÃO DE CORES - PRODUTOS PRINCIPAIS =====');
console.log('📋 Este script vai corrigir cores dos produtos principais baseado no nome');

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

async function detectarCor(nomeProduto) {
  const nome = nomeProduto.toLowerCase();
  
  // Procurar por cores no nome (ordem importa - mais específico primeiro)
  for (const [palavraChave, corPadrao] of Object.entries(CORES_MAPEAMENTO)) {
    if (nome.includes(palavraChave)) {
      return corPadrao;
    }
  }
  
  return null; // Não conseguiu detectar cor
}

async function buscarOuCriarOpcaoCor() {
  // Verificar se já existe a opção "Cor"
  const opcaoExistente = await sql`
    SELECT id FROM product_options WHERE name = 'Cor' LIMIT 1
  `;
  
  if (opcaoExistente.length > 0) {
    console.log(`✅ Opção "Cor" já existe: ${opcaoExistente[0].id}`);
    return opcaoExistente[0].id;
  }
  
  // Criar opção "Cor" se não existir
  const novaOpcao = await sql`
    INSERT INTO product_options (name, type, is_required, position)
    VALUES ('Cor', 'radio', false, 1)
    RETURNING id
  `;
  
  console.log(`✅ Opção "Cor" criada: ${novaOpcao[0].id}`);
  return novaOpcao[0].id;
}

async function buscarOuCriarValorCor(opcaoId, nomeCor) {
  // Verificar se o valor da cor já existe
  const valorExistente = await sql`
    SELECT id FROM product_option_values 
    WHERE option_id = ${opcaoId} AND value = ${nomeCor}
    LIMIT 1
  `;
  
  if (valorExistente.length > 0) {
    return valorExistente[0].id;
  }
  
  // Criar valor da cor
  const novoValor = await sql`
    INSERT INTO product_option_values (option_id, value, display_value)
    VALUES (${opcaoId}, ${nomeCor}, ${nomeCor})
    RETURNING id
  `;
  
  console.log(`  ➕ Valor cor criado: "${nomeCor}" (ID: ${novoValor[0].id})`);
  return novoValor[0].id;
}

async function criarRelacaoVarianteCor(variantId, valorCorId) {
  // Verificar se já existe a relação
  const relacaoExistente = await sql`
    SELECT id FROM variant_option_values 
    WHERE variant_id = ${variantId} AND option_value_id = ${valorCorId}
    LIMIT 1
  `;
  
  if (relacaoExistente.length > 0) {
    return false; // Já existe
  }
  
  // Criar relação variant → valor da cor
  await sql`
    INSERT INTO variant_option_values (variant_id, option_value_id)
    VALUES (${variantId}, ${valorCorId})
  `;
  
  return true; // Criado
}

async function corrigirCoresProdutosPrincipais() {
  try {
    console.log('\n🔍 ETAPA 1: Identificando produtos principais sem cor...');
    
    // Buscar produtos principais que têm variações mas não têm cor definida
    const produtosSemCor = await sql`
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
    
    console.log(`📊 Encontrados ${produtosSemCor.length} produtos principais sem cor`);
    
    if (produtosSemCor.length === 0) {
      console.log('✅ Todos os produtos já têm cores definidas!');
      return;
    }
    
    console.log('\n🎨 ETAPA 2: Detectando cores baseadas no nome...');
    
    const produtosComCorDetectada = [];
    const produtosSemCorDetectada = [];
    
    for (const produto of produtosSemCor) {
      const corDetectada = await detectarCor(produto.name);
      
      if (corDetectada) {
        produtosComCorDetectada.push({
          ...produto,
          cor_detectada: corDetectada
        });
        console.log(`  ✅ ${produto.sku}: "${produto.name}" → ${corDetectada}`);
      } else {
        produtosSemCorDetectada.push(produto);
        console.log(`  ❓ ${produto.sku}: "${produto.name}" → Cor não detectada`);
      }
    }
    
    console.log(`\n📈 RESULTADO DETECÇÃO:`);
    console.log(`  ✅ Com cor detectada: ${produtosComCorDetectada.length}`);
    console.log(`  ❓ Sem cor detectada: ${produtosSemCorDetectada.length}`);
    
    if (produtosComCorDetectada.length === 0) {
      console.log('❌ Nenhuma cor foi detectada. Verifique o mapeamento.');
      return;
    }
    
    console.log('\n🏗️ ETAPA 3: Preparando estruturas no banco...');
    
    // Garantir que existe a opção "Cor"
    const opcaoCorId = await buscarOuCriarOpcaoCor();
    
    console.log('\n🔧 ETAPA 4: Aplicando correções...');
    
    let corrigidos = 0;
    let erros = 0;
    
    for (const produto of produtosComCorDetectada) {
      try {
        console.log(`\n🔄 Processando ${produto.sku} - ${produto.cor_detectada}:`);
        
        // 1. Buscar ou criar valor da cor
        const valorCorId = await buscarOuCriarValorCor(opcaoCorId, produto.cor_detectada);
        
        // 2. Buscar a variante que corresponde ao produto principal
        const variant = await sql`
          SELECT id FROM product_variants 
          WHERE product_id = ${produto.id} AND sku = ${produto.sku}
          LIMIT 1
        `;
        
        if (variant.length === 0) {
          // Criar variant para o produto principal se não existir
          const novaVariant = await sql`
            INSERT INTO product_variants (product_id, sku, price, original_price, quantity, is_active)
            VALUES (${produto.id}, ${produto.sku}, 
                   (SELECT price FROM products WHERE id = ${produto.id}),
                   (SELECT original_price FROM products WHERE id = ${produto.id}),
                   (SELECT quantity FROM products WHERE id = ${produto.id}),
                   true)
            RETURNING id
          `;
          
          console.log(`  ➕ Variant criada para produto principal: ${novaVariant[0].id}`);
          
          // 3. Criar relação variant → cor
          const relacaoCriada = await criarRelacaoVarianteCor(novaVariant[0].id, valorCorId);
          if (relacaoCriada) {
            console.log(`  ✅ Relação variant→cor criada`);
          }
        } else {
          // 3. Criar relação variant → cor para variant existente
          const relacaoCriada = await criarRelacaoVarianteCor(variant[0].id, valorCorId);
          if (relacaoCriada) {
            console.log(`  ✅ Relação variant→cor criada`);
          } else {
            console.log(`  ⚠️ Relação já existia`);
          }
        }
        
        corrigidos++;
        console.log(`  ✅ ${produto.sku} corrigido!`);
        
      } catch (error) {
        erros++;
        console.error(`  ❌ Erro ao processar ${produto.sku}:`, error.message);
      }
    }
    
    console.log('\n🎉 ===== RESULTADO FINAL =====');
    console.log(`✅ Produtos corrigidos: ${corrigidos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📊 Taxa de sucesso: ${((corrigidos / produtosComCorDetectada.length) * 100).toFixed(1)}%`);
    
    if (produtosSemCorDetectada.length > 0) {
      console.log(`\n⚠️ Produtos que precisam de atenção manual (${produtosSemCorDetectada.length}):`);
      produtosSemCorDetectada.slice(0, 10).forEach(p => {
        console.log(`   ${p.sku}: ${p.name}`);
      });
      if (produtosSemCorDetectada.length > 10) {
        console.log(`   ... e mais ${produtosSemCorDetectada.length - 10} produtos`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await sql.end();
  }
}

// Executar correção
corrigirCoresProdutosPrincipais(); 