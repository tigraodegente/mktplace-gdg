export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function createSearchVariations(query: string): string[] {
  const normalized = normalizeText(query);
  const variations = [query, normalized];
  
  // Adicionar variações específicas para palavras comuns
  const replacements: Record<string, string[]> = {
    'berco': ['berço', 'berco'],
    'bebe': ['bebê', 'bebe'],
    'lencol': ['lençol', 'lencol'],
    'cha': ['chá', 'cha'],
    'pe': ['pé', 'pe'],
    'organizacao': ['organização', 'organizacao'],
    'decoracao': ['decoração', 'decoracao']
  };
  
  for (const [key, values] of Object.entries(replacements)) {
    if (normalized.includes(key)) {
      for (const value of values) {
        const variation = query.toLowerCase().replace(new RegExp(key, 'g'), value);
        if (!variations.includes(variation)) {
          variations.push(variation);
        }
      }
    }
  }
  
  return [...new Set(variations)];
} 