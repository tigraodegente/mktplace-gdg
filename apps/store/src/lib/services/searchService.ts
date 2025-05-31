// Definir tipo Product localmente até termos o pacote shared-types configurado
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  original_price?: number;
  discount?: number;
  images: string[];
  image?: string;
  category_id: string;
  category_name?: string;
  brand?: string;
  seller_id?: string;
  seller_name?: string;
  is_active: boolean;
  stock: number;
  sku?: string;
  pieces?: number;
  tags?: string[];
  material?: string;
  rating?: number;
  reviews_count?: number;
  sold_count?: number;
  colors?: string[];
  sizes?: string[];
  warranty?: string;
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
    weight?: number;
  };
  shipping_info?: {
    free_shipping: boolean;
    estimated_days: number;
  };
  is_black_friday?: boolean;
  has_fast_delivery?: boolean;
  has_free_shipping?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SearchSuggestion {
  type: 'product' | 'category' | 'brand' | 'query';
  id: string;
  text: string;
  slug?: string;
  highlight?: string;
  count?: number;
  image?: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  pieces?: number;
  rating?: number;
  soldCount?: number;
  hasFastDelivery?: boolean;
  installments?: number;
}

export interface SearchFilters {
  categories?: string[];
  brands?: string[];
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  hasDiscount?: boolean;
  hasFreeShipping?: boolean;
  inStock?: boolean;
  rating?: number;
  condition?: 'new' | 'used' | 'refurbished';
  sellers?: string[];
  deliveryTime?: string;
  location?: {
    state?: string;
    city?: string;
  };
  dynamicOptions?: Record<string, string[]>;
}

export interface SearchResult {
  products: Product[];
  totalCount: number;
  page: number;
  limit: number;
  facets: SearchFacets;
}

export interface SearchFacets {
  categories: Array<{
    id: string;
    name: string;
    slug?: string;
    count: number;
  }>;
  brands: Array<{
    id: string;
    name: string;
    slug?: string;
    count: number;
  }>;
  tags: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  priceRanges: Array<{
    min: number;
    max: number;
    count: number;
  }>;
  ratings?: Array<{
    value: number;
    count: number;
  }>;
  conditions?: Array<{
    value: 'new' | 'used' | 'refurbished';
    label: string;
    count: number;
  }>;
  deliveryOptions?: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  sellers?: Array<{
    id: string;
    name: string;
    slug?: string;
    rating?: number;
    count: number;
  }>;
  locations?: {
    states: Array<{
      code: string;
      name: string;
      count: number;
    }>;
    cities: Array<{
      name: string;
      state: string;
      count: number;
    }>;
  };
  benefits?: {
    discount: number;
    freeShipping: number;
    outOfStock: number;
  };
  dynamicOptions?: Array<{
    name: string;
    slug: string;
    values: Array<{
      value: string;
      count: number;
    }>;
  }>;
}

class SearchService {
  private searchHistory: string[] = [];
  private readonly MAX_HISTORY_ITEMS = 10;
  private readonly DEBOUNCE_DELAY = 300;
  private searchCache = new Map<string, SearchResult>();
  private popularSearchesCache: string[] | null = null;
  private popularSearchesCacheTime: number = 0;
  private readonly POPULAR_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.loadSearchHistory();
  }

  // Busca principal com cache e otimizações
  async search(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult> {
    const cacheKey = this.getCacheKey(query, filters, page, limit);
    
    // Verificar cache
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    try {
      // Construir URL com parâmetros
      const params = new URLSearchParams();
      
      if (query) params.set('q', query);
      if (filters.categories?.length) params.set('categoria', filters.categories.join(','));
      if (filters.brands?.length) params.set('marca', filters.brands.join(','));
      if (filters.tags?.length) params.set('tag', filters.tags.join(','));
      if (filters.priceMin !== undefined) params.set('preco_min', filters.priceMin.toString());
      if (filters.priceMax !== undefined) params.set('preco_max', filters.priceMax.toString());
      if (filters.hasDiscount) params.set('promocao', 'true');
      if (filters.hasFreeShipping) params.set('frete_gratis', 'true');
      if (filters.inStock !== undefined) params.set('disponivel', filters.inStock.toString());
      if (filters.rating !== undefined) params.set('avaliacao', filters.rating.toString());
      if (filters.condition) params.set('condicao', filters.condition);
      if (filters.sellers?.length) params.set('vendedor', filters.sellers.join(','));
      if (filters.deliveryTime) params.set('entrega', filters.deliveryTime);
      if (filters.location?.state) params.set('estado', filters.location.state);
      if (filters.location?.city) params.set('cidade', filters.location.city);
      
      // Adicionar filtros dinâmicos
      if (filters.dynamicOptions) {
        for (const [optionSlug, values] of Object.entries(filters.dynamicOptions)) {
          if (values.length > 0) {
            params.set(`opcao_${optionSlug}`, values.join(','));
          }
        }
      }
      
      params.set('pagina', page.toString());
      params.set('itens', limit.toString());
      
      // Fazer chamada para API
      const response = await fetch(`/api/products?${params.toString()}`);
      
      console.log('🌐 URL da API:', `/api/products?${params.toString()}`);
      console.log('📡 Status da resposta:', response.status);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }
      
      const result = await response.json();
      
      console.log('📦 Resposta da API:', result);
      console.log('✅ Success:', result.success);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro desconhecido');
      }
      
      const searchResult = {
        products: result.data.products,
        totalCount: result.data.totalCount,
        page: page,
        limit: limit,
        facets: result.data.facets
      };
      
      console.log('🎯 SearchResult formatado:', searchResult);
      
      // Adicionar ao cache
      this.searchCache.set(cacheKey, searchResult);
      
      // Limpar cache antigo se necessário
      if (this.searchCache.size > 50) {
        const firstKey = this.searchCache.keys().next().value;
        if (firstKey) {
          this.searchCache.delete(firstKey);
        }
      }
      
      return searchResult;
      
    } catch (error) {
      console.error('Erro na busca:', error);
      // Retornar resultado vazio em caso de erro
      return {
        products: [],
        totalCount: 0,
        page: 1,
        limit: 20,
        facets: {
          categories: [],
          brands: [],
          tags: [],
          priceRanges: [],
          ratings: [],
          conditions: [],
          deliveryOptions: [],
          sellers: [],
          locations: {
            states: [],
            cities: []
          }
        }
      };
    }
  }

  // Busca rápida para autocomplete
  async quickSearch(query: string): Promise<SearchSuggestion[]> {
    if (query.length < 2) return [];

    try {
      const response = await fetch(`/api/products/search-suggestions?q=${encodeURIComponent(query)}&limit=15`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar sugestões');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro desconhecido');
      }
      
      // Mapear sugestões da API para o formato esperado
      return result.data.suggestions.map((suggestion: any) => {
        if (suggestion.type === 'product') {
          return {
            type: 'product' as const,
            id: suggestion.id,
            text: suggestion.text,
            slug: suggestion.slug,
            image: suggestion.image,
            price: suggestion.price,
            originalPrice: suggestion.originalPrice,
            discount: suggestion.discount,
            rating: suggestion.rating,
            soldCount: suggestion.soldCount,
            highlight: this.highlightMatch(suggestion.text, query)
          };
        } else {
          return {
            type: suggestion.type as 'category' | 'brand' | 'query',
            id: suggestion.id,
            text: suggestion.text,
            slug: suggestion.slug,
            count: suggestion.count,
            highlight: suggestion.type === 'query' ? undefined : this.highlightMatch(suggestion.text, query)
          };
        }
      });
      
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      return [];
    }
  }

  // Adicionar ao histórico e rastrear busca
  async addToHistory(query: string, resultsCount?: number) {
    if (query && !this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      if (this.searchHistory.length > this.MAX_HISTORY_ITEMS) {
        this.searchHistory.pop();
      }
      this.saveSearchHistory();
    }
    
    // Rastrear busca no servidor
    try {
      await fetch('/api/search/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          resultsCount: resultsCount || 0
        })
      });
    } catch (error) {
      // Não bloquear se falhar o tracking
      console.error('Erro ao rastrear busca:', error);
    }
  }

  // Rastrear clique em produto da busca
  async trackSearchClick(query: string, productId: string, position: number) {
    try {
      await fetch('/api/search/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          clickedProductId: productId,
          clickedPosition: position
        })
      });
    } catch (error) {
      console.error('Erro ao rastrear clique:', error);
    }
  }

  // Obter histórico
  getHistory(): string[] {
    return [...this.searchHistory];
  }

  // Limpar histórico
  clearHistory() {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  // Obter sugestões populares da API
  async getPopularSearches(): Promise<string[]> {
    // Verificar cache
    const now = Date.now();
    if (this.popularSearchesCache && (now - this.popularSearchesCacheTime) < this.POPULAR_CACHE_DURATION) {
      return this.popularSearchesCache;
    }
    
    try {
      const response = await fetch('/api/search/popular-terms');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar termos populares');
      }
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        this.popularSearchesCache = result.data;
        this.popularSearchesCacheTime = now;
        return result.data;
      }
      
    } catch (error) {
      console.error('Erro ao buscar termos populares:', error);
    }
    
    // Fallback para termos padrão
    return [
      'samsung',
      'iphone',
      'notebook',
      'fone de ouvido',
      'tv',
      'playstation',
      'smartphone',
      'monitor'
    ];
  }

  // Helpers privados
  private getCacheKey(query: string, filters?: SearchFilters, page?: number, limit?: number): string {
    return JSON.stringify({ query, filters, page, limit });
  }

  private loadSearchHistory() {
    try {
      // Verificar se está no browser
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('searchHistory');
        if (saved) {
          this.searchHistory = JSON.parse(saved);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

  private saveSearchHistory() {
    try {
      // Verificar se está no browser
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
      }
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }

  private highlightMatch(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// Exportar instância única
export const searchService = new SearchService(); 