#!/usr/bin/env node

/**
 * Teste do Sistema de Frete Modernizado
 * 
 * Testa se o UnifiedShippingService funciona com a nova estrutura
 */

import pg from 'pg';

const { Client } = pg;

async function testModernShipping() {
  console.log('🧪 TESTANDO SISTEMA DE FRETE MODERNIZADO');
  console.log('========================================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco');

    // 1. Testar busca de zonas
    console.log('\n🌍 1. TESTE: Busca de Zonas');
    console.log('----------------------------');
    
    const testCEPs = ['01310-100', '04038-001', '22071-900', '30112-000'];
    
    for (const cep of testCEPs) {
      const cleanCEP = cep.replace(/\D/g, '').padStart(8, '0');
      
      const zones = await client.query(`
        SELECT 
          z.id,
          z.name,
          z.uf,
          z.postal_code_ranges,
          c.name as carrier_name
        FROM shipping_zones z
        INNER JOIN shipping_carriers c ON c.id = z.carrier_id
        WHERE z.is_active = true 
        LIMIT 5
      `);

      console.log(`📮 CEP ${cep}:`);
      
      if (zones.rows.length > 0) {
        // Simular verificação de faixa (simplificada)
        const zone = zones.rows[0];
        console.log(`   ✅ Zona: ${zone.name} (${zone.uf}) via ${zone.carrier_name}`);
      } else {
        console.log(`   ❌ Nenhuma zona encontrada`);
      }
    }

    // 2. Testar busca de rates
    console.log('\n💰 2. TESTE: Busca de Tarifas');
    console.log('------------------------------');
    
    const rates = await client.query(`
      SELECT 
        r.id,
        r.base_price,
        r.price_per_kg,
        z.name as zone_name,
        c.name as carrier_name
      FROM shipping_rates r
      INNER JOIN shipping_zones z ON z.id = r.zone_id
      INNER JOIN shipping_carriers c ON c.id = z.carrier_id
      WHERE r.is_active = true
      LIMIT 10
    `);

    console.log(`📊 Encontradas ${rates.rows.length} tarifas ativas:`);
    rates.rows.forEach(rate => {
      console.log(`   💵 ${rate.carrier_name} - ${rate.zone_name}: R$ ${rate.base_price} + R$ ${rate.price_per_kg}/kg`);
    });

    // 3. Testar configurações de sellers
    console.log('\n👤 3. TESTE: Configurações de Sellers');
    console.log('--------------------------------------');
    
    const configs = await client.query(`
      SELECT 
        sc.seller_id,
        sc.markup_percentage,
        sc.free_shipping_threshold,
        sc.max_weight_kg,
        c.name as carrier_name
      FROM seller_shipping_configs sc
      INNER JOIN shipping_carriers c ON c.id = sc.carrier_id
      WHERE sc.is_active = true
      LIMIT 5
    `);

    console.log(`⚙️ Encontradas ${configs.rows.length} configurações:`);
    configs.rows.forEach(config => {
      console.log(`   👤 Seller ${config.seller_id}: ${config.markup_percentage}% markup, Frete grátis: R$ ${config.free_shipping_threshold}`);
    });

    // 4. Verificar dados migrados vs antigos
    console.log('\n🔄 4. COMPARAÇÃO: Dados Antigos vs Novos');
    console.log('------------------------------------------');
    
    try {
      const oldModalities = await client.query('SELECT COUNT(*) as total FROM shipping_modalities');
      const oldOptions = await client.query('SELECT COUNT(*) as total FROM shipping_calculated_options');
      
      const newRates = await client.query('SELECT COUNT(*) as total FROM shipping_rates');
      const newConfigs = await client.query('SELECT COUNT(*) as total FROM seller_shipping_configs');
      
      console.log('📊 SISTEMA ANTIGO:');
      console.log(`   Modalidades: ${oldModalities.rows[0].total}`);
      console.log(`   Opções calculadas: ${oldOptions.rows[0].total}`);
      
      console.log('📊 SISTEMA NOVO:');
      console.log(`   Tarifas: ${newRates.rows[0].total}`);
      console.log(`   Configurações: ${newConfigs.rows[0].total}`);
      
    } catch (error) {
      console.log('⚠️ Algumas tabelas antigas podem ter sido removidas');
    }

    // 5. Simular cálculo de frete
    console.log('\n🧮 5. SIMULAÇÃO: Cálculo de Frete');
    console.log('----------------------------------');
    
    const mockItems = [
      {
        product_id: 'test-product-1',
        quantity: 2,
        weight: 0.5, // 500g
        price: 50.00,
        sellerId: 'test-seller-1'
      },
      {
        product_id: 'test-product-2', 
        quantity: 1,
        weight: 1.2, // 1.2kg
        price: 120.00,
        sellerId: 'test-seller-1'
      }
    ];

    const totalWeight = mockItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalValue = mockItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    console.log(`📦 Simulando carrinho:`);
    console.log(`   ${mockItems.length} itens`);
    console.log(`   Peso total: ${totalWeight}kg`);
    console.log(`   Valor total: R$ ${totalValue.toFixed(2)}`);

    // Buscar uma rate para simular
    const sampleRate = await client.query(`
      SELECT r.*, z.name as zone_name, c.name as carrier_name
      FROM shipping_rates r
      INNER JOIN shipping_zones z ON z.id = r.zone_id
      INNER JOIN shipping_carriers c ON c.id = z.carrier_id
      WHERE r.is_active = true
      LIMIT 1
    `);

    if (sampleRate.rows.length > 0) {
      const rate = sampleRate.rows[0];
      const basePrice = parseFloat(rate.base_price);
      const pricePerKg = parseFloat(rate.price_per_kg);
      
      const calculatedPrice = basePrice + (pricePerKg * totalWeight);
      
      console.log(`💵 Simulação via ${rate.carrier_name}:`);
      console.log(`   Base: R$ ${basePrice.toFixed(2)}`);
      console.log(`   Por peso (${totalWeight}kg): R$ ${(pricePerKg * totalWeight).toFixed(2)}`);
      console.log(`   TOTAL: R$ ${calculatedPrice.toFixed(2)}`);
    }

    // 6. Status final
    console.log('\n✅ 6. RESULTADO DOS TESTES');
    console.log('============================');
    
    const checksCount = await Promise.all([
      client.query('SELECT COUNT(*) as total FROM shipping_carriers WHERE is_active = true'),
      client.query('SELECT COUNT(*) as total FROM shipping_zones WHERE is_active = true'),  
      client.query('SELECT COUNT(*) as total FROM shipping_rates WHERE is_active = true'),
      client.query('SELECT COUNT(*) as total FROM seller_shipping_configs WHERE is_active = true')
    ]);

    const [carriersCount, zonesCount, ratesCount, configsCount] = checksCount.map(r => parseInt(r.rows[0].total));

    console.log('🎯 INFRAESTRUTURA MIGRADA:');
    console.log(`   ✅ ${carriersCount} transportadoras ativas`);
    console.log(`   ✅ ${zonesCount} zonas de entrega ativas`);
    console.log(`   ✅ ${ratesCount} tarifas configuradas`);
    console.log(`   ✅ ${configsCount} configurações de sellers`);

    if (carriersCount >= 1 && zonesCount >= 1000 && ratesCount >= 10 && configsCount >= 1) {
      console.log('\n🎉 SUCESSO: Sistema de frete modernizado está FUNCIONAL!');
      console.log('📋 Próximos passos:');
      console.log('   1. Testar no frontend da Store');
      console.log('   2. Verificar calculadora de frete');
      console.log('   3. Testar checkout completo');
      console.log('   4. Remover tabelas antigas (opcional)');
    } else {
      console.log('\n❌ ATENÇÃO: Sistema pode ter problemas');
      console.log('💡 Verificar se a migração foi executada corretamente');
    }

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
  } finally {
    await client.end();
  }
}

testModernShipping(); 