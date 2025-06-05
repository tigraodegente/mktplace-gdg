// ========================================
// MKTPLACE UTILS PACKAGE
// Utilitários centralizados
// ========================================

// Auth System - Sistema de autenticação completo
export * from './auth/auth-service';
export * from './auth/middleware';

// NOTA: stores.ts não é exportado aqui pois depende do Svelte
// Para usar stores, importe diretamente nas apps SvelteKit:
// import { authStore } from '@mktplace/utils/auth/stores'

// Utilitários compartilhados do marketplace

// Exportar funções de formatação
export * from './formatters';

// Exportar funções de validação
export * from './validators';

// Exportar helpers e constantes
export * from './helpers';
export * from './constants';

// Exportar módulo de enriquecimento
export * from './enrichment';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
} 