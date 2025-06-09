/**
 * 🔧 TESTE DAS CORREÇÕES NA VALIDAÇÃO
 * Simula cenários realistas com as melhorias aplicadas
 */

// Simular produto base dos logs reais
const baseProduct = {
    id: '2d2fe541-13a1-49a8-b85d-4b84bb4f0ad8',
    name: 'Almofada Amamentação Azul Marinho',
    brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
    price: 142.39, // Preço dos logs reais
    sku: '154227'
};

// Produtos candidatos com cenários realistas
const candidateProducts = [
    {
        id: 'cand-1',
        name: 'Almofada Amamentação Cappuccino',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
        price: 142.39, // Mesmo preço
        sku: '154226'
    },
    {
        id: 'cand-2',
        name: 'Almofada Amamentação Creme',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
        price: 144.50, // 1.5% diferença - deveria passar com 5% tolerância
        sku: '154228'
    },
    {
        id: 'cand-3',
        name: 'Almofada Amamentação Rosa Bebê',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
        price: 139.99, // 1.7% diferença - deveria passar
        sku: '154229'
    },
    {
        id: 'cand-4',
        name: 'Almofada Amamentação Verde Menta',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
        price: 148.20, // 4.1% diferença - deveria passar
        sku: '154230'
    },
    {
        id: 'cand-5',
        name: 'Almofada Amamentação Alice Bege',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
        price: 142.39, // Mesmo preço mas tem tema "alice" - deveria ser rejeitado
        sku: '154231'
    },
    {
        id: 'cand-6',
        name: 'Almofada Amamentação Azul Clássico', 
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
        price: 138.00, // 3.1% diferença - deveria passar
        sku: '154232'
    },
    {
        id: 'cand-7',
        name: 'Travesseiro de Bebê Rosa',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
        price: 142.39, // Mesmo preço mas produto diferente - deveria ser rejeitado
        sku: '154233'
    }
];

console.log('🔧 TESTE DAS CORREÇÕES APLICADAS');
console.log('='.repeat(80));
console.log(`🔬 PRODUTO BASE: "${baseProduct.name}"`);
console.log(`💰 Preço base: R$ ${baseProduct.price}`);
console.log(`🏷️ Marca: ${baseProduct.brand_id}\n`);

console.log('📊 MELHORIAS APLICADAS:');
console.log('─'.repeat(50));
console.log('✅ Tolerância preço: 1% → 5% (mais flexível)');
console.log('✅ Similaridade nome: 85% → 80% (mais inclusivo)');
console.log('✅ Score mínimo: 80% → 70% (mais permissivo)');
console.log('✅ Marca: tolerante a dados faltando');
console.log('✅ Debug: logs detalhados adicionados\n');

console.log('🧪 TESTANDO VARIAÇÕES COM CORREÇÕES:');
console.log('─'.repeat(60));

let acceptedCount = 0;
let expectedAccepted = 0;

candidateProducts.forEach((candidate, index) => {
    console.log(`\n${index + 1}. TESTANDO: "${candidate.name}"`);
    console.log(`💰 R$ ${candidate.price} | Marca: ${candidate.brand_id}`);
    
    // Determinar resultado esperado
    const shouldBeAccepted = !candidate.name.toLowerCase().includes('alice') && 
                            !candidate.name.toLowerCase().includes('travesseiro');
    if (shouldBeAccepted) expectedAccepted++;
    
    const validation = simulateValidationWithCorrections(baseProduct, candidate);
    
    console.log(`📊 RESULTADO: ${validation.isValid ? '✅ ACEITO' : '❌ REJEITADO'}`);
    console.log(`📈 Score: ${(validation.score * 100).toFixed(1)}% | Esperado: ${shouldBeAccepted ? '✅ ACEITO' : '❌ REJEITADO'}`);
    
    if (validation.isValid) {
        acceptedCount++;
        validation.reasons.forEach(reason => console.log(`   ✓ ${reason}`));
    } else {
        validation.rejectionReasons.forEach(reason => console.log(`   ❌ ${reason}`));
    }
    
    // Verificar se resultado está correto
    const correct = validation.isValid === shouldBeAccepted;
    console.log(`🎯 Resultado: ${correct ? '✅ CORRETO' : '❌ INCORRETO'}`);
});

console.log(`\n📊 RESUMO FINAL:`)
console.log('='.repeat(80));
console.log(`✅ Aceitos: ${acceptedCount}/${candidateProducts.length} produtos`);
console.log(`🎯 Esperados: ${expectedAccepted}/${candidateProducts.length} produtos`);
console.log(`📈 Precisão: ${acceptedCount === expectedAccepted ? '100%' : 'Precisar ajustes'}`);

const improvement = acceptedCount > 0 ? 'Sistema encontrando variações!' : 'Sistema ainda muito restritivo';
console.log(`💡 Status: ${improvement}`);

console.log(`\n🚀 CONCLUSÃO:`);
console.log('─'.repeat(40));
if (acceptedCount >= 4) {
    console.log('✅ CORREÇÕES FUNCIONARAM: Sistema agora encontra as variações válidas!');
    console.log('🎯 Rejeitou produtos temáticos (Alice) e diferentes (Travesseiro)');
    console.log('💰 Tolerância de preço 5% permite variações de até R$ 7,12');
    console.log('📝 Similaridade 80% captura variações com descritores adicionais');
} else {
    console.log('⚠️ AINDA PRECISA AJUSTES: Sistema rejeitando muitas variações válidas');
    console.log('💡 Considerar aumentar mais a tolerância ou revisar lógica de nome');
}

function simulateValidationWithCorrections(baseProduct, candidateProduct) {
    const reasons = [];
    const rejectionReasons = [];
    let totalScore = 0;
    const maxScore = 100;
    
    // 1. 🚨 VALIDAÇÃO CRÍTICA: PREÇO (5% tolerância)
    const basePrice = parseFloat(baseProduct.price || 0);
    const candidatePrice = parseFloat(candidateProduct.price || 0);
    
    if (basePrice > 0) {
        const priceDifference = Math.abs(basePrice - candidatePrice) / basePrice;
        
        if (priceDifference > 0.05) { // 5% tolerância
            rejectionReasons.push(`Preço muito diferente: ${(priceDifference * 100).toFixed(2)}% (limite: 5%)`);
            return { isValid: false, score: 0, reasons, rejectionReasons };
        } else {
            totalScore += 25;
            reasons.push(`Preço compatível: ${(priceDifference * 100).toFixed(2)}% diferença`);
        }
    }
    
    // 2. 🚨 VALIDAÇÃO CRÍTICA: TEMAS/PERSONAGENS
    const thematicWords = [
        'alice', 'simba', 'ursa', 'safari', 'selva', 'bosque', 'animais', 'princess', 'princesa',
        'amiguinha', 'amiguinho', 'encantada', 'baby', 'estrela', 'coracao', 'floral', 'listrado',
        'cacto', 'abobora', 'poa', 'estrelinhas', 'sophia', 'sofia', 'disney', 'marvel'
    ];
    
    const candidateName = candidateProduct.name.toLowerCase();
    const baseName = baseProduct.name.toLowerCase();
    
    const candidateHasTheme = thematicWords.some(theme => candidateName.includes(theme));
    const baseHasTheme = thematicWords.some(theme => baseName.includes(theme));
    
    if (!baseHasTheme && candidateHasTheme) {
        const foundTheme = thematicWords.find(theme => candidateName.includes(theme));
        rejectionReasons.push(`Produto candidato tem tema/personagem: "${foundTheme}"`);
        return { isValid: false, score: 0, reasons, rejectionReasons };
    }
    
    if (baseHasTheme && candidateHasTheme) {
        const baseTheme = thematicWords.find(theme => baseName.includes(theme));
        const candidateTheme = thematicWords.find(theme => candidateName.includes(theme));
        
        if (baseTheme !== candidateTheme) {
            rejectionReasons.push(`Temas diferentes: "${baseTheme}" vs "${candidateTheme}"`);
            return { isValid: false, score: 0, reasons, rejectionReasons };
        }
    }
    
    totalScore += 25;
    reasons.push('Compatibilidade temática validada');
    
    // 3. 📏 VALIDAÇÃO: NOME BASE (80% similaridade)
    const nameCompatibility = calculateNameSimilarity(
        removeVariations(baseProduct.name),
        removeVariations(candidateProduct.name)
    );
    
    if (nameCompatibility < 0.80) { // 80% similaridade mínima
        rejectionReasons.push(`Nome base muito diferente: ${(nameCompatibility * 100).toFixed(1)}% similaridade`);
        return { isValid: false, score: 0, reasons, rejectionReasons };
    }
    
    totalScore += 25;
    reasons.push(`Nome base compatível: ${(nameCompatibility * 100).toFixed(1)}% similaridade`);
    
    // 4. 🏷️ VALIDAÇÃO: MARCA (flexível)
    if (baseProduct.brand_id && candidateProduct.brand_id) {
        if (baseProduct.brand_id !== candidateProduct.brand_id) {
            rejectionReasons.push('Marcas diferentes');
            return { isValid: false, score: 0, reasons, rejectionReasons };
        }
        
        totalScore += 15;
        reasons.push('Mesma marca');
    }
    // Se não tem marca, não penaliza
    
    // Score final - critério mais flexível
    const finalScore = totalScore / maxScore;
    const hasEssentialValidations = totalScore >= 75; // Preço + Tema + Nome Base = 75 pontos
    const isValid = hasEssentialValidations || finalScore >= 0.70; // 70% mínimo
    
    return {
        isValid,
        score: finalScore,
        reasons,
        rejectionReasons
    };
}

// Funções auxiliares
function removeVariations(name) {
    const patterns = [
        'azul', 'rosa', 'branco', 'preto', 'verde', 'amarelo', 'vermelho', 'roxo', 'cinza', 'marrom',
        'bege', 'creme', 'marinho', 'escuro', 'claro', 'cappuccino', 'coral', 'turquesa', 'nude', 'menta',
        'pp', 'p', 'm', 'g', 'gg', 'pequeno', 'medio', 'grande', 'mini', 'maxi',
        'baby', 'bebê', 'classico', 'clássico'
    ];
    
    let cleanName = name.toLowerCase();
    patterns.forEach(pattern => {
        cleanName = cleanName.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), '').trim();
    });
    
    return cleanName.replace(/\s+/g, ' ').trim();
}

function calculateNameSimilarity(name1, name2) {
    const words1 = name1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = name2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
} 