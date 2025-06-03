/**
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
 * API Endpoint: Calcular Múltiplas Opções de Frete
 * 
 * POST /api/shipping/calculate-multiple
 * Retorna TODAS as opções de frete para uma região (Expressa, Padrão, Econômica)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    console.log('🚛 Shipping Calculate Multiple - Estratégia híbrida iniciada');
    
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

    // Tentar calcular múltiplas opções com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 5 segundos
      const queryPromise = (async () => {
        console.log(`🚛 Calculando múltiplas opções para CEP ${cleanPostalCode}`);
      
        // STEP 1: Calcular peso e valor totais
      let totalWeight = 0;
      let totalValue = 0;
      
      items.forEach((item: any) => {
        const weight = (item.product?.weight || 0.5) * 1000; // Converter para gramas
        totalWeight += weight * item.quantity;
        totalValue += item.product.price * item.quantity;
      });
      
      console.log(`📦 Peso total: ${totalWeight}g, Valor total: R$ ${totalValue.toFixed(2)}`);

        // STEP 2: Buscar zonas de frete (query simplificada)
        let zones = [];
        try {
          zones = await db.query`
            SELECT id, name, delivery_days_min, delivery_days_max, carrier_id
            FROM shipping_zones
            WHERE is_active = true
            ORDER BY delivery_days_min ASC
            LIMIT 10
          `;
        } catch (e) {
          console.log('Erro ao buscar zonas, usando fallback');
        }

      const options = [];

        // STEP 3: Processar cada zona (simplificado)
        if (zones.length > 0) {
      for (const zone of zones) {
            try {
              // Buscar regras de peso (query separada)
              const weightRules = await db.query`
                SELECT weight_from, weight_to, price
                FROM shipping_weight_rules
                WHERE zone_id = ${zone.id} AND is_active = true
                ORDER BY weight_from ASC
                LIMIT 5
              `;

              let basePrice = 15.90; // Padrão
        
        for (const rule of weightRules) {
                if (totalWeight >= rule.weight_from && totalWeight <= rule.weight_to) {
                  basePrice = parseFloat(rule.price);
            break;
          }
        }

              // Verificar frete grátis
              const isFree = totalValue >= 199; // Threshold simplificado
              const finalPrice = isFree ? 0 : basePrice;

              // Gerar nome automático baseado no prazo
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

        const option = {
          id: `frenet-${zone.id}`,
                carrierId: zone.carrier_id || 'frenet-carrier',
          carrierName: 'Frenet',
          name: optionName,
          price: finalPrice,
                originalPrice: basePrice,
          isFree,
                freeReason: isFree ? `Frete grátis acima de R$ 199` : '',
          deliveryDaysMin: zone.delivery_days_min,
          deliveryDaysMax: zone.delivery_days_max,
          breakdown: {
            basePrice,
                  taxes: { gris: 0, adv: 0 },
                  totalTaxes: 0,
                  freeShippingDiscount: isFree ? basePrice : 0
          }
        };

        options.push(option);
            } catch (e) {
              console.log(`Erro ao processar zona ${zone.id}`);
            }
          }
        } else {
          // FALLBACK: Opções padrão se não encontrou zonas
          const defaultOptions = [
            { name: 'Expresso', days: 1, price: 35.90 },
            { name: 'Padrão', days: 3, price: 25.90 },
            { name: 'Econômico', days: 7, price: 15.90 }
          ];

          for (const opt of defaultOptions) {
            const isFree = totalValue >= 199;
            
            options.push({
              id: `frenet-${opt.name.toLowerCase()}`,
              carrierId: 'frenet-carrier',
              carrierName: 'Frenet',
              name: `Frenet - ${opt.name}`,
              price: isFree ? 0 : opt.price,
              originalPrice: opt.price,
              isFree,
              freeReason: isFree ? 'Frete grátis acima de R$ 199' : '',
              deliveryDaysMin: opt.days,
              deliveryDaysMax: opt.days + 1,
              breakdown: {
                basePrice: opt.price,
                taxes: { gris: 0, adv: 0 },
                totalTaxes: 0,
                freeShippingDiscount: isFree ? opt.price : 0
              }
            });
          }
      }

        // Ordenar opções (frete grátis primeiro, depois por preço e prazo)
        options.sort((a: any, b: any) => {
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
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000)
    });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ ${result.options.length} opções calculadas`);

    return json({
      success: true,
        data: result,
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro calculate-multiple: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível calcular as opções de frete',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Erro crítico shipping multiple:', error);
    
    return json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Erro interno do servidor'
        } 
      },
      { status: 500 }
    );
  }
}; 