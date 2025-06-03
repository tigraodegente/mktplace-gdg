// =====================================================
// FACTORY PATTERN PARA SHIPPING PROVIDERS
// =====================================================

import type { 
  IShippingProvider, 
  ShippingProvider, 
  ShippingProviderConfig 
} from '$lib/types/shipping';

import { CubboProvider } from './providers/cubbo-provider';
import { CorreiosProvider } from './providers/correios-provider';

// =====================================================
// REGISTRY DE PROVIDERS DISPONÍVEIS
// =====================================================

type ProviderConstructor = new (config: ShippingProviderConfig) => IShippingProvider;

const PROVIDER_REGISTRY: Record<ShippingProvider, ProviderConstructor> = {
  cubbo: CubboProvider,
  correios: CorreiosProvider,
  // Futuras transportadoras ficam fáceis de adicionar:
  jadlog: CorreiosProvider, // Pode reusar o mesmo provider se API for similar
  azul: CorreiosProvider,   // Ou criar provider específico
  total: CorreiosProvider
};

// =====================================================
// FACTORY CLASS
// =====================================================

export class ShippingProviderFactory {
  /**
   * Criar instância de provider específico
   */
  static createProvider(
    providerName: ShippingProvider, 
    config: ShippingProviderConfig
  ): IShippingProvider {
    const ProviderClass = PROVIDER_REGISTRY[providerName];
    
    if (!ProviderClass) {
      throw new Error(`Provider '${providerName}' não está registrado`);
    }
    
    return new ProviderClass(config);
  }

  /**
   * Listar todos os providers disponíveis
   */
  static getAvailableProviders(): ShippingProvider[] {
    return Object.keys(PROVIDER_REGISTRY) as ShippingProvider[];
  }

  /**
   * Verificar se provider está disponível
   */
  static isProviderAvailable(providerName: string): providerName is ShippingProvider {
    return providerName in PROVIDER_REGISTRY;
  }

  /**
   * Registrar novo provider dinamicamente (para extensibilidade)
   */
  static registerProvider(
    name: ShippingProvider, 
    providerClass: ProviderConstructor
  ): void {
    PROVIDER_REGISTRY[name] = providerClass;
    console.log(`[SHIPPING] Provider '${name}' registrado com sucesso`);
  }

  /**
   * Criar múltiplos providers (para fallback)
   */
  static createProviders(
    configs: Record<ShippingProvider, ShippingProviderConfig>
  ): Record<ShippingProvider, IShippingProvider> {
    const providers: Record<string, IShippingProvider> = {};
    
    for (const [providerName, config] of Object.entries(configs)) {
      if (this.isProviderAvailable(providerName) && config.enabled) {
        try {
          providers[providerName] = this.createProvider(
            providerName as ShippingProvider, 
            config
          );
          console.log(`[SHIPPING] Provider '${providerName}' inicializado`);
        } catch (error) {
          console.error(`[SHIPPING] Erro ao inicializar provider '${providerName}':`, error);
        }
      }
    }
    
    return providers as Record<ShippingProvider, IShippingProvider>;
  }

  /**
   * Validar configuração de provider
   */
  static async validateProviderConfig(
    providerName: ShippingProvider, 
    config: ShippingProviderConfig
  ): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const provider = this.createProvider(providerName, config);
      const isValid = await provider.validateConfig();
      
      return {
        valid: isValid,
        error: isValid ? undefined : 'Configuração inválida ou API indisponível'
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Criar provider com configuração automática baseada no ambiente
   */
  static createProviderFromEnv(providerName: ShippingProvider): IShippingProvider {
    const envPrefix = providerName.toUpperCase();
    
    const config: ShippingProviderConfig = {
      name: providerName,
      enabled: process.env[`SHIPPING_${envPrefix}_ENABLED`] === 'true',
      api_url: process.env[`SHIPPING_${envPrefix}_API_URL`] || '',
      api_key: process.env[`SHIPPING_${envPrefix}_API_KEY`],
      store_id: process.env[`SHIPPING_${envPrefix}_STORE_ID`],
      timeout: parseInt(process.env[`SHIPPING_${envPrefix}_TIMEOUT`] || '30000'),
      retry_attempts: parseInt(process.env[`SHIPPING_${envPrefix}_RETRY_ATTEMPTS`] || '3'),
      retry_delay: parseInt(process.env[`SHIPPING_${envPrefix}_RETRY_DELAY`] || '5000'),
      test_mode: process.env[`SHIPPING_${envPrefix}_TEST_MODE`] === 'true',
      webhook_url: process.env[`SHIPPING_${envPrefix}_WEBHOOK_URL`],
      settings: {}
    };

    if (!config.enabled) {
      throw new Error(`Provider '${providerName}' está desabilitado`);
    }

    if (!config.api_url) {
      throw new Error(`API URL não configurada para provider '${providerName}'`);
    }

    return this.createProvider(providerName, config);
  }
}

// =====================================================
// HELPER PARA DEBUGGING
// =====================================================

export class ShippingProviderDebugger {
  /**
   * Testar conectividade de todos os providers
   */
  static async testAllProviders(
    configs: Record<ShippingProvider, ShippingProviderConfig>
  ): Promise<Record<ShippingProvider, { success: boolean; error?: string }>> {
    const results: Record<string, { success: boolean; error?: string }> = {};
    
    for (const [providerName, config] of Object.entries(configs)) {
      if (config.enabled) {
        const validation = await ShippingProviderFactory.validateProviderConfig(
          providerName as ShippingProvider, 
          config
        );
        
        results[providerName] = {
          success: validation.valid,
          error: validation.error
        };
      } else {
        results[providerName] = {
          success: false,
          error: 'Provider desabilitado'
        };
      }
    }
    
    return results as Record<ShippingProvider, { success: boolean; error?: string }>;
  }

  /**
   * Log de configuração detalhada
   */
  static logProviderConfig(providerName: ShippingProvider, config: ShippingProviderConfig): void {
    console.log(`[SHIPPING:DEBUG] Configuração do provider '${providerName}':`, {
      enabled: config.enabled,
      api_url: config.api_url ? '***configurada***' : 'NÃO CONFIGURADA',
      api_key: config.api_key ? '***configurada***' : 'NÃO CONFIGURADA',
      store_id: config.store_id || 'não definido',
      timeout: config.timeout,
      retry_attempts: config.retry_attempts,
      test_mode: config.test_mode
    });
  }
} 