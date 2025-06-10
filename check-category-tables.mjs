import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL);

try {
    console.log('🔍 Verificando tabelas relacionadas a categoria...\n');
    
    const categoryTables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%categor%' 
        ORDER BY table_name
    `;
    
    console.log('📋 Tabelas relacionadas a categoria:');
    categoryTables.forEach(t => console.log('- ' + t.table_name));
    
    const productTables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%product%' 
        ORDER BY table_name
    `;
    
    console.log('\n📋 Tabelas relacionadas a produto:');
    productTables.forEach(t => console.log('- ' + t.table_name));
    
    // Verificar se existe product_categories
    if (categoryTables.some(t => t.table_name === 'product_categories')) {
        console.log('\n🔍 Verificando estrutura da tabela product_categories...');
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'product_categories' 
            ORDER BY ordinal_position
        `;
        
        columns.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });
        
        console.log('\n📊 Amostra de product_categories:');
        const sample = await sql`SELECT * FROM product_categories LIMIT 5`;
        console.log(`Total de relacionamentos: ${sample.length}`);
        if (sample.length > 0) {
            console.log('Estrutura:', Object.keys(sample[0]).join(', '));
            sample.forEach((row, idx) => {
                console.log(`${idx + 1}. Product: ${row.product_id} -> Category: ${row.category_id}`);
            });
        }
    }
    
    // Verificar tabela categories
    if (categoryTables.some(t => t.table_name === 'categories')) {
        console.log('\n📊 Verificando algumas categorias...');
        const categories = await sql`SELECT id, name, slug FROM categories LIMIT 10`;
        categories.forEach(cat => {
            console.log(`- ${cat.name} (${cat.slug}) - ID: ${cat.id}`);
        });
    }
    
} catch (error) {
    console.error('❌ Erro:', error.message);
} finally {
    await sql.end();
} 