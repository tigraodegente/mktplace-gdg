import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function checkTablesStructure() {
  try {
    console.log('🔍 Verificando estrutura das tabelas de variações...\n');

    // 1. Estrutura da tabela product_options
    console.log('1️⃣ Estrutura da tabela product_options:');
    const productOptionsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'product_options' 
      ORDER BY ordinal_position
    `;
    
    console.table(productOptionsColumns);

    // 2. Dados reais da tabela product_options
    console.log('\n2️⃣ Dados da tabela product_options:');
    const productOptionsData = await sql`
      SELECT * FROM product_options ORDER BY id LIMIT 10
    `;
    console.table(productOptionsData);

    // 3. Estrutura da tabela product_option_values
    console.log('\n3️⃣ Estrutura da tabela product_option_values:');
    const productOptionValuesColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'product_option_values' 
      ORDER BY ordinal_position
    `;
    console.table(productOptionValuesColumns);

    // 4. Dados reais da tabela product_option_values
    console.log('\n4️⃣ Dados da tabela product_option_values:');
    const productOptionValuesData = await sql`
      SELECT * FROM product_option_values ORDER BY id LIMIT 15
    `;
    console.table(productOptionValuesData);

    // 5. Query corrigida para buscar opções e seus valores
    console.log('\n5️⃣ Opções com seus valores (query corrigida):');
    const optionsWithValues = await sql`
      SELECT 
        po.id, po.name, po.is_active,
        COUNT(pov.id) as values_count,
        array_agg(pov.value ORDER BY pov.value) as values
      FROM product_options po
      LEFT JOIN product_option_values pov ON pov.option_id = po.id
      WHERE po.is_active = true
      GROUP BY po.id, po.name, po.is_active
      ORDER BY po.name
    `;
    
    optionsWithValues.forEach((option, index) => {
      console.log(`   ${index + 1}. ${option.name} - ${option.values_count} valores:`);
      console.log(`      Valores: ${option.values.join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sql.end();
  }
}

checkTablesStructure(); 