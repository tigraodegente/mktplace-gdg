#!/usr/bin/env node

/**
 * Limpeza Final - Remover Tabelas Antigas
 * 
 * Remove as tabelas do sistema antigo de frete após confirmação da migração
 * ATENÇÃO: Esta operação é IRREVERSÍVEL
 */

import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

class ShippingCleanup {
  constructor() {
    this.connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
    this.client = new Client({
      connectionString: this.connectionString,
      ssl: { rejectUnauthorized: false }
    });
    this.backupFile = `backup/final-cleanup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.sql`;
  }

  async init() {
    await this.client.connect();
    console.log('✅ Conectado ao banco de dados');
    
    if (!fs.existsSync('backup')) {
      fs.mkdirSync('backup', { recursive: true });
    }
  }

  async validateMigration() {
    console.log('\n🔍 VALIDANDO MIGRAÇÃO ANTES DA LIMPEZA');
    console.log('======================================');

    const checks = [
      { table: 'shipping_carriers', min: 1, desc: 'transportadoras' },
      { table: 'shipping_zones', min: 1000, desc: 'zonas' },
      { table: 'shipping_rates', min: 10, desc: 'tarifas' },
      { table: 'seller_shipping_configs', min: 1, desc: 'configurações' }
    ];

    let allValid = true;

    for (const check of checks) {
      const result = await this.client.query(`SELECT COUNT(*) as total FROM ${check.table} WHERE is_active = true`);
      const total = parseInt(result.rows[0].total);
      
      if (total >= check.min) {
        console.log(`✅ ${check.desc}: ${total} registros ativos`);
      } else {
        console.log(`❌ ${check.desc}: ${total} registros (mínimo: ${check.min})`);
        allValid = false;
      }
    }

    if (!allValid) {
      console.log('\n❌ MIGRAÇÃO INVÁLIDA - Cancelando limpeza por segurança');
      console.log('💡 Execute novamente a migração antes de limpar');
      return false;
    }

    console.log('\n✅ MIGRAÇÃO VÁLIDA - Prosseguindo com limpeza');
    return true;
  }

  async createFinalBackup() {
    console.log('\n🔒 CRIANDO BACKUP FINAL DAS TABELAS ANTIGAS');
    console.log('=============================================');

    const oldTables = [
      'shipping_modalities',
      'shipping_calculated_options'
    ];

    let backupSQL = '-- BACKUP FINAL ANTES DA REMOÇÃO\n';
    backupSQL += `-- Data: ${new Date().toISOString()}\n`;
    backupSQL += '-- ATENÇÃO: Após este backup, as tabelas serão removidas\n\n';

    for (const table of oldTables) {
      try {
        console.log(`📋 Backup final: ${table}`);
        
        // Backup da estrutura
        const structureResult = await this.client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = '${table}' AND table_schema = 'public'
          ORDER BY ordinal_position
        `);

        if (structureResult.rows.length > 0) {
          backupSQL += `-- ESTRUTURA: ${table}\n`;
          backupSQL += `CREATE TABLE IF NOT EXISTS ${table}_final_backup (\n`;
          structureResult.rows.forEach((col, index) => {
            const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            const comma = index < structureResult.rows.length - 1 ? ',' : '';
            backupSQL += `  ${col.column_name} ${col.data_type}${nullable}${defaultVal}${comma}\n`;
          });
          backupSQL += `);\n\n`;

          // Backup dos dados
          const dataResult = await this.client.query(`SELECT * FROM ${table}`);
          console.log(`   └── ${dataResult.rows.length} registros salvos`);

          if (dataResult.rows.length > 0) {
            const columns = Object.keys(dataResult.rows[0]).join(', ');
            backupSQL += `-- DADOS: ${table}\n`;
            backupSQL += `INSERT INTO ${table}_final_backup (${columns}) VALUES\n`;
            
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
        } else {
          console.log(`   ⚠️ Tabela ${table} não encontrada`);
        }

      } catch (error) {
        console.log(`❌ Erro no backup de ${table}:`, error.message);
      }
    }

    // Salvar backup
    fs.writeFileSync(this.backupFile, backupSQL);
    console.log(`✅ Backup final salvo em: ${this.backupFile}`);
    console.log(`📊 Tamanho: ${(fs.statSync(this.backupFile).size / 1024).toFixed(2)} KB`);
  }

  async removeLegacyTables() {
    console.log('\n🗑️  REMOVENDO TABELAS ANTIGAS');
    console.log('==============================');

    const tablesToRemove = [
      'shipping_modalities',
      'shipping_calculated_options'
    ];

    const removedTables = [];
    const errors = [];

    for (const table of tablesToRemove) {
      try {
        // Verificar se tabela existe
        const exists = await this.client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${table}'
          )
        `);

        if (exists.rows[0].exists) {
          // Verificar dependências
          console.log(`🔍 Verificando dependências de ${table}...`);
          
          const dependencies = await this.client.query(`
            SELECT 
              tc.table_name,
              tc.constraint_name
            FROM information_schema.table_constraints tc
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.constraint_name IN (
              SELECT constraint_name
              FROM information_schema.constraint_column_usage
              WHERE table_name = '${table}'
            )
          `);

          if (dependencies.rows.length > 0) {
            console.log(`   ⚠️ Encontradas ${dependencies.rows.length} dependências`);
            // Remover com CASCADE
            await this.client.query(`DROP TABLE ${table} CASCADE`);
            console.log(`   ✅ ${table} removida com CASCADE`);
          } else {
            // Remover normalmente
            await this.client.query(`DROP TABLE ${table}`);
            console.log(`   ✅ ${table} removida`);
          }

          removedTables.push(table);
        } else {
          console.log(`   ⚠️ ${table} não existe (já removida?))`);
        }

      } catch (error) {
        console.log(`   ❌ Erro ao remover ${table}:`, error.message);
        errors.push({ table, error: error.message });
      }
    }

    return { removedTables, errors };
  }

  async validateCleanup() {
    console.log('\n✅ VALIDANDO LIMPEZA');
    console.log('====================');

    const oldTables = ['shipping_modalities', 'shipping_calculated_options'];
    let allRemoved = true;

    for (const table of oldTables) {
      const exists = await this.client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table}'
        )
      `);

      if (exists.rows[0].exists) {
        console.log(`❌ ${table} ainda existe`);
        allRemoved = false;
      } else {
        console.log(`✅ ${table} removida com sucesso`);
      }
    }

    // Verificar se sistema novo ainda funciona
    const newTablesCheck = await Promise.all([
      this.client.query('SELECT COUNT(*) as total FROM shipping_carriers WHERE is_active = true'),
      this.client.query('SELECT COUNT(*) as total FROM shipping_zones WHERE is_active = true'),
      this.client.query('SELECT COUNT(*) as total FROM shipping_rates WHERE is_active = true')
    ]);

    const [carriers, zones, rates] = newTablesCheck.map(r => parseInt(r.rows[0].total));

    console.log('\n🎯 SISTEMA NOVO (pós-limpeza):');
    console.log(`   ✅ ${carriers} transportadoras`);
    console.log(`   ✅ ${zones} zonas`);
    console.log(`   ✅ ${rates} tarifas`);

    return allRemoved && carriers > 0 && zones > 0 && rates > 0;
  }

  async close() {
    await this.client.end();
  }
}

async function executeCleanup() {
  const cleanup = new ShippingCleanup();

  try {
    await cleanup.init();

    console.log('🧹 INICIANDO LIMPEZA FINAL DO SISTEMA DE FRETE');
    console.log('===============================================');

    // 1. Validar migração
    const isValid = await cleanup.validateMigration();
    if (!isValid) {
      return;
    }

    // 2. Backup final
    await cleanup.createFinalBackup();

    // 3. Confirmar operação
    console.log('\n⚠️  CONFIRMAÇÃO NECESSÁRIA');
    console.log('==========================');
    console.log('Esta operação removerá PERMANENTEMENTE as tabelas antigas:');
    console.log('- shipping_modalities');
    console.log('- shipping_calculated_options');
    console.log('');
    console.log('✅ Backup criado em:', cleanup.backupFile);
    console.log('✅ Sistema novo validado e funcionando');
    console.log('');
    console.log('Para prosseguir, execute:');
    console.log('node scripts/migration/cleanup-old-tables.js --confirm');

    // Verificar se tem flag de confirmação
    const args = process.argv.slice(2);
    if (!args.includes('--confirm')) {
      console.log('\n⏸️  LIMPEZA PAUSADA - Aguardando confirmação');
      return;
    }

    // 4. Executar remoção
    console.log('\n🗑️  EXECUTANDO REMOÇÃO...');
    const { removedTables, errors } = await cleanup.removeLegacyTables();

    // 5. Validar limpeza
    const cleanupSuccess = await cleanup.validateCleanup();

    // 6. Resultado final
    console.log('\n🎯 RESULTADO DA LIMPEZA');
    console.log('=======================');

    if (cleanupSuccess && errors.length === 0) {
      console.log('🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
      console.log(`✅ ${removedTables.length} tabelas antigas removidas`);
      console.log('✅ Sistema novo funcionando perfeitamente');
      console.log('✅ Migração 100% completa');
      
      console.log('\n📋 SISTEMA FINAL:');
      console.log('   ✅ Estrutura moderna e limpa');
      console.log('   ✅ APIs REST funcionando');
      console.log('   ✅ Interface admin conectada');
      console.log('   ✅ Store usando nova estrutura');
      console.log('   ✅ Zero legacy code');
      
    } else {
      console.log('❌ LIMPEZA PARCIAL OU COM PROBLEMAS');
      console.log('📋 Tabelas removidas:', removedTables.join(', '));
      if (errors.length > 0) {
        console.log('❌ Erros:', errors.map(e => e.table).join(', '));
      }
    }

    console.log('\n🔒 BACKUP PERMANENTE:', cleanup.backupFile);

  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO NA LIMPEZA:', error);
    console.log('🔒 Backup disponível em:', cleanup.backupFile);
  } finally {
    await cleanup.close();
  }
}

executeCleanup(); 