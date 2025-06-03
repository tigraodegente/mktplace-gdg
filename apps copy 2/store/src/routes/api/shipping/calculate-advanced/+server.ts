import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

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
        console.log('🚛 Shipping Calculate Advanced - Estratégia híbrida iniciada');
        
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

        // Tentar calcular frete avançado com timeout
        try {
            const db = getDatabase(platform);
            
            // Promise com timeout de 6 segundos
            const queryPromise = (async () => {
                // STEP 1: Buscar zona por CEP (query simplificada)
                const zones = await db.query`
                    SELECT z.id as zone_id, z.name as zone_name, z.uf, 
                    c.name as carrier_name
                FROM shipping_zones z
                JOIN shipping_carriers c ON z.carrier_id = c.id
                    WHERE z.is_active = true AND c.is_active = true
                    LIMIT 5
            `;

                let zone = null;
                if (zones.length > 0) {
                    // Usar primeira zona ativa (simplificado)
                    zone = zones[0];
                } else {
                return {
                    success: false,
                    error: 'CEP não atendido',
                    options: []
                };
            }

                // STEP 2: Calcular métricas de peso/volume
            const totalWeight = calculateTotalWeight(items);
            const totalVolume = calculateTotalVolume(items);
            const cubicWeight = calculateCubicWeight(totalVolume);
            const effectiveWeight = calculateEffectiveWeight(items);

                // STEP 3: Buscar opções de modalidades (query simplificada)
                let modalitiesOptions = [];
                try {
                    modalitiesOptions = await db.query`
                        SELECT id, name, description, delivery_days_min, delivery_days_max,
                               pricing_type, min_price, max_price, price_multiplier
                        FROM shipping_modalities
                        WHERE is_active = true
                        ORDER BY priority ASC, delivery_days_min ASC
                        LIMIT 10
            `;
                } catch (e) {
                    console.log('Erro ao buscar modalidades, usando fallback');
                }

            const shippingOptions: AdvancedShippingOption[] = [];

                // STEP 4: Processar opções (simplificado)
                if (modalitiesOptions.length > 0) {
                    for (const option of modalitiesOptions) {
                        // Usar min_price como base_price, ou fallback se não existir
                        const basePrice = calculateAdvancedPrice(effectiveWeight, option.min_price || option.max_price || 15.90);
                        const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                        const isFreeShipping = totalValue >= 199; // Threshold simplificado
                
                const shippingOption: AdvancedShippingOption = {
                    id: option.id,
                            name: generateShippingName(option.name, option.delivery_days_min),
                            description: option.description || '',
                            price: isFreeShipping ? 0 : basePrice,
                            delivery_days: option.delivery_days_min,
                            modality_id: option.id,
                            modality_name: option.name,
                            pricing_type: option.pricing_type || 'per_shipment',
                    carrier: zone.carrier_name,
                    zone_name: zone.zone_name
                };
                
                shippingOptions.push(shippingOption);
            }
                } else {
                    // Opções padrão se não encontrou no banco
                    const defaultOptions = [
                        {
                            id: 'sedex',
                            name: 'SEDEX',
                            description: 'Entrega rápida',
                            days: 2,
                            price: 25.90
                        },
                        {
                            id: 'pac',
                            name: 'PAC',
                            description: 'Entrega econômica',
                            days: 5,
                            price: 15.90
                        }
                    ];

                    for (const option of defaultOptions) {
                        const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                        const adjustedPrice = calculateAdvancedPrice(effectiveWeight, option.price);
                        const isFreeShipping = totalValue >= 199;
                        
                        shippingOptions.push({
                            id: option.id,
                            name: generateShippingName(option.name, option.days),
                            description: option.description,
                            price: isFreeShipping ? 0 : adjustedPrice,
                            delivery_days: option.days,
                            modality_id: option.id,
                            modality_name: option.name,
                            pricing_type: 'per_shipment',
                            carrier: zone.carrier_name,
                            zone_name: zone.zone_name
                        });
                    }
                }

                // Ordenar por preço
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
            })();
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 6000)
            });
            
            const result = await Promise.race([queryPromise, timeoutPromise]) as any;
            
            console.log(`✅ Frete avançado calculado: ${result.options?.length || 0} opções`);
            
            return json({
                ...result,
                source: 'database'
            });
            
        } catch (error) {
            console.log(`⚠️ Erro shipping advanced: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
            
            // FALLBACK: Cálculo avançado com dados mock
            const totalWeight = calculateTotalWeight(items);
            const totalVolume = calculateTotalVolume(items);
            const cubicWeight = calculateCubicWeight(totalVolume);
            const effectiveWeight = calculateEffectiveWeight(items);
            const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const isFreeShipping = totalValue >= 199;
            
            // Determinar região por CEP
            const cepRegion = cleanPostalCode.substring(0, 2);
            let regionName = 'Sudeste';
            let baseDeliveryDays = 5;
            
            if (['01', '02', '03', '04', '05', '08', '09'].includes(cepRegion)) {
                regionName = 'São Paulo';
                baseDeliveryDays = 2;
            } else if (['20', '21', '22', '23', '24', '25', '26', '27', '28'].includes(cepRegion)) {
                regionName = 'Rio de Janeiro';
                baseDeliveryDays = 3;
            }
            
            const mockOptions: AdvancedShippingOption[] = [
                {
                    id: 'sedex-express',
                    name: generateShippingName('SEDEX Express', baseDeliveryDays - 1),
                    description: 'Entrega expressa com seguro',
                    price: isFreeShipping ? 0 : calculateAdvancedPrice(effectiveWeight, 35.90),
                    delivery_days: baseDeliveryDays - 1,
                    modality_id: 'sedex-express',
                    modality_name: 'SEDEX Express',
                    pricing_type: 'per_shipment',
                    carrier: 'Correios',
                    zone_name: regionName
                },
                {
                    id: 'sedex',
                    name: generateShippingName('SEDEX', baseDeliveryDays),
                    description: 'Entrega rápida e segura',
                    price: isFreeShipping ? 0 : calculateAdvancedPrice(effectiveWeight, 25.90),
                    delivery_days: baseDeliveryDays,
                    modality_id: 'sedex',
                    modality_name: 'SEDEX',
                    pricing_type: 'per_shipment',
                    carrier: 'Correios',
                    zone_name: regionName
                },
                {
                    id: 'pac',
                    name: generateShippingName('PAC', baseDeliveryDays + 2),
                    description: 'Entrega econômica',
                    price: isFreeShipping ? 0 : calculateAdvancedPrice(effectiveWeight, 15.90),
                    delivery_days: baseDeliveryDays + 2,
                    modality_id: 'pac',
                    modality_name: 'PAC',
                    pricing_type: 'per_shipment',
                    carrier: 'Correios',
                    zone_name: regionName
                }
            ];
            
            return json({
                success: true,
                options: mockOptions,
                zone_info: {
                    zone_id: cepRegion,
                    zone_name: regionName,
                    uf: cepRegion === '01' ? 'SP' : 'BR',
                    carrier: 'Correios'
                },
                calculation_info: {
                    total_weight: totalWeight,
                    total_volume: totalVolume,
                    cubic_weight: cubicWeight,
                    effective_weight: effectiveWeight,
                    postal_code: cleanPostalCode,
                    items_count: items.length
                },
                source: 'fallback'
            });
        }

    } catch (error) {
        console.error('❌ Erro crítico shipping advanced:', error);
        return json({
            success: false,
            error: 'Erro interno no servidor',
            options: []
        }, { status: 500 });
    }
};

/**
 * Calcular preço avançado baseado no peso efetivo
 */
function calculateAdvancedPrice(effectiveWeight: number, basePrice: number): number {
    let price = basePrice;
    
    // Ajustar preço por peso
    if (effectiveWeight > 5) { // Acima de 5kg
        price += (effectiveWeight - 5) * 3; // +R$3 por kg extra
    } else if (effectiveWeight > 2) { // Acima de 2kg
        price += (effectiveWeight - 2) * 2; // +R$2 por kg extra
    }
    
    // Aplicar taxas (simulando GRIS e ADV)
    const gris = Math.max(price * 0.02, 1.50); // 2% mín R$1,50
    const adv = Math.max(price * 0.01, 0.50);  // 1% mín R$0,50
    
    return Math.round((price + gris + adv) * 100) / 100;
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