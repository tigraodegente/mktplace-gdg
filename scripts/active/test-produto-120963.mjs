import postgres from 'postgres';
import dotenv from 'dotenv';

const fetch = globalThis.fetch;
dotenv.config({ path: '.env.develop' });

const sql = postgres(process.env.DATABASE_URL);
const ADMIN_API_URL = 'http://localhost:5174/api/ai/enrich';

async function testarProduto120963() {
    console.log('🔍 TESTANDO PRODUTO SKU 120963...\n');

    try {
        // Buscar dados completos do produto
        const [produto] = await sql`
            SELECT id, sku, name, description, category_id, brand_id, price, tags
            FROM products 
            WHERE sku = '120963'
        `;

        if (!produto) {
            console.log('❌ Produto não encontrado');
            return;
        }

        console.log('📦 DADOS DO PRODUTO:');
        console.log('   Nome:', produto.name);
        console.log('   Descrição:', produto.description?.length || 0, 'chars');
        console.log('   Price:', produto.price);
        console.log('   Brand ID:', produto.brand_id);
        console.log('   Tags:', produto.tags?.length || 0);

        // Testar com API
        const payload = {
            fetchCategories: true,
            fetchBrands: true,
            id: produto.id,
            name: produto.name,
            description: produto.description || '',
            category_id: produto.category_id,
            tags: produto.tags || [],
            price: produto.price || 0,
            brand_id: produto.brand_id
        };

        console.log('\n🤖 Chamando API...');
        
        const response = await fetch(ADMIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        console.log('📡 Status:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ SUCESSO!');
            console.log('🎯 Campos retornados:', Object.keys(result.data).length);
            
            // Mostrar campos importantes
            console.log('\n📋 CAMPOS PRINCIPAIS:');
            console.log('   Category ID:', result.data.category_id || '❌ NULL');
            console.log('   Short Description:', result.data.short_description ? '✅ ' + result.data.short_description.length + ' chars' : '❌ NULL');
            console.log('   Meta Description:', result.data.meta_description ? '✅ ' + result.data.meta_description.length + ' chars' : '❌ NULL');
            console.log('   Attributes:', result.data.attributes ? '✅ ' + Object.keys(result.data.attributes).length + ' attrs' : '❌ NULL');
            console.log('   Specifications:', result.data.specifications ? '✅ ' + Object.keys(result.data.specifications).length + ' specs' : '❌ NULL');
            
        } else {
            const errorText = await response.text();
            console.log('❌ ERRO:', errorText);
            
            try {
                const errorObj = JSON.parse(errorText);
                console.log('📋 Erro estruturado:', errorObj);
            } catch (e) {
                console.log('📋 Erro como texto:', errorText);
            }
        }

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await sql.end();
    }
}

testarProduto120963(); 