import type { Database } from '$lib/db/database.types';
import type { ShippingOption, ShippingCalculationRequest } from '$lib/types/shipping';

export interface AdvancedShippingOption {
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

export interface ShippingCalculationResult {
    success: boolean;
    options: AdvancedShippingOption[];
    cache_key?: string;
    error?: string;
}

export class AdvancedShippingService {
    constructor(private db: Database) {}

    /**
     * Calcular opções de frete usando a nova estrutura avançada
     */
    async calculateShipping(request: ShippingCalculationRequest): Promise<ShippingCalculationResult> {
        try {
            const { postal_code, items, seller_id } = request;
            
            // Gerar chave de cache
            const cache_key = this.generateCacheKey(request);
            
            // Verificar cache primeiro
            const cached = await this.getCachedQuote(cache_key);
            if (cached) {
                return {
                    success: true,
                    options: cached,
                    cache_key
                };
            }

            // Buscar zona por CEP
            const zone = await this.findZoneByPostalCode(postal_code);
            if (!zone) {
                return {
                    success: false,
                    options: [],
                    error: 'CEP não atendido'
                };
            }

            // Calcular peso total
            const totalWeight = this.calculateTotalWeight(items);
            
            // Buscar opções calculadas para a zona
            const calculatedOptions = await this.getCalculatedOptions(zone.zone_id, seller_id);
            
            // Processar cada opção
            const shippingOptions: AdvancedShippingOption[] = [];
            
            for (const option of calculatedOptions) {
                const price = this.calculatePriceForWeight(option.calculated_weight_rules, totalWeight);
                const finalPrice = this.applyAdditionalFees(price, option.calculated_fees, totalWeight);
                
                // Verificar frete grátis
                const isFreeShipping = await this.checkFreeShipping(
                    items, 
                    option.modality_id, 
                    seller_id, 
                    zone.zone_id
                );
                
                const shippingOption: AdvancedShippingOption = {
                    id: option.id,
                    name: this.generateShippingName(option.modality_name, option.calculated_delivery_days),
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

            // Ordenar por preço
            shippingOptions.sort((a, b) => a.price - b.price);

            // Salvar no cache
            await this.cacheQuote(cache_key, shippingOptions, seller_id, postal_code, items);

            return {
                success: true,
                options: shippingOptions,
                cache_key
            };

        } catch (error) {
            console.error('Erro no cálculo de frete avançado:', error);
            return {
                success: false,
                options: [],
                error: 'Erro interno no cálculo de frete'
            };
        }
    }

    /**
     * Buscar zona por CEP usando a função do banco
     */
    private async findZoneByPostalCode(postal_code: string) {
        const { data } = await this.db
            .rpc('find_shipping_zone_advanced', { 
                p_postal_code: postal_code.replace(/\D/g, '').padStart(8, '0')
            })
            .single();
        
        return data;
    }

    /**
     * Buscar opções calculadas para uma zona
     */
    private async getCalculatedOptions(zone_id: string, seller_id?: string) {
        let query = this.db
            .from('shipping_calculated_options')
            .select(`
                id,
                modality_id,
                calculated_weight_rules,
                calculated_delivery_days,
                calculated_fees,
                shipping_modalities!inner(
                    id,
                    name,
                    description,
                    pricing_type,
                    is_active,
                    priority
                )
            `)
            .eq('zone_id', zone_id)
            .eq('is_active', true)
            .eq('shipping_modalities.is_active', true)
            .order('shipping_modalities.priority');

        const { data, error } = await query;
        
        if (error) {
            console.error('Erro ao buscar opções calculadas:', error);
            return [];
        }

        return data?.map(option => ({
            id: option.id,
            modality_id: option.modality_id,
            modality_name: option.shipping_modalities.name,
            modality_description: option.shipping_modalities.description,
            pricing_type: option.shipping_modalities.pricing_type,
            calculated_weight_rules: option.calculated_weight_rules,
            calculated_delivery_days: option.calculated_delivery_days,
            calculated_fees: option.calculated_fees
        })) || [];
    }

    /**
     * Calcular preço baseado no peso
     */
    private calculatePriceForWeight(weightRules: any[], weight: number): number {
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
     * Aplicar taxas adicionais
     */
    private applyAdditionalFees(basePrice: number, fees: any, weight: number): number {
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
     * Verificar se tem frete grátis
     */
    private async checkFreeShipping(
        items: any[], 
        modality_id: string, 
        seller_id?: string, 
        zone_id?: string
    ): Promise<boolean> {
        // Calcular valor total dos itens
        const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Buscar configuração de frete grátis
        let query = this.db
            .from('shipping_modality_configs')
            .select('free_shipping_threshold, free_shipping_products, free_shipping_categories')
            .eq('modality_id', modality_id)
            .eq('is_enabled', true);
            
        if (seller_id) {
            query = query.eq('seller_id', seller_id);
        } else {
            query = query.is('seller_id', null); // Configuração global
        }
        
        if (zone_id) {
            query = query.eq('zone_id', zone_id);
        } else {
            query = query.is('zone_id', null); // Configuração global
        }
        
        const { data } = await query.single();
        
        if (!data) return false;
        
        // Verificar threshold de valor
        if (data.free_shipping_threshold && totalValue >= data.free_shipping_threshold) {
            return true;
        }
        
        // Verificar produtos específicos
        if (data.free_shipping_products?.length > 0) {
            const hasFreeProdut = items.some(item => 
                data.free_shipping_products.includes(item.product_id)
            );
            if (hasFreeProdut) return true;
        }
        
        // Verificar categorias
        if (data.free_shipping_categories?.length > 0) {
            const hasFreeCategory = items.some(item => 
                data.free_shipping_categories.includes(item.category_id)
            );
            if (hasFreeCategory) return true;
        }
        
        return false;
    }

    /**
     * Calcular peso total dos itens
     */
    private calculateTotalWeight(items: any[]): number {
        return items.reduce((total, item) => {
            const weight = item.weight || 0.3; // Peso padrão 300g
            return total + (weight * item.quantity);
        }, 0);
    }

    /**
     * Gerar nome amigável para opção de frete
     */
    private generateShippingName(modalityName: string, days: number): string {
        if (days === 0) return `${modalityName} - Entrega Hoje`;
        if (days === 1) return `${modalityName} - Entrega Amanhã`;
        return `${modalityName} - ${days} dias úteis`;
    }

    /**
     * Gerar chave de cache
     */
    private generateCacheKey(request: ShippingCalculationRequest): string {
        const itemsHash = JSON.stringify(request.items.map(i => ({
            id: i.product_id,
            qty: i.quantity,
            weight: i.weight
        })));
        
        return `shipping_${request.postal_code}_${request.seller_id || 'global'}_${btoa(itemsHash).slice(0, 10)}`;
    }

    /**
     * Buscar cotação em cache
     */
    private async getCachedQuote(cache_key: string): Promise<AdvancedShippingOption[] | null> {
        const { data } = await this.db
            .from('shipping_quotes')
            .select('shipping_options')
            .eq('cache_key', cache_key)
            .gt('expires_at', new Date().toISOString())
            .single();
            
        return data?.shipping_options || null;
    }

    /**
     * Salvar cotação no cache
     */
    private async cacheQuote(
        cache_key: string, 
        options: AdvancedShippingOption[], 
        seller_id: string | undefined, 
        postal_code: string, 
        items: any[]
    ) {
        const expires_at = new Date();
        expires_at.setHours(expires_at.getHours() + 1); // Cache por 1 hora
        
        await this.db
            .from('shipping_quotes')
            .upsert({
                cache_key,
                seller_id,
                postal_code: postal_code.replace(/\D/g, ''),
                items_data: items,
                shipping_options: options,
                expires_at: expires_at.toISOString()
            });
    }
} 