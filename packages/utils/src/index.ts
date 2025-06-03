// Utilitários compartilhados do marketplace

// Exportar funções de formatação
export * from './formatters';

// Exportar funções de validação
export * from './validators';

// NÃO exportar auth aqui pois contém jsonwebtoken que é server-side only
// Para usar auth, importe diretamente: import { ... } from '@mktplace-gdg/utils/auth'

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