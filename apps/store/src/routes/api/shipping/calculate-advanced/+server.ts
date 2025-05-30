import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

interface ShippingItem {
    product_id: string;
    quantity: number;
    weight?: number;
    price: number;
    category_id?: string;
    height?: number;
    width?: number;
    length?: number;
}

interface ShippingRequest {
    postal_code: string;
    items: ShippingItem[];
    seller_id?: string;
}

interface AdvancedShippingOption {
    id: string;
    name: string;
    description: string;
    price: number;
    delivery_days: number;
    modality_id: string;
    modality_name: string;
    pricing_type: 'per_item' | 'per_shipment';
    carrier: string;
    zone_name: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
    try {
        const body: ShippingRequest = await request.json();
        const { postal_code, items, seller_id } = body;

        // Validações básicas
        if (!postal_code || !items || items.length === 0) {
            return json({
                success: false,
                error: 'CEP e itens são obrigatórios'
            }, { status: 400 });
        }

        const cleanPostalCode = postal_code.replace(/\D/g, '').padStart(8, '0');
        
        if (cleanPostalCode.length !== 8) {
            return json({
                success: false,
                error: 'CEP inválido'
            }, { status: 400 });
        }

        const result = await withDatabase(platform, async (db) => {
            // 1. Buscar zona por CEP
            const zoneResult = await db.query`
                SELECT 
                    z.id as zone_id,
                    z.name as zone_name,
                    z.uf,
                    c.name as carrier_name
                FROM shipping_zones z
                JOIN shipping_carriers c ON z.carrier_id = c.id
                WHERE z.is_active = true 
                  AND c.is_active = true
                  AND EXISTS (
                      SELECT 1 
                      FROM jsonb_array_elements(z.postal_code_ranges) as range
                      WHERE ${cleanPostalCode} BETWEEN (range->>'from') AND (range->>'to')
                  )
                LIMIT 1
            `;

            if (!zoneResult.length) {
                return {
                    success: false,
                    error: 'CEP não atendido',
                    options: []
                };
            }

            const zone = zoneResult[0];

            // 2. Calcular peso total
            const totalWeight = calculateTotalWeight(items);

            // 3. Calcular volume total
            const totalVolume = calculateTotalVolume(items);

            // 4. Calcular peso cúbico
            const cubicWeight = calculateCubicWeight(totalVolume);

            // 5. Calcular peso efetivo
            const effectiveWeight = calculateEffectiveWeight(items);

            // 6. Buscar opções calculadas para a zona (usar estrutura Frenet importada)
            const optionsResult = await db.query`
                SELECT 
                    sco.id,
                    sco.modality_id,
                    sco.calculated_weight_rules,
                    sco.calculated_delivery_days,
                    sco.calculated_fees,
                    sm.name as modality_name,
                    sm.description as modality_description,
                    sm.pricing_type
                FROM shipping_calculated_options sco
                JOIN shipping_modalities sm ON sco.modality_id = sm.id
                JOIN shipping_base_rates sbr ON sco.base_rate_id = sbr.id
                WHERE sbr.zone_id = ${zone.zone_id}
                  AND sco.is_active = true
                  AND sm.is_active = true
                ORDER BY sm.priority ASC, sco.calculated_delivery_days ASC
            `;

            const shippingOptions: AdvancedShippingOption[] = [];

            // 7. Processar cada opção
            for (const option of optionsResult) {
                // 🔧 USAR PESO EFETIVO para cálculo de preço (considera volume)
                const price = calculatePriceForWeight(option.calculated_weight_rules, effectiveWeight);
                const finalPrice = applyAdditionalFees(price, option.calculated_fees);
                
                // Verificar frete grátis
                const isFreeShipping = await checkFreeShipping(
                    db, 
                    items, 
                    option.modality_id, 
                    seller_id, 
                    zone.zone_id
                );
                
                const shippingOption: AdvancedShippingOption = {
                    id: option.id,
                    name: generateShippingName(option.modality_name, option.calculated_delivery_days),
                    description: option.modality_description || '',
                    price: isFreeShipping ? 0 : finalPrice,
                    delivery_days: option.calculated_delivery_days,
                    modality_id: option.modality_id,
                    modality_name: option.modality_name,
                    pricing_type: option.pricing_type,
                    carrier: zone.carrier_name,
                    zone_name: zone.zone_name
                };
                
                shippingOptions.push(shippingOption);
            }

            // 8. Ordenar por preço
            shippingOptions.sort((a, b) => a.price - b.price);

            return {
                success: true,
                options: shippingOptions,
                zone_info: {
                    zone_id: zone.zone_id,
                    zone_name: zone.zone_name,
                    uf: zone.uf,
                    carrier: zone.carrier_name
                },
                calculation_info: {
                    total_weight: totalWeight,
                    total_volume: totalVolume,
                    cubic_weight: cubicWeight,
                    effective_weight: effectiveWeight,
                    postal_code: cleanPostalCode,
                    items_count: items.length
                }
            };
        });

        return json(result);

    } catch (error) {
        console.error('Erro no cálculo de frete avançado:', error);
        return json({
            success: false,
            error: 'Erro interno no servidor',
            options: []
        }, { status: 500 });
    }
};

/**
 * Calcular preço baseado no peso (estrutura Frenet importada)
 */
function calculatePriceForWeight(weightRules: any[], weight: number): number {
    const weightInGrams = weight * 1000; // Converter kg para gramas
    
    for (const rule of weightRules) {
        if (weightInGrams >= rule.from && weightInGrams <= rule.to) {
            return rule.price;
        }
    }
    
    // Se não encontrou regra, usar a última (maior peso)
    const lastRule = weightRules[weightRules.length - 1];
    return lastRule?.price || 0;
}

/**
 * Aplicar taxas adicionais (estrutura Frenet)
 */
function applyAdditionalFees(basePrice: number, fees: any): number {
    let finalPrice = basePrice;
    
    if (fees.gris_percent) {
        const grisValue = Math.max(
            basePrice * (fees.gris_percent / 100),
            fees.gris_min || 0
        );
        finalPrice += grisValue;
    }
    
    if (fees.adv_percent) {
        const advValue = Math.max(
            basePrice * (fees.adv_percent / 100),
            fees.adv_min || 0
        );
        finalPrice += advValue;
    }
    
    return Math.round(finalPrice * 100) / 100; // Arredondar para 2 casas decimais
}

/**
 * Verificar se tem frete grátis (estrutura Frenet)
 */
async function checkFreeShipping(
    db: any,
    items: ShippingItem[], 
    modality_id: string, 
    seller_id?: string, 
    zone_id?: string
): Promise<boolean> {
    // Calcular valor total dos itens
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Buscar configuração de frete grátis na estrutura Frenet
    const configResult = await db.query`
        SELECT 
            free_shipping_threshold, 
            free_shipping_products, 
            free_shipping_categories
        FROM shipping_modality_configs
        WHERE modality_id = ${modality_id}
          AND is_enabled = true
          AND (seller_id = ${seller_id || null} OR seller_id IS NULL)
          AND (zone_id = ${zone_id || null} OR zone_id IS NULL)
        ORDER BY 
            CASE WHEN seller_id IS NOT NULL THEN 1 ELSE 2 END,
            CASE WHEN zone_id IS NOT NULL THEN 1 ELSE 2 END
        LIMIT 1
    `;
    
    if (!configResult.length) {
        // Se não tem config específica, verificar threshold global (R$ 199)
        return totalValue >= 199.00;
    }
    
    const config = configResult[0];
    
    // Verificar threshold de valor
    if (config.free_shipping_threshold && totalValue >= config.free_shipping_threshold) {
        return true;
    }
    
    // Verificar produtos específicos
    if (config.free_shipping_products?.length > 0) {
        const hasFreeProdut = items.some(item => 
            config.free_shipping_products.includes(item.product_id)
        );
        if (hasFreeProdut) return true;
    }
    
    // Verificar categorias
    if (config.free_shipping_categories?.length > 0) {
        const hasFreeCategory = items.some(item => 
            config.free_shipping_categories.includes(item.category_id)
        );
        if (hasFreeCategory) return true;
    }
    
    return false;
}

/**
 * Gerar nome amigável para opção de frete
 */
function generateShippingName(modalityName: string, days: number): string {
    if (days === 0) return `${modalityName} - Entrega Hoje`;
    if (days === 1) return `${modalityName} - Entrega Amanhã`;
    return `${modalityName} - ${days} dias úteis`;
}

/**
 * 🚚 FUNÇÕES DE CÁLCULO DE PESO/VOLUME AVANÇADO
 */
function calculateTotalWeight(items: ShippingItem[]): number {
    return items.reduce((total, item) => {
        const weight = item.weight || 0.3; // Default 300g
        return total + (weight * item.quantity);
    }, 0);
}

function calculateTotalVolume(items: ShippingItem[]): number {
    return items.reduce((total, item) => {
        const height = item.height || 10; // cm
        const width = item.width || 10;   // cm 
        const length = item.length || 15; // cm
        const volume = height * width * length; // cm³
        return total + (volume * item.quantity);
    }, 0);
}

function calculateCubicWeight(volume: number, transportType: 'aereo' | 'rodoviario' = 'rodoviario'): number {
    const divisor = transportType === 'aereo' ? 6000 : 5000;
    return volume / divisor; // kg
}

function calculateEffectiveWeight(items: ShippingItem[]): number {
    const realWeight = calculateTotalWeight(items);
    const totalVolume = calculateTotalVolume(items);
    const cubicWeight = calculateCubicWeight(totalVolume);
    
    // O peso efetivo é sempre o maior
    const effectiveWeight = Math.max(realWeight, cubicWeight);
    
    console.log(`📦 Cálculo de peso avançado:`, {
        realWeight: `${realWeight.toFixed(2)}kg`,
        totalVolume: `${totalVolume.toFixed(0)}cm³`,
        cubicWeight: `${cubicWeight.toFixed(2)}kg`,
        effectiveWeight: `${effectiveWeight.toFixed(2)}kg`
    });
    
    return effectiveWeight;
} 