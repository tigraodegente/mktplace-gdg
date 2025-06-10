/**
 * Utilitários para normalização e busca de texto
 */

/**
 * Normaliza texto removendo acentos e caracteres especiais
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')   // Remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gera variações automáticas de palavras com/sem acentos
 */
export function generateSearchVariations(query: string): string[] {
  const variations = [query];
  
  // Mapeamento completo de variações ç/c
  const cVariations = [
    // Berço/berco (todas as variações)
    { pattern: /\bberco\b/gi, replacement: 'berço' },
    { pattern: /\bberç[oô]\b/gi, replacement: 'berco' },
    { pattern: /\bberc\b/gi, replacement: 'berç' },      // ✅ NOVO: berc → berç
    { pattern: /\bberç\b/gi, replacement: 'berc' },      // ✅ NOVO: berç → berc
    
    // Lenço/lenco
    { pattern: /\blenco\b/gi, replacement: 'lenço' },
    { pattern: /\blenc\b/gi, replacement: 'lenç' },      // ✅ NOVO: lenc → lenç
    { pattern: /\blenç[oô]\b/gi, replacement: 'lenco' },
    
    // Coração/coracao  
    { pattern: /\bcoracao\b/gi, replacement: 'coração' },
    { pattern: /\bcorac\b/gi, replacement: 'coraç' },    // ✅ NOVO: corac → coraç
    { pattern: /\bcoraç[aã]o\b/gi, replacement: 'coracao' },
  ];
  
  // Mapeamento de acentos
  const accentVariations = [
    // Bebê/bebe
    { pattern: /\bbebe\b/gi, replacement: 'bebê' },
    { pattern: /\bbebê\b/gi, replacement: 'bebe' },
    
    // Ação/acao, são/sao, não/nao
    { pattern: /\bacao\b/gi, replacement: 'ação' },
    { pattern: /\bação\b/gi, replacement: 'acao' },
    { pattern: /\bsao\b/gi, replacement: 'são' },
    { pattern: /\bsão\b/gi, replacement: 'sao' },
    { pattern: /\bnao\b/gi, replacement: 'não' },
    { pattern: /\bnão\b/gi, replacement: 'nao' },
    
    // Mais acentos comuns
    { pattern: /\bmae\b/gi, replacement: 'mãe' },
    { pattern: /\bmãe\b/gi, replacement: 'mae' },
    { pattern: /\birma\b/gi, replacement: 'irmã' },
    { pattern: /\birmã\b/gi, replacement: 'irma' },
  ];
  
  // Aplicar todas as variações
  const allVariations = [...cVariations, ...accentVariations];
  
  allVariations.forEach(({ pattern, replacement }) => {
    if (query.match(pattern)) {
      variations.push(query.replace(pattern, replacement));
    }
  });
  
  // Remover duplicatas
  return [...new Set(variations)];
}

/**
 * Verifica se dois textos são similares (ignorando acentos)
 */
export function isSimilarText(text1: string, text2: string): boolean {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

/**
 * Destaca termos de busca em um texto
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery || !text) return text;
  
  const variations = generateSearchVariations(searchQuery);
  let highlightedText = text;
  
  variations.forEach(variation => {
    const regex = new RegExp(`(${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  });
  
  return highlightedText;
}

/**
 * Limpa e valida query de busca
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 100); // Limitar tamanho
} 