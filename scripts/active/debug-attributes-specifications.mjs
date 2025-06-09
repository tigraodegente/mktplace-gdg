import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);

async function debugAttributesSpecifications() {
    console.log('🔍 DEBUGANDO ATTRIBUTES E SPECIFICATIONS...\n');

    try {
        // Pegar um produto que acabamos de processar
        const [produto] = await sql`
            SELECT id, sku, name, attributes, specifications, updated_at
            FROM products 
            WHERE sku = '121479'  -- Último produto processado
        `;

        if (!produto) {
            console.log('❌ Produto não encontrado');
            return;
        }

        console.log('📦 PRODUTO:', produto.name);
        console.log('📅 Última atualização:', produto.updated_at);
        console.log('\n📋 CAMPOS ATUAIS NO BANCO:');
        console.log('   Attributes tipo:', typeof produto.attributes);
        console.log('   Attributes valor:', produto.attributes);
        console.log('   Specifications tipo:', typeof produto.specifications);
        console.log('   Specifications valor:', produto.specifications);

        // Testar salvamento manual de attributes e specifications
        console.log('\n🧪 TESTANDO SALVAMENTO MANUAL...');

        const testAttributes = {
            "Cor": ["Amarela"],
            "Quantidade": ["30 unidades"],
            "Tamanho": ["5,5cm"]
        };

        const testSpecifications = {
            "Material": "Vinil autocolante",
            "Dimensões": "5,5cm (cada estrela)",
            "Quantidade": "30 unidades por kit"
        };

        console.log('📝 Dados de teste:');
        console.log('   Attributes:', JSON.stringify(testAttributes));
        console.log('   Specifications:', JSON.stringify(testSpecifications));

        // Tentar atualizar
        try {
            const result = await sql`
                UPDATE products 
                SET 
                    attributes = ${JSON.stringify(testAttributes)}::jsonb,
                    specifications = ${JSON.stringify(testSpecifications)}::jsonb,
                    updated_at = NOW()
                WHERE id = ${produto.id}
            `;

            console.log('\n✅ UPDATE executado com sucesso!');
            console.log('📊 Linhas afetadas:', result.count);

            // Verificar se salvou
            const [produtoAtualizado] = await sql`
                SELECT attributes, specifications, updated_at
                FROM products 
                WHERE id = ${produto.id}
            `;

            console.log('\n📋 RESULTADO APÓS UPDATE:');
            console.log('   Attributes:', produtoAtualizado.attributes);
            console.log('   Specifications:', produtoAtualizado.specifications);
            console.log('   Updated at:', produtoAtualizado.updated_at);

            // Verificar se os campos estão vazios
            const attrsCount = produtoAtualizado.attributes && typeof produtoAtualizado.attributes === 'object' 
                ? Object.keys(produtoAtualizado.attributes).length 
                : 0;
            const specsCount = produtoAtualizado.specifications && typeof produtoAtualizado.specifications === 'object' 
                ? Object.keys(produtoAtualizado.specifications).length 
                : 0;

            console.log('\n📊 CONTADORES:');
            console.log('   Attributes count:', attrsCount);
            console.log('   Specifications count:', specsCount);

        } catch (updateError) {
            console.error('❌ Erro no UPDATE:', updateError);
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await sql.end();
    }
}

debugAttributesSpecifications(); 