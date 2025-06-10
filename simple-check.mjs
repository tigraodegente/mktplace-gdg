import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', { 
  ssl: 'require', 
  max: 1 
});

try {
  // Query bem simples
  const result = await sql`SELECT COUNT(*) as total FROM products`;
  console.log('Total produtos:', result[0].total);
  
  const withAttrs = await sql`SELECT COUNT(*) as total FROM products WHERE attributes IS NOT NULL`;
  console.log('Com attributes (qualquer):', withAttrs[0].total);
  
  const withValidAttrs = await sql`SELECT COUNT(*) as total FROM products WHERE attributes IS NOT NULL AND attributes != '{}'`;
  console.log('Com attributes válidos:', withValidAttrs[0].total);
  
  const example = await sql`SELECT name, attributes FROM products WHERE attributes IS NOT NULL AND attributes != '{}' LIMIT 2`;
  if (example.length > 0) {
    console.log('\nExemplos:');
    example.forEach((row, i) => {
      console.log(`${i + 1}. ${row.name}`);
      console.log(`   ${JSON.stringify(row.attributes)}`);
    });
  }
  
} catch (e) {
  console.error('Erro:', e.message);
} finally {
  await sql.end();
} 