import postgres from 'postgres';

// BANCO CORRETO (mesmo que a API usa agora)
const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function testDynamicFiltersReal() {
  try {
    console.log('🧪 Testando filtros dinâmicos no banco correto...\n');

    // A MESMA query que está na API
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
    
    console.log('1️⃣ Executando query completa dos filtros dinâmicos...');
    const dynamicOptionsResults = await sql.unsafe(dynamicOptionsQuery);
    
    console.log(`📊 Resultados: ${dynamicOptionsResults.length} tipos de filtros encontrados`);
    
    if (dynamicOptionsResults.length > 0) {
      console.log('\n2️⃣ Filtros dinâmicos encontrados:');
      dynamicOptionsResults.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.attribute_key}:`);
        console.log(`      - ${row.distinct_values} valores únicos`);
        console.log(`      - ${row.total_products} produtos com este atributo`);
        
        if (Array.isArray(row.options)) {
          console.log(`      - Top valores: ${row.options.slice(0, 3).map(o => `${o.value} (${o.count})`).join(', ')}`);
        }
      });
      
      // Converter para formato da API
      console.log('\n3️⃣ Formato final (como deveria aparecer na API):');
      const dynamicOptions = dynamicOptionsResults.map((row) => ({
        name: row.attribute_key.charAt(0).toUpperCase() + row.attribute_key.slice(1),
        slug: `opcao_${row.attribute_key.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'attribute',
        options: Array.isArray(row.options) ? row.options : [],
        totalProducts: parseInt(row.total_products)
      }));
      
      console.log(JSON.stringify(dynamicOptions, null, 2));
      
    } else {
      console.log('\n❌ Nenhum filtro dinâmico encontrado');
      
      // Debug passo a passo
      console.log('\n🔍 Debug detalhado:');
      
      console.log('   1. Produtos com attributes válidos:');
      const step1 = await sql`
        SELECT COUNT(*) as total
        FROM products p
        WHERE p.is_active = true 
        AND p.attributes IS NOT NULL 
        AND p.attributes != '{}'::jsonb
        AND jsonb_typeof(p.attributes) = 'object'
      `;
      console.log(`      Total: ${step1[0].total}`);
      
      if (step1[0].total > 0) {
        console.log('   2. Exemplos de attributes:');
        const step2 = await sql`
          SELECT name, attributes
          FROM products p
          WHERE p.is_active = true 
          AND p.attributes IS NOT NULL 
          AND p.attributes != '{}'::jsonb
          AND jsonb_typeof(p.attributes) = 'object'
          LIMIT 3
        `;
        
        step2.forEach((row, i) => {
          console.log(`      ${i + 1}. ${row.name}:`);
          console.log(`         ${JSON.stringify(row.attributes)}`);
        });
        
        console.log('   3. Keys disponíveis:');
        const step3 = await sql`
          SELECT 
            jsonb_object_keys(attributes) as key,
            COUNT(*) as frequency
          FROM products p
          WHERE p.is_active = true 
          AND p.attributes IS NOT NULL 
          AND p.attributes != '{}'::jsonb
          AND jsonb_typeof(p.attributes) = 'object'
          GROUP BY jsonb_object_keys(attributes)
          ORDER BY frequency DESC
        `;
        
        step3.forEach((row, i) => {
          console.log(`      ${i + 1}. ${row.key}: ${row.frequency} produtos`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    console.error('❌ Mensagem:', error.message);
  } finally {
    await sql.end();
  }
}

testDynamicFiltersReal(); 