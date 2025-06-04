#!/usr/bin/env node

/**
 * Debug - Calculadora de Frete
 * 
 * Investiga o problema na calculadora de frete da Store
 */

import pg from 'pg';

const { Client } = pg;

async function debugShippingCalculator() {
  console.log('🐛 DEBUG: CALCULADORA DE FRETE');
  console.log('===============================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco');

    // CEP do erro: 11060414 (Santos, SP)
    const testCEP = '11060414';
    console.log(`\n🎯 TESTANDO CEP: ${testCEP}`);
    console.log('================================');

    // 1. Verificar se existe zona para este CEP
    console.log('\n1. 🌍 BUSCANDO ZONA PARA O CEP:');
    const cleanCEP = testCEP.replace(/\D/g, '').padStart(8, '0');
    const cepNum = parseInt(cleanCEP);
    
    const zones = await client.query(`
      SELECT 
        z.id,
        z.name,
        z.uf,
        z.postal_code_ranges,
        c.id as carrier_id,
        c.name as carrier_name,
        c.type as carrier_type,
        z.delivery_days_min,
        z.delivery_days_max
      FROM shipping_zones z
      INNER JOIN shipping_carriers c ON c.id = z.carrier_id
      WHERE z.is_active = true 
      AND c.is_active = true
      LIMIT 50
    `);

    console.log(`📊 Encontradas ${zones.rows.length} zonas ativas`);

    let matchedZone = null;
    for (const zone of zones.rows) {
      if (zone.postal_code_ranges && Array.isArray(zone.postal_code_ranges)) {
        for (const range of zone.postal_code_ranges) {
          if (range.from && range.to) {
            const from = parseInt(range.from.toString().padStart(8, '0'));
            const to = parseInt(range.to.toString().padStart(8, '0'));
            
            if (cepNum >= from && cepNum <= to) {
              matchedZone = zone;
              console.log(`✅ ZONA ENCONTRADA: ${zone.name} (${zone.uf}) via ${zone.carrier_name}`);
              console.log(`   └── Faixa: ${range.from} - ${range.to}`);
              break;
            }
          }
        }
        if (matchedZone) break;
      }
    }

    if (!matchedZone) {
      console.log('❌ NENHUMA ZONA ENCONTRADA para o CEP');
      console.log('\n🔍 Verificando primeiras zonas para debug:');
      zones.rows.slice(0, 5).forEach(zone => {
        console.log(`   📋 ${zone.name} (${zone.uf}): ${JSON.stringify(zone.postal_code_ranges)}`);
      });
      return;
    }

    // 2. Verificar shipping_rates para a zona encontrada
    console.log('\n2. 💰 BUSCANDO TARIFAS PARA A ZONA:');
    const rates = await client.query(`
      SELECT 
        r.*,
        c.name as carrier_name,
        c.type as carrier_type
      FROM shipping_rates r
      INNER JOIN shipping_zones z ON z.id = r.zone_id
      INNER JOIN shipping_carriers c ON c.id = z.carrier_id
      WHERE r.zone_id = $1
      AND r.is_active = true
      AND c.is_active = true
      ORDER BY r.base_price
    `, [matchedZone.id]);

    console.log(`📊 Encontradas ${rates.rows.length} tarifas para a zona`);

    if (rates.rows.length === 0) {
      console.log('❌ NENHUMA TARIFA ENCONTRADA para a zona');
      console.log('\n🔍 Verificando todas as tarifas ativas:');
      
      const allRates = await client.query(`
        SELECT 
          r.zone_id,
          z.name as zone_name,
          r.id,
          r.base_price,
          r.price_per_kg,
          c.name as carrier_name
        FROM shipping_rates r
        INNER JOIN shipping_zones z ON z.id = r.zone_id
        INNER JOIN shipping_carriers c ON c.id = z.carrier_id
        WHERE r.is_active = true
        LIMIT 10
      `);

      console.log(`📋 Primeiras 10 tarifas ativas:`);
      allRates.rows.forEach(rate => {
        console.log(`   💵 ${rate.carrier_name} - ${rate.zone_name}: R$ ${rate.base_price} + R$ ${rate.price_per_kg}/kg`);
      });
      return;
    }

    // 3. Simular conversão para formato compatível
    console.log('\n3. 🔄 SIMULANDO CONVERSÃO PARA FORMATO COMPATÍVEL:');
    rates.rows.forEach((rate, index) => {
      console.log(`\n📦 TARIFA ${index + 1}:`);
      console.log(`   ID: ${rate.id}`);
      console.log(`   Base: R$ ${rate.base_price}`);
      console.log(`   Por kg: R$ ${rate.price_per_kg}`);
      console.log(`   Weight rules: ${JSON.stringify(rate.weight_rules)}`);
      
      // Simular conversão
      const basePrice = parseFloat(rate.base_price || 10);
      const pricePerKg = parseFloat(rate.price_per_kg || 5);
      
      const weightRanges = [
        { from: 0, to: 1000, price: basePrice },
        { from: 1001, to: 5000, price: basePrice + pricePerKg * 2 },
        { from: 5001, to: 10000, price: basePrice + pricePerKg * 5 }
      ];
      
      console.log(`   Weight ranges convertidas:`, weightRanges.slice(0, 3));
      
      // Testar peso de 900g
      const testWeight = 900; // gramas
      let foundPrice = null;
      
      for (const rule of weightRanges) {
        if (testWeight >= rule.from && testWeight <= rule.to) {
          foundPrice = rule.price;
          break;
        }
      }
      
      console.log(`   ✅ Para 900g: R$ ${foundPrice || 'ERRO'}`);
    });

    // 4. Verificar configurações de sellers
    console.log('\n4. 👤 VERIFICANDO CONFIGURAÇÕES DE SELLERS:');
    const configs = await client.query(`
      SELECT *
      FROM seller_shipping_configs
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`📊 Encontradas ${configs.rows.length} configurações:`);
    configs.rows.forEach(config => {
      console.log(`   👤 Seller: ${config.seller_id}`);
      console.log(`   Markup: ${config.markup_percentage}%`);
      console.log(`   Frete grátis: R$ ${config.free_shipping_threshold}`);
    });

    // 5. Testar simulação completa
    console.log('\n5. 🧮 SIMULAÇÃO COMPLETA:');
    console.log('==========================');
    
    if (rates.rows.length > 0) {
      const rate = rates.rows[0];
      const basePrice = parseFloat(rate.base_price);
      const pricePerKg = parseFloat(rate.price_per_kg);
      const testWeight = 0.9; // kg
      const testValue = 559.97; // R$
      
      console.log(`📦 Simulando:`);
      console.log(`   Peso: ${testWeight}kg`);
      console.log(`   Valor: R$ ${testValue.toFixed(2)}`);
      console.log(`   Zona: ${matchedZone.name}`);
      console.log(`   Transportadora: ${matchedZone.carrier_name}`);
      
      const calculatedPrice = basePrice + (pricePerKg * testWeight);
      
      console.log(`\n💵 Cálculo:`);
      console.log(`   Base: R$ ${basePrice.toFixed(2)}`);
      console.log(`   Por peso: R$ ${(pricePerKg * testWeight).toFixed(2)}`);
      console.log(`   TOTAL: R$ ${calculatedPrice.toFixed(2)}`);
      
      // Verificar se seria frete grátis
      const config = configs.rows.find(c => c.seller_id === 'default' || c.seller_id === 'system');
      if (config && testValue >= parseFloat(config.free_shipping_threshold)) {
        console.log(`   🎁 FRETE GRÁTIS: Valor acima de R$ ${config.free_shipping_threshold}`);
      }
    }

    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('================');
    
    if (!matchedZone) {
      console.log('❌ PROBLEMA: CEP não encontra zona correspondente');
      console.log('💡 SOLUÇÃO: Verificar ranges de CEP nas shipping_zones');
    } else if (rates.rows.length === 0) {
      console.log('❌ PROBLEMA: Zona encontrada mas sem tarifas configuradas');
      console.log('💡 SOLUÇÃO: Criar shipping_rates para esta zona');
    } else {
      console.log('✅ ZONA E TARIFAS OK - Problema pode estar na conversão');
      console.log('💡 INVESTIGAR: ModernShippingAdapter.getShippingOptions()');
    }

  } catch (error) {
    console.error('❌ ERRO NO DEBUG:', error);
  } finally {
    await client.end();
  }
}

debugShippingCalculator(); 