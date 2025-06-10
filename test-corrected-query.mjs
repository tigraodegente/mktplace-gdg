import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', { 
  ssl: 'require', 
  max: 1 
});

try {
  console.log('🧪 Testando query corrigida dos filtros dinâmicos...\n');

  // A query corrigida que está na API agora
  const dynamicOptionsQuery = `
    WITH parsed_attributes AS (
      SELECT 
        p.id,
        CASE 
          WHEN jsonb_typeof(p.attributes) = 'string' THEN 
            (p.attributes #>> '{}')::jsonb  -- Converter string JSON para objeto JSONB
          WHEN jsonb_typeof(p.attributes) = 'object' THEN 
            p.attributes  -- Já é objeto JSONB
          ELSE NULL
        END as parsed_attrs
      FROM products p
      WHERE p.is_active = true 
      AND p.attributes IS NOT NULL 
      AND p.attributes != '{}'::jsonb
      AND (
        jsonb_typeof(p.attributes) = 'string' OR 
        jsonb_typeof(p.attributes) = 'object'
      )
    ),
    attribute_analysis AS (
      SELECT 
        jsonb_object_keys(parsed_attrs) as attribute_key,
        jsonb_array_elements_text(parsed_attrs->jsonb_object_keys(parsed_attrs)) as attribute_value,
        COUNT(*) OVER (PARTITION BY jsonb_object_keys(parsed_attrs)) as total_products_with_key
      FROM parsed_attributes
      WHERE parsed_attrs IS NOT NULL 
      AND jsonb_typeof(parsed_attrs) = 'object'
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
      AND trim(attribute_value) != ''
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
  
  console.log('1️⃣ Executando query corrigida...');
  const dynamicOptionsResults = await sql.unsafe(dynamicOptionsQuery);
  
  console.log(`📊 Resultados: ${dynamicOptionsResults.length} tipos de filtros encontrados`);
  
  if (dynamicOptionsResults.length > 0) {
    console.log('\n🎉 SUCESSO! Filtros dinâmicos encontrados:');
    dynamicOptionsResults.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.attribute_key}:`);
      console.log(`      - ${row.distinct_values} valores únicos`);
      console.log(`      - ${row.total_products} produtos com este atributo`);
      
      if (Array.isArray(row.options)) {
        console.log(`      - Top valores: ${row.options.slice(0, 3).map(o => `${o.value} (${o.count})`).join(', ')}`);
      }
    });
    
    // Formato final da API
    console.log('\n✅ Formato final para a API:');
    const dynamicOptions = dynamicOptionsResults.map((row) => ({
      name: row.attribute_key.charAt(0).toUpperCase() + row.attribute_key.slice(1),
      slug: `opcao_${row.attribute_key.toLowerCase().replace(/\s+/g, '_')}`,
      type: 'attribute',
      options: Array.isArray(row.options) ? row.options : [],
      totalProducts: parseInt(row.total_products)
    }));
    
    console.log(JSON.stringify(dynamicOptions, null, 2));
    
  } else {
    console.log('\n❌ Nenhum filtro encontrado mesmo com a query corrigida');
  }
  
} catch (e) {
  console.error('❌ Erro na query corrigida:', e.message);
  console.error('❌ Detalhes:', e);
} finally {
  await sql.end();
} 