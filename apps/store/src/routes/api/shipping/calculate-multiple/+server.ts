/**
 * API Endpoint: Calcular Múltiplas Opções de Frete
 * 
 * POST /api/shipping/calculate-multiple
 * Retorna TODAS as opções de frete para uma região (Expressa, Padrão, Econômica)
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
      console.log(`🚛 Calculando múltiplas opções para seller ${sellerId}, CEP ${cleanPostalCode}`);
      
      // 1. Calcular peso e valor totais
      let totalWeight = 0;
      let totalValue = 0;
      
      items.forEach((item: any) => {
        const weight = (item.product?.weight || 0.5) * 1000; // Converter para gramas
        totalWeight += weight * item.quantity;
        totalValue += item.product.price * item.quantity;
      });
      
      console.log(`📦 Peso total: ${totalWeight}g, Valor total: R$ ${totalValue.toFixed(2)}`);

      // 2. Buscar TODAS as zonas de frete disponíveis para o CEP
      const zones = await db.query(`
        SELECT sz.*, sr.weight_rules, sr.additional_fees
        FROM shipping_zones sz
        JOIN shipping_rates sr ON sz.id = sr.zone_id
        WHERE sz.is_active = true 
          AND sr.is_active = true
          AND sz.carrier_id = 'frenet-carrier'
          AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(sz.postal_code_ranges) as range
            WHERE $1 BETWEEN (range->>'from') AND (range->>'to')
          )
        ORDER BY sz.delivery_days_min ASC, sr.weight_rules->0->>'price'
      `, [cleanPostalCode]);
      
      if (zones.length === 0) {
        return {
          postalCode: cleanPostalCode,
          options: [],
          error: 'Nenhuma zona de entrega encontrada para este CEP'
        };
      }

      console.log(`🗺️ Encontradas ${zones.length} opções de frete`);

      // 3. Calcular opções para cada zona
      const options = [];

      for (const zone of zones) {
        console.log(`💰 Calculando para zona: ${zone.name}`);

        // 4. Calcular preço por peso
        let basePrice = null;
        const weightRules = zone.weight_rules || [];
        
        for (const rule of weightRules) {
          if (totalWeight >= rule.from && totalWeight <= rule.to) {
            basePrice = rule.price;
            console.log(`⚖️ Faixa encontrada: ${rule.from}g-${rule.to}g = R$ ${rule.price}`);
            break;
          }
        }

        if (basePrice === null) {
          console.log(`❌ Peso ${totalWeight}g não suportado para ${zone.name}`);
          continue;
        }

        // 5. Calcular taxas adicionais
        const fees = zone.additional_fees || {};
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
        `, [sellerId, zone.id]);

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

        // 7. Gerar nome automático baseado no prazo
        let optionName;
        if (zone.delivery_days_min === 0) {
          optionName = 'Frenet - Entrega Hoje';
        } else if (zone.delivery_days_min === 1) {
          optionName = 'Frenet - Entrega Amanhã';
        } else if (zone.delivery_days_min <= 2) {
          optionName = 'Frenet - Expresso';
        } else if (zone.delivery_days_min <= 5) {
          optionName = 'Frenet - Padrão';
        } else {
          optionName = 'Frenet - Econômico';
        }

        // Se tiver múltiplas opções do mesmo tipo, usar o nome da zona
        if (zone.name.includes('(')) {
          optionName = `Frenet - ${zone.name.split('(')[1].replace(')', '')}`;
        }

        const option = {
          id: `frenet-${zone.id}`,
          carrierId: 'frenet-carrier',
          carrierName: 'Frenet',
          name: optionName,
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

        options.push(option);
        console.log(`✅ Opção criada: ${option.name} - R$ ${option.price.toFixed(2)}`);
      }

      // 8. Ordenar opções (frete grátis primeiro, depois por preço e prazo)
      options.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        if (a.price !== b.price) return a.price - b.price;
        return a.deliveryDaysMin - b.deliveryDaysMin;
      });

      return {
        postalCode: cleanPostalCode,
        sellerId,
        totalWeight,
        totalValue,
        options
      };
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao calcular múltiplas opções:', error);
    
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