/**
 * Shipping Cart Service
 * 
 * Serviço para integrar o sistema avançado de frete com o carrinho
 * Usa a nova API /api/shipping/calculate-advanced
 */

import type { CartItem } from '$lib/types/cart';

export interface ShippingCalculationRequest {
    postal_code: string;
    items: ShippingItem[];
    seller_id?: string;
}

export interface ShippingItem {
    product_id: string;
    quantity: number;
    weight?: number;
    price: number;
    category_id?: string;
    height?: number;
    width?: number;
    length?: number;
}

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
    zone_info?: {
        zone_id: string;
        zone_name: string;
        uf: string;
        carrier: string;
    };
    calculation_info?: {
        total_weight: number;
        postal_code: string;
        items_count: number;
    };
    error?: string;
}

export interface SellerShippingQuote {
    sellerId: string;
    sellerName: string;
    items: CartItem[];
    shippingResult: ShippingCalculationResult;
    subtotal: number;
    totalWeight: number;
}

export class ShippingCartService {
    
    /**
     * Calcular frete para um seller específico
     */
    static async calculateShippingForSeller(
        postalCode: string,
        items: CartItem[],
        sellerId: string
    ): Promise<ShippingCalculationResult> {
        try {
            // Converter itens do carrinho para formato da API
            const shippingItems: ShippingItem[] = items.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                weight: (item.product as any).weight || 0.3, // Default 300g
                price: item.product.price,
                category_id: (item.product as any).category_id,
                height: (item.product as any).height,
                width: (item.product as any).width,
                length: (item.product as any).length
            }));

            const requestBody: ShippingCalculationRequest = {
                postal_code: postalCode,
                items: shippingItems,
                seller_id: sellerId
            };

            const response = await fetch('/api/shipping/calculate-advanced', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result: ShippingCalculationResult = await response.json();
            return result;

        } catch (error) {
            console.error('Erro ao calcular frete para seller:', error);
            return {
                success: false,
                options: [],
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }

    /**
     * Calcular frete para todos os sellers do carrinho
     */
    static async calculateShippingForCart(
        postalCode: string,
        cartItems: CartItem[]
    ): Promise<SellerShippingQuote[]> {
        // Agrupar itens por seller
        const itemsBySeller: Record<string, CartItem[]> = {};
        
        cartItems.forEach(item => {
            if (!itemsBySeller[item.sellerId]) {
                itemsBySeller[item.sellerId] = [];
            }
            itemsBySeller[item.sellerId].push(item);
        });

        // Calcular frete para cada seller em paralelo
        const shippingPromises = Object.entries(itemsBySeller).map(
            async ([sellerId, sellerItems]): Promise<SellerShippingQuote> => {
                const shippingResult = await this.calculateShippingForSeller(
                    postalCode,
                    sellerItems,
                    sellerId
                );

                const subtotal = sellerItems.reduce(
                    (sum, item) => sum + (item.product.price * item.quantity),
                    0
                );

                const totalWeight = sellerItems.reduce(
                    (sum, item) => {
                        // 🚚 CÁLCULO COMPLETO: peso real + peso cubado
                        const realWeight = ((item.product as any).weight || 0.3) * item.quantity;
                        
                        // Calcular volume e peso cubado
                        const height = (item.product as any).height || 10;
                        const width = (item.product as any).width || 10;
                        const length = (item.product as any).length || 15;
                        const volume = height * width * length * item.quantity;
                        const cubicWeight = volume / 5000; // divisor rodoviário
                        
                        // Usar o maior entre peso real e peso cubado
                        const effectiveWeight = Math.max(realWeight, cubicWeight);
                        
                        return sum + effectiveWeight;
                    },
                    0
                );

                return {
                    sellerId,
                    sellerName: sellerItems[0].sellerName,
                    items: sellerItems,
                    shippingResult,
                    subtotal,
                    totalWeight
                };
            }
        );

        try {
            const results = await Promise.all(shippingPromises);
            return results;
        } catch (error) {
            console.error('Erro ao calcular frete para carrinho:', error);
            return [];
        }
    }

    /**
     * Formatar opção de frete para exibição no carrinho
     */
    static formatShippingOption(option: AdvancedShippingOption): {
        id: string;
        name: string;
        price: number;
        estimatedDays: number;
        isFree: boolean;
        mode: string;
        description: string;
        carrier: string;
    } {
        return {
            id: option.id,
            name: option.name,
            price: option.price,
            estimatedDays: option.delivery_days,
            isFree: option.price === 0,
            mode: option.modality_id,
            description: option.description,
            carrier: option.carrier
        };
    }

    /**
     * Obter a opção de frete mais barata para um seller
     */
    static getCheapestOption(options: AdvancedShippingOption[]): AdvancedShippingOption | null {
        if (!options || options.length === 0) return null;
        
        return options.reduce((cheapest, current) => 
            current.price < cheapest.price ? current : cheapest
        );
    }

    /**
     * Obter a opção de frete mais rápida para um seller
     */
    static getFastestOption(options: AdvancedShippingOption[]): AdvancedShippingOption | null {
        if (!options || options.length === 0) return null;
        
        return options.reduce((fastest, current) => 
            current.delivery_days < fastest.delivery_days ? current : fastest
        );
    }

    /**
     * Calcular total de frete do carrinho baseado nas opções selecionadas
     */
    static calculateCartShippingTotal(
        quotes: SellerShippingQuote[],
        selectedOptionsBySeller: Record<string, string>
    ): {
        totalShipping: number;
        maxDeliveryDays: number;
        hasExpressOptions: boolean;
        hasGroupedOptions: boolean;
    } {
        let totalShipping = 0;
        let maxDeliveryDays = 0;
        let hasExpressOptions = false;
        let hasGroupedOptions = false;

        quotes.forEach(quote => {
            if (!quote.shippingResult.success) return;

            const selectedOptionId = selectedOptionsBySeller[quote.sellerId];
            if (!selectedOptionId) return;

            const selectedOption = quote.shippingResult.options.find(
                opt => opt.id === selectedOptionId
            );

            if (selectedOption) {
                totalShipping += selectedOption.price;
                maxDeliveryDays = Math.max(maxDeliveryDays, selectedOption.delivery_days);
                
                if (selectedOption.modality_id === 'expressa') {
                    hasExpressOptions = true;
                }
                if (selectedOption.modality_id === 'agrupada') {
                    hasGroupedOptions = true;
                }
            }
        });

        return {
            totalShipping,
            maxDeliveryDays,
            hasExpressOptions,
            hasGroupedOptions
        };
    }

    /**
     * Validar CEP
     */
    static validatePostalCode(postalCode: string): boolean {
        const cleanCode = postalCode.replace(/\D/g, '');
        return cleanCode.length === 8;
    }

    /**
     * Formatar CEP para exibição
     */
    static formatPostalCode(postalCode: string): string {
        const clean = postalCode.replace(/\D/g, '');
        if (clean.length >= 5) {
            return clean.replace(/(\d{5})(\d{1,3})/, '$1-$2');
        }
        return clean;
    }

    /**
     * Detectar se tem frete grátis disponível
     */
    static hasFreeShippingAvailable(quotes: SellerShippingQuote[]): boolean {
        return quotes.some(quote => 
            quote.shippingResult.success && 
            quote.shippingResult.options.some(opt => opt.price === 0)
        );
    }

    /**
     * Calcular economia potencial com frete grátis
     */
    static calculateFreeShippingSavings(quotes: SellerShippingQuote[]): number {
        return quotes.reduce((total, quote) => {
            if (!quote.shippingResult.success) return total;
            
            const cheapestOption = this.getCheapestOption(quote.shippingResult.options);
            const freeOption = quote.shippingResult.options.find(opt => opt.price === 0);
            
            if (freeOption && cheapestOption && cheapestOption.price > 0) {
                return total + cheapestOption.price;
            }
            
            return total;
        }, 0);
    }
} 