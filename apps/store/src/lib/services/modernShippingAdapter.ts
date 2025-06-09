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
      // Buscar zonas no schema atual (sem carrier_id nas zones)
      const zones = await db.query`
        SELECT 
          z.id,
          z.name,
          z.states,
          z.cep_ranges,
          z.region,
          z.is_active
        FROM shipping_zones z
        WHERE z.is_active = true 
        AND z.name LIKE '%-%'
      `;
      
      // Filtrar por estado/região baseado no CEP
      const cepUF = this.getCEPState(cleanPostalCode);
      
      for (const zone of zones || []) {
        // Verificar se a zona atende o estado do CEP
        if (zone.states && zone.states.includes(cepUF)) {
          // Buscar dados do carrier via shipping_base_rates
          const carrierData = await db.queryOne`
            SELECT 
              sbr.carrier_id,
              sc.name as carrier_name,
              sc.description as carrier_type,
              MIN(sbr.min_delivery_days) as delivery_days_min,
              MAX(sbr.max_delivery_days) as delivery_days_max
            FROM shipping_base_rates sbr
            JOIN shipping_carriers sc ON sc.id = sbr.carrier_id
            WHERE sbr.zone_id = ${zone.id} 
            AND sbr.is_active = true
            AND sc.is_active = true
            GROUP BY sbr.carrier_id, sc.name, sc.description
            LIMIT 1
          `;
          
          return {
            zone_id: zone.id,
            zone_name: zone.name,
            uf: cepUF,
            carrier_id: carrierData?.carrier_id || null,
            carrier_name: carrierData?.carrier_name || 'Frenet',
            carrier_type: carrierData?.carrier_type || 'frenet',
            delivery_days_min: carrierData?.delivery_days_min || 1,
            delivery_days_max: carrierData?.delivery_days_max || 7
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
   * Buscar opções de frete usando nova estrutura (shipping_base_rates)
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
      // Buscar rates para a zona usando estrutura atual
      const rates = await db.query`
        SELECT 
          sbr.*,
          sc.name as carrier_name,
          sc.description as carrier_type
        FROM shipping_base_rates sbr
        JOIN shipping_carriers sc ON sc.id = sbr.carrier_id
        WHERE sbr.zone_id = ${zone.zone_id}
        AND sbr.is_active = true
        AND sc.is_active = true
        ORDER BY sbr.priority ASC, sbr.base_price ASC
      `;
      
      // Converter para formato compatível com sistema antigo
      const compatibleOptions = [];
      
      for (const rate of rates || []) {
        const modalityName = this.generateModalityNameByPriority(rate.priority, rate.carrier_name);
        
        const option = {
          modality_id: rate.id,
          modality_name: modalityName,
          modality_description: `Frete ${modalityName}`,
          modality_pricing_type: 'per_weight',
          modality_priority: rate.priority || 1,
          zone_id: zone.zone_id,
          calculated_weight_rules: this.convertToWeightRules(rate, totalWeight),
          calculated_delivery_days: Math.round((rate.min_delivery_days + rate.max_delivery_days) / 2),
          calculated_fees: {},
          weight_rules: this.convertToWeightRules(rate, totalWeight),
          additional_fees: {},
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
          ORDER BY priority ASC
          LIMIT 1
        `;
        
        if (config) {
          return {
            custom_price_multiplier: config.markup_percentage || 0,
            markup_percentage: config.markup_percentage || 0,
            free_shipping_threshold: config.free_shipping_threshold || 999999,
            free_shipping_products: config.free_shipping_products || [],
            free_shipping_categories: config.free_shipping_categories || [],
            max_weight_kg: config.max_weight_kg || 30,
            max_dimensions: config.max_dimensions
          };
        }
      }
      
      // Buscar configuração global (seller_id = NULL)
      const globalConfig = await db.queryOne`
        SELECT *
        FROM seller_shipping_configs
        WHERE seller_id IS NULL
        AND is_active = true
        ORDER BY priority ASC
        LIMIT 1
      `;
      
      if (globalConfig) {
        return {
          custom_price_multiplier: globalConfig.markup_percentage || 0,
          markup_percentage: globalConfig.markup_percentage || 0,
          free_shipping_threshold: globalConfig.free_shipping_threshold || 999999,
          free_shipping_products: globalConfig.free_shipping_products || [],
          free_shipping_categories: globalConfig.free_shipping_categories || [],
          max_weight_kg: globalConfig.max_weight_kg || 30,
          max_dimensions: globalConfig.max_dimensions
        };
      }
      
      // Fallback final - sem frete grátis
      return {
        custom_price_multiplier: 0,
        markup_percentage: 0,
        free_shipping_threshold: 999999,
        free_shipping_products: [],
        free_shipping_categories: [],
        max_weight_kg: 30,
        max_dimensions: null
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar configuração:', error);
      return {
        custom_price_multiplier: 0,
        markup_percentage: 0,
        free_shipping_threshold: 999999,
        free_shipping_products: [],
        free_shipping_categories: [],
        max_weight_kg: 30,
        max_dimensions: null
      };
    }
  }
  
  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================
  
  /**
   * Determinar UF baseado no CEP
   */
  private static getCEPState(cep: string): string {
    const cepNum = parseInt(cep.substring(0, 2));
    
    // Mapeamento básico de CEP para UF
    const cepToUF: { [key: string]: string } = {
      '01': 'SP', '02': 'SP', '03': 'SP', '04': 'SP', '05': 'SP', '06': 'SP', '07': 'SP', '08': 'SP', '09': 'SP', '10': 'SP',
      '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
      '20': 'RJ', '21': 'RJ', '22': 'RJ', '23': 'RJ', '24': 'RJ', '25': 'RJ', '26': 'RJ', '27': 'RJ', '28': 'RJ',
      '30': 'MG', '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '36': 'MG', '37': 'MG', '38': 'MG', '39': 'MG',
      '40': 'BA', '41': 'PR', '42': 'SC', '43': 'PR', '44': 'BA', '45': 'BA', '46': 'BA', '47': 'BA', '48': 'BA', '49': 'SE',
      '50': 'PE', '51': 'PE', '52': 'PE', '53': 'PE', '54': 'PE', '55': 'PE', '56': 'PE', '57': 'AL', '58': 'PB', '59': 'PB',
      '60': 'CE', '61': 'CE', '62': 'CE', '63': 'CE', '64': 'PI', '65': 'MT', '66': 'MT', '67': 'MT', '68': 'AC', '69': 'RO',
      '70': 'DF', '71': 'DF', '72': 'GO', '73': 'GO', '74': 'GO', '75': 'GO', '76': 'GO', '77': 'GO', '78': 'MT', '79': 'MS',
      '80': 'PR', '81': 'PR', '82': 'PR', '83': 'PR', '84': 'PR', '85': 'PR', '86': 'PR', '87': 'PR', '88': 'SC', '89': 'SC',
      '90': 'RS', '91': 'RS', '92': 'RS', '93': 'RS', '94': 'RS', '95': 'RS', '96': 'RS', '97': 'RS', '98': 'RS', '99': 'RS'
    };
    
    const prefix = cep.substring(0, 2);
    return cepToUF[prefix] || 'SP'; // Default SP
  }
  
  /**
   * Converter shipping_base_rate para formato de weight_rules compatível
   */
  private static convertToWeightRules(rate: any, requestedWeight: number): any[] {
    // Calcular preço baseado no peso e configurações da rate
    const basePrice = parseFloat(rate.base_price || 15.90);
    const pricePerKg = parseFloat(rate.price_per_kg || 0);
    const minWeight = parseFloat(rate.min_weight || 0);
    const maxWeight = parseFloat(rate.max_weight || 30);
    
    // CORRIGIDO: Peso já vem em gramas do banco
    const weightKg = requestedWeight / 1000;
    
    // Calcular preço final
    let finalPrice = basePrice;
    if (weightKg > 1 && pricePerKg > 0) {
      finalPrice = basePrice + (weightKg - 1) * pricePerKg;
    }
    
    // Aplicar limites
    finalPrice = Math.max(finalPrice, basePrice);
    
    // Retornar regras simples baseadas no peso solicitado
    return [
      { 
        from: 0, 
        to: Math.max(requestedWeight, 1000), 
        price: Math.round(finalPrice * 100) / 100 
      }
    ];
  }
  
  /**
   * Gerar nome da modalidade baseado na prioridade
   */
  private static generateModalityNameByPriority(priority: number, carrierName: string): string {
    switch (priority) {
      case 1: return `${carrierName} Expressa`;
      case 2: return `${carrierName} Padrão`;
      case 3: return `${carrierName} Econômica`;
      default: return `${carrierName} Normal`;
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