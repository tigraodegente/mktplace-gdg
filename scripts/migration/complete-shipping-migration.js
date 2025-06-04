#!/usr/bin/env node

/**
 * MIGRAÇÃO COMPLETA CORRETA - Sistema de Frete
 * 
 * Restaura dados do backup e migra TODAS as opções de frete para cobertura nacional
 */

import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

class CompleteShippingMigration {
  constructor() {
    this.connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
    this.client = new Client({
      connectionString: this.connectionString,
      ssl: { rejectUnauthorized: false }
    });
    this.backupFile = 'backup/shipping-migration-2025-06-04T14-59-55.sql'; // Backup mais recente
  }

  async init() {
    await this.client.connect();
    console.log('✅ Conectado ao banco de dados');
  }

  // FASE 1: RESTAURAR TABELAS TEMPORÁRIAS
  async restoreTemporaryTables() {
    console.log('\n🔄 FASE 1: RESTAURANDO TABELAS TEMPORÁRIAS');
    console.log('===========================================');

    if (!fs.existsSync(this.backupFile)) {
      throw new Error(`Backup não encontrado: ${this.backupFile}`);
    }

    console.log(`📋 Lendo backup: ${this.backupFile}`);
    const backupSQL = fs.readFileSync(this.backupFile, 'utf8');

    // Criar tabelas temporárias a partir do backup
    console.log('🔧 Criando tabelas temporárias...');

    // Extrair e executar CREATE TABLE statements
    const createTableRegex = /CREATE TABLE IF NOT EXISTS (\w+)_backup \(([\s\S]*?)\);/g;
    let match;

    while ((match = createTableRegex.exec(backupSQL)) !== null) {
      const tableName = match[1];
      const tableDefinition = match[2];
      
      console.log(`   📦 Criando tabela temporária: ${tableName}_temp`);
      
      try {
        await this.client.query(`DROP TABLE IF EXISTS ${tableName}_temp CASCADE`);
        await this.client.query(`
          CREATE TABLE ${tableName}_temp (
            ${tableDefinition}
          )
        `);
        console.log(`   ✅ ${tableName}_temp criada`);
      } catch (error) {
        console.log(`   ❌ Erro ao criar ${tableName}_temp:`, error.message);
      }
    }

    // Extrair e executar INSERT statements
    console.log('\n📊 Populando tabelas temporárias...');
    
    const insertRegex = /INSERT INTO (\w+)_backup \((.*?)\) VALUES\n([\s\S]*?);/g;
    let insertMatch;

    while ((insertMatch = insertRegex.exec(backupSQL)) !== null) {
      const tableName = insertMatch[1];
      const columns = insertMatch[2];
      const values = insertMatch[3];
      
      console.log(`   📋 Populando ${tableName}_temp...`);
      
      try {
        await this.client.query(`
          INSERT INTO ${tableName}_temp (${columns}) VALUES
          ${values}
        `);
        
        const count = await this.client.query(`SELECT COUNT(*) as total FROM ${tableName}_temp`);
        console.log(`   ✅ ${tableName}_temp: ${count.rows[0].total} registros restaurados`);
      } catch (error) {
        console.log(`   ❌ Erro ao popular ${tableName}_temp:`, error.message);
      }
    }
  }

  // FASE 2: MIGRAR TODAS AS OPÇÕES CALCULADAS
  async migrateAllShippingOptions() {
    console.log('\n🚀 FASE 2: MIGRANDO TODAS AS OPÇÕES DE FRETE');
    console.log('==============================================');

    // Primeiro, limpar shipping_rates existentes (limitadas)
    console.log('🧹 Limpando tarifas limitadas existentes...');
    await this.client.query('DELETE FROM shipping_rates');
    console.log('   ✅ Tarifas antigas removidas');

    // Buscar todas as opções calculadas
    const options = await this.client.query(`
      SELECT 
        co.*,
        m.name as modality_name,
        m.description as modality_description,
        m.pricing_type,
        m.price_multiplier,
        m.min_price,
        m.max_price,
        z.id as zone_id,
        z.name as zone_name,
        z.uf as zone_uf,
        z.carrier_id
      FROM shipping_calculated_options_temp co
      INNER JOIN shipping_modalities_temp m ON m.id = co.modality_id
      INNER JOIN shipping_zones z ON z.id = co.zone_id
      WHERE co.is_active = true
      AND m.is_active = true
      AND z.is_active = true
      ORDER BY z.uf, z.name, m.priority
    `);

    console.log(`📊 Encontradas ${options.rows.length} opções calculadas para migrar`);

    if (options.rows.length === 0) {
      throw new Error('Nenhuma opção calculada encontrada para migrar');
    }

    // Migrar cada opção para shipping_rates
    let migratedCount = 0;
    const processedZones = new Set();

    for (const option of options.rows) {
      try {
        // Gerar ID único para a tarifa
        const rateId = `rate_${option.zone_id}_${option.modality_id}`;
        
        // Calcular preços baseados na modalidade
        const basePrice = parseFloat(option.min_price || 10);
        const priceMultiplier = parseFloat(option.price_multiplier || 1);
        const pricePerKg = basePrice * priceMultiplier;

        // Usar weight rules existentes ou criar padrão
        let weightRules = option.calculated_weight_rules;
        if (!weightRules || !Array.isArray(weightRules)) {
          // Criar weight rules baseadas no preço
          weightRules = [
            { from: 0, to: 1000, price: basePrice },
            { from: 1001, to: 5000, price: basePrice + pricePerKg * 2 },
            { from: 5001, to: 10000, price: basePrice + pricePerKg * 5 },
            { from: 10001, to: 30000, price: basePrice + pricePerKg * 10 },
            { from: 30001, to: 50000, price: basePrice + pricePerKg * 20 }
          ];
        }

        // Inserir na shipping_rates
        await this.client.query(`
          INSERT INTO shipping_rates (
            id, zone_id, weight_rules, base_price, price_per_kg,
            additional_fees, is_active, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, true, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            weight_rules = EXCLUDED.weight_rules,
            base_price = EXCLUDED.base_price,
            price_per_kg = EXCLUDED.price_per_kg,
            additional_fees = EXCLUDED.additional_fees
        `, [
          rateId,
          option.zone_id,
          JSON.stringify(weightRules),
          basePrice,
          pricePerKg,
          JSON.stringify(option.calculated_fees || {})
        ]);

        migratedCount++;
        processedZones.add(option.zone_id);

        // Log de progresso a cada 100 registros
        if (migratedCount % 100 === 0) {
          console.log(`   🔄 Migrados: ${migratedCount}/${options.rows.length} (${Math.round(migratedCount/options.rows.length*100)}%)`);
        }

      } catch (error) {
        console.log(`   ❌ Erro ao migrar opção ${option.id}:`, error.message);
      }
    }

    console.log(`✅ Migração concluída: ${migratedCount} tarifas criadas`);
    console.log(`🌍 Cobertura: ${processedZones.size} zonas com frete`);
  }

  // FASE 3: VALIDAR COBERTURA
  async validateCoverage() {
    console.log('\n✅ FASE 3: VALIDANDO COBERTURA NACIONAL');
    console.log('=======================================');

    // Verificar estatísticas gerais
    const stats = await Promise.all([
      this.client.query('SELECT COUNT(*) as total FROM shipping_rates WHERE is_active = true'),
      this.client.query('SELECT COUNT(DISTINCT zone_id) as zones FROM shipping_rates WHERE is_active = true'),
      this.client.query(`
        SELECT z.uf, COUNT(*) as zones_count
        FROM shipping_rates r
        INNER JOIN shipping_zones z ON z.id = r.zone_id
        WHERE r.is_active = true
        GROUP BY z.uf
        ORDER BY zones_count DESC
      `)
    ]);

    const [totalRates, coveredZones, statesCoverage] = stats;

    console.log(`📊 ESTATÍSTICAS FINAIS:`);
    console.log(`   ✅ ${totalRates.rows[0].total} tarifas ativas`);
    console.log(`   ✅ ${coveredZones.rows[0].zones} zonas com cobertura`);
    console.log(`   ✅ ${statesCoverage.rows.length} estados cobertos`);

    console.log(`\n🌍 COBERTURA POR ESTADO:`);
    statesCoverage.rows.slice(0, 10).forEach(state => {
      console.log(`   ${state.uf}: ${state.zones_count} zonas`);
    });

    // Testar CEP específico do erro
    console.log(`\n🎯 TESTE: CEP 11060414 (Santos, SP)`);
    const testResult = await this.testCEP('11060414');
    
    return {
      totalRates: parseInt(totalRates.rows[0].total),
      coveredZones: parseInt(coveredZones.rows[0].zones),
      statesCovered: statesCoverage.rows.length,
      testPassed: testResult
    };
  }

  async testCEP(cep) {
    const cleanCEP = cep.replace(/\D/g, '').padStart(8, '0');
    const cepNum = parseInt(cleanCEP);

    // Buscar zona para o CEP
    const zones = await this.client.query(`
      SELECT z.*, c.name as carrier_name
      FROM shipping_zones z
      INNER JOIN shipping_carriers c ON c.id = z.carrier_id
      WHERE z.is_active = true
    `);

    let matchedZone = null;
    for (const zone of zones.rows) {
      if (zone.postal_code_ranges && Array.isArray(zone.postal_code_ranges)) {
        for (const range of zone.postal_code_ranges) {
          if (range.from && range.to) {
            const from = parseInt(range.from.toString().padStart(8, '0'));
            const to = parseInt(range.to.toString().padStart(8, '0'));
            
            if (cepNum >= from && cepNum <= to) {
              matchedZone = zone;
              break;
            }
          }
        }
        if (matchedZone) break;
      }
    }

    if (!matchedZone) {
      console.log(`   ❌ CEP ${cep}: Zona não encontrada`);
      return false;
    }

    // Buscar tarifas para a zona
    const rates = await this.client.query(`
      SELECT COUNT(*) as total FROM shipping_rates 
      WHERE zone_id = $1 AND is_active = true
    `, [matchedZone.id]);

    const ratesCount = parseInt(rates.rows[0].total);
    
    if (ratesCount > 0) {
      console.log(`   ✅ CEP ${cep}: ${matchedZone.name} (${matchedZone.uf}) - ${ratesCount} tarifas`);
      return true;
    } else {
      console.log(`   ❌ CEP ${cep}: Zona encontrada mas sem tarifas`);
      return false;
    }
  }

  // FASE 4: LIMPEZA
  async cleanup() {
    console.log('\n🧹 FASE 4: LIMPEZA DAS TABELAS TEMPORÁRIAS');
    console.log('==========================================');

    const tempTables = ['shipping_modalities_temp', 'shipping_calculated_options_temp'];
    
    for (const table of tempTables) {
      try {
        await this.client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ ${table} removida`);
      } catch (error) {
        console.log(`❌ Erro ao remover ${table}:`, error.message);
      }
    }
  }

  async close() {
    await this.client.end();
  }
}

// EXECUTAR MIGRAÇÃO COMPLETA
async function runCompleteMigration() {
  const migration = new CompleteShippingMigration();

  try {
    await migration.init();

    console.log('🚀 INICIANDO MIGRAÇÃO COMPLETA E CORRETA');
    console.log('========================================');

    // FASE 1: Restaurar tabelas temporárias
    await migration.restoreTemporaryTables();

    // FASE 2: Migrar todas as opções
    await migration.migrateAllShippingOptions();

    // FASE 3: Validar cobertura
    const validation = await migration.validateCoverage();

    // FASE 4: Limpeza
    await migration.cleanup();

    // Resultado final
    console.log('\n🎉 MIGRAÇÃO COMPLETA FINALIZADA');
    console.log('===============================');
    
    if (validation.totalRates >= 1000 && validation.testPassed) {
      console.log('✅ SUCESSO TOTAL:');
      console.log(`   🎯 ${validation.totalRates} tarifas migradas`);
      console.log(`   🌍 ${validation.coveredZones} zonas cobertas`);
      console.log(`   🇧🇷 ${validation.statesCovered} estados`);
      console.log('   ✅ CEP 11060414 funcionando');
      console.log('\n🚀 Sistema pronto para uso nacional!');
    } else {
      console.log('⚠️ ATENÇÃO: Migração pode ter problemas');
      console.log('💡 Verificar logs acima');
    }

  } catch (error) {
    console.error('\n💥 ERRO NA MIGRAÇÃO COMPLETA:', error);
  } finally {
    await migration.close();
  }
}

runCompleteMigration(); 