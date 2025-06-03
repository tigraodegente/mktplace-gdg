/**
 * Normaliza texto removendo acentos e convertendo para minúsculas
 * para busca mais eficiente
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Prepara query de busca para SQL
 */
export function prepareSearchQuery(query: string): string {
  const normalized = normalizeSearchText(query);
  // Escapa caracteres especiais do SQL LIKE
  return normalized
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Mapa de variações comuns de acentuação em português
 */
const ACCENT_VARIATIONS: Record<string, string[]> = {
  'a': ['á', 'à', 'ã', 'â', 'ä'],
  'e': ['é', 'è', 'ê', 'ë'],
  'i': ['í', 'ì', 'î', 'ï'],
  'o': ['ó', 'ò', 'õ', 'ô', 'ö'],
  'u': ['ú', 'ù', 'û', 'ü'],
  'c': ['ç'],
  'n': ['ñ']
};

/**
 * Palavras irrelevantes para busca (stop words)
 */
const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os',
  'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas',
  'para', 'por', 'com', 'sem', 'sob', 'e', 'ou', 'mas'
]);

/**
 * Gera variações de uma palavra considerando acentos
 */
export function generateWordVariations(word: string): string[] {
  const variations = new Set<string>([word, word.toLowerCase()]);
  
  // Adicionar versão sem acentos
  const normalized = normalizeSearchText(word);
  variations.add(normalized);
  
  // Adicionar variações específicas conhecidas
  const commonVariations: Record<string, string[]> = {
    'berco': ['berço'],
    'berço': ['berco'],
    'bebe': ['bebê'],
    'bebê': ['bebe'],
    'mamae': ['mamãe'],
    'mamãe': ['mamae'],
    'papai': ['papai'],
    'avo': ['avó', 'avô'],
    'avó': ['avo'],
    'avô': ['avo'],
    'colchao': ['colchão'],
    'colchão': ['colchao'],
    'lencol': ['lençol'],
    'lençol': ['lencol'],
    'cha': ['chá'],
    'chá': ['cha'],
    'pe': ['pé'],
    'pé': ['pe']
  };
  
  const lowerWord = word.toLowerCase();
  if (commonVariations[lowerWord]) {
    commonVariations[lowerWord].forEach(v => variations.add(v));
  }
  
  return Array.from(variations);
}

/**
 * Extrai palavras relevantes de uma query de busca
 */
export function extractSearchWords(query: string): string[] {
  // Dividir em palavras
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  // Filtrar stop words e palavras muito curtas
  return words.filter(word => 
    word.length > 2 && !STOP_WORDS.has(word)
  );
}

/**
 * Calcula score de relevância para ordenação
 */
export function calculateRelevanceScore(
  product: any,
  searchWords: string[]
): number {
  let score = 0;
  const name = product.name?.toLowerCase() || '';
  const description = product.description?.toLowerCase() || '';
  
  searchWords.forEach(word => {
    // Pontuação maior se a palavra aparece no nome
    if (name.includes(word)) {
      score += 10;
      // Bonus se aparece no início
      if (name.startsWith(word)) {
        score += 5;
      }
    }
    
    // Pontuação menor se aparece na descrição
    if (description.includes(word)) {
      score += 3;
    }
    
    // Bonus se todas as palavras aparecem no nome
    if (searchWords.every(w => name.includes(w))) {
      score += 20;
    }
  });
  
  // Considerar outros fatores
  if (product.featured) score += 5;
  if (product.rating_average >= 4) score += 3;
  if (product.sales_count > 100) score += 2;
  
  return score;
}

/**
 * Destaca termos de busca no texto
 */
export function highlightSearchTerms(
  text: string,
  searchTerms: string[]
): string {
  let highlighted = text;
  
  searchTerms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
} 