import { browser } from '$app/environment';

interface CursorPaginationState {
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
  totalItems: number | undefined;
  loading: boolean;
  error: string | null;
}

interface SearchFilters {
  q?: string;
  categoria?: string[];
  marca?: string[];
  preco_min?: number;
  preco_max?: number;
  promocao?: boolean;
  frete_gratis?: boolean;
  disponivel?: boolean;
  ordenar?: string;
  [key: string]: any;
}

export class CursorPaginationService {
  private state: CursorPaginationState = {
    items: [],
    nextCursor: null,
    hasMore: true,
    totalItems: undefined,
    loading: false,
    error: null
  };
  
  private subscribers: Array<(state: CursorPaginationState) => void> = [];
  private abortController: AbortController | null = null;
  
  constructor(
    private endpoint: string = '/api/products',
    private initialLimit: number = 20
  ) {}
  
  // Subscribe para mudanças de estado
  subscribe(callback: (state: CursorPaginationState) => void) {
    this.subscribers.push(callback);
    callback(this.state); // Emitir estado atual
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
  
  private notify() {
    this.subscribers.forEach(callback => callback(this.state));
  }
  
  private setState(updates: Partial<CursorPaginationState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }
  
  // Busca inicial (reset)
  async search(filters: SearchFilters = {}, useOptimized: boolean = false) {
    this.cancelPendingRequest();
    
    this.setState({
      items: [],
      nextCursor: null,
      hasMore: true,
      totalItems: undefined,
      loading: true,
      error: null
    });
    
    try {
      const result = await this.fetchPage(filters, null, useOptimized);
      
      this.setState({
        items: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        totalItems: result.totalItems,
        loading: false
      });
      
      return result;
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar produtos'
      });
      throw error;
    }
  }
  
  // Carregar próxima página
  async loadMore(filters: SearchFilters = {}, useOptimized: boolean = false) {
    if (!this.state.hasMore || this.state.loading) {
      return;
    }
    
    this.cancelPendingRequest();
    this.setState({ loading: true, error: null });
    
    try {
      const result = await this.fetchPage(filters, this.state.nextCursor, useOptimized);
      
      this.setState({
        items: [...this.state.items, ...result.items],
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        totalItems: result.totalItems || this.state.totalItems,
        loading: false
      });
      
      return result;
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar mais produtos'
      });
      throw error;
    }
  }
  
  // Fetch de uma página
  private async fetchPage(
    filters: SearchFilters, 
    cursor: string | null, 
    useOptimized: boolean
  ) {
    this.abortController = new AbortController();
    
    // Construir URL com parâmetros
    const params = new URLSearchParams();
    
    // Adicionar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value != null && value !== '' && value !== false) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
    });
    
    // Adicionar cursor se existir
    if (cursor) {
      params.set('cursor', cursor);
    }
    
    // Adicionar limite
    params.set('itens', String(this.initialLimit));
    
    // Escolher endpoint
    const url = useOptimized 
      ? `/api/products/optimized?${params}`
      : `${this.endpoint}?${params}`;
    
    
    const response = await fetch(url, {
      signal: this.abortController.signal
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Erro ao buscar produtos');
    }
    
    // Adaptar resposta baseado no formato retornado
    if (data.data.nextCursor !== undefined) {
      // Formato cursor-based
      return {
        items: data.data.products || data.data.items || [],
        nextCursor: data.data.nextCursor,
        hasMore: data.data.hasMore,
        totalItems: data.data.totalItems
      };
    } else {
      // Formato tradicional - simular cursor
      const items = data.data.products || data.data || [];
      const hasMore = items.length === this.initialLimit;
      
      return {
        items,
        nextCursor: hasMore ? this.generateSimulatedCursor(items) : null,
        hasMore,
        totalItems: data.data.totalCount || data.totalCount
      };
    }
  }
  
  // Gerar cursor simulado para API tradicional
  private generateSimulatedCursor(items: any[]): string | null {
    if (items.length === 0) return null;
    
    const lastItem = items[items.length - 1];
    const cursor = {
      id: lastItem.id,
      created_at: lastItem.created_at || new Date().toISOString(),
      score: lastItem.overall_score || 0
    };
    
    return btoa(JSON.stringify(cursor));
  }
  
  // Cancelar requisição pendente
  private cancelPendingRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
  
  // Reset do estado
  reset() {
    this.cancelPendingRequest();
    this.setState({
      items: [],
      nextCursor: null,
      hasMore: true,
      totalItems: undefined,
      loading: false,
      error: null
    });
  }
  
  // Getters para acesso fácil
  get items() { return this.state.items; }
  get loading() { return this.state.loading; }
  get hasMore() { return this.state.hasMore; }
  get error() { return this.state.error; }
  get totalItems() { return this.state.totalItems; }
  get currentItems() { return this.state.items.length; }
  
  // Cleanup
  destroy() {
    this.cancelPendingRequest();
    this.subscribers = [];
  }
}

// Factory para criar instâncias
export function createCursorPagination(
  endpoint: string = '/api/products',
  initialLimit: number = 20
) {
  return new CursorPaginationService(endpoint, initialLimit);
}

// Hook para usar no Svelte
export function useCursorPagination(
  endpoint: string = '/api/products',
  initialLimit: number = 20
) {
  if (!browser) {
    return {
      items: [],
      loading: false,
      hasMore: false,
      error: null,
      totalItems: undefined,
      currentItems: 0,
      search: async () => {},
      loadMore: async () => {},
      reset: () => {},
      destroy: () => {}
    };
  }
  
  const service = new CursorPaginationService(endpoint, initialLimit);
  
  return {
    subscribe: service.subscribe.bind(service),
    search: service.search.bind(service),
    loadMore: service.loadMore.bind(service),
    reset: service.reset.bind(service),
    destroy: service.destroy.bind(service),
    get items() { return service.items; },
    get loading() { return service.loading; },
    get hasMore() { return service.hasMore; },
    get error() { return service.error; },
    get totalItems() { return service.totalItems; },
    get currentItems() { return service.currentItems; }
  };
} 