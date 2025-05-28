/**
 * Componentes do Sistema de Carrinho
 * 
 * Exporta todos os componentes modulares do carrinho
 * para facilitar importação em outros lugares
 */

// Componente principal
export { default as CartPreview } from '$lib/components/CartPreview.svelte';

// Componentes modulares
export { default as CartHeader } from './CartHeader.svelte';
export { default as CartItem } from './CartItem.svelte';
export { default as CartFooter } from './CartFooter.svelte';
export { default as CouponSection } from './CouponSection.svelte';
export { default as EmptyCart } from './EmptyCart.svelte';
export { default as SellerGroup } from './SellerGroup.svelte';
export { default as ShareCart } from './ShareCart.svelte';
export { default as ShippingCalculator } from './ShippingCalculator.svelte';
export { default as ShippingModeSelector } from './ShippingModeSelector.svelte';
export { default as MoneyValue } from './MoneyValue.svelte';
export { default as StaticMoney } from './StaticMoney.svelte';
export { default as PlainMoney } from './PlainMoney.svelte';

// Store
export { advancedCartStore } from '$lib/stores/advancedCartStore';

// Tipos
export type {
  CartItem as CartItemType,
  SellerGroup as SellerGroupType,
  ShippingOption,
  ShippingMode,
  Coupon,
  CartState,
  CartTotals,
  ProductShipping
} from '$lib/types/cart';

// Constantes e utilitários
export * from './constants'; 