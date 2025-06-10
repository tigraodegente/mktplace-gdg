import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function analyzeRedundancy() {
  try {
    console.log('🔍 Analisando redundância entre tabelas de variações e attributes...\n');

    // 1. Produtos que têm TANTO variações estruturadas QUANTO attributes
    console.log('1️⃣ Produtos com AMBOS (tabelas + attributes):');
    const bothSources = await sql`
      SELECT 
        p.id, p.name,
        p.attributes,
        po.name as option_name,
        array_agg(pov.value ORDER BY pov.value) as structured_values
      FROM products p
      INNER JOIN product_options po ON po.product_id = p.id
      INNER JOIN product_option_values pov ON pov.option_id = po.id
      WHERE p.is_active = true
      AND p.attributes IS NOT NULL 
      AND p.attributes != '{}'::jsonb
      GROUP BY p.id, p.name, p.attributes, po.name
      LIMIT 5
    `;

    if (bothSources.length > 0) {
      console.log(`   ✅ Encontrados ${bothSources.length} produtos com ambas as fontes:`);
      bothSources.forEach((product, index) => {
        console.log(`\n   ${index + 1}. ${product.name}:`);
        console.log(`      📋 Attributes: ${JSON.stringify(product.attributes)}`);
        console.log(`      🏗️  Estruturado (${product.option_name}): [${product.structured_values.join(', ')}]`);
        
        // Verificar se há sobreposição
        const attributeValues = product.attributes[product.option_name] || [];
        const overlap = product.structured_values.filter(val => attributeValues.includes(val));
        if (overlap.length > 0) {
          console.log(`      ⚠️  REDUNDÂNCIA: ${overlap.join(', ')}`);
        } else {
          console.log(`      ✅ Sem redundância`);
        }
      });
    } else {
      console.log('   ❌ Nenhum produto encontrado com ambas as fontes');
    }

    // 2. Estatísticas gerais
    console.log('\n2️⃣ Estatísticas gerais:');
    
    const stats = await sql`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(CASE WHEN attributes IS NOT NULL AND attributes != '{}'::jsonb THEN 1 END) as com_attributes,
        COUNT(CASE WHEN EXISTS(SELECT 1 FROM product_options po WHERE po.product_id = products.id) THEN 1 END) as com_variacoes_estruturadas
      FROM products 
      WHERE is_active = true
    `;
    
    const statsRow = stats[0];
    console.log(`   📊 Total produtos ativos: ${statsRow.total_produtos}`);
    console.log(`   📋 Com attributes: ${statsRow.com_attributes}`);
    console.log(`   🏗️  Com variações estruturadas: ${statsRow.com_variacoes_estruturadas}`);

    // 3. Analisar tipos de attributes mais comuns
    console.log('\n3️⃣ Tipos de attributes mais comuns:');
    const attributeKeys = await sql`
      SELECT 
        jsonb_object_keys(attributes) as attribute_key,
        COUNT(*) as frequency
      FROM products 
      WHERE is_active = true
      AND attributes IS NOT NULL 
      AND attributes != '{}'::jsonb
      GROUP BY jsonb_object_keys(attributes)
      ORDER BY frequency DESC
      LIMIT 10
    `;
    
    attributeKeys.forEach((attr, index) => {
      console.log(`   ${index + 1}. ${attr.attribute_key}: ${attr.frequency} produtos`);
    });

    // 4. Valores únicos por tipo de attribute
    console.log('\n4️⃣ Análise de valores por tipo de attribute:');
    const colorValues = await sql`
      SELECT DISTINCT 
        jsonb_array_elements_text(attributes->'Cor') as color_value,
        COUNT(*) as frequency
      FROM products 
      WHERE is_active = true
      AND attributes ? 'Cor'
      GROUP BY jsonb_array_elements_text(attributes->'Cor')
      ORDER BY frequency DESC
      LIMIT 10
    `;
    
    if (colorValues.length > 0) {
      console.log('   🎨 Cores mais comuns (via attributes):');
      colorValues.forEach((color, index) => {
        console.log(`      ${index + 1}. ${color.color_value}: ${color.frequency} produtos`);
      });
    }

    // 5. Comparar com valores estruturados
    console.log('\n5️⃣ Valores estruturados (via tabelas):');
    const structuredColors = await sql`
      SELECT 
        pov.value,
        COUNT(DISTINCT po.product_id) as frequency
      FROM product_options po
      INNER JOIN product_option_values pov ON pov.option_id = po.id
      WHERE po.name = 'Cor'
      GROUP BY pov.value
      ORDER BY frequency DESC
    `;
    
    if (structuredColors.length > 0) {
      console.log('   🎨 Cores estruturadas (via tabelas):');
      structuredColors.forEach((color, index) => {
        console.log(`      ${index + 1}. ${color.value}: ${color.frequency} produtos`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sql.end();
  }
}

analyzeRedundancy(); 