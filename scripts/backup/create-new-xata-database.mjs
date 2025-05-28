#!/usr/bin/env node

import 'dotenv/config';
import fetch from 'node-fetch';

const XATA_API_KEY = process.env.XATA_API_KEY;
const WORKSPACE = process.env.XATA_WORKSPACE || 'GUSTAVO-FERRO-s-workspace-787mk0';
const REGION = 'us-east-1';
const DATABASE_NAME = 'mktplace-gdg-orm'; // Nome diferente para não conflitar

async function createDatabase() {
  console.log('🚀 Criando novo banco de dados Xata (sem PostgreSQL)...\n');
  
  const url = `https://api.xata.io/workspaces/${WORKSPACE}/dbs/${DATABASE_NAME}`;
  
  console.log(`📦 Criando banco: ${DATABASE_NAME}`);
  console.log(`   Workspace: ${WORKSPACE}`);
  console.log(`   Region: ${REGION}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${XATA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        region: REGION,
        // NÃO incluir postgresEnabled: true
        ui: {
          color: 'blue'
        }
      })
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      console.log(`\n✅ Banco de dados ${DATABASE_NAME} criado com sucesso!`);
      console.log('✅ PostgreSQL NÃO está habilitado (perfeito para usar a ORM)');
      
      console.log('\n📝 Próximos passos:');
      console.log('1. Atualize o arquivo .xatarc para usar o novo banco:');
      console.log(`   {
     "databaseURL": "https://${WORKSPACE}.${REGION}.xata.sh/db/${DATABASE_NAME}"
   }`);
      console.log('\n2. Execute: node scripts/create-all-marketplace-tables.mjs');
      console.log('3. Execute: npx xata pull main');
      console.log('4. Execute: cd packages/xata-client && npm run build && cd ../..');
      console.log('5. Execute: node scripts/seed-all-xata.mjs');
      
      return true;
    } else {
      console.log(`\n❌ Erro ao criar banco de dados:`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Resposta: ${responseText}`);
      
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message) {
          console.log(`   Mensagem: ${errorJson.message}`);
        }
      } catch (e) {
        // Não é JSON
      }
      
      return false;
    }
  } catch (error) {
    console.log(`\n❌ Erro ao criar banco de dados:`);
    console.log(`   Erro: ${error.message}`);
    return false;
  }
}

// Verificar se temos a API key
if (!XATA_API_KEY) {
  console.error('❌ XATA_API_KEY não encontrada no .env');
  process.exit(1);
}

createDatabase().catch(console.error); 