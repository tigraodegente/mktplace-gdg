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

interface ProductShippingConfig {
    product_id: string;
    shipping_pac: boolean;
    shipping_sedex: boolean;
    shipping_carrier: boolean;
    shipping_pickup: boolean;
}

/**
 * Buscar configurações de shipping dos produtos
 */
async function getProductsShippingConfig(db: any, productIds: string[]): Promise<ProductShippingConfig[]> {
    if (productIds.length === 0) return [];
    
    try {
        const products = await db.query`
            SELECT id as product_id, shipping_pac, shipping_sedex, shipping_carrier, shipping_pickup
            FROM products 
            WHERE id = ANY(${productIds}::uuid[])
            AND is_active = true
        `;
        
        return products || [];
    } catch (error) {
        console.error('Erro ao buscar configurações de shipping dos produtos:', error);
        // Se der erro, assume que todos os métodos estão habilitados
        return productIds.map(id => ({
            product_id: id,
            shipping_pac: true,
            shipping_sedex: true,
            shipping_carrier: true,
            shipping_pickup: true
        }));
    }
}

/**
 * Filtrar opções de shipping baseado nas configurações dos produtos
 */
function filterShippingOptionsByProducts(
    options: AdvancedShippingOption[], 
    productsConfig: ProductShippingConfig[]
): AdvancedShippingOption[] {
    if (productsConfig.length === 0) return options;
    
    // Verificar quais métodos estão habilitados para TODOS os produtos
    const allProductsConfig = {
        shipping_pac: productsConfig.every(p => p.shipping_pac),
        shipping_sedex: productsConfig.every(p => p.shipping_sedex), 
        shipping_carrier: productsConfig.every(p => p.shipping_carrier),
        shipping_pickup: productsConfig.every(p => p.shipping_pickup)
    };
    
    console.log('🎯 Filtros de shipping por produto:', allProductsConfig);
    
    return options.filter(option => {
        const modalityLower = option.modality_name.toLowerCase();
        const modalityCode = option.modality_id.toLowerCase();
        
        // Mapear modalidades para campos de configuração
        if (modalityCode === 'pac' || modalityLower.includes('pac') || modalityLower.includes('econômic')) {
            return allProductsConfig.shipping_pac;
        }
        
        if (modalityCode === 'sedex' || modalityLower.includes('sedex') || modalityLower.includes('express') || modalityLower.includes('rápid')) {
            return allProductsConfig.shipping_sedex;
        }
        
        if (modalityCode === 'carrier' || modalityLower.includes('transportadora') || modalityLower.includes('premium')) {
            return allProductsConfig.shipping_carrier;
        }
        
        if (modalityCode === 'pickup' || modalityLower.includes('retirada') || modalityLower.includes('pickup') || modalityLower.includes('loja')) {
            return allProductsConfig.shipping_pickup;
        }
        
        // Se não conseguir identificar, deixa passar (segurança)
        return true;
    });
}

export const POST: RequestHandler = async ({ request, platform }) => {
    try {
        console.log('🚛 Shipping Calculate Advanced - Sistema integrado iniciado');
        
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

        // Buscar configurações de shipping dos produtos
        const productIds = items.map(item => item.product_id);
        const db = getDatabase(platform);
        const productsConfig = await getProductsShippingConfig(db, productIds);
        
        console.log('📦 Configurações de shipping dos produtos:', productsConfig);

        // Tentar calcular frete com banco real
        try {
            // Função auxiliar para determinar UF do CEP
            const getCEPState = (cep: string): string => {
                const prefix = cep.substring(0, 2);
                const cepToUF: { [key: string]: string } = {
                    '01': 'SP', '02': 'SP', '03': 'SP', '04': 'SP', '05': 'SP', '06': 'SP', '07': 'SP', '08': 'SP', '09': 'SP', '10': 'SP',
                    '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
                    '20': 'RJ', '21': 'RJ', '22': 'RJ', '23': 'RJ', '24': 'RJ', '25': 'RJ', '26': 'RJ', '27': 'RJ', '28': 'RJ',
                    '30': 'MG', '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '36': 'MG', '37': 'MG', '38': 'MG', '39': 'MG'
                };
                return cepToUF[prefix] || 'SP';
            };

            // STEP 1: Buscar zona por CEP (corrigida para schema atual)
            const cepUF = getCEPState(cleanPostalCode);
            const zones = await db.query`
                SELECT DISTINCT
                    z.id as zone_id, 
                    z.name as zone_name, 
                    z.states[1] as uf,
                    'Frenet' as carrier_name
                FROM shipping_zones z
                WHERE z.is_active = true 
                AND z.name LIKE '%-%'
                AND z.states @> ARRAY[${cepUF}]
                LIMIT 5
            `;

            let zone = null;
            if (zones.length > 0) {
                zone = zones[0];
            } else {
                // Fallback: criar zona fictícia baseada no CEP
                const cepRegion = cleanPostalCode.substring(0, 2);
                let regionName = 'Sudeste';
                let uf = 'SP';
                
                if (['01', '02', '03', '04', '05', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'].includes(cepRegion)) {
                    regionName = 'São Paulo';
                    uf = 'SP';
                } else if (['20', '21', '22', '23', '24', '25', '26', '27', '28'].includes(cepRegion)) {
                    regionName = 'Rio de Janeiro';
                    uf = 'RJ';
                }
                
                zone = {
                    zone_id: cepRegion,
                    zone_name: regionName,
                    uf: uf,
                    carrier_name: 'Frenet'
                };
            }

            // STEP 2: Calcular métricas de peso/volume
            const totalWeight = calculateTotalWeight(items);
            const totalVolume = calculateTotalVolume(items);
            const cubicWeight = calculateCubicWeight(totalVolume);
            const effectiveWeight = calculateEffectiveWeight(items);

            // STEP 3: ✨ BUSCAR MODALIDADES REAIS DO BANCO ✨
            const modalitiesOptions = await db.query`
                SELECT id, code, name, description, 
                       delivery_days_min, delivery_days_max,
                       pricing_type, min_price, max_price, 
                       price_multiplier
                FROM shipping_modalities
                WHERE is_active = true
                ORDER BY priority ASC, delivery_days_min ASC
                LIMIT 10
            `;

            const shippingOptions: AdvancedShippingOption[] = [];

            // STEP 4: Processar modalidades reais
            if (modalitiesOptions.length > 0) {
                const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const isFreeShipping = totalValue >= 199; // Threshold padrão
                
                console.log(`💰 Valor total: R$ ${totalValue}, Frete grátis: ${isFreeShipping}, Peso efetivo: ${effectiveWeight}kg`);
                
                for (const option of modalitiesOptions) {
                    // Buscar preços reais do banco para esta zona
                    let calculatedPrice = 0;
                    
                    try {
                        const rateQuery = await db.query`
                            SELECT base_price, price_per_kg, min_weight, max_weight
                            FROM shipping_base_rates sbr
                            JOIN shipping_carriers sc ON sbr.carrier_id = sc.id
                            WHERE sbr.zone_id = ${zone.zone_id}
                            AND sc.name = 'Frenet'
                            AND sbr.is_active = true
                            AND sbr.priority = ${option.priority || 2}
                            LIMIT 1
                        `;
                        
                        if (rateQuery.length > 0) {
                            const rate = rateQuery[0];
                            calculatedPrice = calculatePriceFromRate(effectiveWeight, rate, option.price_multiplier || 1.0);
                        } else {
                            // Fallback: usar preço mínimo da modalidade com peso
                            const basePrice = parseFloat(option.min_price) || 15.90;
                            calculatedPrice = calculateAdvancedPrice(effectiveWeight, basePrice);
                        }
                    } catch (rateError) {
                        // Se falhar, usar preço base
                        const basePrice = parseFloat(option.min_price) || 15.90;
                        calculatedPrice = calculateAdvancedPrice(effectiveWeight, basePrice);
                    }
                    
                    // APLICAR FRETE GRÁTIS APENAS SE VALOR >= 199
                    const finalPrice = isFreeShipping ? 0 : Math.max(calculatedPrice, 8.00); // Mín R$ 8
            
                    const shippingOption: AdvancedShippingOption = {
                        id: option.id,
                        name: generateShippingName(option.name, option.delivery_days_min),
                        description: option.description || '',
                        price: finalPrice,
                        delivery_days: option.delivery_days_min,
                        modality_id: option.code || option.id,
                        modality_name: option.name,
                        pricing_type: option.pricing_type || 'per_shipment',
                        carrier: zone.carrier_name,
                        zone_name: zone.zone_name
                    };
                    
                    shippingOptions.push(shippingOption);
                }
                
                console.log(`✅ Modalidades processadas: ${modalitiesOptions.length}, Preços calculados`);
            } else {
                console.log('⚠️ Nenhuma modalidade encontrada no banco, usando fallback');
                
                // Fallback: modalidades básicas
                const defaultOptions = [
                    { id: 'sedex', name: 'SEDEX', description: 'Entrega rápida', days: 2, price: 25.90 },
                    { id: 'pac', name: 'PAC', description: 'Entrega econômica', days: 5, price: 15.90 }
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

            // Filtrar opções baseado nas configurações dos produtos
            const filteredOptions = filterShippingOptionsByProducts(shippingOptions, productsConfig);
            
            console.log(`🎯 Opções antes do filtro: ${shippingOptions.length}, depois: ${filteredOptions.length}`);

            // Ordenar por preço
            filteredOptions.sort((a, b) => a.price - b.price);

            await db.close();

            return json({
                success: true,
                options: filteredOptions,
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
                    items_count: items.length,
                    products_shipping_config: productsConfig,
                    source: 'database_real'
                }
            });
            
        } catch (error) {
            console.log(`⚠️ Erro shipping database: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
            
            // FALLBACK: Cálculo com dados mock
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
                    modality_id: 'express',
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
            
            // Filtrar opções fallback baseado nas configurações dos produtos
            const filteredMockOptions = filterShippingOptionsByProducts(mockOptions, productsConfig);
            
            console.log(`🎯 Opções fallback antes do filtro: ${mockOptions.length}, depois: ${filteredMockOptions.length}`);
            
            return json({
                success: true,
                options: filteredMockOptions,
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
                    items_count: items.length,
                    products_shipping_config: productsConfig,
                    source: 'fallback'
                }
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
 * Calcular preço baseado nos dados reais da tabela shipping_base_rates
 */
function calculatePriceFromRate(effectiveWeightKg: number, rate: any, multiplier: number = 1.0): number {
    const basePrice = parseFloat(rate.base_price) || 15.90;
    const pricePerKg = parseFloat(rate.price_per_kg) || 0;
    
    let finalPrice = basePrice;
    
    // Se tem preço por kg e peso > 1kg
    if (pricePerKg > 0 && effectiveWeightKg > 1) {
        finalPrice = basePrice + ((effectiveWeightKg - 1) * pricePerKg);
    }
    
    // Aplicar multiplicador da modalidade
    finalPrice = finalPrice * multiplier;
    
    // Aplicar taxas mínimas
    const gris = Math.max(finalPrice * 0.02, 1.50);
    const adv = Math.max(finalPrice * 0.01, 0.50);
    
    return Math.round((finalPrice + gris + adv) * 100) / 100;
}

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
 * 🚚 FUNÇÕES DE CÁLCULO DE PESO/VOLUME AVANÇADO (CORRIGIDAS)
 */
function calculateTotalWeight(items: ShippingItem[]): number {
    const totalWeightGrams = items.reduce((total, item) => {
        const weight = item.weight || 300; // Default 300g se não informado
        return total + (weight * item.quantity);
    }, 0);
    
    // Converter gramas para kg
    return totalWeightGrams / 1000;
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
    const realWeightKg = calculateTotalWeight(items); // já em kg
    const totalVolume = calculateTotalVolume(items);
    const cubicWeightKg = calculateCubicWeight(totalVolume);
    
    // O peso efetivo é sempre o maior
    const effectiveWeight = Math.max(realWeightKg, cubicWeightKg);
    
    console.log(`📦 Cálculo de peso corrigido:`, {
        realWeight: `${realWeightKg.toFixed(2)}kg`,
        totalVolume: `${totalVolume.toFixed(0)}cm³`,
        cubicWeight: `${cubicWeightKg.toFixed(2)}kg`,
        effectiveWeight: `${effectiveWeight.toFixed(2)}kg`
    });
    
    return effectiveWeight;
} 