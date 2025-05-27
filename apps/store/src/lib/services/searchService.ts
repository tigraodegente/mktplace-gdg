import type { Product } from '@mktplace/shared-types';

export interface SearchSuggestion {
  type: 'product' | 'category' | 'brand' | 'query';
  id: string;
  text: string;
  highlight?: string;
  count?: number;
  image?: string;
  price?: number;
}

export interface SearchFilters {
  categories?: string[];
  priceMin?: number;
  priceMax?: number;
  brands?: string[];
  tags?: string[];
  hasDiscount?: boolean;
  hasFreeShipping?: boolean;
  inStock?: boolean;
  rating?: number;
}

export interface SearchResult {
  products: Product[];
  suggestions: SearchSuggestion[];
  totalCount: number;
  facets: {
    categories: Array<{ id: string; name: string; count: number }>;
    brands: Array<{ id: string; name: string; count: number }>;
    priceRanges: Array<{ min: number; max: number; count: number }>;
    tags: Array<{ id: string; name: string; count: number }>;
  };
}

class SearchService {
  private searchHistory: string[] = [];
  private readonly MAX_HISTORY_ITEMS = 10;
  private readonly DEBOUNCE_DELAY = 300;
  private searchCache = new Map<string, SearchResult>();

  constructor() {
    this.loadSearchHistory();
  }

  // Busca principal com cache e otimizações
  async search(query: string, filters?: SearchFilters, page = 1, limit = 20): Promise<SearchResult> {
    const cacheKey = this.getCacheKey(query, filters, page, limit);
    
    // Verificar cache
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    // TODO: Substituir por chamada real à API
    const result = await this.mockSearch(query, filters, page, limit);
    
    // Armazenar no cache
    this.searchCache.set(cacheKey, result);
    
    // Limpar cache antigo se necessário
    if (this.searchCache.size > 50) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }

    return result;
  }

  // Busca rápida para autocomplete
  async quickSearch(query: string): Promise<SearchSuggestion[]> {
    if (query.length < 2) return [];

    // TODO: Substituir por chamada real à API
    const suggestions: SearchSuggestion[] = [];

    // Produtos
    const products = await this.mockSearchProducts(query, 5);
    suggestions.push(...products.map(p => ({
      type: 'product' as const,
      id: p.id,
      text: p.name,
      image: p.images?.[0],
      price: p.price,
      highlight: this.highlightMatch(p.name, query)
    })));

    // Categorias
    const categories = this.mockSearchCategories(query);
    suggestions.push(...categories);

    // Queries populares
    const queries = this.mockSearchQueries(query);
    suggestions.push(...queries);

    return suggestions;
  }

  // Adicionar ao histórico
  addToHistory(query: string) {
    if (!query.trim()) return;

    // Remover duplicatas
    this.searchHistory = this.searchHistory.filter(q => q !== query);
    
    // Adicionar no início
    this.searchHistory.unshift(query);
    
    // Limitar tamanho
    if (this.searchHistory.length > this.MAX_HISTORY_ITEMS) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY_ITEMS);
    }

    this.saveSearchHistory();
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

  // Obter sugestões populares
  getPopularSearches(): string[] {
    return [
      'Kit berço completo',
      'Lençol infantil',
      'Organizador de berço',
      'Tapete infantil',
      'Toalha de banho com capuz',
      'Edredom infantil',
      'Protetor de berço',
      'Mosquiteiro para berço',
      'Almofada de amamentação',
      'Saco de dormir bebê'
    ];
  }

  // Obter trending searches
  getTrendingSearches(): string[] {
    return [
      'Black Friday bebê',
      'Kit maternidade',
      'Enxoval completo',
      'Quarto montessoriano',
      'Berço americano'
    ];
  }

  // Obter categorias principais
  getMainCategories(): Array<{ id: string; name: string; count: number; icon: string; color: string }> {
    return [
      { id: 'berco', name: 'Berço', count: 156, icon: '🛏️', color: 'blue' },
      { id: 'banho', name: 'Banho', count: 89, icon: '🛁', color: 'cyan' },
      { id: 'decoracao', name: 'Decoração', count: 234, icon: '🎨', color: 'pink' },
      { id: 'organizacao', name: 'Organização', count: 67, icon: '📦', color: 'purple' },
      { id: 'passeio', name: 'Passeio', count: 45, icon: '🚼', color: 'green' },
      { id: 'alimentacao', name: 'Alimentação', count: 78, icon: '🍼', color: 'orange' }
    ];
  }

  // Helpers privados
  private getCacheKey(query: string, filters?: SearchFilters, page?: number, limit?: number): string {
    return JSON.stringify({ query, filters, page, limit });
  }

  private loadSearchHistory() {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('searchHistory');
      if (saved) {
        this.searchHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

  private saveSearchHistory() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }

  private highlightMatch(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Mock functions - substituir por API real
  private async mockSearch(query: string, filters?: SearchFilters, page = 1, limit = 20): Promise<SearchResult> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const allProducts = this.generateMockProducts();
    let filtered = allProducts;

    // Aplicar busca por texto
    if (query) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Aplicar filtros
    if (filters) {
      if (filters.categories?.length) {
        filtered = filtered.filter(p => filters.categories!.includes(p.category_id));
      }
      if (filters.priceMin !== undefined) {
        filtered = filtered.filter(p => p.price >= filters.priceMin!);
      }
      if (filters.priceMax !== undefined) {
        filtered = filtered.filter(p => p.price <= filters.priceMax!);
      }
      if (filters.hasDiscount) {
        filtered = filtered.filter(p => p.discount && p.discount > 0);
      }
      if (filters.inStock) {
        filtered = filtered.filter(p => p.stock > 0);
      }
    }

    // Paginação
    const start = (page - 1) * limit;
    const paginatedProducts = filtered.slice(start, start + limit);

    // Gerar facets
    const facets = this.generateFacets(filtered);

    return {
      products: paginatedProducts,
      suggestions: [],
      totalCount: filtered.length,
      facets
    };
  }

  private async mockSearchProducts(query: string, limit: number): Promise<Product[]> {
    const products = this.generateMockProducts();
    return products
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }

  private mockSearchCategories(query: string): SearchSuggestion[] {
    const categories = [
      { id: 'berco', name: 'Berço', count: 156, icon: '🛏️', color: 'blue' },
      { id: 'banho', name: 'Banho', count: 89, icon: '🛁', color: 'cyan' },
      { id: 'decoracao', name: 'Decoração', count: 234, icon: '🎨', color: 'pink' },
      { id: 'organizacao', name: 'Organização', count: 67, icon: '📦', color: 'purple' },
      { id: 'passeio', name: 'Passeio', count: 45, icon: '🚼', color: 'green' },
      { id: 'alimentacao', name: 'Alimentação', count: 78, icon: '🍼', color: 'orange' }
    ];

    return categories
      .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
      .map(c => ({
        type: 'category' as const,
        id: c.id,
        text: c.name,
        count: c.count,
        highlight: this.highlightMatch(c.name, query)
      }));
  }

  private mockSearchQueries(query: string): SearchSuggestion[] {
    const queries = [
      'kit berço 10 peças',
      'lençol berço americano',
      'protetor de berço respirável',
      'organizador de fraldas'
    ];

    return queries
      .filter(q => q.includes(query.toLowerCase()))
      .map(q => ({
        type: 'query' as const,
        id: q,
        text: q
      }));
  }

  private generateMockProducts(): Product[] {
    const products: Product[] = [];
    const baseProducts = [
      {
        name: 'Kit Berço Completo Ursinhos',
        category_id: 'berco',
        category_name: 'Berço',
        price: 189.90,
        original_price: 299.90,
        discount: 37,
        pieces: 10,
        tags: ['kit-berco', 'ursinhos', 'completo'],
        brand: 'Baby Dreams',
        material: '100% Algodão',
        rating: 4.8,
        reviews_count: 234,
        sold_count: 1567,
        colors: ['Azul', 'Rosa', 'Cinza', 'Bege'],
        warranty: '6 meses',
        shipping_info: {
          free_shipping: true,
          estimated_days: 3
        }
      },
      {
        name: 'Jogo de Lençol Infantil Safari',
        category_id: 'berco',
        category_name: 'Berço',
        price: 89.90,
        original_price: 149.90,
        discount: 40,
        pieces: 3,
        tags: ['lencol', 'safari', 'infantil'],
        brand: 'Mundo Baby',
        material: 'Malha 100% Algodão',
        rating: 4.6,
        reviews_count: 156,
        sold_count: 892,
        sizes: ['Berço Americano', 'Berço Nacional'],
        warranty: '3 meses'
      },
      {
        name: 'Toalha de Banho com Capuz Elefantinho',
        category_id: 'banho',
        category_name: 'Banho',
        price: 59.90,
        pieces: 1,
        tags: ['toalha', 'capuz', 'elefante'],
        brand: 'Soft Baby',
        material: 'Algodão Felpudo',
        rating: 4.9,
        reviews_count: 89,
        sold_count: 445,
        colors: ['Branco', 'Amarelo', 'Verde Água'],
        dimensions: {
          width: 70,
          height: 70,
          weight: 0.3
        }
      },
      {
        name: 'Organizador de Berço Nuvens',
        category_id: 'organizacao',
        category_name: 'Organização',
        price: 79.90,
        original_price: 99.90,
        discount: 20,
        pieces: 1,
        tags: ['organizador', 'berco', 'nuvens'],
        brand: 'Organize Baby',
        material: 'Tecido Oxford',
        rating: 4.7,
        reviews_count: 67,
        sold_count: 334,
        dimensions: {
          width: 60,
          height: 30,
          depth: 15
        }
      },
      {
        name: 'Tapete Infantil Antiderrapante ABC',
        category_id: 'decoracao',
        category_name: 'Decoração',
        price: 149.90,
        pieces: 1,
        tags: ['tapete', 'antiderrapante', 'educativo'],
        brand: 'Play Kids',
        material: 'EVA Atóxico',
        rating: 4.5,
        reviews_count: 123,
        sold_count: 678,
        dimensions: {
          width: 180,
          height: 120,
          depth: 1
        },
        warranty: '1 ano'
      }
    ];

    // Gerar variações
    for (let i = 0; i < 50; i++) {
      const base = baseProducts[i % baseProducts.length];
      const variation = i % 5;
      
      products.push({
        id: `prod-${i + 1}`,
        name: `${base.name} - ${['Azul', 'Rosa', 'Verde', 'Amarelo', 'Cinza'][variation]}`,
        slug: `${base.name.toLowerCase().replace(/ /g, '-')}-${variation}`,
        description: `${base.name} de alta qualidade para o conforto do seu bebê`,
        price: base.price + (variation * 10),
        original_price: base.original_price ? base.original_price + (variation * 15) : undefined,
        discount: base.discount,
        images: [`/api/placeholder/300/400`],
        category_id: base.category_id,
        category_name: base.category_name,
        seller_id: `seller-${(i % 3) + 1}`,
        seller_name: ['Loja Baby Dreams', 'Mundo Infantil', 'Kids & Cia'][i % 3],
        is_active: true,
        stock: Math.floor(Math.random() * 50) + 10,
        sku: `SKU-${1000 + i}`,
        pieces: base.pieces,
        tags: base.tags,
        brand: base.brand,
        material: base.material,
        rating: base.rating ? base.rating - (variation * 0.1) : undefined,
        reviews_count: base.reviews_count,
        sold_count: base.sold_count ? Math.floor(base.sold_count * (1 - variation * 0.1)) : undefined,
        colors: base.colors,
        sizes: base.sizes,
        warranty: base.warranty,
        dimensions: base.dimensions,
        shipping_info: base.shipping_info,
        is_black_friday: i % 4 === 0,
        has_fast_delivery: i % 3 === 0,
        is_new: i % 5 === 0,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    return products;
  }

  private generateFacets(products: Product[]) {
    // Categorias
    const categoryCount = new Map<string, number>();
    products.forEach(p => {
      categoryCount.set(p.category_id, (categoryCount.get(p.category_id) || 0) + 1);
    });

    const categories = Array.from(categoryCount.entries()).map(([id, count]) => ({
      id,
      name: this.getCategoryName(id),
      count
    }));

    // Faixas de preço
    const priceRanges = [
      { min: 0, max: 50, count: 0 },
      { min: 50, max: 100, count: 0 },
      { min: 100, max: 200, count: 0 },
      { min: 200, max: 500, count: 0 },
      { min: 500, max: Infinity, count: 0 }
    ];

    products.forEach(p => {
      const range = priceRanges.find(r => p.price >= r.min && p.price < r.max);
      if (range) range.count++;
    });

    // Tags
    const tagCount = new Map<string, number>();
    products.forEach(p => {
      p.tags?.forEach((tag: string) => {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      });
    });

    const tags = Array.from(tagCount.entries()).map(([id, count]) => ({
      id,
      name: this.getTagName(id),
      count
    }));

    return {
      categories,
      brands: [], // TODO: Implementar brands
      priceRanges: priceRanges.filter(r => r.count > 0),
      tags
    };
  }

  private getCategoryName(id: string): string {
    const names: Record<string, string> = {
      berco: 'Berço',
      banho: 'Banho',
      decoracao: 'Decoração',
      organizacao: 'Organização',
      passeio: 'Passeio'
    };
    return names[id] || id;
  }

  private getTagName(id: string): string {
    const names: Record<string, string> = {
      'kit-berco': 'Kit Berço',
      'lencol': 'Lençol',
      'toalha': 'Toalha',
      'organizador': 'Organizador',
      'tapete': 'Tapete'
    };
    return names[id] || id;
  }
}

// Exportar instância única
export const searchService = new SearchService(); 