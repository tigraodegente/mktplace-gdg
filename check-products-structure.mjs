import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL);

try {
    console.log('🔍 Verificando estrutura da tabela products...\n');
    
    const columns = await sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        ORDER BY ordinal_position
    `;
    
    console.log('📋 Colunas da tabela products:');
    columns.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n🔍 Procurando colunas relacionadas a categoria...');
    const categoryColumns = columns.filter(col => 
        col.column_name.toLowerCase().includes('category') ||
        col.column_name.toLowerCase().includes('categoria')
    );
    
    if (categoryColumns.length > 0) {
        console.log('✅ Colunas de categoria encontradas:');
        categoryColumns.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });
    } else {
        console.log('❌ Nenhuma coluna de categoria encontrada');
    }
    
    console.log('\n🔍 Verificando algumas linhas da tabela...');
    const sample = await sql`SELECT * FROM products LIMIT 3`;
    console.log(`📊 Amostra de ${sample.length} produtos:`);
    if (sample.length > 0) {
        console.log('Colunas disponíveis:', Object.keys(sample[0]).join(', '));
    }
    
} catch (error) {
    console.error('❌ Erro:', error.message);
} finally {
    await sql.end();
} 