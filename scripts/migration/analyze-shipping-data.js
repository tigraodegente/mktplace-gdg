#!/usr/bin/env node

/**
 * Script de Análise - Sistema de Frete Existente
 * 
 * Analisa a estrutura atual de frete na Store para preparar migração
 */

import { execSync } from 'child_process';
import pg from 'pg';

const { Client } = pg;

async function analyzeShippingData() {
  console.log('🔍 ANALISANDO SISTEMA DE FRETE EXISTENTE...\n');
  
  // Usar CONNECTION_STRING do .env
  const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');
    
    // 1. Listar todas as tabelas relacionadas a shipping
    console.log('\n📋 1. TABELAS RELACIONADAS A SHIPPING:');
    console.log('==========================================');
    
    try {
      const tablesResult = await client.query(`
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_name LIKE '%shipping%' 
          AND table_schema = 'public'
        ORDER BY table_name
      `);
      
      if (tablesResult.rows.length > 0) {
        tablesResult.rows.forEach(table => {
          console.log(`✅ ${table.table_name} (${table.table_type})`);
        });
      } else {
        console.log('❌ Nenhuma tabela de shipping encontrada');
      }
    } catch (error) {
      console.log('❌ Erro ao listar tabelas:', error.message);
    }
    
    console.log('\n📊 2. ANALISANDO DADOS EXISTENTES:');
    console.log('==========================================');
    
    // 2. Verificar tabelas específicas que vimos no código
    const tablesToCheck = [
      'shipping_zones',
      'shipping_modalities', 
      'shipping_calculated_options',
      'shipping_carriers',
      'shipping_rates',
      'seller_shipping_configs'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        const countResult = await client.query(`
          SELECT COUNT(*) as total FROM ${tableName}
        `);
        
        const total = parseInt(countResult.rows[0]?.total || '0');
        console.log(`📊 ${tableName}: ${total} registros`);
        
        if (total > 0 && total <= 10) {
          // Mostrar alguns dados se poucos registros
          const sampleResult = await client.query(`
            SELECT * FROM ${tableName} LIMIT 3
          `);
          const fields = Object.keys(sampleResult.rows[0] || {}).slice(0, 3);
          console.log(`   └── Campos:`, fields.join(', '));
        }
        
      } catch (error) {
        console.log(`❌ ${tableName}: Tabela não existe ou erro (${error.message})`);
      }
    }
    
    console.log('\n🔧 3. VERIFICANDO ESTRUTURA DAS TABELAS:');
    console.log('==========================================');
    
    // 3. Analisar estrutura das tabelas existentes
    for (const tableName of tablesToCheck) {
      try {
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' 
            AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        
        if (columnsResult.rows.length > 0) {
          console.log(`\n📋 ESTRUTURA: ${tableName}`);
          columnsResult.rows.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
          });
        }
        
      } catch (error) {
        console.log(`❌ Erro ao analisar estrutura de ${tableName}`);
      }
    }
    
    console.log('\n🎯 4. RELATÓRIO DE MIGRAÇÃO:');
    console.log('==========================================');
    
    // 4. Gerar relatório para decisão
    const existingTables = [];
    const newTables = ['shipping_carriers', 'shipping_zones', 'shipping_rates', 'seller_shipping_configs'];
    
    for (const tableName of tablesToCheck) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const total = parseInt(countResult.rows[0]?.total || '0');
        if (total > 0) {
          existingTables.push({ name: tableName, records: total });
        }
      } catch (error) {
        // Tabela não existe
      }
    }
    
    console.log('\n✅ TABELAS COM DADOS (Sistema Antigo):');
    existingTables.forEach(table => {
      console.log(`   📊 ${table.name}: ${table.records} registros`);
    });
    
    console.log('\n🆕 TABELAS NOVAS (Sistema Novo):');
    for (const tableName of newTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const total = parseInt(countResult.rows[0]?.total || '0');
        console.log(`   📊 ${tableName}: ${total} registros`);
      } catch (error) {
        console.log(`   ❌ ${tableName}: Não existe ainda`);
      }
    }
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('==========================================');
    if (existingTables.length > 0) {
      console.log('✅ Sistema antigo encontrado com dados');
      console.log('🔄 Preparar migração dos dados existentes');
      console.log('📋 Tabelas a migrar:', existingTables.map(t => t.name).join(', '));
    } else {
      console.log('❌ Nenhum dado de frete encontrado');
      console.log('🆕 Populando sistema novo do zero');
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  } finally {
    await client.end();
  }
}

// Executar análise
analyzeShippingData()
  .then(() => {
    console.log('\n✅ ANÁLISE CONCLUÍDA!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ FALHA NA ANÁLISE:', error);
    process.exit(1);
  }); 