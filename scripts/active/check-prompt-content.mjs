import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);

console.log('📝 CONTEÚDO DO PROMPT COMPLETE_ENRICHMENT...\n');

try {
  const [prompt] = await sql`
    SELECT name, category, prompt_template, variables, expected_output, is_active 
    FROM ai_prompts 
    WHERE name = 'complete_enrichment' AND category = 'general'
  `;
  
  if (prompt) {
    console.log('📋 DADOS DO PROMPT:');
    console.log('   Nome:', prompt.name);
    console.log('   Categoria:', prompt.category);
    console.log('   Ativo:', prompt.is_active);
    console.log('   Variáveis:', prompt.variables);
    console.log('   Output esperado:', prompt.expected_output?.substring(0, 200) + '...');
    
    console.log('\n📝 TEMPLATE COMPLETO:');
    console.log('=' .repeat(80));
    console.log(prompt.prompt_template);
    console.log('=' .repeat(80));
  } else {
    console.log('❌ Prompt não encontrado');
  }
  
} catch (error) {
  console.error('❌ Erro:', error.message);
}

await sql.end(); 