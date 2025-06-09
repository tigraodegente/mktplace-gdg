import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });

const sql = postgres(process.env.DATABASE_URL);
const ADMIN_API_URL = 'http://localhost:5175/api/ai/enrich';

async function testeEnriquecimento() {
    console.log('🧪 TESTE SIMPLES DE ENRIQUECIMENTO IA\n');
    
    try {
        // 1. Pegar um produto sem categoria para testar
        const produtos = await sql`
            SELECT id, sku, name, category_id, description, tags
            FROM products 
            WHERE category_id IS NULL
            LIMIT 1
        `;
        
        if (produtos.length === 0) {
            console.log('❌ Nenhum produto sem categoria encontrado para teste');
            return;
        }
        
        const produto = produtos[0];
        console.log('📦 PRODUTO DE TESTE:');
        console.log(`   SKU: ${produto.sku}`);
        console.log(`   Nome: ${produto.name}`);
        console.log(`   Tags: ${produto.tags ? produto.tags.join(', ') : 'nenhuma'}\n`);
        
        // 2. Testar chamada para API
        console.log('🔗 Testando conexão com admin-panel...');
        
        const payload = {
            fetchCategories: true,
            fetchBrands: true,
            id: produto.id,
            name: produto.name,
            description: produto.description,
            tags: produto.tags || []
        };
        
        console.log('📡 Enviando requisição para IA...');
        
        const response = await fetch(ADMIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`📡 Status da resposta: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Erro na API:', errorText);
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ IA respondeu com sucesso!');
            console.log('📋 Dados recebidos:');
            
            const data = result.data;
            if (data.category_id) console.log(`   🎯 Categoria sugerida: ${data.category_id}`);
            if (data.description) console.log(`   📝 Description: ${data.description.substring(0, 100)}...`);
            if (data.short_description) console.log(`   📝 Short Description: ${data.short_description}`);
            if (data.meta_description) console.log(`   🔍 Meta Description: ${data.meta_description}`);
            if (data.attributes) console.log(`   🏷️ Attributes: ${Object.keys(data.attributes).join(', ')}`);
            
            console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
            console.log('✅ O script completo deve funcionar corretamente.');
            
        } else {
            console.log('❌ IA retornou erro:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 SOLUÇÃO: Certifique-se que o admin-panel está rodando:');
            console.log('   cd apps/admin-panel && npm run dev');
        }
    } finally {
        await sql.end();
    }
}

testeEnriquecimento(); 