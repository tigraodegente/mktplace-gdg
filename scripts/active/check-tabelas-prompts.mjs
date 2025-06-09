import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 VERIFICANDO TABELAS DE PROMPTS...\n');

try {
  // Verificar tabelas que contenham "prompt" no nome
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%prompt%'`;
  console.log('📋 Tabelas encontradas:', tables.map(t => t.table_name));
  
  if (tables.length === 0) {
    console.log('❌ Nenhuma tabela de prompts encontrada\n');
  }
  
  // Tentar ai_prompts
  try {
    console.log('\n🔍 Testando tabela ai_prompts...');
    const prompts = await sql`SELECT name, category, is_active FROM ai_prompts WHERE name = 'complete_enrichment'`;
    console.log('✅ Tabela ai_prompts existe!');
    console.log('📝 Prompts complete_enrichment encontrados:', prompts.length);
    if (prompts.length > 0) {
      prompts.forEach(p => {
        console.log(`   - ${p.name} (${p.category}) - Ativo: ${p.is_active}`);
      });
    }
  } catch (e) {
    console.log('❌ Erro ao consultar ai_prompts:', e.message);
  }
  
  // Tentar prompts
  try {
    console.log('\n🔍 Testando tabela prompts...');
    const prompts2 = await sql`SELECT prompt_key FROM prompts WHERE prompt_key = 'complete_enrichment'`;
    console.log('✅ Tabela prompts existe!');
    console.log('📝 Prompts complete_enrichment encontrados:', prompts2.length);
  } catch (e) {
    console.log('❌ Erro ao consultar prompts:', e.message);
  }
  
} catch (error) {
  console.error('❌ Erro geral:', error.message);
}

await sql.end(); 