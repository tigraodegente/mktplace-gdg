import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function testAdminVariacoes() {
    console.log('🧪 Testando novo sistema de variações do admin-panel...\n');
    
    try {
        const productId = '2d2fe541-13a1-49a8-b85d-4b84bb4f0ad8'; // Almofada Azul Marinho
        
        // Simular a mesma lógica do endpoint criado
        console.log(`🔍 Testando produto ${productId}`);
        
        // 1. Verificar se o produto é uma variação
        const produto = await sql`
            SELECT p.id, p.name, p.sku, p.is_variant
            FROM products p 
            WHERE p.id = ${productId}
        `;
        
        if (produto.length === 0) {
            console.log('❌ Produto não encontrado!');
            return;
        }
        
        const produtoAtual = produto[0];
        console.log('📦 PRODUTO:');
        console.log(`   Nome: ${produtoAtual.name}`);
        console.log(`   SKU: ${produtoAtual.sku}`);
        console.log(`   É variação: ${produtoAtual.is_variant}`);
        
        let variacoesReais = [];
        
        // 2. Se é variação, buscar produto principal e suas variações
        if (produtoAtual.is_variant) {
            console.log(`\n📦 Produto é uma variação, buscando família...`);
            
            // Encontrar produto principal
            const principal = await sql`
                SELECT p.id, p.name, p.sku
                FROM products p
                INNER JOIN product_variants pv ON p.id = pv.product_id
                WHERE pv.sku = ${produtoAtual.sku}
                LIMIT 1
            `;
            
            if (principal.length > 0) {
                console.log(`🎯 Produto principal: ${principal[0].name} (ID: ${principal[0].id})`);
                
                // Buscar todas as variações do produto principal
                variacoesReais = await sql`
                    SELECT 
                        pv.id as variant_id,
                        pv.sku, 
                        pv.price, 
                        pv.quantity as stock, 
                        pv.is_active,
                        p2.name as variant_name,
                        -- Buscar cores/opções
                        COALESCE(
                            json_object_agg(po.name, pov.value) FILTER (WHERE po.name IS NOT NULL),
                            '{}'::json
                        ) as option_values
                    FROM product_variants pv
                    INNER JOIN products p2 ON pv.sku = p2.sku
                    LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
                    LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
                    LEFT JOIN product_options po ON po.id = pov.option_id
                    WHERE pv.product_id = ${principal[0].id} AND pv.is_active = true
                    GROUP BY pv.id, pv.sku, pv.price, pv.quantity, pv.is_active, p2.name
                    ORDER BY pv.created_at ASC
                `;
            }
        }
        
        console.log(`\n✅ VARIAÇÕES REAIS ENCONTRADAS: ${variacoesReais.length}`);
        variacoesReais.forEach((v, idx) => {
            console.log(`   ${idx + 1}. SKU ${v.sku} - ${v.variant_name} - R$ ${v.price}`);
            console.log(`      Opções: ${JSON.stringify(v.option_values)}`);
        });
        
        // 3. Comparar com busca de produtos similares (sistema IA antigo)
        const produtosSimilares = await sql`
            SELECT p.id, p.name, p.sku, p.price
            FROM products p
            WHERE p.name ILIKE ${`%${produtoAtual.name.split(' ')[0]}%`}
                AND p.id != ${productId}
                AND p.is_active IS NOT FALSE
            ORDER BY p.name ASC
            LIMIT 20
        `;
        
        console.log(`\n🤖 PRODUTOS SIMILARES (sistema IA antigo): ${produtosSimilares.length}`);
        
        console.log(`\n📊 COMPARAÇÃO:`);
        console.log(`   • CORRETO (variações reais): ${variacoesReais.length} variações`);
        console.log(`   • INCORRETO (produtos similares): ${produtosSimilares.length} produtos`);
        console.log(`   • O admin-panel AGORA deve mostrar as ${variacoesReais.length} variações reais`);
        console.log(`   • E NÃO deve mostrar os ${produtosSimilares.length} produtos similares`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await sql.end();
    }
}

testAdminVariacoes(); 