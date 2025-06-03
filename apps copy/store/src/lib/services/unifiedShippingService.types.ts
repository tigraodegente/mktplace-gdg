// Tipos do UnifiedShippingService - Safe for client import
// IMPORTANTE: Este arquivo NÃO deve importar nada que dependa de Node.js

// Tipo genérico de produto para evitar imports
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  category_id?: string;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  [key: string]: any;
}

export interface UnifiedShippingItem {
  product: Product;
  product_id: string;
  quantity: number;
  sellerId: string;
  sellerName: string;
  weight?: number;
  price: number;
  category_id?: string;
  height?: number;
  width?: number;
  length?: number;
}

export interface UnifiedShippingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  deliveryDays: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  modalityId: string;
  modalityName: string;
  pricingType: 'per_item' | 'per_shipment';
  carrier: string;
  carrierName: string;
  carrierId: string;
  zoneName: string;
  isFree: boolean;
  freeReason?: string;
  breakdown?: ShippingBreakdown;
}

export interface ShippingBreakdown {
  basePrice: number;
  markup: number;
  taxes: Record<string, number>;
  discounts: Record<string, number>;
  freeShippingDiscount: number;
}

export interface UnifiedShippingQuote {
  sellerId: string;
  sellerName: string;
  items: UnifiedShippingItem[];
  options: UnifiedShippingOption[];
  totalWeight: number;
  totalValue: number;
  success: boolean;
  error?: string;
  zoneInfo?: {
    zoneId: string;
    zoneName: string;
    uf: string;
    carrier: string;
  };
}

export interface UnifiedShippingRequest {
  postalCode: string;
  items: UnifiedShippingItem[];
  sellerId?: string;
  useCache?: boolean;
}

export interface ShippingCalculationParams {
  cep: string;
  items: Array<{
    id: string;
    sellerId: string;
    weight: number;
    height: number;
    width: number;
    length: number;
    quantity: number;
    price: number;
    sku?: string;
    name?: string;
  }>;
  userId?: string;
}

export interface GroupedShippingResult {
  sellerId: string;
  sellerName?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  quotes: UnifiedShippingQuote[];
  subtotal: number;
  selectedQuoteId?: string;
} 