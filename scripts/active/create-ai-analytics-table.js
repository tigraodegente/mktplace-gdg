#!/usr/bin/env node

/**
 * Script para criar tabela de analytics de busca inteligente
 * Uso: node scripts/active/create-ai-analytics-table.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco (mesmo padrão do projeto)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function createAIAnalyticsTable() {
  console.log('🚀 Criando tabela de analytics de IA...');
  
  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(process.cwd(), 'sql-backup', 'create-faq-searches-postgres.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Conectar ao banco
    console.log('📡 Conectando ao banco...');
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    
    console.log('🔨 Executando SQL...');
    await client.query(sql);
    
    // Criar índices separadamente
    console.log('📚 Criando índices...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_faq_searches_session ON faq_searches(session_id);',
      'CREATE INDEX IF NOT EXISTS idx_faq_searches_created ON faq_searches(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_faq_searches_query ON faq_searches(query);',
      'CREATE INDEX IF NOT EXISTS idx_faq_searches_confidence ON faq_searches(ai_confidence);'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL);
        console.log(`✅ Índice criado: ${indexSQL.match(/idx_[a-z_]+/)[0]}`);
      } catch (err) {
        console.warn(`⚠️ Índice já existe ou erro: ${err.message}`);
      }
    }
    
    // Verificar se tabela foi criada
    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'faq_searches'
    `);
    
    if (result.rows[0].count > 0) {
      console.log('✅ Tabela faq_searches criada com sucesso!');
      
      // Mostrar estrutura da tabela
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'faq_searches'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Estrutura da tabela:');
      console.table(columns.rows);
      
    } else {
      console.error('❌ Falha ao criar tabela');
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
createAIAnalyticsTable()
  .then(() => {
    console.log('\n🎉 Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na execução:', error);
    process.exit(1);
  });

export { createAIAnalyticsTable }; 