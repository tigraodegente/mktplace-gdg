#!/usr/bin/env node

/**
 * MIGRAÇÃO COMPLETA - Sistema de Frete
 * 
 * Migra dados do sistema antigo (Store) para estrutura nova (Admin-Panel)
 * ATENÇÃO: Este script é IRREVERSÍVEL após a limpeza final
 */

import { execSync } from 'child_process';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

class ShippingMigration {
  constructor() {
    this.connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
    this.client = new Client({
      connectionString: this.connectionString,
      ssl: { rejectUnauthorized: false }
    });
    this.backupFile = `backup/shipping-migration-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.sql`;
  }

  async init() {
    await this.client.connect();
    console.log('✅ Conectado ao banco de dados');
    
    // Criar diretório de backup
    if (!fs.existsSync('backup')) {
      fs.mkdirSync('backup', { recursive: true });
    }
  }

  // FASE 1: BACKUP COMPLETO
  async createBackup() {
    console.log('\n🔒 FASE 1: CRIANDO BACKUP COMPLETO');
    console.log('=====================================');

    const tables = [
      'shipping_modalities',
      'shipping_calculated_options', 
      'shipping_zones',
      'shipping_carriers'
    ];

    let backupSQL = '-- BACKUP COMPLETO DO SISTEMA DE FRETE ANTIGO\n';
    backupSQL += `-- Data: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      try {
        console.log(`📋 Fazendo backup: ${table}`);
        
        // Backup da estrutura
        const structureResult = await this.client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = '${table}' AND table_schema = 'public'
          ORDER BY ordinal_position
        `);

        backupSQL += `-- ESTRUTURA: ${table}\n`;
        backupSQL += `CREATE TABLE IF NOT EXISTS ${table}_backup (\n`;
        structureResult.rows.forEach((col, index) => {
          const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          const comma = index < structureResult.rows.length - 1 ? ',' : '';
          backupSQL += `  ${col.column_name} ${col.data_type}${nullable}${defaultVal}${comma}\n`;
        });
        backupSQL += `);\n\n`;

        // Backup dos dados
        const dataResult = await this.client.query(`SELECT * FROM ${table}`);
        console.log(`   └── ${dataResult.rows.length} registros`);

        if (dataResult.rows.length > 0) {
          const columns = Object.keys(dataResult.rows[0]).join(', ');
          backupSQL += `-- DADOS: ${table}\n`;
          backupSQL += `INSERT INTO ${table}_backup (${columns}) VALUES\n`;
          
          dataResult.rows.forEach((row, index) => {
            const values = Object.values(row).map(val => 
              val === null ? 'NULL' : 
              typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` :
              typeof val === 'object' ? `'${JSON.stringify(val).replace(/'/g, "''")}'` :
              val
            ).join(', ');
            const comma = index < dataResult.rows.length - 1 ? ',' : ';';
            backupSQL += `(${values})${comma}\n`;
          });
          backupSQL += '\n';
        }

      } catch (error) {
        console.log(`❌ Erro no backup de ${table}:`, error.message);
      }
    }

    // Salvar backup
    fs.writeFileSync(this.backupFile, backupSQL);
    console.log(`✅ Backup salvo em: ${this.backupFile}`);
    console.log(`📊 Tamanho: ${(fs.statSync(this.backupFile).size / 1024).toFixed(2)} KB`);
  }

  // FASE 2: MIGRAÇÃO DOS DADOS
  async migrateData() {
    console.log('\n🔄 FASE 2: MIGRANDO DADOS PARA ESTRUTURA NOVA');
    console.log('==============================================');

    // 2.1: Migrar shipping_carriers (se necessário)
    await this.migrateCarriers();
    
    // 2.2: Migrar shipping_zones 
    await this.migrateZones();
    
    // 2.3: Criar shipping_rates baseado em shipping_modalities
    await this.migrateRates();
    
    // 2.4: Criar configurações padrão para sellers
    await this.createDefaultSellerConfigs();
  }

  async migrateCarriers() {
    console.log('\n📦 2.1: Migrando Transportadoras');
    
    // Verificar carriers existentes
    const existingCarriers = await this.client.query('SELECT COUNT(*) as total FROM shipping_carriers');
    const total = parseInt(existingCarriers.rows[0].total);
    
    if (total === 0) {
      console.log('   ❌ Nenhuma transportadora encontrada, criando padrões...');
      
      await this.client.query(`
        INSERT INTO shipping_carriers (id, name, type, is_active, settings, created_at) VALUES
        ('frenet-carrier', 'Frenet', 'api', true, '{"api_user": "", "api_password": ""}', NOW()),
        ('global-carrier', 'Global Shipping', 'table', true, '{"contact": "", "phone": ""}', NOW())
      `);
      
      console.log('   ✅ Transportadoras padrão criadas');
    } else {
      console.log(`   ✅ ${total} transportadoras já existem`);
    }
  }

  async migrateZones() {
    console.log('\n🌍 2.2: Verificando Zonas de Entrega');
    
    const zonesCount = await this.client.query('SELECT COUNT(*) as total FROM shipping_zones');
    const total = parseInt(zonesCount.rows[0].total);
    
    console.log(`   ✅ ${total} zonas já existem na estrutura nova`);
    
    // Verificar se precisam ser atualizadas com carrier_id
    const zonesWithoutCarrier = await this.client.query(`
      SELECT COUNT(*) as total FROM shipping_zones WHERE carrier_id IS NULL
    `);
    
    const withoutCarrier = parseInt(zonesWithoutCarrier.rows[0].total);
    
    if (withoutCarrier > 0) {
      console.log(`   🔧 Atualizando ${withoutCarrier} zonas sem transportadora...`);
      
      await this.client.query(`
        UPDATE shipping_zones 
        SET carrier_id = 'frenet-carrier' 
        WHERE carrier_id IS NULL
      `);
      
      console.log('   ✅ Zonas atualizadas com transportadora padrão');
    }
  }

  async migrateRates() {
    console.log('\n💰 2.3: Migrando Modalidades → Tarifas');
    
    // Verificar se shipping_rates está vazio
    const ratesCount = await this.client.query('SELECT COUNT(*) as total FROM shipping_rates');
    const total = parseInt(ratesCount.rows[0].total);
    
    if (total > 0) {
      console.log(`   ✅ ${total} tarifas já existem`);
      return;
    }
    
    // Buscar modalidades do sistema antigo
    const modalities = await this.client.query(`
      SELECT * FROM shipping_modalities WHERE is_active = true ORDER BY priority
    `);
    
    console.log(`   📋 Encontradas ${modalities.rows.length} modalidades ativas`);
    
    // Buscar zonas para criar tarifas
    const zones = await this.client.query(`
      SELECT id, name FROM shipping_zones WHERE is_active = true LIMIT 10
    `);
    
    console.log(`   🌍 Criando tarifas para ${zones.rows.length} zonas principais`);
    
    let createdRates = 0;
    
    for (const modality of modalities.rows) {
      for (const zone of zones.rows) {
        // Criar tarifa baseada na modalidade
        const basePrice = parseFloat(modality.min_price || 10);
        const pricePerKg = basePrice * parseFloat(modality.price_multiplier || 1);
        
        await this.client.query(`
          INSERT INTO shipping_rates (
            id, zone_id, weight_rules, base_price, price_per_kg, 
            additional_fees, is_active, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, true, NOW()
          )
        `, [
          `rate_${zone.id}_${modality.id}`,
          zone.id,
          JSON.stringify({
            min_weight: 0,
            max_weight: 50,
            unit: 'kg'
          }),
          basePrice,
          pricePerKg,
          JSON.stringify({
            fuel_surcharge: 0.1,
            handling_fee: 2.0
          })
        ]);
        
        createdRates++;
      }
    }
    
    console.log(`   ✅ ${createdRates} tarifas criadas`);
  }

  async createDefaultSellerConfigs() {
    console.log('\n👤 2.4: Criando Configurações Padrão para Sellers');
    
    const configsCount = await this.client.query('SELECT COUNT(*) as total FROM seller_shipping_configs');
    const total = parseInt(configsCount.rows[0].total);
    
    if (total > 0) {
      console.log(`   ✅ ${total} configurações já existem`);
      return;
    }
    
    // Buscar sellers existentes (assumindo que existem)
    try {
      const sellers = await this.client.query(`
        SELECT id FROM users WHERE role = 'seller' OR role LIKE '%seller%' LIMIT 5
      `);
      
      if (sellers.rows.length === 0) {
        console.log('   ⚠️ Nenhum seller encontrado, criando config padrão');
        
        // Criar configuração padrão geral
        await this.client.query(`
          INSERT INTO seller_shipping_configs (
            id, seller_id, carrier_id, is_enabled, markup_percentage, 
            free_shipping_threshold, max_weight_kg, is_active, created_at
          ) VALUES (
            'default_config', 'default', 'frenet-carrier', true, 10.0, 100.0, 30.0, true, NOW()
          )
        `);
        
        console.log('   ✅ Configuração padrão criada');
      } else {
        console.log(`   📋 Criando configurações para ${sellers.rows.length} sellers`);
        
        for (const seller of sellers.rows) {
          await this.client.query(`
            INSERT INTO seller_shipping_configs (
              id, seller_id, carrier_id, is_enabled, markup_percentage,
              free_shipping_threshold, max_weight_kg, is_active, created_at
            ) VALUES (
              $1, $2, 'frenet-carrier', true, 15.0, 150.0, 25.0, true, NOW()
            )
          `, [`config_${seller.id}`, seller.id]);
        }
        
        console.log(`   ✅ ${sellers.rows.length} configurações criadas`);
      }
    } catch (error) {
      console.log('   ⚠️ Erro ao buscar sellers, criando config padrão');
      
      await this.client.query(`
        INSERT INTO seller_shipping_configs (
          id, seller_id, carrier_id, is_enabled, markup_percentage,
          free_shipping_threshold, max_weight_kg, is_active, created_at
        ) VALUES (
          'default_config', 'system', 'frenet-carrier', true, 10.0, 100.0, 30.0, true, NOW()
        )
      `);
    }
  }

  // FASE 3: VALIDAÇÃO
  async validateMigration() {
    console.log('\n✅ FASE 3: VALIDANDO MIGRAÇÃO');
    console.log('==============================');

    const validations = [
      { table: 'shipping_carriers', min: 1 },
      { table: 'shipping_zones', min: 1000 },
      { table: 'shipping_rates', min: 10 },
      { table: 'seller_shipping_configs', min: 1 }
    ];

    let allValid = true;

    for (const validation of validations) {
      const result = await this.client.query(`SELECT COUNT(*) as total FROM ${validation.table}`);
      const total = parseInt(result.rows[0].total);
      
      if (total >= validation.min) {
        console.log(`✅ ${validation.table}: ${total} registros`);
      } else {
        console.log(`❌ ${validation.table}: ${total} registros (mínimo: ${validation.min})`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log('\n🎉 MIGRAÇÃO VÁLIDA - Todos os dados migrados com sucesso!');
      return true;
    } else {
      console.log('\n❌ MIGRAÇÃO INVÁLIDA - Verificar erros acima');
      return false;
    }
  }

  // FASE 4: LIMPEZA (OPCIONAL - PERIGOSO)
  async cleanup(confirm = false) {
    if (!confirm) {
      console.log('\n⚠️  FASE 4: LIMPEZA NÃO EXECUTADA');
      console.log('Para executar limpeza, chame: cleanup(true)');
      console.log('ATENÇÃO: Isto removerá as tabelas antigas permanentemente!');
      return;
    }

    console.log('\n🗑️  FASE 4: LIMPEZA DAS TABELAS ANTIGAS');
    console.log('======================================');

    const oldTables = [
      'shipping_modalities',
      'shipping_calculated_options'
    ];

    for (const table of oldTables) {
      try {
        await this.client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Tabela ${table} removida`);
      } catch (error) {
        console.log(`❌ Erro ao remover ${table}:`, error.message);
      }
    }

    console.log('\n🎯 LIMPEZA CONCLUÍDA - Sistema migrado completamente!');
  }

  async close() {
    await this.client.end();
  }
}

// EXECUTAR MIGRAÇÃO
async function runMigration() {
  const migration = new ShippingMigration();

  try {
    await migration.init();

    console.log('🚀 INICIANDO MIGRAÇÃO COMPLETA DO SISTEMA DE FRETE');
    console.log('==================================================');

    // FASE 1: Backup
    await migration.createBackup();

    // FASE 2: Migração
    await migration.migrateData();

    // FASE 3: Validação
    const isValid = await migration.validateMigration();

    if (isValid) {
      console.log('\n🎉 SUCESSO: Migração concluída com sucesso!');
      console.log('📋 Próximos passos:');
      console.log('   1. Atualizar UnifiedShippingService.ts na Store');
      console.log('   2. Testar funcionalidades de frete');
      console.log('   3. Executar limpeza (opcional): node migrate-shipping-complete.js --cleanup');
    } else {
      console.log('\n❌ FALHA: Migração não foi bem-sucedida');
      console.log('💡 Verificar logs acima e corrigir problemas');
    }

  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO:', error);
    console.log('\n🔒 Backup disponível em:', migration.backupFile);
  } finally {
    await migration.close();
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);
if (args.includes('--cleanup')) {
  // Execução com limpeza
  console.log('⚠️  MODO LIMPEZA ATIVADO');
  runMigration().then(() => {
    console.log('Para executar limpeza, rode: node migrate-shipping-complete.js --force-cleanup');
  });
} else {
  runMigration();
} 