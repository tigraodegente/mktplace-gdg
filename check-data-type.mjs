import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', { 
  ssl: 'require', 
  max: 1 
});

try {
  console.log('🔍 Verificando tipo real do campo attributes...\n');

  // 1. Verificar o tipo da coluna na tabela
  console.log('1️⃣ Tipo da coluna attributes na tabela:');
  const columnType = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'attributes'
  `;
  console.table(columnType);

  // 2. Verificar o tipo dos dados reais
  console.log('\n2️⃣ Tipos dos dados reais:');
  const dataTypes = await sql`
    SELECT 
      name,
      attributes,
      pg_typeof(attributes) as tipo_real,
      jsonb_typeof(attributes) as jsonb_tipo
    FROM products 
    WHERE attributes IS NOT NULL 
    AND attributes != '{}' 
    LIMIT 3
  `;
  
  dataTypes.forEach((row, i) => {
    console.log(`\n${i + 1}. ${row.name}:`);
    console.log(`   Tipo PostgreSQL: ${row.tipo_real}`);
    console.log(`   JSONB tipo: ${row.jsonb_tipo}`);
    console.log(`   Valor: ${row.attributes}`);
    console.log(`   É string? ${typeof row.attributes}`);
  });

  // 3. Tentar converter de texto para JSONB
  console.log('\n3️⃣ Teste de conversão texto -> JSONB:');
  const converted = await sql`
    SELECT 
      name,
      attributes::text as original,
      attributes::jsonb as convertido,
      jsonb_object_keys(attributes::jsonb) as keys
    FROM products 
    WHERE attributes IS NOT NULL 
    AND attributes != '{}' 
    AND attributes != ''
    LIMIT 2
  `;
  
  if (converted.length > 0) {
    console.log('✅ Conversão funcionou!');
    converted.forEach((row, i) => {
      console.log(`${i + 1}. ${row.name} - Key: ${row.keys}`);
    });
  }

} catch (e) {
  console.error('❌ Erro:', e.message);
  
  // Se der erro na conversão, tentar como text
  try {
    console.log('\n4️⃣ Testando como campo TEXT:');
    const asText = await sql`
      SELECT 
        name,
        attributes,
        length(attributes) as tamanho
      FROM products 
      WHERE attributes IS NOT NULL 
      AND attributes != '{}' 
      LIMIT 2
    `;
    console.table(asText);
  } catch (e2) {
    console.error('❌ Erro também como text:', e2.message);
  }
  
} finally {
  await sql.end();
} 