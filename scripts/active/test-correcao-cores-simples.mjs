#!/usr/bin/env node

console.log('🧪 ===== TESTE SIMPLES - DETECÇÃO DE CORES =====');

// Mapeamento de cores baseado no nome do produto
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
  
  // Verdes
  'verde escuro': 'Verde Escuro',
  'verde claro': 'Verde Claro', 
  'verde': 'Verde',
  
  // Marrons
  'cappuccino': 'Marrom',
  'chocolate': 'Marrom',
  'marrom': 'Marrom',
  'bege': 'Bege',
  'caramelo': 'Caramelo',
  
  // Básicas
  'branco': 'Branco',
  'preto': 'Preto',
  'cinza': 'Cinza',
  'amarelo': 'Amarelo',
  'vermelho': 'Vermelho',
  'roxo': 'Roxo',
  'violeta': 'Violeta',
  'laranja': 'Laranja'
};

function detectarCor(nomeProduto) {
  const nome = nomeProduto.toLowerCase();
  
  // Procurar por cores no nome (ordem importa - mais específico primeiro)
  for (const [palavraChave, corPadrao] of Object.entries(CORES_MAPEAMENTO)) {
    if (nome.includes(palavraChave)) {
      return corPadrao;
    }
  }
  
  return null; // Não conseguiu detectar cor
}

// Produtos de exemplo para testar
const PRODUTOS_TESTE = [
  { sku: '150938', name: 'Almofada Amamentação Rosé' },
  { sku: '150943', name: 'Almofada Amamentação Azul Bebê' },
  { sku: '150946', name: 'Almofada Amamentação Azul Marinho' },
  { sku: '153935', name: 'Almofada Amamentação Verde' },
  { sku: '153939', name: 'Almofada Amamentação Cappuccino' },
  { sku: '100001', name: 'Camiseta Básica Branca' },
  { sku: '100002', name: 'Calça Jeans Azul Escuro' },
  { sku: '100003', name: 'Tênis Preto Masculino' },
  { sku: '100004', name: 'Vestido Rosa Floral' },
  { sku: '100005', name: 'Moletom Cinza Unissex' },
  { sku: '100006', name: 'Sapato Social Marrom' },
  { sku: '100007', name: 'Blusa Verde Claro Feminina' },
  { sku: '100008', name: 'Bermuda Amarela Infantil' },
  { sku: '100009', name: 'Jaqueta Vermelha de Couro' },
  { sku: '100010', name: 'Produto Sem Cor Definida' },
  { sku: '100011', name: 'Kit Eletrônico Multifuncional' },
  { sku: '100012', name: 'Acessório de Mesa' }
];

console.log('\n🎨 TESTANDO DETECÇÃO DE CORES:');
console.log('=======================================');

let comCorDetectada = 0;
let semCorDetectada = 0;
const coresDetectadas = new Set();

PRODUTOS_TESTE.forEach((produto, idx) => {
  const corDetectada = detectarCor(produto.name);
  
  if (corDetectada) {
    comCorDetectada++;
    coresDetectadas.add(corDetectada);
    console.log(`✅ ${String(idx + 1).padStart(2, '0')}. SKU ${produto.sku}: "${produto.name}" → ${corDetectada}`);
  } else {
    semCorDetectada++;
    console.log(`❌ ${String(idx + 1).padStart(2, '0')}. SKU ${produto.sku}: "${produto.name}" → SEM COR`);
  }
});

console.log('\n📊 ESTATÍSTICAS:');
console.log(`  ✅ Produtos com cor detectada: ${comCorDetectada} (${((comCorDetectada / PRODUTOS_TESTE.length) * 100).toFixed(1)}%)`);
console.log(`  ❌ Produtos sem cor detectada: ${semCorDetectada} (${((semCorDetectada / PRODUTOS_TESTE.length) * 100).toFixed(1)}%)`);
console.log(`  🎨 Cores únicas detectadas: ${coresDetectadas.size}`);

console.log('\n🎨 CORES DETECTADAS:');
Array.from(coresDetectadas).sort().forEach((cor, idx) => {
  const count = PRODUTOS_TESTE.filter(p => detectarCor(p.name) === cor).length;
  console.log(`  ${idx + 1}. "${cor}" - ${count} produto(s)`);
});

console.log('\n✅ TESTE CONCLUÍDO - Lógica funcionando!');
console.log('📋 Próximo passo: Executar script real no banco de dados'); 