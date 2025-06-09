import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function verificarStatusEstoque() {
    console.log('🔍 Verificando status e estoque dos produtos...\n');
    
    try {
        // 1. Total de produtos
        const totalProdutos = await sql`SELECT COUNT(*) as total FROM products`;
        console.log(`📦 TOTAL DE PRODUTOS: ${totalProdutos[0].total}`);
        
        // 2. Status dos produtos (ativo/inativo)
        const statusProdutos = await sql`
            SELECT 
                CASE 
                    WHEN is_active = true THEN 'Ativo' 
                    ELSE 'Inativo' 
                END as status,
                COUNT(*) as quantidade
            FROM products 
            GROUP BY is_active
            ORDER BY is_active DESC
        `;
        
        console.log('\n📊 STATUS DOS PRODUTOS:');
        statusProdutos.forEach(row => {
            console.log(`   ${row.status}: ${row.quantidade} produtos`);
        });
        
        // 3. Análise de estoque
        const estoqueAnalise = await sql`
            SELECT 
                CASE 
                    WHEN quantity > 0 THEN 'Com Estoque'
                    WHEN quantity = 0 THEN 'Sem Estoque'
                    WHEN quantity IS NULL THEN 'Estoque NULL'
                    ELSE 'Estoque Negativo'
                END as situacao_estoque,
                COUNT(*) as quantidade
            FROM products 
            GROUP BY 
                CASE 
                    WHEN quantity > 0 THEN 'Com Estoque'
                    WHEN quantity = 0 THEN 'Sem Estoque'
                    WHEN quantity IS NULL THEN 'Estoque NULL'
                    ELSE 'Estoque Negativo'
                END
            ORDER BY quantidade DESC
        `;
        
        console.log('\n📈 SITUAÇÃO DO ESTOQUE:');
        estoqueAnalise.forEach(row => {
            console.log(`   ${row.situacao_estoque}: ${row.quantidade} produtos`);
        });
        
        // 4. Produtos com variações
        const produtosComVariacoes = await sql`
            SELECT COUNT(DISTINCT product_id) as produtos_com_variacoes
            FROM product_variants
        `;
        
        console.log(`\n🔄 PRODUTOS COM VARIAÇÕES: ${produtosComVariacoes[0].produtos_com_variacoes}`);
        
        // 5. Total de variações
        const totalVariacoes = await sql`
            SELECT COUNT(*) as total_variacoes
            FROM product_variants
        `;
        
        console.log(`🔗 TOTAL DE VARIAÇÕES: ${totalVariacoes[0].total_variacoes}`);
        
        // 6. Status das variações
        const statusVariacoes = await sql`
            SELECT 
                CASE 
                    WHEN is_active = true THEN 'Ativo' 
                    ELSE 'Inativo' 
                END as status,
                COUNT(*) as quantidade
            FROM product_variants 
            GROUP BY is_active
            ORDER BY is_active DESC
        `;
        
        console.log('\n📊 STATUS DAS VARIAÇÕES:');
        statusVariacoes.forEach(row => {
            console.log(`   ${row.status}: ${row.quantidade} variações`);
        });
        
        // 7. Estoque das variações
        const estoqueVariacoes = await sql`
            SELECT 
                CASE 
                    WHEN quantity > 0 THEN 'Com Estoque'
                    WHEN quantity = 0 THEN 'Sem Estoque'
                    WHEN quantity IS NULL THEN 'Estoque NULL'
                    ELSE 'Estoque Negativo'
                END as situacao_estoque,
                COUNT(*) as quantidade
            FROM product_variants
            GROUP BY 
                CASE 
                    WHEN quantity > 0 THEN 'Com Estoque'
                    WHEN quantity = 0 THEN 'Sem Estoque'
                    WHEN quantity IS NULL THEN 'Estoque NULL'
                    ELSE 'Estoque Negativo'
                END
            ORDER BY quantidade DESC
        `;
        
        console.log('\n📈 SITUAÇÃO DO ESTOQUE DAS VARIAÇÕES:');
        estoqueVariacoes.forEach(row => {
            console.log(`   ${row.situacao_estoque}: ${row.quantidade} variações`);
        });
        
        // 8. Produtos sem variações
        const produtosSemVariacoes = await sql`
            SELECT COUNT(*) as produtos_sem_variacoes
            FROM products p
            WHERE NOT EXISTS (
                SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id
            )
        `;
        
        console.log(`\n📦 PRODUTOS SEM VARIAÇÕES: ${produtosSemVariacoes[0].produtos_sem_variacoes}`);
        
        // 9. Resumo combinado: produtos ativos com estoque
        const produtosAtivosComEstoque = await sql`
            SELECT COUNT(*) as total
            FROM products
            WHERE is_active = true AND quantity > 0
        `;
        
        console.log(`\n✅ PRODUTOS ATIVOS COM ESTOQUE: ${produtosAtivosComEstoque[0].total}`);
        
        // 10. Resumo combinado: variações ativas com estoque
        const variacoesAtivasComEstoque = await sql`
            SELECT COUNT(*) as total
            FROM product_variants
            WHERE is_active = true AND quantity > 0
        `;
        
        console.log(`✅ VARIAÇÕES ATIVAS COM ESTOQUE: ${variacoesAtivasComEstoque[0].total}`);
        
        console.log('\n🎯 ANÁLISE CONCLUÍDA!');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await sql.end();
    }
}

verificarStatusEstoque(); 