import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', { 
  ssl: 'require', 
  max: 1 
});

try {
  console.log('🧪 Debug passo a passo da query dos filtros dinâmicos...\n');

  // PASSO 1: Teste simples do JSONB
  console.log('1️⃣ Teste básico do JSONB:');
  const step1 = await sql`
    SELECT 
      jsonb_object_keys(attributes) as key,
      COUNT(*) as count
    FROM products
    WHERE attributes IS NOT NULL 
    AND attributes != '{}'
    GROUP BY jsonb_object_keys(attributes)
    ORDER BY count DESC
    LIMIT 5
  `;
  console.table(step1);

  // PASSO 2: Teste do jsonb_array_elements_text
  console.log('\n2️⃣ Teste dos valores de Cor:');
  const step2 = await sql`
    SELECT 
      jsonb_array_elements_text(attributes->'Cor') as cor_value,
      COUNT(*) as count
    FROM products
    WHERE attributes ? 'Cor'
    GROUP BY jsonb_array_elements_text(attributes->'Cor')
    ORDER BY count DESC
    LIMIT 10
  `;
  console.table(step2);

  // PASSO 3: Teste da primeira parte do CTE (sem window function)
  console.log('\n3️⃣ Teste sem window function:');
  const step3 = await sql`
    SELECT 
      jsonb_object_keys(attributes) as attribute_key,
      jsonb_array_elements_text(attributes->jsonb_object_keys(attributes)) as attribute_value
    FROM products p
    WHERE p.is_active = true 
    AND p.attributes IS NOT NULL 
    AND p.attributes != '{}'::jsonb
    AND jsonb_typeof(p.attributes) = 'object'
    LIMIT 10
  `;
  console.table(step3);

  // PASSO 4: Teste completo do primeiro CTE (com window function)
  console.log('\n4️⃣ Teste do primeiro CTE completo:');
  const step4 = await sql`
    SELECT 
      attribute_key,
      attribute_value,
      total_products_with_key
    FROM (
      SELECT 
        jsonb_object_keys(attributes) as attribute_key,
        jsonb_array_elements_text(attributes->jsonb_object_keys(attributes)) as attribute_value,
        COUNT(*) OVER (PARTITION BY jsonb_object_keys(attributes)) as total_products_with_key
      FROM products p
      WHERE p.is_active = true 
      AND p.attributes IS NOT NULL 
      AND p.attributes != '{}'::jsonb
      AND jsonb_typeof(p.attributes) = 'object'
    ) t
    LIMIT 15
  `;
  console.table(step4);

} catch (e) {
  console.error('❌ Erro no passo:', e.message);
  console.error('❌ Erro completo:', e);
} finally {
  await sql.end();
} 