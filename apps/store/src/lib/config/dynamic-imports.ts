/**
 * Configuração de Dynamic Imports
 * 
 * Componentes que devem ser carregados sob demanda
 * para reduzir o bundle inicial
 */

import { browser } from '$app/environment';

// Helper para importar componentes dinamicamente
export async function lazyComponent<T>(
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  if (!browser) {
    // No servidor, importar diretamente
    const module = await importFn();
    return module.default;
  }
  
  // No cliente, usar dynamic import
  const module = await importFn();
  return module.default;
}

// Componentes pesados que devem ser lazy loaded
export const LazyComponents = {
  // Componentes de produto
  // @ts-ignore - Adicionar quando criar o componente
  ProductGallery: () => lazyComponent(() => import('$lib/components/product/ProductGallery.svelte' as any)),
  // @ts-ignore - Adicionar quando criar o componente
  ProductReviews: () => lazyComponent(() => import('$lib/components/product/ProductReviews.svelte' as any)),
  // @ts-ignore - Adicionar quando criar o componente
  ProductQuestions: () => lazyComponent(() => import('$lib/components/product/ProductQuestions.svelte' as any)),
  
  // Componentes de checkout existentes
  PaymentStep: () => lazyComponent(() => import('$lib/components/checkout/PaymentStep.svelte')),
  AddressStep: () => lazyComponent(() => import('$lib/components/checkout/AddressStep.svelte')),
  
  // Componentes de chat
  ChatWidget: () => lazyComponent(() => import('$lib/components/chat/ChatWidget.svelte')),
  // @ts-ignore - Adicionar quando criar o componente
  ChatConversation: () => lazyComponent(() => import('$lib/components/chat/ChatConversation.svelte' as any)),
  
  // Componentes de UI
  // @ts-ignore - Adicionar quando criar o componente
  RichTextEditor: () => lazyComponent(() => import('$lib/components/ui/RichTextEditor.svelte' as any)),
  // @ts-ignore - Adicionar quando criar o componente
  ImageUploader: () => lazyComponent(() => import('$lib/components/ui/ImageUploader.svelte' as any)),
  // @ts-ignore - Adicionar quando criar o componente
  DataTable: () => lazyComponent(() => import('$lib/components/ui/DataTable.svelte' as any)),
  
  // Componentes existentes que podem ser lazy
  ShareCart: () => lazyComponent(() => import('$lib/components/cart/ShareCart.svelte')),
  VirtualProductGrid: () => lazyComponent(() => import('$lib/components/product/VirtualProductGrid.svelte')),
  
  // @ts-ignore - Adicionar quando criar o componente
  ProductQuickView: () => lazyComponent(() => import('$lib/components/modals/ProductQuickView.svelte' as any)),
};

// Helper para pré-carregar componentes quando idle
export function preloadComponent(componentName: keyof typeof LazyComponents) {
  if (!browser) return;
  
  // Usar requestIdleCallback se disponível
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      LazyComponents[componentName]();
    });
  } else {
    // Fallback para setTimeout
    setTimeout(() => {
      LazyComponents[componentName]();
    }, 2000);
  }
}

// Helper para carregar múltiplos componentes
export async function preloadComponents(componentNames: (keyof typeof LazyComponents)[]) {
  if (!browser) return;
  
  const promises = componentNames.map(name => LazyComponents[name]());
  await Promise.all(promises);
}

// Componente wrapper para lazy loading com fallback
export interface LazyComponentOptions {
  component: keyof typeof LazyComponents;
  loading?: any; // Componente de loading
  error?: any; // Componente de erro
  delay?: number; // Delay antes de mostrar loading
  timeout?: number; // Timeout para erro
}

// Export para uso em templates
export { LazyComponents as lazy }; 