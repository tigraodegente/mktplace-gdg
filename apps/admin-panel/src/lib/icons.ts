// Sistema centralizado de ícones e emojis do Admin Panel

export const EMOJIS = {
  // Produtos
  product: '📝',
  sku: '🏷️',
  url: '🔗',
  description: '📄',
  fullDescription: '📝',
  brand: '🏢',
  category: '📂',
  seller: '👤',
  status: '📊',
  date: '📅',
  active: '🟢',
  featured: '⭐',
  
  // Preços e Finanças
  price: '💰',
  cost: '💵',
  margin: '📈',
  profit: '💹',
  discount: '🏷️',
  
  // Estoque e Inventário
  stock: '📦',
  quantity: '🔢',
  weight: '⚖️',
  dimensions: '📏',
  warehouse: '🏪',
  
  // Categorização
  tags: '🏷️',
  keywords: '🔖',
  collection: '📂',
  
  // Imagens e Mídia
  images: '🖼️',
  gallery: '🎨',
  video: '🎬',
  
  // SEO e Marketing
  seo: '🔍',
  meta: '📋',
  robots: '🤖',
  canonical: '🔗',
  
  // Variações
  variants: '🎨',
  options: '⚙️',
  combinations: '🔄',
  
  // Avançado
  advanced: '⚙️',
  shipping: '🚚',
  digital: '💾',
  taxes: '📊',
  warranty: '🛡️',
  country: '🌍',
  condition: '🔍',
  
  // Status
  draft: '📝',
  published: '✅',
  inactive: '❌',
  archived: '📦'
} as const;

export const SVGS = {
  // Ações básicas
  edit: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />`,
  
  delete: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />`,
  
  add: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />`,
  
  save: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />`,
  
  close: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`,
  
  search: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />`,
  
  // Status
  check: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`,
  
  x: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`,
  
  warning: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />`,
  
  info: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
  
  // IA e Automação
  ai: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />`,
  
  refresh: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`,
  
  // Menu e Navegação
  menu: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />`,
  
  settings: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />`,
  
  // Produtos específicos
  variants: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 011 1v1z" />`,
  
  link: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />`,
  
  tag: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />`
} as const;

// Componente utilitário para ícones SVG
export function createIcon(iconName: keyof typeof SVGS, className: string = 'w-5 h-5') {
  return `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${SVGS[iconName]}</svg>`;
}

// Função para obter emoji
export function getEmoji(emojiName: keyof typeof EMOJIS): string {
  return EMOJIS[emojiName];
}

// Mapeamento de cores por contexto
export const ICON_COLORS = {
  primary: 'text-[#00BFB3]',
  secondary: 'text-slate-600',
  success: 'text-green-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-blue-600'
} as const; 