interface TopBarMessage {
  readonly id: string;
  readonly icon: 'payment' | 'shipping' | 'discount';
  readonly text: string;
  readonly link: string;
  readonly linkText: string;
}

interface TopBarResponse {
  success: boolean;
  data: TopBarMessage[];
  fallback?: boolean;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

class TopBarService {
  private cache: TopBarMessage[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly LOG_PREFIX = '[topbar_service]';

  /**
   * Get topbar messages from API with caching
   */
  async getMessages(): Promise<TopBarMessage[]> {
    console.log(`${this.LOG_PREFIX} Carregando mensagens da topbar...`);

    // Check cache first
    if (this.isCacheValid()) {
      console.log(`${this.LOG_PREFIX} ✅ Cache válido, retornando dados em cache`);
      return this.cache!;
    }

    try {
      const response = await fetch('/api/topbar', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TopBarResponse = await response.json();

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error('Invalid response format from topbar API');
      }

      // Update cache
      this.cache = result.data;
      this.cacheTimestamp = Date.now();

      if (result.fallback) {
        console.warn(`${this.LOG_PREFIX} ⚠️ Usando dados de fallback:`, result.error?.message);
      } else {
        console.log(`${this.LOG_PREFIX} ✅ ${result.data.length} mensagens carregadas do banco de dados`);
      }

      return result.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} ❌ Erro ao carregar mensagens:`, error);

      // Return cached data if available
      if (this.cache) {
        console.log(`${this.LOG_PREFIX} 🔄 Usando cache expirado como fallback`);
        return this.cache;
      }

      // Final fallback - static data
      console.log(`${this.LOG_PREFIX} 🚨 Usando dados estáticos como último recurso`);
      return this.getStaticFallback();
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache || !this.cacheTimestamp) {
      return false;
    }

    const now = Date.now();
    const cacheAge = now - this.cacheTimestamp;
    
    return cacheAge < this.CACHE_DURATION;
  }

  /**
   * Get static fallback messages
   */
  private getStaticFallback(): TopBarMessage[] {
    return [
      {
        id: 'static-1',
        icon: 'payment',
        text: 'Tudo em até 12X',
        link: '/promocoes',
        linkText: 'COMPRAR'
      },
      {
        id: 'static-2',
        icon: 'shipping',
        text: 'Frete Grátis acima de R$ 199',
        link: '/frete-gratis',
        linkText: 'APROVEITAR'
      },
      {
        id: 'static-3',
        icon: 'discount',
        text: '10% OFF na primeira compra',
        link: '/primeira-compra',
        linkText: 'USAR CUPOM'
      }
    ];
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    console.log(`${this.LOG_PREFIX} 🗑️ Cache limpo manualmente`);
    this.cache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Refresh messages (force reload)
   */
  async refreshMessages(): Promise<TopBarMessage[]> {
    console.log(`${this.LOG_PREFIX} 🔄 Forçando atualização das mensagens...`);
    this.clearCache();
    return this.getMessages();
  }

  /**
   * Preload messages (fire and forget)
   */
  async preload(): Promise<void> {
    try {
      await this.getMessages();
      console.log(`${this.LOG_PREFIX} 📋 Preload concluído`);
    } catch (error) {
      console.warn(`${this.LOG_PREFIX} ⚠️ Preload falhou:`, error);
    }
  }
}

// Export singleton instance
export const topbarService = new TopBarService();

// Export types
export type { TopBarMessage, TopBarResponse }; 