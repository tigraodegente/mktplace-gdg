import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 VERIFICANDO CATEGORIAS DISPONÍVEIS:\n');

const cats = await sql`SELECT id, name FROM categories WHERE name ILIKE '%cortina%' OR name ILIKE '%quarto%' OR name ILIKE '%bebê%' LIMIT 15`;
console.log('📋 Categorias relacionadas a cortina/quarto/bebê:');
cats.forEach(c => console.log(`  ${c.id} - ${c.name}`));

console.log('\n🔍 VERIFICANDO PRODUTOS COM ERRO:');
const erros = await sql`SELECT sku, name FROM products WHERE sku IN ('151027', '120684', '87561')`;
erros.forEach(p => console.log(`  ${p.sku} - ${p.name}`));

await sql.end(); 