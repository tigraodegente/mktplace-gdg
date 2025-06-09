console.log('🧪 TESTE: Verificando tolerâncias ajustadas...');
console.log('📊 Mudanças aplicadas:');
console.log('   - Tolerância de peso: 5% → 20%');
console.log('   - Score mínimo: 70% → 60%');
console.log('   - Score essencial: 75 → 65 pontos');
console.log('');

// Testar o endpoint
async function testAdjustedTolerances() {
    try {
        console.log('🔍 Testando o produto: Almofada Amamentação Azul Marinho');
        
        const response = await fetch('http://localhost:5173/api/ai/enrich', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'enrich_field',
                field: 'variations',
                product_data: {
                    id: '2d2fe541-13a1-49a8-b85d-4b84bb4f0ad8',
                    name: 'Almofada Amamentação Azul Marinho',
                    brand_id: '5885e6cf-63ef-4f26-a7e3-1129f285703c',
                    price: 83.51
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        console.log('📊 RESULTADO DO TESTE:');
        console.log(`   - Status: ${result.success ? '✅ Sucesso' : '❌ Erro'}`);
        
        if (result.success && result.data) {
            const variations = result.data.related_products || [];
            console.log(`   - Variações encontradas: ${variations.length}`);
            
            if (variations.length > 0) {
                console.log('\n🎨 VARIAÇÕES ENCONTRADAS:');
                variations.forEach((v, i) => {
                    console.log(`   ${i+1}. ${v.name}`);
                    console.log(`      - Preço: R$ ${v.price}`);
                    console.log(`      - Diferença: ${v.difference}`);
                    console.log(`      - Confiança: ${(v.confidence * 100).toFixed(1)}%`);
                });
                
                console.log(`\n✅ SUCESSO: Encontradas ${variations.length} variações (vs 3 anteriores)`);
                if (variations.length > 3) {
                    console.log('🚀 MELHORIA: Mais variações encontradas com tolerâncias ajustadas!');
                } else {
                    console.log('📝 NOTA: Mesmo número de variações - pode precisar de mais ajustes');
                }
            } else {
                console.log('\n❌ PROBLEMA: Nenhuma variação encontrada');
            }
        } else {
            console.log(`   - Erro: ${result.error || 'Erro desconhecido'}`);
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Executar o teste
testAdjustedTolerances(); 