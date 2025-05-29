/**
 * API Endpoint: Calcular Frete Simples
 * 
 * POST /api/shipping/calculate-simple
 * Versão simplificada do cálculo de frete
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json();
    const { postalCode, items, sellerId = 'seller-1' } = body;

    // Validações básicas
    if (!postalCode || !items || !Array.isArray(items)) {
      return json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_REQUEST', 
            message: 'CEP e itens são obrigatórios' 
          } 
        },
        { status: 400 }
      );
    }

    const cleanPostalCode = postalCode.replace(/\D/g, '');
    
    if (cleanPostalCode.length !== 8) {
      return json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_POSTAL_CODE', 
            message: 'CEP deve ter 8 dígitos' 
          } 
        },
        { status: 400 }
      );
    }

    const result = await withDatabase(platform, async (db) => {
      console.log(`🚛 Calculando frete simples para seller ${sellerId}, CEP ${cleanPostalCode}`);
      
      // 1. Calcular peso e valor totais
      let totalWeight = 0;
      let totalValue = 0;
      
      items.forEach((item: any) => {
        const weight = (item.product?.weight || 0.5) * 1000; // Converter para gramas
        totalWeight += weight * item.quantity;
        totalValue += item.product.price * item.quantity;
      });
      
      console.log(`📦 Peso total: ${totalWeight}g, Valor total: R$ ${totalValue.toFixed(2)}`);

      // 2. Buscar zona por CEP
      const zones = await db.query(`
        SELECT * FROM find_shipping_zone($1, 'frenet-carrier')
      `, [cleanPostalCode]);
      
      if (zones.length === 0) {
        return {
          postalCode: cleanPostalCode,
          options: [],
          error: 'Nenhuma zona de entrega encontrada para este CEP'
        };
      }

      const zone = zones[0];
      console.log(`🗺️ Zona encontrada: ${zone.zone_name}`);

      // 3. Buscar tabela de preços
      const rates = await db.query(`
        SELECT weight_rules, additional_fees
        FROM shipping_rates 
        WHERE zone_id = $1 AND is_active = true
      `, [zone.zone_id]);

      if (rates.length === 0) {
        return {
          postalCode: cleanPostalCode,
          options: [],
          error: 'Tabela de preços não encontrada para esta zona'
        };
      }

      const rate = rates[0];
      console.log(`💰 Tabela de preços encontrada`);

      // 4. Calcular preço por peso
      let basePrice = null;
      const weightRules = rate.weight_rules || [];
      
      for (const rule of weightRules) {
        if (totalWeight >= rule.from && totalWeight <= rule.to) {
          basePrice = rule.price;
          console.log(`⚖️ Faixa encontrada: ${rule.from}g-${rule.to}g = R$ ${rule.price}`);
          break;
        }
      }

      if (basePrice === null) {
        return {
          postalCode: cleanPostalCode,
          options: [],
          error: `Peso ${totalWeight}g excede os limites de entrega`
        };
      }

      // 5. Calcular taxas adicionais
      const fees = rate.additional_fees || {};
      let gris = 0;
      let adv = 0;

      if (fees.gris_percent) {
        gris = Math.max(
          basePrice * fees.gris_percent / 100,
          fees.gris_min || 0
        );
      }

      if (fees.adv_percent) {
        adv = Math.max(
          basePrice * fees.adv_percent / 100,
          fees.adv_min || 0
        );
      }

      const totalTaxes = gris + adv;
      const originalPrice = basePrice + totalTaxes;
      
      console.log(`💵 Preço base: R$ ${basePrice}, Taxas: R$ ${totalTaxes.toFixed(2)}, Total: R$ ${originalPrice.toFixed(2)}`);

      // 6. Verificar frete grátis
      const configs = await db.query(`
        SELECT free_shipping_threshold, free_shipping_products, free_shipping_categories
        FROM seller_shipping_configs
        WHERE (seller_id = $1 OR seller_id IS NULL)
          AND carrier_id = 'frenet-carrier'
          AND (zone_id = $2 OR zone_id IS NULL)
          AND is_enabled = true
        ORDER BY 
          CASE WHEN seller_id = $1 THEN 0 ELSE 1 END,
          priority ASC
        LIMIT 1
      `, [sellerId, zone.zone_id]);

      let isFree = false;
      let freeReason = '';

      if (configs.length > 0) {
        const config = configs[0];
        
        // Verificar por valor
        if (config.free_shipping_threshold && totalValue >= config.free_shipping_threshold) {
          isFree = true;
          freeReason = `Frete grátis acima de R$ ${config.free_shipping_threshold}`;
        }
        
        // Verificar por produto específico
        if (!isFree && config.free_shipping_products) {
          for (const item of items) {
            if (config.free_shipping_products.includes(item.product.id)) {
              isFree = true;
              freeReason = `Produto "${item.product.name}" tem frete grátis`;
              break;
            }
          }
        }
      }

      const finalPrice = isFree ? 0 : originalPrice;
      
      console.log(`🎁 Frete grátis: ${isFree ? 'SIM' : 'NÃO'} - ${freeReason || 'N/A'}`);

      // 7. Gerar opção final
      const option = {
        id: `frenet-${zone.zone_id}`,
        carrierId: 'frenet-carrier',
        carrierName: 'Frenet',
        name: `Frenet - ${zone.delivery_days_min === 0 ? 'Entrega Hoje' : `${zone.delivery_days_min}-${zone.delivery_days_max} dias`}`,
        price: finalPrice,
        originalPrice,
        isFree,
        freeReason,
        deliveryDaysMin: zone.delivery_days_min,
        deliveryDaysMax: zone.delivery_days_max,
        breakdown: {
          basePrice,
          taxes: { gris, adv },
          totalTaxes,
          freeShippingDiscount: isFree ? originalPrice : 0
        }
      };

      return {
        postalCode: cleanPostalCode,
        sellerId,
        totalWeight,
        totalValue,
        options: [option]
      };
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao calcular frete simples:', error);
    
    return json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Erro interno do servidor',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        } 
      },
      { status: 500 }
    );
  }
}; 