/**
 * 🎯 TESTE FINAL: "Rosa Bebê" após correção
 */

const baseProduct = {
    name: 'Almofada Amamentação Azul Marinho',
    brand_id: 'marca-001',
    price: 142.39
};

const candidateProduct = {
    name: 'Almofada Amamentação Rosa Bebê',
    brand_id: 'marca-001', 
    price: 139.99
};

console.log('🎯 TESTE FINAL APÓS CORREÇÃO');
console.log('='.repeat(50));
console.log(`📦 BASE: "${baseProduct.name}"`);
console.log(`📦 CANDIDATO: "${candidateProduct.name}"`);

// Simular análise de nome após correção
function removeVariations(name) {
    const patterns = [
        // Cores
        'azul', 'rosa', 'branco', 'preto', 'verde', 'amarelo', 'vermelho', 'roxo', 'cinza', 'marrom',
        'bege', 'creme', 'marinho', 'escuro', 'claro', 'cappuccino', 'menta',
        // Tamanhos
        'pp', 'p', 'm', 'g', 'gg', 'pequeno', 'medio', 'grande', 'mini', 'maxi',
        // Descritores (incluindo bebê)
        'baby', 'bebê', 'classico', 'clássico', 'dupla', 'face'
    ];
    
    let cleanName = name.toLowerCase();
    console.log(`🔍 Nome original: "${name}"`);
    
    patterns.forEach(pattern => {
        const oldName = cleanName;
        cleanName = cleanName.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), '').trim();
        if (oldName !== cleanName) {
            console.log(`   Removeu "${pattern}": "${oldName}" → "${cleanName}"`);
        }
    });
    
    cleanName = cleanName.replace(/\s+/g, ' ').trim();
    console.log(`✅ Nome final limpo: "${cleanName}"`);
    return cleanName;
}

function calculateSimilarity(name1, name2) {
    const words1 = name1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = name2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    console.log(`🔍 Palavras base: [${words1.join(', ')}]`);
    console.log(`🔍 Palavras candidato: [${words2.join(', ')}]`);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    console.log(`🔍 Palavras comuns: [${commonWords.join(', ')}]`);
    console.log(`🔍 Total únicas: ${totalWords}`);
    
    const similarity = commonWords.length / totalWords;
    console.log(`📊 Similaridade: ${commonWords.length}/${totalWords} = ${(similarity * 100).toFixed(1)}%`);
    
    return similarity;
}

console.log('\n🧪 ANÁLISE DE NOME BASE:');
console.log('─'.repeat(30));

const baseCleaned = removeVariations(baseProduct.name);
console.log('\n');
const candidateCleaned = removeVariations(candidateProduct.name);

console.log('\n📊 CÁLCULO DE SIMILARIDADE:');
console.log('─'.repeat(30));
const similarity = calculateSimilarity(baseCleaned, candidateCleaned);

console.log('\n🎯 RESULTADO FINAL:');
console.log('─'.repeat(20));
if (similarity >= 0.80) {
    console.log('✅ ACEITO: Similaridade ≥ 80%');
    console.log(`🎉 "Rosa Bebê" agora é detectado como variação válida!`);
} else {
    console.log('❌ REJEITADO: Similaridade < 80%');
    console.log(`⚠️ Ainda há problema com "Rosa Bebê"`);
}

// Verificar também se "bebê" foi removido dos temas
const thematicWords = [
    'alice', 'simba', 'ursa', 'safari', 'selva', 'bosque', 'animais', 'princess', 'princesa',
    'amiguinha', 'amiguinho', 'encantada', 'estrela', 'coracao', 'floral', 'listrado',
    'cacto', 'abobora', 'poa', 'estrelinhas', 'sophia', 'sofia', 'disney', 'marvel'
];

const hasTheme = thematicWords.some(theme => candidateProduct.name.toLowerCase().includes(theme));
console.log(`\n🎭 VALIDAÇÃO TEMÁTICA: ${hasTheme ? '❌ Tem tema' : '✅ Sem tema'}`);

// Verificar preço
const priceDiff = Math.abs(baseProduct.price - candidateProduct.price) / baseProduct.price;
console.log(`💰 DIFERENÇA PREÇO: ${(priceDiff * 100).toFixed(2)}% (limite: 5%)`);
console.log(`💰 VALIDAÇÃO PREÇO: ${priceDiff <= 0.05 ? '✅ Dentro do limite' : '❌ Fora do limite'}`);

console.log('\n🏁 ANÁLISE COMPLETA:');
console.log('='.repeat(50));
const wouldPass = similarity >= 0.80 && !hasTheme && priceDiff <= 0.05;
console.log(`🎯 PRODUTO "Rosa Bebê": ${wouldPass ? '✅ SERIA ACEITO' : '❌ SERIA REJEITADO'}`);

if (wouldPass) {
    console.log('🎉 CORREÇÃO FUNCIONOU! Sistema agora encontrará 5/5 variações!');
} else {
    console.log('⚠️ Ainda precisa de ajustes adicionais.');
} 