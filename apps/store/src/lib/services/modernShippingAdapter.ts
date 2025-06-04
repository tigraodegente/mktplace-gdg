/**
 * Modern Shipping Adapter
 * 
 * Adaptador que permite ao UnifiedShippingService usar a nova estrutura de banco
 * mantendo 100% de compatibilidade com a interface existente da Store
 */

import type { 
  UnifiedShippingItem,
  UnifiedShippingOption,
  UnifiedShippingQuote,
  UnifiedShippingRequest 
} from './unifiedShippingService.types';

/**
 * Adaptador para buscar dados usando a nova estrutura de tabelas
 */
export class ModernShippingAdapter {
  
  /**
   * Buscar zona por CEP usando nova estrutura
   */
  static async findZoneByPostalCode(db: any, postalCode: string): Promise<any> {
    const cleanPostalCode = postalCode.replace(/\D/g, '').padStart(8, '0');
    
    try {
      // Buscar nas novas tabelas
      const zones = await db.query`
        SELECT 
          z.id,
          z.name,
          z.uf,
          z.postal_code_ranges,
          z.delivery_days_min,
          z.delivery_days_max,
          c.id as carrier_id,
          c.name as carrier_name,
          c.type as carrier_type
        FROM shipping_zones z
        INNER JOIN shipping_carriers c ON c.id = z.carrier_id
        WHERE z.is_active = true 
        AND c.is_active = true
      `;
      
      // Filtrar por CEP nas faixas
      for (const zone of zones || []) {
        if (this.isPostalCodeInZone(cleanPostalCode, zone.postal_code_ranges)) {
          return {
            zone_id: zone.id,
            zone_name: zone.name,
            uf: zone.uf,
            carrier_id: zone.carrier_id,
            carrier_name: zone.carrier_name,
            carrier_type: zone.carrier_type,
            delivery_days_min: zone.delivery_days_min,
            delivery_days_max: zone.delivery_days_max
          };
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Erro ao buscar zona:', error);
      return null;
    }
  }
  
  /**
   * Buscar opções de frete usando nova estrutura (shipping_rates)
   */
  static async getShippingOptions(
    db: any,
    zone: any,
    sellerId: string | undefined,
    totalWeight: number,
    totalValue: number,
    items: UnifiedShippingItem[]
  ): Promise<any[]> {
    
    try {
      // Buscar rates para a zona usando nova estrutura
      const rates = await db.query`
        SELECT 
          r.*,
          c.name as carrier_name,
          c.type as carrier_type
        FROM shipping_rates r
        INNER JOIN shipping_zones z ON z.id = r.zone_id
        INNER JOIN shipping_carriers c ON c.id = z.carrier_id
        WHERE r.zone_id = ${zone.zone_id}
        AND r.is_active = true
        AND c.is_active = true
        ORDER BY r.base_price
      `;
      
      // Converter para formato compatível com sistema antigo
      const compatibleOptions = [];
      
      for (const rate of rates || []) {
        // Simular modalidade baseada na rate
        const modalityType = rate.price_per_kg > 0 ? 'per_shipment' : 'fixed';
        
        const option = {
          modality_id: rate.id,
          modality_name: this.generateModalityName(rate, zone.carrier_name),
          modality_description: `Frete via ${zone.carrier_name}`,
          modality_pricing_type: modalityType,
          modality_priority: 1,
          zone_id: zone.zone_id,
          calculated_weight_rules: this.convertToWeightRules(rate),
          calculated_delivery_days: zone.delivery_days_min || 5,
          calculated_fees: rate.additional_fees || {},
          weight_rules: this.convertToWeightRules(rate),
          additional_fees: rate.additional_fees || {},
          is_active: true
        };
        
        compatibleOptions.push(option);
      }
      
      return compatibleOptions;
      
    } catch (error) {
      console.error('❌ Erro ao buscar opções de frete:', error);
      return [];
    }
  }
  
  /**
   * Buscar configurações do seller usando nova estrutura
   */
  static async getShippingConfig(
    db: any,
    modalityId: string,
    sellerId?: string,
    zoneId?: string
  ): Promise<any> {
    
    try {
      // Buscar configuração específica do seller
      if (sellerId) {
        const config = await db.queryOne`
          SELECT *
          FROM seller_shipping_configs
          WHERE seller_id = ${sellerId}
          AND is_active = true
          AND is_enabled = true
          ORDER BY priority ASC
          LIMIT 1
        `;
        
        if (config) {
          return {
            custom_price_multiplier: config.markup_percentage,
            markup_percentage: config.markup_percentage,
            free_shipping_threshold: config.free_shipping_threshold,
            free_shipping_products: config.free_shipping_products || [],
            free_shipping_categories: config.free_shipping_categories || [],
            max_weight_kg: config.max_weight_kg,
            max_dimensions: config.max_dimensions
          };
        }
      }
      
      // Buscar configuração padrão
      const defaultConfig = await db.queryOne`
        SELECT *
        FROM seller_shipping_configs
        WHERE seller_id = 'default' OR seller_id = 'system'
        AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      if (defaultConfig) {
        return {
          custom_price_multiplier: defaultConfig.markup_percentage || 0,
          markup_percentage: defaultConfig.markup_percentage || 0,
          free_shipping_threshold: defaultConfig.free_shipping_threshold || 100,
          free_shipping_products: defaultConfig.free_shipping_products || [],
          free_shipping_categories: defaultConfig.free_shipping_categories || [],
          max_weight_kg: defaultConfig.max_weight_kg || 30,
          max_dimensions: defaultConfig.max_dimensions
        };
      }
      
      // Fallback para valores padrão
      return {
        custom_price_multiplier: 0,
        markup_percentage: 0,
        free_shipping_threshold: 100,
        free_shipping_products: [],
        free_shipping_categories: [],
        max_weight_kg: 30,
        max_dimensions: null
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar configuração:', error);
      return {};
    }
  }
  
  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================
  
  /**
   * Verificar se CEP está na zona (mesmo método do sistema antigo)
   */
  private static isPostalCodeInZone(postalCode: string, ranges: any[]): boolean {
    if (!ranges || !Array.isArray(ranges)) return false;
    
    const postal = parseInt(postalCode);
    
    for (const range of ranges) {
      if (range.from && range.to) {
        const from = parseInt(range.from.toString().padStart(8, '0'));
        const to = parseInt(range.to.toString().padStart(8, '0'));
        
        if (postal >= from && postal <= to) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Converter shipping_rate para formato de weight_rules compatível
   */
  private static convertToWeightRules(rate: any): any[] {
    const rules = [];
    
    // Se tem peso específico nas regras
    if (rate.weight_rules && Array.isArray(rate.weight_rules)) {
      return rate.weight_rules;
    }
    
    // Criar regras baseadas no preço base e por kg
    const basePrice = parseFloat(rate.base_price || 10);
    const pricePerKg = parseFloat(rate.price_per_kg || 5);
    
    // Criar faixas de peso padrão
    const weightRanges = [
      { from: 0, to: 1000, price: basePrice }, // até 1kg
      { from: 1001, to: 5000, price: basePrice + pricePerKg * 2 }, // 1-5kg
      { from: 5001, to: 10000, price: basePrice + pricePerKg * 5 }, // 5-10kg
      { from: 10001, to: 30000, price: basePrice + pricePerKg * 10 }, // 10-30kg
      { from: 30001, to: 50000, price: basePrice + pricePerKg * 20 } // 30-50kg
    ];
    
    return weightRanges;
  }
  
  /**
   * Gerar nome da modalidade baseado na rate
   */
  private static generateModalityName(rate: any, carrierName: string): string {
    const basePrice = parseFloat(rate.base_price || 0);
    const pricePerKg = parseFloat(rate.price_per_kg || 0);
    
    if (pricePerKg > basePrice) {
      return `${carrierName} - Econômico`;
    } else if (basePrice > 15) {
      return `${carrierName} - Expresso`;
    } else {
      return `${carrierName} - Padrão`;
    }
  }
  
  /**
   * Verificar compatibilidade com produto (mantém interface)
   */
  static async getProductsShippingConfig(db: any, productIds: string[]): Promise<any[]> {
    // Para manter compatibilidade, retornar configuração padrão
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
 * Cache de compatibilidade para métodos migrados
 */
export class CompatibilityCache {
  private static cache = new Map<string, { data: any; expiry: number }>();
  
  static set(key: string, data: any, ttlMinutes: number = 30): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMinutes * 60 * 1000
    });
  }
  
  static get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  static generateKey(method: string, params: any): string {
    return `${method}_${JSON.stringify(params)}`;
  }
} 