import type { PaginationParams } from './types';

/**
 * Converte parâmetros de paginação para o formato Xata
 */
export function toXataPagination(params: PaginationParams) {
  return {
    size: params.limit || 20,
    offset: ((params.page || 1) - 1) * (params.limit || 20)
  };
}

/**
 * Converte resposta paginada do Xata para formato padrão
 */
export function fromXataPagination<T>(
  records: T[],
  meta: { page: { cursor: string; more: boolean } },
  params: PaginationParams
) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  
  return {
    items: records,
    meta: {
      page,
      limit,
      hasMore: meta.page.more,
      cursor: meta.page.cursor
    }
  };
}

/**
 * Helper para construir filtros do Xata
 */
export function buildXataFilter(filters: Record<string, any>) {
  const xataFilter: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    
    // Tratamento especial para ranges
    if (key.endsWith('_min') || key.endsWith('_max')) {
      const field = key.replace(/_min$|_max$/, '');
      const operator = key.endsWith('_min') ? '$gte' : '$lte';
      
      if (!xataFilter[field]) xataFilter[field] = {};
      xataFilter[field][operator] = value;
    }
    // Tratamento para arrays (operador IN)
    else if (Array.isArray(value)) {
      xataFilter[key] = { $any: value };
    }
    // Tratamento para busca de texto
    else if (key === 'search' || key === 'q') {
      // Será usado com o método search() do Xata
      continue;
    }
    // Valores diretos
    else {
      xataFilter[key] = value;
    }
  }
  
  return xataFilter;
}

/**
 * Helper para ordenação
 */
export function buildXataSort(sort?: string, order?: 'asc' | 'desc') {
  if (!sort) return undefined;
  
  return {
    [sort]: order || 'asc'
  };
} 