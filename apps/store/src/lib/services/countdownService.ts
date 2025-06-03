import type { CountdownData } from '../../routes/api/countdown/+server';

/**
 * Countdown Service - Gerencia dados dinâmicos de countdown de campanhas
 * Implementa cache, fallbacks e gerenciamento de estado
 */
class CountdownService {
  private cache: {
    data: CountdownData | null;
    timestamp: number;
  } | null = null;

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private currentRequest: Promise<CountdownData | null> | null = null;

  /**
   * Busca dados do countdown ativo
   * Com cache de 5 minutos e deduplicação de requests
   */
  private async fetchCountdown(): Promise<CountdownData | null> {
    // Deduplicação: se já há uma request em andamento, aguarda ela
    if (this.currentRequest) {
      return this.currentRequest;
    }

    this.currentRequest = this.performFetch();
    
    try {
      const result = await this.currentRequest;
      return result;
    } finally {
      this.currentRequest = null;
    }
  }

  private async performFetch(): Promise<CountdownData | null> {
    try {
      const response = await fetch('/api/countdown', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        console.warn(`Countdown API retornou ${response.status}`);
        return this.getFallbackCountdown();
      }

      const result = await response.json();
      
      if (!result.success) {
        console.warn('Countdown API retornou erro:', result.error);
        return result.data || this.getFallbackCountdown();
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar countdown:', error);
      return this.getFallbackCountdown();
    }
  }

  /**
   * Obtém countdown ativo com cache
   */
  async getActiveCountdown(): Promise<CountdownData | null> {
    // Verificar cache
    if (this.cache && (Date.now() - this.cache.timestamp) < this.CACHE_TTL) {
      return this.cache.data;
    }

    // Buscar dados frescos
    const countdownData = await this.fetchCountdown();
    
    // Atualizar cache
    this.cache = {
      data: countdownData,
      timestamp: Date.now()
    };

    return countdownData;
  }

  /**
   * Pré-carrega dados em background (não bloqueia UI)
   */
  prefetch(): void {
    // Só pré-carregar se não há cache válido
    if (!this.cache || (Date.now() - this.cache.timestamp) >= this.CACHE_TTL) {
      this.fetchCountdown().catch(() => {
        // Silenciar erros do prefetch
      });
    }
  }

  /**
   * Limpa cache e força refresh na próxima chamada
   */
  invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Dados de fallback quando API falha
   */
  private getFallbackCountdown(): CountdownData {
    return {
      id: 'fallback',
      name: 'Mega Promoção',
      text: '⚡ Mega promoção termina em:',
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      isActive: true,
      priority: 1
    };
  }

  /**
   * Verifica se um countdown ainda é válido (não expirou)
   */
  isValidCountdown(countdown: CountdownData | null): boolean {
    if (!countdown || !countdown.isActive) return false;
    
    const endTime = new Date(countdown.endTime);
    return endTime.getTime() > Date.now();
  }

  /**
   * Obtém status do cache
   */
  getCacheInfo() {
    if (!this.cache) {
      return { cached: false, age: 0 };
    }
    
    const age = Date.now() - this.cache.timestamp;
    return {
      cached: true,
      age,
      valid: age < this.CACHE_TTL,
      data: this.cache.data
    };
  }
}

// Singleton instance
export const countdownService = new CountdownService();

// Export types
export type { CountdownData }; 