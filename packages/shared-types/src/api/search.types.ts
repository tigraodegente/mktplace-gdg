export interface SearchFilters {
  // Filtros básicos existentes
  categories?: string[];
  brands?: string[];
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  hasDiscount?: boolean;
  hasFreeShipping?: boolean;
  inStock?: boolean;
  
  // Novos filtros
  rating?: number;                    // Avaliação mínima (1-5)
  condition?: 'new' | 'used' | 'refurbished'; // Condição do produto
  sellers?: string[];                 // IDs dos vendedores
  deliveryTime?: '24h' | '48h' | '3days' | '7days' | '15days'; // Tempo de entrega
  paymentMethods?: ('pix' | 'credit' | 'debit' | 'boleto' | 'installments')[]; // Formas de pagamento
  location?: {
    state?: string;                   // Estado (UF)
    city?: string;                    // Cidade
    distance?: number;                // Distância máxima em km
  };
  attributes?: {                      // Atributos dinâmicos por categoria
    color?: string[];
    size?: string[];
    material?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface FacetItem {
  id: string;
  name: string;
  count: number;
  slug?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  count: number;
}

export interface RatingFacet {
  value: number;
  count: number;
}

export interface ConditionFacet {
  value: 'new' | 'used' | 'refurbished';
  label: string;
  count: number;
}

export interface DeliveryFacet {
  value: string;
  label: string;
  count: number;
}

export interface SellerFacet {
  id: string;
  name: string;
  rating?: number;
  count: number;
  slug?: string;
}

export interface LocationFacets {
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
}

export interface SearchFacets {
  categories: FacetItem[];
  brands: FacetItem[];
  tags: FacetItem[];
  priceRanges: PriceRange[];
  ratings: RatingFacet[];
  conditions: ConditionFacet[];
  deliveryOptions: DeliveryFacet[];
  sellers?: SellerFacet[];
  locations?: LocationFacets;
  benefits?: {
    discount: number;
    freeShipping: number;
    outOfStock: number;
  };
} 