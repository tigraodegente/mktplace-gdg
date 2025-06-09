// Usar fetch nativo do Node.js 18+
const fetch = globalThis.fetch;

const ADMIN_API_URL = 'http://localhost:5174/api/ai/enrich';

async function testarProdutoSimples() {
    console.log('🧪 TESTANDO PRODUTO SIMPLES...\n');

    const payloadSimples = {
        fetchCategories: true,
        fetchBrands: true,
        id: "test-simples",
        name: "Camiseta Azul",
        description: "Uma camiseta azul básica",
        category_id: null,
        tags: ["teste"],
        price: 50.00,
        brand_id: null
    };

    try {
        console.log('📤 Enviando produto simples...');
        
        const response = await fetch(ADMIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payloadSimples)
        });

        console.log('📡 Status:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ SUCESSO!');
            console.log('🎯 Campos retornados:', Object.keys(result.data).length);
            console.log('🏷️  Category ID:', result.data.category_id ? '✅ Definido' : '❌ NULL');
            console.log('📄 Short Description:', result.data.short_description ? '✅ Preenchido' : '❌ Vazio');
            console.log('🔍 Meta Description:', result.data.meta_description ? '✅ Preenchido' : '❌ Vazio');
        } else {
            const error = await response.text();
            console.log('❌ ERRO:', error);
        }

    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

testarProdutoSimples(); 