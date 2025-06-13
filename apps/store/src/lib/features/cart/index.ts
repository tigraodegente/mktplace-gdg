/**
 * Cart Feature - Exports Centralizados
 */

// Stores
export { cartStoreBridge as cartStore, advancedCartStoreBridge as advancedCartStore } from './stores/cartStore.bridge';
export { newCartStore } from './stores/cartStore.new';

// Tipos (re-export dos tipos compartilhados)
export type { 
  CartItem, 
  SellerGroup, 
  CartTotals, 
  Coupon,
  Product 
} from '../shared/types/commerce';

// Constantes
export const CART_VERSION = '2.0.0-bridge'; 