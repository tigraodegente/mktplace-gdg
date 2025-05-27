// Componentes básicos
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as Input } from './Input.svelte';

// Componentes complexos
export { default as ProductCard } from './components/ProductCard.svelte';
export { default as SearchBox } from './components/SearchBox.svelte';

// Tipos (re-exportar tipos úteis para os componentes)
export type { Product } from '@mktplace/shared-types';
export type { SearchSuggestion } from './components/SearchBox.svelte'; 