/**
 * Unified Shipping Service
 * 
 * Serviço consolidado que unifica todas as funcionalidades de cálculo de frete:
 * - Cálculo para carrinho (múltiplos sellers)
 * - Suporte a múltiplas transportadoras
 * - Sistema de zonas e modalidades
 * - Frete grátis em múltiplos níveis
 * - Cache inteligente
 * - Peso real vs peso cubado
 * - Modalidades: Expressa (por item) e Agrupada (por remessa)
 * 
 * ATUALIZADO: Usa nova estrutura de banco via ModernShippingAdapter
 */

import type { CartItem } from '$lib/types/cart';
import { withDatabase } from '$lib/db';
import type { 
  UnifiedShippingItem,
  UnifiedShippingOption,
  UnifiedShippingQuote,
  UnifiedShippingRequest,
  ShippingBreakdown
} from './unifiedShippingService.types';

// Importar o novo adaptador
import { ModernShippingAdapter } from './modernShippingAdapter';

// Re-export types for compatibility
export type { 
  UnifiedShippingItem,
  UnifiedShippingOption,
  UnifiedShippingQuote,
  UnifiedShippingRequest,
  ShippingBreakdown
} from './unifiedShippingService.types';

// ============================================================================
// TYPES E INTERFACES
// ============================================================================

// Definindo Product localmente até resolver imports
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  category_id?: string;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  [key: string]: any;
}

interface ProductShippingConfig {
  product_id: string;
  shipping_pac: boolean;
  shipping_sedex: boolean;
  shipping_carrier: boolean;
  shipping_pickup: boolean;
}

// ============================================================================
// CACHE EM MEMÓRIA
// ============================================================================

class ShippingCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  set(key: string, data: any, ttlMinutes: number = 60): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMinutes * 60 * 1000
    });
  }
  
  get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  generateKey(request: UnifiedShippingRequest): string {
    const itemsHash = JSON.stringify(request.items.map(i => ({
      id: i.product_id,
      qty: i.quantity,
      w: i.weight
    })));
    
    return `shipping_${request.postalCode}_${request.sellerId || 'all'}_${btoa(itemsHash).slice(0, 10)}`;
  }
}

// ============================================================================
// SERVIÇO UNIFICADO
// ============================================================================

export class UnifiedShippingService {
  private static cache = new ShippingCache();
  
  /**
   * Método principal - Calcular frete para carrinho completo
   */
  static async calculateShippingForCart(
    platform: any,
    postalCode: string,
    cartItems: CartItem[]
  ): Promise<UnifiedShippingQuote[]> {
    
    // Validar entrada
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      console.error('❌ calculateShippingForCart: cartItems inválido ou vazio', cartItems);
      return [];
    }
    
    // Agrupar itens por seller
    const itemsBySeller = this.groupItemsBySeller(cartItems);
    const quotes: UnifiedShippingQuote[] = [];
    
    // Calcular frete para cada seller
    for (const [sellerId, items] of Object.entries(itemsBySeller)) {
      const quote = await this.calculateShippingForSeller(
        platform,
        {
          postalCode,
          items,
          sellerId,
          useCache: true
        }
      );
      quotes.push(quote);
    }
    
    return quotes;
  }
  
  /**
   * Calcular frete para um seller específico
   */
  static async calculateShippingForSeller(
    platform: any,
    request: UnifiedShippingRequest
  ): Promise<UnifiedShippingQuote> {
    
    // Verificar cache
    if (request.useCache !== false) {
      const cacheKey = this.cache.generateKey(request);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`🎯 Cache hit para ${request.sellerId || 'global'}`);
        return cached;
      }
    }
    
    return await withDatabase(platform, async (db) => {
      try {
        console.log(`🚛 Calculando frete para seller ${request.sellerId || 'global'}, CEP ${request.postalCode}`);
        
        // 1. Buscar zona por CEP
        const zone = await this.findZoneByPostalCode(db, request.postalCode);
        if (!zone) {
          return this.createErrorQuote(request, 'CEP não encontrado na área de cobertura');
        }
        
        // 2. Calcular peso e valor totais
        const totalWeight = this.calculateEffectiveWeight(request.items);
        const totalValue = this.calculateTotalValue(request.items);
        
        console.log(`📦 Peso: ${(totalWeight/1000).toFixed(2)}kg, Valor: R$ ${totalValue.toFixed(2)}`);
        
        // 3. Buscar opções de frete disponíveis
        const shippingOptions = await this.getShippingOptions(
          db,
          zone,
          request.sellerId,
          totalWeight,
          totalValue,
          request.items
        );
        
        if (shippingOptions.length === 0) {
          return this.createErrorQuote(request, 'Nenhuma opção de frete disponível');
        }
        
        // 4. Criar quote
        const quote: UnifiedShippingQuote = {
          sellerId: request.sellerId || 'global',
          sellerName: request.items[0]?.sellerName || 'Loja',
          items: request.items,
          options: shippingOptions,
          totalWeight,
          totalValue,
          success: true,
          zoneInfo: {
            zoneId: zone.zone_id,
            zoneName: zone.zone_name,
            uf: zone.uf,
            carrier: zone.carrier_name
          }
        };
        
        // 5. Salvar no cache
        if (request.useCache !== false) {
          const cacheKey = this.cache.generateKey(request);
          this.cache.set(cacheKey, quote);
        }
        
        return quote;
        
      } catch (error) {
        console.error('❌ Erro no cálculo de frete:', error);
        return this.createErrorQuote(request, 'Erro ao calcular frete');
      }
    });
  }
  
  // ============================================================================
  // MÉTODOS AUXILIARES - BANCO DE DADOS
  // ============================================================================
  
  private static async findZoneByPostalCode(
    db: any,
    postalCode: string
  ): Promise<any> {
    console.log('🔍 Buscando zona via ModernShippingAdapter');
    return await ModernShippingAdapter.findZoneByPostalCode(db, postalCode);
  }
  
  private static async getShippingOptions(
    db: any,
    zone: any,
    sellerId: string | undefined,
    totalWeight: number,
    totalValue: number,
    items: UnifiedShippingItem[]
  ): Promise<UnifiedShippingOption[]> {
    
    console.log('🚛 Buscando opções via ModernShippingAdapter');
    
    // Buscar modalidades usando novo adaptador
    const modalities = await ModernShippingAdapter.getShippingOptions(
      db,
      zone,
      sellerId,
      totalWeight,
      totalValue,
      items
    );

    const options: UnifiedShippingOption[] = [];
    
    for (const modality of modalities || []) {
      const option = await this.createShippingOption(
        db,
        modality,
        zone,
        sellerId,
        totalWeight,
        totalValue,
        items
      );
      
      if (option) {
        options.push(option);
      }
    }
    
    // Ordenar por preço
    return options.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      if (a.price !== b.price) return a.price - b.price;
      return a.deliveryDays - b.deliveryDays;
    });
  }
  
  private static async createShippingOption(
    db: any,
    modality: any,
    zone: any,
    sellerId: string | undefined,
    totalWeight: number,
    totalValue: number,
    items: UnifiedShippingItem[]
  ): Promise<UnifiedShippingOption | null> {
    
    try {
      // 1. Calcular preço base
      let basePrice: number;
      
      // Se for "per_item", calcular preço individual por item
      if (modality.modality_pricing_type === 'per_item') {
        basePrice = 0;
        for (const item of items) {
          // CORRIGIDO: Converter peso de string/kg para gramas
          let itemWeightGrams = 300; // Default 300g
          
          if (item.weight) {
            // Se weight é string, converter
            const weightValue = typeof item.weight === 'string' 
              ? parseFloat(item.weight) 
              : item.weight;
            
            // Se o peso parece estar em kg (valores menores que 100), converter para gramas
            if (weightValue > 0) {
              itemWeightGrams = weightValue < 100 
                ? weightValue * 1000  // Se < 100, assumir que está em kg e converter para gramas
                : weightValue;         // Se >= 100, já está em gramas
            }
          }
          
          const itemPrice = this.calculatePriceByWeight(
            itemWeightGrams,
            modality.calculated_weight_rules || modality.weight_rules || []
          );
          if (itemPrice === null) return null;
          basePrice += itemPrice;
        }
      } else {
        // Se for "per_shipment", usar peso total
        const shipmentPrice = this.calculatePriceByWeight(
          totalWeight,
          modality.calculated_weight_rules || modality.weight_rules || []
        );
        if (shipmentPrice === null) return null;
        basePrice = shipmentPrice;
      }
      
      // 2. Buscar configurações de markup e frete grátis
      const config = await this.getShippingConfig(db, modality.modality_id, sellerId, zone.zone_id);
      
      // 3. Aplicar markup
      const markupPercentage = config?.custom_price_multiplier || config?.markup_percentage || 0;
      const markup = basePrice * markupPercentage / 100;
      
      // 4. Calcular taxas adicionais
      const taxes = this.calculateAdditionalFees(
        basePrice + markup,
        modality.calculated_fees || modality.additional_fees
      );
      
      // 5. Preço original (antes de descontos)
      const originalPrice = basePrice + markup + taxes.total;
      
      // 6. Verificar frete grátis
      const freeShipping = await this.checkFreeShipping(
        db,
        items,
        totalValue,
        config,
        modality.modality_id,
        sellerId
      );
      
      // 7. Definir prazo
      const deliveryDays = modality.calculated_delivery_days || zone.delivery_days_min || 5;
      const deliveryDaysMin = zone.delivery_days_min || deliveryDays;
      const deliveryDaysMax = zone.delivery_days_max || deliveryDays + 2;
      
      // 8. Criar opção
      return {
        id: `${zone.carrier_id}-${modality.modality_id}`,
        name: this.generateOptionName(
          modality.modality_name,
          deliveryDays,
          modality.modality_pricing_type
        ),
        description: modality.modality_description || '',
        price: freeShipping.isFree ? 0 : originalPrice,
        originalPrice,
        deliveryDays,
        deliveryDaysMin,
        deliveryDaysMax,
        modalityId: modality.modality_id,
        modalityName: modality.modality_name,
        pricingType: modality.modality_pricing_type,
        carrier: zone.carrier_name,
        carrierName: zone.carrier_name,
        carrierId: zone.carrier_id,
        zoneName: zone.zone_name,
        isFree: freeShipping.isFree,
        freeReason: freeShipping.reason,
        breakdown: {
          basePrice,
          markup,
          taxes: taxes.breakdown,
          discounts: {},
          freeShippingDiscount: freeShipping.isFree ? originalPrice : 0
        }
      };
      
    } catch (error) {
      console.error('Erro ao criar opção de frete:', error);
      return null;
    }
  }
  
  // ============================================================================
  // MÉTODOS AUXILIARES - CÁLCULOS
  // ============================================================================
  
  private static calculateEffectiveWeight(items: UnifiedShippingItem[]): number {
    let totalRealWeight = 0;
    let totalVolume = 0;
    
    for (const item of items) {
      // CORRIGIDO: Converter peso de string/kg para gramas
      let itemWeightGrams = 300; // Default 300g
      
      if (item.weight) {
        // Se weight é string, converter
        const weightValue = typeof item.weight === 'string' 
          ? parseFloat(item.weight) 
          : item.weight;
        
        // Se o peso parece estar em kg (valores menores que 100), converter para gramas
        if (weightValue > 0) {
          itemWeightGrams = weightValue < 100 
            ? weightValue * 1000  // Se < 100, assumir que está em kg e converter para gramas
            : weightValue;         // Se >= 100, já está em gramas
        }
      }
      
      totalRealWeight += itemWeightGrams * item.quantity;
      
      // Volume em cm³
      const height = item.height || 10;
      const width = item.width || 10;
      const length = item.length || 15;
      const volume = height * width * length * item.quantity;
      totalVolume += volume;
    }
    
    // Peso cubado (divisor rodoviário: 5000) - mantém em gramas
    const cubicWeight = (totalVolume / 5000) * 1000; // em gramas
    
    // Usar o maior entre peso real e peso cubado
    const effectiveWeight = Math.max(totalRealWeight, cubicWeight);
    
    console.log(`📏 Peso real: ${(totalRealWeight/1000).toFixed(2)}kg, Cubado: ${(cubicWeight/1000).toFixed(2)}kg, Efetivo: ${(effectiveWeight/1000).toFixed(2)}kg`);
    
    return effectiveWeight;
  }
  
  private static calculateTotalValue(items: UnifiedShippingItem[]): number {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  private static calculatePriceByWeight(
    weightGrams: number,
    weightRules: any[]
  ): number | null {
    
    if (!weightRules || !Array.isArray(weightRules)) return null;
    
    for (const rule of weightRules) {
      if (weightGrams >= rule.from && weightGrams <= rule.to) {
        return rule.price;
      }
    }
    
    // Se não encontrou regra, usar a última (maior peso)
    const lastRule = weightRules[weightRules.length - 1];
    return lastRule?.price || null;
  }
  
  private static calculateAdditionalFees(
    baseAmount: number,
    feesConfig: any
  ): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = 0;
    
    if (!feesConfig) return { total, breakdown };
    
    // GRIS (Gerenciamento de Risco)
    if (feesConfig.gris_percent) {
      const gris = Math.max(
        baseAmount * feesConfig.gris_percent / 100,
        feesConfig.gris_min || 0
      );
      breakdown.gris = gris;
      total += gris;
    }
    
    // Ad Valorem
    if (feesConfig.adv_percent) {
      const adv = Math.max(
        baseAmount * feesConfig.adv_percent / 100,
        feesConfig.adv_min || 0
      );
      breakdown.adv = adv;
      total += adv;
    }
    
    // Taxas fixas
    const fixedFees = ['pedagio', 'despacho', 'suframa', 'tas'];
    for (const fee of fixedFees) {
      if (feesConfig[fee]) {
        breakdown[fee] = feesConfig[fee];
        total += feesConfig[fee];
      }
    }
    
    return { total, breakdown };
  }
  
  // ============================================================================
  // MÉTODOS AUXILIARES - FRETE GRÁTIS
  // ============================================================================
  
  private static async getShippingConfig(
    db: any,
    modalityId: string,
    sellerId?: string,
    zoneId?: string
  ): Promise<any> {
    console.log('⚙️ Buscando configuração via ModernShippingAdapter');
    return await ModernShippingAdapter.getShippingConfig(db, modalityId, sellerId, zoneId);
  }
  
  private static async checkFreeShipping(
    db: any,
    items: UnifiedShippingItem[],
    totalValue: number,
    config: any,
    modalityId: string,
    sellerId?: string
  ): Promise<{ isFree: boolean; reason?: string }> {
    
    if (!config) return { isFree: false };
    
    // 1. Frete grátis por valor mínimo
    if (config.free_shipping_threshold && totalValue >= config.free_shipping_threshold) {
      return {
        isFree: true,
        reason: `Frete grátis acima de R$ ${config.free_shipping_threshold.toFixed(2)}`
      };
    }
    
    // 2. Frete grátis por produto
    if (config.free_shipping_products?.length > 0) {
      for (const item of items) {
        if (config.free_shipping_products.includes(item.product_id)) {
          return {
            isFree: true,
            reason: `Produto "${item.product.name}" tem frete grátis`
          };
        }
      }
    }
    
    // 3. Frete grátis por categoria
    if (config.free_shipping_categories?.length > 0) {
      for (const item of items) {
        if (config.free_shipping_categories.includes(item.category_id)) {
          return {
            isFree: true,
            reason: 'Categoria com frete grátis'
          };
        }
      }
    }
    
    // 4. REMOVIDO: Verificação de shipping_promotions (tabela não existe)
    // Retornar false se nenhuma condição for atendida
    return { isFree: false };
  }
  
  // ============================================================================
  // MÉTODOS AUXILIARES - UTILITÁRIOS
  // ============================================================================
  
  private static groupItemsBySeller(cartItems: CartItem[]): Record<string, UnifiedShippingItem[]> {
    const grouped: Record<string, UnifiedShippingItem[]> = {};
    
    // Validar entrada
    if (!Array.isArray(cartItems)) {
      console.error('❌ groupItemsBySeller: entrada não é um array', cartItems);
      return grouped;
    }
    
    for (const item of cartItems) {
      if (!grouped[item.sellerId]) {
        grouped[item.sellerId] = [];
      }
      
      grouped[item.sellerId].push({
        product: item.product,
        product_id: item.product.id,
        quantity: item.quantity,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        weight: (item.product as any).weight,
        price: item.product.price,
        category_id: (item.product as any).category_id,
        height: (item.product as any).height,
        width: (item.product as any).width,
        length: (item.product as any).length
      });
    }
    
    return grouped;
  }
  
  private static isPostalCodeInZone(postalCode: string, ranges: any[]): boolean {
    if (!ranges || !Array.isArray(ranges)) return false;
    
    const cep = parseInt(postalCode);
    
    for (const range of ranges) {
      const from = parseInt(range.from);
      const to = parseInt(range.to);
      
      if (cep >= from && cep <= to) {
        return true;
      }
    }
    
    return false;
  }
  
  private static generateOptionName(modalityName: string, days: number, pricingType: string): string {
    let name = modalityName;
    
    // Adicionar prazo
    if (days === 0) {
      name += ' - Entrega Hoje';
    } else if (days === 1) {
      name += ' - Entrega Amanhã';
    } else {
      name += ` - ${days} dias úteis`;
    }
    
    // Adicionar tipo de cobrança se for por item
    if (pricingType === 'per_item') {
      name += ' (por item)';
    }
    
    return name;
  }
  
  private static createErrorQuote(
    request: UnifiedShippingRequest,
    error: string
  ): UnifiedShippingQuote {
    return {
      sellerId: request.sellerId || 'global',
      sellerName: request.items[0]?.sellerName || 'Loja',
      items: request.items,
      options: [],
      totalWeight: 0,
      totalValue: 0,
      success: false,
      error
    };
  }
  
  // ============================================================================
  // MÉTODOS PÚBLICOS ADICIONAIS
  // ============================================================================
  
  /**
   * Obter opção mais barata
   */
  static getCheapestOption(options: UnifiedShippingOption[]): UnifiedShippingOption | null {
    if (!options || options.length === 0) return null;
    return options.reduce((cheapest, current) => 
      current.price < cheapest.price ? current : cheapest
    );
  }
  
  /**
   * Obter opção mais rápida
   */
  static getFastestOption(options: UnifiedShippingOption[]): UnifiedShippingOption | null {
    if (!options || options.length === 0) return null;
    return options.reduce((fastest, current) => 
      current.deliveryDays < fastest.deliveryDays ? current : fastest
    );
  }
  
  /**
   * Calcular total de frete do carrinho
   */
  static calculateCartShippingTotal(
    quotes: UnifiedShippingQuote[],
    selectedOptions: Record<string, string>
  ): {
    totalShipping: number;
    maxDeliveryDays: number;
    hasFreeShipping: boolean;
  } {
    let totalShipping = 0;
    let maxDeliveryDays = 0;
    let hasFreeShipping = false;
    
    for (const quote of quotes) {
      const selectedId = selectedOptions[quote.sellerId];
      if (!selectedId) continue;
      
      const option = quote.options.find(opt => opt.id === selectedId);
      if (option) {
        totalShipping += option.price;
        maxDeliveryDays = Math.max(maxDeliveryDays, option.deliveryDays);
        if (option.isFree) hasFreeShipping = true;
      }
    }
    
    return { totalShipping, maxDeliveryDays, hasFreeShipping };
  }
  
  /**
   * Validar CEP
   */
  static validatePostalCode(postalCode: string): boolean {
    const clean = postalCode.replace(/\D/g, '');
    return clean.length === 8;
  }
  
  /**
   * Formatar CEP
   */
  static formatPostalCode(postalCode: string): string {
    const clean = postalCode.replace(/\D/g, '');
    if (clean.length >= 5) {
      return clean.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }
    return clean;
  }

  /**
   * Buscar configurações de shipping dos produtos
   */
  static async getProductsShippingConfig(db: any, productIds: string[]): Promise<ProductShippingConfig[]> {
    console.log('📦 Buscando config de produtos via ModernShippingAdapter');
    return await ModernShippingAdapter.getProductsShippingConfig(db, productIds);
  }

  /**
   * Filtrar opções de shipping baseado nas configurações dos produtos
   */
  static filterUnifiedShippingOptions(
    options: UnifiedShippingOption[], 
    productsConfig: ProductShippingConfig[]
  ): UnifiedShippingOption[] {
    if (productsConfig.length === 0) return options;
    
    // Verificar quais métodos estão habilitados para TODOS os produtos
    const allProductsConfig = {
      shipping_pac: productsConfig.every(p => p.shipping_pac),
      shipping_sedex: productsConfig.every(p => p.shipping_sedex), 
      shipping_carrier: productsConfig.every(p => p.shipping_carrier),
      shipping_pickup: productsConfig.every(p => p.shipping_pickup)
    };
    
    console.log('🎯 Filtros unified shipping por produto:', allProductsConfig);
    
    return options.filter(option => {
      const modalityLower = option.modalityName.toLowerCase();
      
      // Mapear modalidades para campos de configuração
      if (modalityLower.includes('pac') || modalityLower.includes('econômic')) {
        return allProductsConfig.shipping_pac;
      }
      
      if (modalityLower.includes('sedex') || modalityLower.includes('express') || modalityLower.includes('rápid')) {
        return allProductsConfig.shipping_sedex;
      }
      
      if (modalityLower.includes('transportadora') || modalityLower.includes('premium')) {
        return allProductsConfig.shipping_carrier;
      }
      
      if (modalityLower.includes('retirada') || modalityLower.includes('pickup') || modalityLower.includes('loja')) {
        return allProductsConfig.shipping_pickup;
      }
      
      // Se não conseguir identificar, deixa passar (segurança)
      return true;
    });
  }
} 