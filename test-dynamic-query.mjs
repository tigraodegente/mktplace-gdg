import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function testDynamicQuery() {
  try {
    console.log('🧪 Testando query dos filtros dinâmicos...\n');

    // A mesma query usada na API
    const dynamicOptionsQuery = `
      WITH attribute_analysis AS (
        SELECT 
          jsonb_object_keys(attributes) as attribute_key,
          jsonb_array_elements_text(attributes->jsonb_object_keys(attributes)) as attribute_value,
          COUNT(*) OVER (PARTITION BY jsonb_object_keys(attributes)) as total_products_with_key
        FROM products p
        WHERE p.is_active = true 
        AND p.attributes IS NOT NULL 
        AND p.attributes != '{}'::jsonb
        AND jsonb_typeof(p.attributes) = 'object'
      ),
      option_values AS (
        SELECT 
          attribute_key,
          attribute_value,
          COUNT(*) as value_count,
          MAX(total_products_with_key) as total_for_key
        FROM attribute_analysis
        WHERE attribute_value IS NOT NULL 
        AND attribute_value != ''
        GROUP BY attribute_key, attribute_value
      )
      SELECT 
        attribute_key,
        json_agg(
          json_build_object(
            'value', attribute_value,
            'label', attribute_value,
            'count', value_count
          ) ORDER BY value_count DESC
        ) as options,
        COUNT(*) as distinct_values,
        MAX(total_for_key) as total_products
      FROM option_values
      GROUP BY attribute_key
      HAVING COUNT(*) > 1  -- Só incluir atributos com múltiplas opções
      ORDER BY MAX(total_for_key) DESC, attribute_key ASC
    `;
    
    console.log('1️⃣ Executando query completa...');
    const dynamicOptionsResults = await sql.unsafe(dynamicOptionsQuery);
    
    console.log(`📊 Resultados: ${dynamicOptionsResults.length} tipos de filtros`);
    
    if (dynamicOptionsResults.length > 0) {
      console.log('\n2️⃣ Filtros encontrados:');
      dynamicOptionsResults.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.attribute_key}:`);
        console.log(`      - ${row.distinct_values} valores únicos`);
        console.log(`      - ${row.total_products} produtos com este atributo`);
        
        if (Array.isArray(row.options)) {
          console.log(`      - Valores: ${row.options.slice(0, 3).map(o => `${o.value} (${o.count})`).join(', ')}`);
        }
      });
      
      // Converter para formato da API
      console.log('\n3️⃣ Formato final (como na API):');
      const dynamicOptions = dynamicOptionsResults.map((row) => ({
        name: row.attribute_key.charAt(0).toUpperCase() + row.attribute_key.slice(1),
        slug: `opcao_${row.attribute_key.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'attribute',
        options: Array.isArray(row.options) ? row.options : [],
        totalProducts: parseInt(row.total_products)
      }));
      
      console.log(JSON.stringify(dynamicOptions, null, 2));
      
    } else {
      console.log('❌ Nenhum resultado encontrado');
      
      // Vamos debugar step by step
      console.log('\n🔍 Debug passo a passo:');
      
      console.log('   1. Produtos com attributes:');
      const withAttributes = await sql`
        SELECT COUNT(*) as total
        FROM products p
        WHERE p.is_active = true 
        AND p.attributes IS NOT NULL 
        AND p.attributes != '{}'::jsonb
        AND jsonb_typeof(p.attributes) = 'object'
      `;
      console.log(`      Total: ${withAttributes[0].total}`);
      
      console.log('   2. Primeiro CTE (attribute_analysis):');
      const step1 = await sql`
        SELECT 
          jsonb_object_keys(attributes) as attribute_key,
          COUNT(*) as count
        FROM products p
        WHERE p.is_active = true 
        AND p.attributes IS NOT NULL 
        AND p.attributes != '{}'::jsonb
        AND jsonb_typeof(p.attributes) = 'object'
        GROUP BY jsonb_object_keys(attributes)
        ORDER BY count DESC
        LIMIT 5
      `;
      console.table(step1);
      
      console.log('   3. Expandindo valores por chave:');
      const step2 = await sql`
        SELECT 
          'Cor' as attribute_key,
          jsonb_array_elements_text(attributes->'Cor') as attribute_value,
          COUNT(*) as count
        FROM products p
        WHERE p.is_active = true 
        AND p.attributes ? 'Cor'
        GROUP BY jsonb_array_elements_text(attributes->'Cor')
        ORDER BY count DESC
        LIMIT 10
      `;
      console.table(step2);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    console.error('❌ Mensagem:', error.message);
  } finally {
    await sql.end();
  }
}

testDynamicQuery(); 