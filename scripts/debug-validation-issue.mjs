/**
 * 🔍 SCRIPT PARA DIAGNOSTICAR PROBLEMA NA VALIDAÇÃO
 * Reproduz exatamente o cenário dos logs para entender por que variações válidas estão sendo rejeitadas
 */

// Simular dados dos logs originais
const baseProduct = {
    id: '2d2fe541-13a1-49a8-b85d-4b84bb4f0ad8',
    name: 'Almofada Amamentação Azul Marinho',
    brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
    price: 100.00, // Assumindo preço base
    sku: 'ALM-001'
};

// Produtos que foram rejeitados mas deveriam ser aceitos
const problemProducts = [
    {
        id: 'test-1',
        name: 'Almofada Amamentação Cappuccino',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c', // Mesma marca
        price: 100.00, // Mesmo preço
        sku: 'ALM-002'
    },
    {
        id: 'test-2', 
        name: 'Almofada Amamentação Creme',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c', // Mesma marca
        price: 100.00, // Mesmo preço
        sku: 'ALM-003'
    },
    {
        id: 'test-3',
        name: 'Almofada Amamentação Rosa Bebê',
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c', // Mesma marca  
        price: 100.50, // 0.5% diferença - deveria passar
        sku: 'ALM-004'
    },
    {
        id: 'test-4',
        name: 'Almofada Amamentação Verde Menta', 
        brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c', // Mesma marca
        price: 99.80, // 0.2% diferença - deveria passar
        sku: 'ALM-005'
    }
];

console.log('🔍 DIAGNÓSTICO DO PROBLEMA DE VALIDAÇÃO');
console.log('='.repeat(80));
console.log(`🔬 PRODUTO BASE: "${baseProduct.name}"`);
console.log(`💰 Preço base: R$ ${baseProduct.price}`);
console.log(`🏷️ Marca: ${baseProduct.brand_id}\n`);

console.log('🧪 TESTANDO PRODUTOS QUE DEVERIAM SER ACEITOS:');
console.log('─'.repeat(60));

problemProducts.forEach((candidate, index) => {
    console.log(`\n${index + 1}. TESTANDO: "${candidate.name}"`);
    console.log(`💰 Preço: R$ ${candidate.price} | Marca: ${candidate.brand_id}`);
    
    // Simular validação passo a passo
    const validation = simulateValidation(baseProduct, candidate);
    
    console.log(`📊 RESULTADO: ${validation.isValid ? '✅ ACEITO' : '❌ REJEITADO'}`);
    console.log(`📈 Score final: ${(validation.score * 100).toFixed(1)}%`);
    
    if (validation.isValid) {
        validation.reasons.forEach(reason => console.log(`   ✓ ${reason}`));
    } else {
        validation.rejectionReasons.forEach(reason => console.log(`   ❌ ${reason}`));
    }
    
    // Análise detalhada
    console.log(`🔍 ANÁLISE DETALHADA:`);
    validation.steps.forEach(step => {
        console.log(`   ${step.status} ${step.name}: ${step.details}`);
    });
});

console.log(`\n💡 DIAGNÓSTICO FINAL:`);
console.log('='.repeat(80));

function simulateValidation(baseProduct, candidateProduct) {
    const reasons = [];
    const rejectionReasons = [];
    const steps = [];
    let totalScore = 0;
    const maxScore = 100;
    
    // 1. 🚨 VALIDAÇÃO CRÍTICA: PREÇO (tolerância 1%)
    const basePrice = parseFloat(baseProduct.price || 0);
    const candidatePrice = parseFloat(candidateProduct.price || 0);
    
    if (basePrice > 0) {
        const priceDifference = Math.abs(basePrice - candidatePrice) / basePrice;
        
        if (priceDifference > 0.01) { // 1% tolerância
            rejectionReasons.push(`Preço muito diferente: ${(priceDifference * 100).toFixed(2)}% (limite: 1%)`);
            steps.push({
                status: '❌',
                name: 'PREÇO',
                details: `${(priceDifference * 100).toFixed(2)}% diferença > 1% limite`
            });
            return { isValid: false, score: 0, reasons, rejectionReasons, steps };
        } else {
            totalScore += 25;
            reasons.push(`Preço compatível: ${(priceDifference * 100).toFixed(2)}% diferença`);
            steps.push({
                status: '✅',
                name: 'PREÇO',
                details: `${(priceDifference * 100).toFixed(2)}% diferença ≤ 1% limite (+25 pontos)`
            });
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
    
    // Se o base não tem tema, mas candidato tem = rejeitar
    if (!baseHasTheme && candidateHasTheme) {
        const foundTheme = thematicWords.find(theme => candidateName.includes(theme));
        rejectionReasons.push(`Produto candidato tem tema/personagem: "${foundTheme}"`);
        steps.push({
            status: '❌',
            name: 'TEMA',
            details: `Candidato tem tema "${foundTheme}", base não tem`
        });
        return { isValid: false, score: 0, reasons, rejectionReasons, steps };
    }
    
    // Se ambos têm tema, deve ser o mesmo
    if (baseHasTheme && candidateHasTheme) {
        const baseTheme = thematicWords.find(theme => baseName.includes(theme));
        const candidateTheme = thematicWords.find(theme => candidateName.includes(theme));
        
        if (baseTheme !== candidateTheme) {
            rejectionReasons.push(`Temas diferentes: "${baseTheme}" vs "${candidateTheme}"`);
            steps.push({
                status: '❌',
                name: 'TEMA',
                details: `Temas diferentes: "${baseTheme}" vs "${candidateTheme}"`
            });
            return { isValid: false, score: 0, reasons, rejectionReasons, steps };
        }
    }
    
    totalScore += 25;
    reasons.push('Compatibilidade temática validada');
    steps.push({
        status: '✅',
        name: 'TEMA',
        details: 'Compatibilidade temática validada (+25 pontos)'
    });
    
    // 3. 📏 VALIDAÇÃO: NOME BASE (simulada)
    const nameCompatibility = calculateSimpleNameSimilarity(
        removeVariations(baseProduct.name),
        removeVariations(candidateProduct.name)
    );
    
    if (nameCompatibility < 0.85) { // 85% similaridade mínima
        rejectionReasons.push(`Nome base muito diferente: ${(nameCompatibility * 100).toFixed(1)}% similaridade`);
        steps.push({
            status: '❌',
            name: 'NOME',
            details: `${(nameCompatibility * 100).toFixed(1)}% similaridade < 85% mínimo`
        });
        return { isValid: false, score: 0, reasons, rejectionReasons, steps };
    }
    
    totalScore += 25;
    reasons.push(`Nome base compatível: ${(nameCompatibility * 100).toFixed(1)}% similaridade`);
    steps.push({
        status: '✅',
        name: 'NOME',
        details: `${(nameCompatibility * 100).toFixed(1)}% similaridade ≥ 85% mínimo (+25 pontos)`
    });
    
    // 4. 🏷️ VALIDAÇÃO: MARCA
    if (baseProduct.brand_id && candidateProduct.brand_id) {
        if (baseProduct.brand_id !== candidateProduct.brand_id) {
            rejectionReasons.push('Marcas diferentes');
            steps.push({
                status: '❌',
                name: 'MARCA',
                details: 'Marcas diferentes'
            });
            return { isValid: false, score: 0, reasons, rejectionReasons, steps };
        }
        
        totalScore += 15;
        reasons.push('Mesma marca');
        steps.push({
            status: '✅',
            name: 'MARCA',
            details: 'Mesma marca (+15 pontos)'
        });
    } else {
        steps.push({
            status: '⚠️',
            name: 'MARCA',
            details: 'Marca não verificada (dados insuficientes)'
        });
    }
    
    // Score final - critério flexível
    const finalScore = totalScore / maxScore;
    const hasEssentialValidations = totalScore >= 75; // Preço + Tema + Nome Base = 75 pontos
    const isValid = hasEssentialValidations || finalScore >= 0.8;
    
    steps.push({
        status: isValid ? '✅' : '❌',
        name: 'SCORE FINAL',
        details: `${totalScore}/${maxScore} pontos = ${(finalScore * 100).toFixed(1)}% | Críticas: ${hasEssentialValidations ? 'OK' : 'FAIL'}`
    });
    
    return {
        isValid,
        score: finalScore,
        reasons,
        rejectionReasons,
        steps
    };
}

// Funções auxiliares simplificadas
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

function calculateSimpleNameSimilarity(name1, name2) {
    const words1 = name1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = name2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
} 