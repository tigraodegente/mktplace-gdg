#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

console.log('🔧 CONFIGURAÇÃO E TESTE DO AMBIENTE\n');
console.log('=' .repeat(50) + '\n');

// 1. Verificar se .env.local existe
if (!fs.existsSync(envPath)) {
  console.log('❌ Arquivo .env.local não encontrado!');
  console.log('📝 Criando modelo de .env.local...\n');
  
  const envContent = `# ========================================
# 🔐 ARQUIVO .env.local - NUNCA COMMITAR!
# ========================================

# Database Connections
# --------------------
MONGODB_URI=mongodb+srv://gdg:FbiI3dOKYLGebzrb@back.9ssm3.mongodb.net/graodegente
NEON_DATABASE_URL=postgresql://neondb_owner:npg_wS8ux1paQcY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb

# OpenAI Configuration
# --------------------
# ⚠️ SUBSTITUA COM SUA NOVA KEY DA OPENAI!
OPENAI_API_KEY=sk-proj-COLE-SUA-CHAVE-AQUI
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# Rate Limiting
OPENAI_RATE_LIMIT_PER_MINUTE=20
OPENAI_RATE_LIMIT_PER_DAY=1000

# Cost Management
AI_COST_ALERT_THRESHOLD=100
AI_MONTHLY_BUDGET=200

# Feature Flags
ENABLE_AI_ENRICHMENT=true
ENABLE_ANTI_DETECTION=true
ENABLE_CONTENT_VALIDATION=true
ENABLE_COST_TRACKING=true

# Environment
NODE_ENV=development
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Arquivo .env.local criado!');
  console.log(`📍 Local: ${envPath}\n`);
  console.log('⚠️  IMPORTANTE:');
  console.log('1. Abra o arquivo e substitua OPENAI_API_KEY');
  console.log('2. Execute este script novamente após configurar\n');
  process.exit(0);
}

// 2. Carregar variáveis
dotenv.config({ path: envPath });

console.log('📋 VERIFICANDO CONFIGURAÇÃO:\n');

// 3. Verificar variáveis essenciais
const requiredVars = {
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
  'OPENAI_MODEL': process.env.OPENAI_MODEL,
  'NEON_DATABASE_URL': process.env.NEON_DATABASE_URL,
  'MONGODB_URI': process.env.MONGODB_URI
};

let hasErrors = false;

for (const [key, value] of Object.entries(requiredVars)) {
  if (!value || value.includes('COLE-SUA-CHAVE-AQUI')) {
    console.log(`❌ ${key}: NÃO CONFIGURADO!`);
    hasErrors = true;
  } else {
    // Mostrar apenas parte do valor por segurança
    const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    console.log(`✅ ${key}: ${masked}`);
  }
}

console.log('\n📊 CONFIGURAÇÃO DA IA:');
console.log(`- Modelo: ${process.env.OPENAI_MODEL || 'NÃO DEFINIDO'}`);
console.log(`- Max Tokens: ${process.env.OPENAI_MAX_TOKENS || 'NÃO DEFINIDO'}`);
console.log(`- Temperature: ${process.env.OPENAI_TEMPERATURE || 'NÃO DEFINIDO'}`);
console.log(`- Rate Limit: ${process.env.OPENAI_RATE_LIMIT_PER_MINUTE || 'NÃO DEFINIDO'}/min`);
console.log(`- Budget Mensal: $${process.env.AI_MONTHLY_BUDGET || 'NÃO DEFINIDO'}`);

if (hasErrors) {
  console.log('\n❌ ERROS ENCONTRADOS!');
  console.log('Por favor, configure as variáveis faltantes no .env.local');
  process.exit(1);
}

// 4. Testar conexão com OpenAI
console.log('\n🤖 TESTANDO OPENAI API...\n');

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('COLE-SUA-CHAVE-AQUI')) {
  console.log('❌ OPENAI_API_KEY não configurada!');
  console.log('Por favor, adicione sua chave no arquivo .env.local');
  process.exit(1);
}

try {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log('📡 Fazendo chamada de teste...');
  
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente de teste. Responda brevemente.'
      },
      {
        role: 'user',
        content: 'Diga apenas "OK" se estiver funcionando.'
      }
    ],
    max_tokens: 10,
    temperature: 0.1
  });

  const response = completion.choices[0].message.content;
  console.log(`✅ Resposta da API: "${response}"`);
  console.log(`✅ Modelo usado: ${completion.model}`);
  console.log(`✅ Tokens usados: ${completion.usage.total_tokens}`);
  
  // Calcular custo aproximado
  const inputCost = (completion.usage.prompt_tokens / 1000) * 0.01; // $0.01 per 1k
  const outputCost = (completion.usage.completion_tokens / 1000) * 0.03; // $0.03 per 1k
  const totalCost = inputCost + outputCost;
  
  console.log(`💰 Custo do teste: $${totalCost.toFixed(6)}`);

  // 5. Verificar .gitignore
  console.log('\n🔒 VERIFICANDO SEGURANÇA:\n');
  
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('.env.local')) {
      console.log('✅ .env.local está no .gitignore');
    } else {
      console.log('⚠️  AVISO: .env.local NÃO está no .gitignore!');
      console.log('Adicionando ao .gitignore...');
      fs.appendFileSync(gitignorePath, '\n# Local environment variables\n.env.local\n.env*.local\n');
      console.log('✅ Adicionado ao .gitignore');
    }
  }

  // 6. Resumo final
  console.log('\n' + '=' .repeat(50));
  console.log('\n🎉 CONFIGURAÇÃO COMPLETA E FUNCIONANDO!\n');
  console.log('✅ OpenAI API: Conectada');
  console.log('✅ Modelo: ' + (process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'));
  console.log('✅ Databases: Configuradas');
  console.log('✅ Segurança: .gitignore configurado');
  
  console.log('\n📊 ESTIMATIVA DE CUSTOS:');
  console.log('- Por produto: ~$0.02');
  console.log('- 2.633 produtos: ~$52.66');
  console.log('- Com reviews: ~$135.60 total');
  
  console.log('\n🚀 PRÓXIMOS PASSOS:');
  console.log('1. Execute: node scripts/enrich-products.mjs');
  console.log('2. Comece com 10 produtos de teste');
  console.log('3. Monitore os custos no dashboard da OpenAI');
  
} catch (error) {
  console.error('\n❌ ERRO AO TESTAR OPENAI:');
  console.error(error.message);
  
  if (error.message.includes('401')) {
    console.error('\n⚠️  Chave de API inválida!');
    console.error('Verifique se copiou a chave corretamente.');
  } else if (error.message.includes('429')) {
    console.error('\n⚠️  Rate limit excedido!');
    console.error('Aguarde alguns minutos e tente novamente.');
  } else if (error.message.includes('insufficient_quota')) {
    console.error('\n⚠️  Sem créditos na conta OpenAI!');
    console.error('Adicione créditos em: https://platform.openai.com/account/billing');
  }
  
  process.exit(1);
} 