/**
 * Componentes do Sistema de Carrinho
 * 
 * Exporta todos os componentes modulares do carrinho
 * para facilitar importação em outros lugares
 */

// Componentes modulares
export { default as CartHeader } from './CartHeader.svelte';
export { default as CartItem } from './CartItem.svelte';
export { default as CartFooter } from './CartFooter.svelte';
export { default as CouponSection } from './CouponSection.svelte';
export { default as EmptyCart } from './EmptyCart.svelte';
export { default as SellerGroupSummary } from './SellerGroupSummary.svelte';
export { default as BenefitBadge } from './BenefitBadge.svelte';
export { default as CartNotifications } from './CartNotifications.svelte';
export { default as ShareCart } from './ShareCart.svelte';
export { default as ShippingCalculator } from './ShippingCalculator.svelte';
export { default as ShippingModeSelector } from './ShippingModeSelector.svelte';
export { default as MoneyValue } from './MoneyValue.svelte';
export { default as StaticMoney } from './StaticMoney.svelte';
export { default as PlainMoney } from './PlainMoney.svelte';
export { default as SellerShippingOptions } from './SellerShippingOptions.svelte';
export { default as OrderSummary } from './OrderSummary.svelte';
export { default as MiniCart } from './MiniCart.svelte';

// Services
export { ShippingCartService } from '$lib/services/shippingCartService';
export type { 
  SellerShippingQuote, 
  ShippingCalculationRequest,
  ShippingItem,
  AdvancedShippingOption 
} from '$lib/services/shippingCartService';

// Store - atualizado para o novo nome
export { cartStore, advancedCartStore } from '$lib/stores/cartStore';

// Tipos básicos
export type {
  CartItem as CartItemType,
  SellerGroup as SellerGroupType,
  Coupon,
  CartTotals
} from '$lib/types/cart';