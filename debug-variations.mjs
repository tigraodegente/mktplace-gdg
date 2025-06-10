import postgres from 'postgres';

// Configuração PostgreSQL com Neon
const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function investigateVariations() {
  try {
    console.log('🔍 Investigando estrutura de variações...\n');

    // 1. Verificar se as tabelas existem e têm dados
    console.log('1️⃣ Verificando tabelas de variações:');
    
    try {
      const productOptions = await sql`SELECT COUNT(*) as total FROM product_options`;
      console.log(`   - product_options: ${productOptions[0].total} registros`);
    } catch (e) {
      console.log(`   - product_options: ❌ Erro - ${e.message}`);
    }

    try {
      const productOptionValues = await sql`SELECT COUNT(*) as total FROM product_option_values`;
      console.log(`   - product_option_values: ${productOptionValues[0].total} registros`);
    } catch (e) {
      console.log(`   - product_option_values: ❌ Erro - ${e.message}`);
    }

    try {
      const productVariants = await sql`SELECT COUNT(*) as total FROM product_variants`;
      console.log(`   - product_variants: ${productVariants[0].total} registros`);
    } catch (e) {
      console.log(`   - product_variants: ❌ Erro - ${e.message}`);
    }

    try {
      const variantOptionValues = await sql`SELECT COUNT(*) as total FROM variant_option_values`;
      console.log(`   - variant_option_values: ${variantOptionValues[0].total} registros`);
    } catch (e) {
      console.log(`   - variant_option_values: ❌ Erro - ${e.message}`);
    }

    console.log('\n2️⃣ Verificando produtos com campos de variação:');
    
    // 2. Verificar produtos com attributes
    try {
      const productsWithAttributes = await sql`
        SELECT 
          COUNT(*) as total_produtos,
          COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}'::jsonb THEN 1 END) as com_attributes
        FROM products 
        WHERE is_active = true
      `;
      const stats = productsWithAttributes[0];
      console.log(`   - Total produtos ativos: ${stats.total_produtos}`);
      console.log(`   - Com attributes: ${stats.com_attributes}`);
    } catch (e) {
      console.log(`   - ❌ Erro ao verificar products: ${e.message}`);
    }

    // 3. Verificar exemplos de attributes
    try {
      const exampleAttributes = await sql`
        SELECT 
          id, name, attributes
        FROM products 
        WHERE is_active = true 
        AND attributes IS NOT NULL 
        AND attributes != '{}'::jsonb
        LIMIT 5
      `;
      
      if (exampleAttributes.length > 0) {
        console.log('\n3️⃣ Exemplos de attributes encontrados:');
        exampleAttributes.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name}:`);
          console.log(`      attributes: ${JSON.stringify(product.attributes, null, 2)}`);
        });
      } else {
        console.log('\n3️⃣ Nenhum produto com attributes encontrado');
      }
    } catch (e) {
      console.log(`\n3️⃣ ❌ Erro ao buscar attributes: ${e.message}`);
    }

    // 4. Se as tabelas de variações existem, mostrar exemplos
    try {
      const optionsExample = await sql`
        SELECT 
          po.id, po.name, po.type, po.is_active,
          COUNT(pov.id) as values_count
        FROM product_options po
        LEFT JOIN product_option_values pov ON pov.option_id = po.id
        WHERE po.is_active = true
        GROUP BY po.id, po.name, po.type, po.is_active
        ORDER BY po.name
        LIMIT 10
      `;
      
      if (optionsExample.length > 0) {
        console.log('\n4️⃣ Opções de variação encontradas:');
        optionsExample.forEach((option, index) => {
          console.log(`   ${index + 1}. ${option.name} (${option.type}) - ${option.values_count} valores`);
        });
      }
    } catch (e) {
      console.log(`\n4️⃣ ❌ Erro ao buscar opções: ${e.message}`);
    }

    // 5. Mostrar valores das opções
    try {
      const valuesExample = await sql`
        SELECT 
          po.name as option_name,
          po.type as option_type,
          pov.value,
          COUNT(vov.id) as usage_count
        FROM product_options po
        INNER JOIN product_option_values pov ON pov.option_id = po.id
        LEFT JOIN variant_option_values vov ON vov.option_value_id = pov.id
        WHERE po.is_active = true
        GROUP BY po.name, po.type, pov.value
        ORDER BY po.name, usage_count DESC
        LIMIT 20
      `;
      
      if (valuesExample.length > 0) {
        console.log('\n5️⃣ Valores das opções:');
        valuesExample.forEach((value, index) => {
          console.log(`   ${index + 1}. ${value.option_name} (${value.option_type}): ${value.value} - usado ${value.usage_count} vezes`);
        });
      }
    } catch (e) {
      console.log(`\n5️⃣ ❌ Erro ao buscar valores: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await sql.end();
  }
}

investigateVariations(); 