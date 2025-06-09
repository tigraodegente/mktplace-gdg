import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function debugProdutoAdmin() {
    console.log('🔍 Verificando produto do admin-panel...\n');
    
    try {
        const productId = '2d2fe541-13a1-49a8-b85d-4b84bb4f0ad8';
        
        // 1. Buscar o produto específico
        const produto = await sql`
            SELECT 
                p.id, p.name, p.sku, p.slug, p.price, p.is_variant, p.category_id
            FROM products p 
            WHERE p.id = ${productId}
        `;
        
        if (produto.length === 0) {
            console.log('❌ Produto não encontrado!');
            return;
        }
        
        console.log('📦 PRODUTO ENCONTRADO:');
        console.log(`   ID: ${produto[0].id}`);
        console.log(`   Nome: ${produto[0].name}`);
        console.log(`   SKU: ${produto[0].sku}`);
        console.log(`   Slug: ${produto[0].slug}`);
        console.log(`   Preço: R$ ${produto[0].price}`);
        console.log(`   É variação: ${produto[0].is_variant}`);
        
        // 2. Verificar se tem variações REAIS (sistema store)
        let variacoesReais = [];
        
        if (produto[0].is_variant) {
            // Se é variação, buscar produto principal e suas variações
            const principal = await sql`
                SELECT p.id, p.name, p.sku
                FROM products p
                INNER JOIN product_variants pv ON p.id = pv.product_id
                WHERE pv.sku = ${produto[0].sku}
                LIMIT 1
            `;
            
            if (principal.length > 0) {
                variacoesReais = await sql`
                    SELECT 
                        pv.sku, pv.price, pv.quantity as stock, pv.is_active,
                        p2.name as variant_name
                    FROM product_variants pv
                    INNER JOIN products p2 ON pv.sku = p2.sku
                    WHERE pv.product_id = ${principal[0].id} AND pv.is_active = true
                    ORDER BY pv.created_at ASC
                `;
                
                console.log(`\n🔄 VARIAÇÕES REAIS (sistema store): ${variacoesReais.length}`);
                variacoesReais.forEach((v, idx) => {
                    console.log(`   ${idx + 1}. SKU ${v.sku} - ${v.variant_name} - R$ ${v.price}`);
                });
            }
        } else {
            // Se é produto principal, buscar suas variações
            variacoesReais = await sql`
                SELECT 
                    pv.sku, pv.price, pv.quantity as stock, pv.is_active,
                    p2.name as variant_name
                FROM product_variants pv
                INNER JOIN products p2 ON pv.sku = p2.sku
                WHERE pv.product_id = ${produto[0].id} AND pv.is_active = true
                ORDER BY pv.created_at ASC
            `;
            
            console.log(`\n🔄 VARIAÇÕES REAIS (sistema store): ${variacoesReais.length}`);
            variacoesReais.forEach((v, idx) => {
                console.log(`   ${idx + 1}. SKU ${v.sku} - ${v.variant_name} - R$ ${v.price}`);
            });
        }
        
        // 3. Buscar produtos "similares" (sistema IA do admin)
        const produtosSimilares = await sql`
            SELECT 
                p.id, p.name, p.sku, p.price, p.is_variant
            FROM products p
            WHERE p.name ILIKE ${`%${produto[0].name.split(' ')[0]}%`}
                AND p.id != ${produto[0].id}
                AND p.is_active IS NOT FALSE
            ORDER BY p.name ASC
            LIMIT 20
        `;
        
        console.log(`\n🤖 PRODUTOS SIMILARES (sistema IA): ${produtosSimilares.length}`);
        produtosSimilares.forEach((p, idx) => {
            console.log(`   ${idx + 1}. ${p.name} - SKU: ${p.sku} - R$ ${p.price}`);
        });
        
        // 4. Análise do problema
        console.log(`\n📊 ANÁLISE DO PROBLEMA:`);
        console.log(`   • Variações REAIS (store): ${variacoesReais.length}`);
        console.log(`   • Produtos SIMILARES (admin IA): ${produtosSimilares.length}`);
        console.log(`   • O admin-panel está mostrando produtos similares como "variações"`);
        console.log(`   • Deveria mostrar as mesmas ${variacoesReais.length} variações do store`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await sql.end();
    }
}

debugProdutoAdmin(); 