/**
 * Universal Shipping Service
 * 
 * Calcula frete real usando dados Frenet + outras transportadoras
 * Suporte a frete grátis por produto, seller e global
 */

import type { Product } from '@mktplace/shared-types';
import { withDatabase } from '$lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface ShippingItem {
  product: Product;
  quantity: number;
  sellerId: string;
  sellerName: string;
}

export interface ShippingOption {
  id: string;
  carrierId: string;
  carrierName: string;
  name: string;
  price: number;
  originalPrice: number;  // Preço antes de descontos
  isFree: boolean;
  freeReason?: string;    // Motivo do frete grátis
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  items: ShippingItem[];
  breakdown: ShippingBreakdown;
}

export interface ShippingBreakdown {
  basePrice: number;
  markup: number;
  taxes: Record<string, number>;
  discounts: Record<string, number>;
  freeShippingDiscount: number;
}

export interface ShippingQuote {
  sellerId: string;
  sellerName: string;
  options: ShippingOption[];
  totalWeight: number;
  totalValue: number;
  hasRestrictions: boolean;
  restrictions?: string[];
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class UniversalShippingService {
  
  /**
   * Calcular opções de frete para um seller específico
   */
  static async calculateShippingForSeller(
    platform: any,
    sellerId: string,
    postalCode: string,
    items: ShippingItem[]
  ): Promise<ShippingQuote> {
    
    return await withDatabase(platform, async (db) => {
      console.log(`🚛 Calculando frete para seller ${sellerId}, CEP ${postalCode}`);
      
      // 1. Buscar configurações do seller (com fallback global)
      const configs = await this.getSellerShippingConfigs(db, sellerId);
      console.log(`⚙️ Encontradas ${configs.length} configurações:`, configs.map((c: any) => c.carrier_name));
      
      // 2. Calcular peso e valor totais
      const totalWeight = this.calculateEffectiveWeight(items);
      const totalValue = this.calculateTotalValue(items);
      console.log(`📦 Peso efetivo: ${(totalWeight/1000).toFixed(2)}kg, Valor total: R$ ${totalValue.toFixed(2)}`);
      
      // 3. Buscar zonas de frete disponíveis
      const zones = await this.findShippingZones(db, postalCode, configs);
      console.log(`🗺️ Encontradas ${zones.length} zonas de frete:`, zones.map((z: any) => z.zone_name));
      
      // 4. Calcular opções para cada zona/carrier
      const options: ShippingOption[] = [];
      
      for (const zone of zones) {
        console.log(`💰 Calculando para zona: ${zone.zone_name}`);
        const option = await this.calculateShippingOption(
          db, zone, items, totalWeight, totalValue, sellerId
        );
        
        if (option) {
          console.log(`✅ Opção criada: ${option.name} - R$ ${option.price.toFixed(2)}`);
          options.push(option);
        } else {
          console.log(`❌ Falha ao criar opção para ${zone.zone_name}`);
        }
      }
      
      // 5. Ordenar por preço e prazo
      options.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        if (a.price !== b.price) return a.price - b.price;
        return a.deliveryDaysMin - b.deliveryDaysMin;
      });
      
      console.log(`🎯 Total de ${options.length} opções geradas`);
      
      return {
        sellerId,
        sellerName: items[0]?.sellerName || 'Seller',
        options,
        totalWeight,
        totalValue,
        hasRestrictions: false,
        restrictions: []
      };
    });
  }
  
  /**
   * Calcular opções de frete para múltiplos sellers (carrinho completo)
   */
  static async calculateShippingForCart(
    platform: any,
    postalCode: string,
    itemsBySeller: Record<string, ShippingItem[]>
  ): Promise<ShippingQuote[]> {
    
    const quotes: ShippingQuote[] = [];
    
    // Calcular frete para cada seller independentemente
    for (const [sellerId, items] of Object.entries(itemsBySeller)) {
      const quote = await this.calculateShippingForSeller(
        platform, sellerId, postalCode, items
      );
      quotes.push(quote);
    }
    
    return quotes;
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  /**
   * Buscar configurações de frete do seller (com fallback global)
   */
  private static async getSellerShippingConfigs(db: any, sellerId: string) {
    const query = `
      SELECT 
        ssc.*,
        sc.name as carrier_name,
        sc.type as carrier_type,
        sz.name as zone_name,
        sz.uf,
        sz.postal_code_ranges,
        sz.delivery_days_min,
        sz.delivery_days_max,
        sr.weight_rules,
        sr.additional_fees
      FROM seller_shipping_configs ssc
      JOIN shipping_carriers sc ON ssc.carrier_id = sc.id
      LEFT JOIN shipping_zones sz ON ssc.zone_id = sz.id
      LEFT JOIN shipping_rates sr ON sz.id = sr.zone_id
      WHERE ssc.is_enabled = true 
        AND sc.is_active = true
        AND (ssc.seller_id = $1 OR ssc.seller_id IS NULL)
      ORDER BY 
        CASE WHEN ssc.seller_id = $1 THEN 0 ELSE 1 END,  -- Seller específico primeiro
        ssc.priority ASC
    `;
    
    const result = await db.query(query, [sellerId]);
    console.log(`🔍 Query configs retornou ${result.length} registros`);
    return result;
  }
  
  /**
   * Buscar zonas de frete por CEP
   */
  private static async findShippingZones(db: any, postalCode: string, configs: any[]) {
    const carrierIds = configs.map(c => c.carrier_id);
    
    if (carrierIds.length === 0) {
      console.log('❌ Nenhum carrier ID encontrado');
      return [];
    }
    
    console.log(`🔍 Buscando zonas para carriers: ${carrierIds.join(', ')}`);
    
    const query = `
      SELECT DISTINCT
        sz.*,
        sc.name as carrier_name,
        sc.type as carrier_type,
        sr.weight_rules,
        sr.additional_fees,
        ssc.markup_percentage,
        ssc.free_shipping_threshold,
        ssc.free_shipping_products,
        ssc.free_shipping_categories
      FROM shipping_zones sz
      JOIN shipping_carriers sc ON sz.carrier_id = sc.id
      JOIN shipping_rates sr ON sz.id = sr.zone_id
      LEFT JOIN seller_shipping_configs ssc ON sz.carrier_id = ssc.carrier_id
      WHERE sz.is_active = true
        AND sc.is_active = true
        AND sz.carrier_id = ANY($2)
        AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(sz.postal_code_ranges) as range
          WHERE $1 BETWEEN (range->>'from') AND (range->>'to')
        )
      ORDER BY sz.delivery_days_min ASC
    `;
    
    const result = await db.query(query, [postalCode, carrierIds]);
    console.log(`🗺️ Query zonas retornou ${result.length} registros`);
    return result;
  }
  
  /**
   * Calcular opção de frete específica
   */
  private static async calculateShippingOption(
    db: any,
    zone: any,
    items: ShippingItem[],
    totalWeight: number,
    totalValue: number,
    sellerId: string
  ): Promise<ShippingOption | null> {
    
    try {
      console.log(`💰 Calculando opção para zona ${zone.zone_name}, peso ${totalWeight}g`);
      
      // 1. Calcular preço base por peso
      const basePrice = this.calculatePriceByWeight(totalWeight, zone.weight_rules);
      console.log(`💵 Preço base calculado: R$ ${basePrice?.toFixed(2) || 'null'}`);
      
      if (basePrice === null) {
        console.log(`❌ Não foi possível calcular preço para peso ${totalWeight}g`);
        return null;
      }
      
      // 2. Aplicar markup do seller
      const markup = basePrice * (zone.markup_percentage || 0) / 100;
      console.log(`📈 Markup aplicado: ${zone.markup_percentage || 0}% = R$ ${markup.toFixed(2)}`);
      
      // 3. Calcular taxas adicionais
      const taxes = this.calculateAdditionalFees(basePrice + markup, zone.additional_fees);
      console.log(`💸 Taxas adicionais: R$ ${taxes.total.toFixed(2)}`);
      
      // 4. Preço total antes de descontos
      const originalPrice = basePrice + markup + taxes.total;
      console.log(`🏷️ Preço original: R$ ${originalPrice.toFixed(2)}`);
      
      // 5. Verificar frete grátis
      const freeShippingResult = this.checkFreeShipping(
        items, totalValue, zone, sellerId
      );
      console.log(`🎁 Frete grátis: ${freeShippingResult.isFree ? 'SIM' : 'NÃO'} - ${freeShippingResult.reason || 'N/A'}`);
      
      // 6. Calcular preço final
      const finalPrice = freeShippingResult.isFree ? 0 : originalPrice;
      
      // 7. Criar breakdown
      const breakdown: ShippingBreakdown = {
        basePrice,
        markup,
        taxes: taxes.breakdown,
        discounts: {},
        freeShippingDiscount: freeShippingResult.isFree ? originalPrice : 0
      };
      
      const option = {
        id: `${zone.carrier_id}-${zone.id}`,
        carrierId: zone.carrier_id,
        carrierName: zone.carrier_name,
        name: this.generateOptionName(zone),
        price: finalPrice,
        originalPrice,
        isFree: freeShippingResult.isFree,
        freeReason: freeShippingResult.reason,
        deliveryDaysMin: zone.delivery_days_min,
        deliveryDaysMax: zone.delivery_days_max,
        items,
        breakdown
      };
      
      console.log(`✅ Opção criada com sucesso: ${option.name} - R$ ${option.price.toFixed(2)}`);
      return option;
      
    } catch (error) {
      console.error('❌ Erro ao calcular opção de frete:', error);
      return null;
    }
  }
  
  /**
   * Calcular preço por faixa de peso
   */
  private static calculatePriceByWeight(weightGrams: number, weightRules: any): number | null {
    console.log(`⚖️ Calculando preço para ${weightGrams}g usando regras:`, weightRules);
    
    if (!weightRules || !Array.isArray(weightRules)) {
      console.log('❌ Regras de peso inválidas');
      return null;
    }
    
    for (const rule of weightRules) {
      if (weightGrams >= rule.from && weightGrams <= rule.to) {
        console.log(`✅ Faixa encontrada: ${rule.from}g-${rule.to}g = R$ ${rule.price}`);
        return rule.price;
      }
    }
    
    console.log(`❌ Nenhuma faixa de peso encontrada para ${weightGrams}g`);
    return null;
  }
  
  /**
   * Calcular taxas adicionais (GRIS, ADV, etc.)
   */
  private static calculateAdditionalFees(baseAmount: number, feesConfig: any) {
    const breakdown: Record<string, number> = {};
    let total = 0;
    
    if (!feesConfig) return { breakdown, total };
    
    // GRIS
    if (feesConfig.gris_percent) {
      const gris = Math.max(
        baseAmount * feesConfig.gris_percent / 100,
        feesConfig.gris_min || 0
      );
      breakdown.gris = gris;
      total += gris;
    }
    
    // ADV
    if (feesConfig.adv_percent) {
      const adv = Math.max(
        baseAmount * feesConfig.adv_percent / 100,
        feesConfig.adv_min || 0
      );
      breakdown.adv = adv;
      total += adv;
    }
    
    // Outras taxas fixas
    const fixedFees = ['pedagio', 'despacho', 'suframa', 'tas'];
    for (const fee of fixedFees) {
      if (feesConfig[fee]) {
        breakdown[fee] = feesConfig[fee];
        total += feesConfig[fee];
      }
    }
    
    return { breakdown, total };
  }
  
  /**
   * Verificar se aplica frete grátis (MÚLTIPLOS NÍVEIS)
   */
  private static checkFreeShipping(
    items: ShippingItem[],
    totalValue: number,
    zone: any,
    sellerId: string
  ): { isFree: boolean; reason?: string } {
    
    // 1. FRETE GRÁTIS POR PRODUTO
    const freeShippingProducts = zone.free_shipping_products || [];
    for (const item of items) {
      if (freeShippingProducts.includes(item.product.id)) {
        return {
          isFree: true,
          reason: `Produto "${item.product.name}" tem frete grátis`
        };
      }
    }
    
    // 2. FRETE GRÁTIS POR CATEGORIA
    const freeShippingCategories = zone.free_shipping_categories || [];
    for (const item of items) {
      if (freeShippingCategories.includes(item.product.category_id)) {
        return {
          isFree: true,
          reason: `Categoria tem frete grátis`
        };
      }
    }
    
    // 3. FRETE GRÁTIS POR VALOR (SELLER/GLOBAL)
    if (zone.free_shipping_threshold && totalValue >= zone.free_shipping_threshold) {
      return {
        isFree: true,
        reason: `Frete grátis acima de R$ ${zone.free_shipping_threshold.toFixed(2)}`
      };
    }
    
    return { isFree: false };
  }
  
  /**
   * Gerar nome da opção baseado no carrier e prazo
   */
  private static generateOptionName(zone: any): string {
    const carrierName = zone.carrier_name;
    const days = zone.delivery_days_min;
    
    if (days === 0) return `${carrierName} - Entrega Hoje`;
    if (days === 1) return `${carrierName} - Entrega Amanhã`;
    if (days <= 2) return `${carrierName} - Expresso`;
    if (days <= 5) return `${carrierName} - Padrão`;
    return `${carrierName} - Econômico`;
  }
  
  /**
   * Calcular peso total dos itens
   */
  private static calculateTotalWeight(items: ShippingItem[]): number {
    return items.reduce((total, item) => {
      const weight = (item.product as any).weight || 0.5; // Default 500g
      return total + (weight * 1000 * item.quantity); // Converter para gramas
    }, 0);
  }
  
  /**
   * Calcular volume total dos itens (em cm³)
   */
  private static calculateTotalVolume(items: ShippingItem[]): number {
    return items.reduce((total, item) => {
      const product = item.product as any;
      const height = product.height || 10; // cm
      const width = product.width || 10;   // cm 
      const length = product.length || 10; // cm
      const volume = height * width * length; // cm³
      return total + (volume * item.quantity);
    }, 0);
  }
  
  /**
   * Calcular peso cubado (volume/6000 para aéreo, volume/5000 para rodoviário)
   */
  private static calculateCubicWeight(volume: number, transportType: 'aereo' | 'rodoviario' = 'rodoviario'): number {
    const divisor = transportType === 'aereo' ? 6000 : 5000;
    return volume / divisor; // kg
  }
  
  /**
   * Calcular peso efetivo (maior entre peso real e peso cubado)
   */
  private static calculateEffectiveWeight(items: ShippingItem[]): number {
    const realWeight = this.calculateTotalWeight(items) / 1000; // Converter para kg
    const totalVolume = this.calculateTotalVolume(items);
    const cubicWeight = this.calculateCubicWeight(totalVolume);
    
    // O peso efetivo é sempre o maior
    const effectiveWeight = Math.max(realWeight, cubicWeight);
    
    console.log(`📦 Cálculo de peso:`, {
      realWeight: `${realWeight.toFixed(2)}kg`,
      totalVolume: `${totalVolume.toFixed(0)}cm³`,
      cubicWeight: `${cubicWeight.toFixed(2)}kg`,
      effectiveWeight: `${effectiveWeight.toFixed(2)}kg`
    });
    
    return effectiveWeight * 1000; // Retornar em gramas para compatibilidade
  }
  
  /**
   * Calcular valor total dos itens
   */
  private static calculateTotalValue(items: ShippingItem[]): number {
    return items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }
} 