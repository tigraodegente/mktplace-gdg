import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.develop' });

const sql = postgres(process.env.DATABASE_URL);

async function checkCategoriasStatus() {
    console.log('🔍 VERIFICANDO STATUS DAS CATEGORIAS NO POSTGRESQL\n');
    
    try {
        // 1. Status geral dos produtos
        const statusProdutos = await sql`
            SELECT 
                COUNT(*) as total_produtos,
                COUNT(category_id) as com_categoria,
                COUNT(*) - COUNT(category_id) as sem_categoria,
                ROUND((COUNT(category_id)::DECIMAL / COUNT(*)) * 100, 2) as percentual_com_categoria
            FROM products
        `;
        
        console.log('📊 STATUS GERAL DOS PRODUTOS:');
        console.log(`   Total de produtos: ${statusProdutos[0].total_produtos}`);
        console.log(`   Com categoria: ${statusProdutos[0].com_categoria} (${statusProdutos[0].percentual_com_categoria}%)`);
        console.log(`   Sem categoria: ${statusProdutos[0].sem_categoria}`);
        
        // 2. Verificar se há dados sobre categorias originais
        const exemplos = await sql`
            SELECT id, sku, name, category_id, brand_id, tags
            FROM products 
            WHERE category_id IS NULL
            LIMIT 10
        `;
        
        console.log('\n📦 EXEMPLOS DE PRODUTOS SEM CATEGORIA:');
        exemplos.forEach((p, idx) => {
            console.log(`   ${idx + 1}. SKU ${p.sku}: "${p.name}"`);
            console.log(`      Tags: ${p.tags ? p.tags.join(', ') : 'nenhuma'}`);
        });
        
        // 3. Verificar se há algum padrão nas tags que pode indicar categoria
        const tagsFrequentes = await sql`
            SELECT 
                unnest(tags) as tag,
                COUNT(*) as frequencia
            FROM products 
            WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
            GROUP BY unnest(tags)
            ORDER BY COUNT(*) DESC
            LIMIT 20
        `;
        
        console.log('\n🏷️ TAGS MAIS FREQUENTES (podem indicar categorias):');
        tagsFrequentes.forEach((t, idx) => {
            console.log(`   ${idx + 1}. "${t.tag}" (${t.frequencia} produtos)`);
        });
        
        // 4. Verificar categorias existentes no sistema
        const categoriasDisponiveis = await sql`
            SELECT id, name, slug, parent_id, is_active
            FROM categories 
            WHERE is_active = true
            ORDER BY name
            LIMIT 20
        `;
        
        console.log(`\n🎯 CATEGORIAS DISPONÍVEIS NO SISTEMA (${categoriasDisponiveis.length} primeiras):`);
        categoriasDisponiveis.forEach((c, idx) => {
            console.log(`   ${idx + 1}. "${c.name}" (ID: ${c.id.substring(0, 8)}...)`);
        });
        
        // 5. Tentar identificar padrões de categoria baseado nos nomes dos produtos
        const padroesProdutos = await sql`
            SELECT 
                CASE 
                    WHEN name ILIKE '%almofada%' THEN 'Almofadas'
                    WHEN name ILIKE '%cortina%' THEN 'Cortinas'
                    WHEN name ILIKE '%lençol%' THEN 'Lençóis'
                    WHEN name ILIKE '%tapete%' THEN 'Tapetes'
                    WHEN name ILIKE '%quadro%' THEN 'Quadros'
                    WHEN name ILIKE '%bolsa%' THEN 'Bolsas'
                    WHEN name ILIKE '%adesivo%' THEN 'Adesivos'
                    WHEN name ILIKE '%kit%' THEN 'Kits'
                    ELSE 'Outros'
                END as categoria_detectada,
                COUNT(*) as quantidade
            FROM products
            WHERE category_id IS NULL
            GROUP BY 1
            ORDER BY 2 DESC
        `;
        
        console.log('\n🔍 CATEGORIAS DETECTADAS POR PADRÃO DE NOME:');
        padroesProdutos.forEach((p, idx) => {
            console.log(`   ${idx + 1}. ${p.categoria_detectada}: ${p.quantidade} produtos`);
        });
        
        console.log('\n💡 SUGESTÕES:');
        console.log('   1. Usar IA para classificar produtos baseado no nome');
        console.log('   2. Usar tags existentes como base para categorização');
        console.log('   3. Mapear padrões de nome para categorias existentes');
        console.log('   4. Classificação manual dos produtos principais');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await sql.end();
    }
}

checkCategoriasStatus(); 