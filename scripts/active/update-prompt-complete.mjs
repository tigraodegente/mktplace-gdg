import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.develop' });
const sql = postgres(process.env.DATABASE_URL);

const novoPrompt = `Você é especialista em e-commerce brasileiro. Analise este produto e enriqueça TODOS os campos:

DADOS DO PRODUTO:
Nome: "{{name}}"
Preço: R$ {{price}}
Categoria atual: {{category}}
Descrição atual: "{{description}}"
Brand ID: {{brand_id}}

CATEGORIAS DISPONÍVEIS:
{{categories_list}}

MARCAS DISPONÍVEIS:  
{{brands_list}}

INSTRUÇÕES:
1. Escolha a categoria mais apropriada do catálogo
2. Crie descrição completa (300-500 palavras) em português brasileiro
3. Gere meta descriptions otimizada para SEO (150-160 caracteres)
4. Crie título meta otimizado (50-60 caracteres)
5. Gere palavras-chave relevantes
6. Defina atributos para filtros da loja
7. Especifique detalhes técnicos

RETORNE APENAS JSON VÁLIDO:
{
  "category_id": "uuid-da-categoria-ou-null",
  "description": "Descrição completa de 300-500 palavras em português brasileiro, destacando benefícios, características e diferenciais do produto",
  "short_description": "Resumo de 80-120 caracteres para listagens",
  "meta_description": "Meta description SEO de 150-160 caracteres",
  "meta_title": "Título SEO de 50-60 caracteres",
  "meta_keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "attributes": {
    "Cor": ["Azul", "Verde", "Rosa"],
    "Tamanho": ["P", "M", "G"],
    "Material": ["Algodão"]
  },
  "specifications": {
    "Material": "100% Algodão",
    "Dimensões": "45 x 35 x 25 cm",
    "Peso": "1,2 kg",
    "Garantia": "12 meses",
    "Origem": "Brasil"
  }
}`;

console.log('🔧 ATUALIZANDO PROMPT COMPLETE_ENRICHMENT...\n');

try {
  const result = await sql`
    UPDATE ai_prompts 
    SET 
      prompt_template = ${novoPrompt},
      updated_at = NOW()
    WHERE name = 'complete_enrichment' AND category = 'general'
  `;
  
  console.log('✅ Prompt atualizado com sucesso!');
  console.log('📋 Linhas afetadas:', result.count);
  
  // Verificar se foi atualizado
  const [updated] = await sql`
    SELECT prompt_template 
    FROM ai_prompts 
    WHERE name = 'complete_enrichment' AND category = 'general'
  `;
  
  console.log('\n📝 NOVO PROMPT (preview):');
  console.log(updated.prompt_template.substring(0, 300) + '...');
  
} catch (error) {
  console.error('❌ Erro ao atualizar:', error.message);
}

await sql.end(); 