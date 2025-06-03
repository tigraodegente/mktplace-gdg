/**
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
 * API Endpoint: Calcular Frete Simples
 * 
 * POST /api/shipping/calculate-simple
 * Versão simplificada do cálculo de frete
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    console.log('🚛 Shipping Calculate Simple - Estratégia híbrida iniciada');
    
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

    // Calcular dados básicos (sempre funciona)
    let totalWeight = 0;
    let totalValue = 0;
    
    items.forEach((item: any) => {
      const weight = (item.product?.weight || 0.5) * 1000; // Converter para gramas
      totalWeight += weight * item.quantity;
      totalValue += item.product.price * item.quantity;
    });
    
    console.log(`📦 Peso total: ${totalWeight}g, Valor total: R$ ${totalValue.toFixed(2)}`);

    // Tentar calcular frete com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 5 segundos para cálculo complexo
      const queryPromise = (async () => {
        console.log(`🚛 Calculando frete para CEP ${cleanPostalCode}`);
        
        // STEP 1: Buscar zona de entrega (query simplificada)
        const zones = await db.query`
          SELECT zone_id, zone_name, delivery_days_min, delivery_days_max
          FROM shipping_zones 
          WHERE postal_code_start <= ${cleanPostalCode} 
            AND postal_code_end >= ${cleanPostalCode}
          LIMIT 1
        `;
        
        if (zones.length === 0) {
          return {
            postalCode: cleanPostalCode,
            options: [],
            error: 'Nenhuma zona de entrega encontrada para este CEP'
          };
        }

        const zone = zones[0];
        console.log(`🗺️ Zona encontrada: ${zone.zone_name}`);

        // STEP 2: Buscar tabela de preços (query simplificada)
        const rates = await db.query`
          SELECT weight_rules, additional_fees
          FROM shipping_rates 
          WHERE zone_id = ${zone.zone_id} AND is_active = true
          LIMIT 1
        `;

        let basePrice = 15.90; // Padrão
        
        if (rates.length > 0) {
          const rate = rates[0];
          const weightRules = rate.weight_rules || [];
          
          for (const rule of weightRules) {
            if (totalWeight >= rule.from && totalWeight <= rule.to) {
              basePrice = rule.price;
              break;
            }
          }
        }

        // STEP 3: Verificar frete grátis (query simplificada)
        let isFree = false;
        let freeReason = '';
        
        if (totalValue >= 100) {
          isFree = true;
          freeReason = 'Frete grátis acima de R$ 100';
        }

        const finalPrice = isFree ? 0 : basePrice;

        const option = {
          id: `frenet-${zone.zone_id}`,
          carrierId: 'frenet-carrier',
          carrierName: 'Frenet',
          name: `Frenet - ${zone.delivery_days_min === 0 ? 'Entrega Hoje' : `${zone.delivery_days_min}-${zone.delivery_days_max} dias`}`,
          price: finalPrice,
          originalPrice: basePrice,
          isFree,
          freeReason,
          deliveryDaysMin: zone.delivery_days_min,
          deliveryDaysMax: zone.delivery_days_max,
          breakdown: {
            basePrice,
            taxes: { gris: 0, adv: 0 },
            totalTaxes: 0,
            freeShippingDiscount: isFree ? basePrice : 0
          }
        };

        return {
          postalCode: cleanPostalCode,
          sellerId,
          totalWeight,
          totalValue,
          options: [option]
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Frete calculado: ${result.options.length} opção(ões)`);
      
      return json({
        success: true,
        data: result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro shipping: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Cálculo de frete básico inteligente
      const cep = cleanPostalCode;
      const cepRegion = cep.substring(0, 2);
      
      // Determinar região e tempo de entrega baseado no CEP
      let region = 'Sudeste';
      let deliveryDays = 5;
      let basePrice = 15.90;
      
      // Regiões brasileiras por CEP
      if (['01', '02', '03', '04', '05', '08', '09'].includes(cepRegion)) {
        region = 'São Paulo';
        deliveryDays = 2;
        basePrice = 12.90;
      } else if (['20', '21', '22', '23', '24', '25', '26', '27', '28'].includes(cepRegion)) {
        region = 'Rio de Janeiro';
        deliveryDays = 3;
        basePrice = 14.90;
      } else if (['30', '31', '32', '33', '34', '35', '36', '37', '38', '39'].includes(cepRegion)) {
        region = 'Minas Gerais';
        deliveryDays = 4;
        basePrice = 16.90;
      } else if (['80', '81', '82', '83', '84', '85', '86', '87'].includes(cepRegion)) {
        region = 'Paraná';
        deliveryDays = 4;
        basePrice = 18.90;
      } else if (['90', '91', '92', '93', '94', '95', '96', '97', '98', '99'].includes(cepRegion)) {
        region = 'Rio Grande do Sul';
        deliveryDays = 5;
        basePrice = 20.90;
      } else if (['40', '41', '42', '43', '44', '45', '46', '47', '48'].includes(cepRegion)) {
        region = 'Bahia';
        deliveryDays = 6;
        basePrice = 22.90;
      } else {
        region = 'Outras Regiões';
        deliveryDays = 7;
        basePrice = 25.90;
      }
      
      // Ajustar preço por peso
      if (totalWeight > 5000) { // Acima de 5kg
        basePrice += 10;
        deliveryDays += 1;
      } else if (totalWeight > 2000) { // Acima de 2kg
        basePrice += 5;
      }
      
      // Verificar frete grátis
      let isFree = false;
      let freeReason = '';
      
      if (totalValue >= 100) {
        isFree = true;
        freeReason = 'Frete grátis acima de R$ 100';
      }
      
      const finalPrice = isFree ? 0 : basePrice;
      
      const option = {
        id: `fallback-${cepRegion}`,
        carrierId: 'correios',
        carrierName: 'Correios',
        name: `Correios - ${deliveryDays} dias úteis`,
        price: finalPrice,
        originalPrice: basePrice,
        isFree,
        freeReason,
        deliveryDaysMin: deliveryDays,
        deliveryDaysMax: deliveryDays + 2,
        breakdown: {
          basePrice,
          taxes: { gris: 0, adv: 0 },
          totalTaxes: 0,
          freeShippingDiscount: isFree ? basePrice : 0
        }
      };
      
      console.log(`📦 Frete fallback: ${region}, ${deliveryDays} dias, R$ ${finalPrice}`);
      
      return json({
        success: true,
        data: {
          postalCode: cleanPostalCode,
          sellerId,
          totalWeight,
          totalValue,
          options: [option],
          region
        },
        source: 'fallback'
      });
    }

  } catch (error) {
    console.error('❌ Erro crítico shipping calculate:', error);
    
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