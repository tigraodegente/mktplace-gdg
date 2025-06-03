// =====================================================
// CONFIGURAÇÃO CENTRAL DO SISTEMA DE TRANSPORTADORAS
// =====================================================

import type { ShippingSystemConfig, ShippingProviderConfig } from '$lib/types/shipping';
import { env } from '$env/dynamic/private';

// =====================================================
// FUNÇÃO PARA CARREGAR CONFIGURAÇÃO DO AMBIENTE
// =====================================================

function loadProviderConfig(provider: string): ShippingProviderConfig {
  const envPrefix = provider.toUpperCase();
  
  return {
    name: provider as any,
    enabled: env[`SHIPPING_${envPrefix}_ENABLED`] === 'true',
    api_url: env[`SHIPPING_${envPrefix}_API_URL`] || '',
    api_key: env[`SHIPPING_${envPrefix}_API_KEY`],
    store_id: env[`SHIPPING_${envPrefix}_STORE_ID`],
    timeout: parseInt(env[`SHIPPING_${envPrefix}_TIMEOUT`] || '30000'),
    retry_attempts: parseInt(env[`SHIPPING_${envPrefix}_RETRY_ATTEMPTS`] || '3'),
    retry_delay: parseInt(env[`SHIPPING_${envPrefix}_RETRY_DELAY`] || '5000'),
    test_mode: env[`SHIPPING_${envPrefix}_TEST_MODE`] === 'true',
    webhook_url: env[`SHIPPING_${envPrefix}_WEBHOOK_URL`],
    settings: {}
  };
}

// =====================================================
// CONFIGURAÇÃO PRINCIPAL
// =====================================================

export const shippingConfig: ShippingSystemConfig = {
  enabled: env.SHIPPING_INTEGRATION_ENABLED === 'true',
  default_provider: (env.SHIPPING_DEFAULT_PROVIDER as any) || 'cubbo',
  fallback_provider: (env.SHIPPING_FALLBACK_PROVIDER as any) || undefined,
  max_retry_attempts: parseInt(env.SHIPPING_MAX_RETRY_ATTEMPTS || '3'),
  retry_intervals: env.SHIPPING_RETRY_INTERVALS?.split(',').map(Number) || [5, 30, 120], // minutos
  cache_ttl: parseInt(env.SHIPPING_CACHE_TTL || '30'), // minutos
  webhook_secret: env.SHIPPING_WEBHOOK_SECRET,
  providers: {
    cubbo: loadProviderConfig('cubbo'),
    correios: loadProviderConfig('correios'),
    jadlog: loadProviderConfig('jadlog'),
    azul: loadProviderConfig('azul'),
    total: loadProviderConfig('total')
  }
};

// =====================================================
// VALIDAÇÃO DE CONFIGURAÇÃO
// =====================================================

export function validateShippingConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar se sistema está habilitado
  if (!shippingConfig.enabled) {
    warnings.push('Sistema de integração de transportadoras está desabilitado');
  }

  // Verificar provider padrão
  if (!shippingConfig.providers[shippingConfig.default_provider]?.enabled) {
    errors.push(`Provider padrão '${shippingConfig.default_provider}' não está habilitado`);
  }

  // Verificar se pelo menos um provider está configurado
  const enabledProviders = Object.values(shippingConfig.providers)
    .filter(p => p.enabled && p.api_url && p.api_key);

  if (enabledProviders.length === 0) {
    errors.push('Nenhum provider está completamente configurado');
  }

  // Verificar configuração de retry
  if (shippingConfig.max_retry_attempts < 1 || shippingConfig.max_retry_attempts > 10) {
    warnings.push('max_retry_attempts deve estar entre 1 e 10');
  }

  if (shippingConfig.retry_intervals.length < shippingConfig.max_retry_attempts) {
    warnings.push('retry_intervals insuficientes para max_retry_attempts');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// =====================================================
// UTILITÁRIOS DE CONFIGURAÇÃO
// =====================================================

export function getEnabledProviders() {
  return Object.entries(shippingConfig.providers)
    .filter(([_, config]) => config.enabled && config.api_url && config.api_key)
    .map(([name, _]) => name);
}

export function isProviderEnabled(provider: string): boolean {
  return shippingConfig.providers[provider as keyof typeof shippingConfig.providers]?.enabled || false;
}

export function getProviderConfig(provider: string) {
  return shippingConfig.providers[provider as keyof typeof shippingConfig.providers];
}

// =====================================================
// LOGS DE INICIALIZAÇÃO
// =====================================================

export function logShippingConfiguration(): void {
  console.log('[SHIPPING:CONFIG] Configuração carregada:', {
    enabled: shippingConfig.enabled,
    default_provider: shippingConfig.default_provider,
    fallback_provider: shippingConfig.fallback_provider,
    max_retry_attempts: shippingConfig.max_retry_attempts,
    retry_intervals: shippingConfig.retry_intervals,
    cache_ttl: shippingConfig.cache_ttl
  });

  const validation = validateShippingConfig();
  
  if (validation.errors.length > 0) {
    console.error('[SHIPPING:CONFIG] ❌ Erros de configuração:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('[SHIPPING:CONFIG] ⚠️ Avisos de configuração:', validation.warnings);
  }

  const enabledProviders = getEnabledProviders();
  console.log(`[SHIPPING:CONFIG] Providers habilitados: ${enabledProviders.join(', ') || 'nenhum'}`);
} 