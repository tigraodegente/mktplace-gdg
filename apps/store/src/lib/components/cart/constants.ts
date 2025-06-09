// Constantes do Carrinho
export const CART_CONSTANTS = {
  // Limites
  MAX_QUANTITY_PER_ITEM: 99,
  MIN_QUANTITY: 1,
  
  // Frete - VALORES MOVIDOS PARA O BANCO DE DADOS
  // FREE_SHIPPING_THRESHOLD: 199, // REMOVIDO - agora vem do banco
  DEFAULT_SHIPPING_DAYS: 5,
  EXPRESS_SHIPPING_DAYS: 2,
  
  // Cupons
  AVAILABLE_COUPONS: [
    { code: 'BEMVINDO10', description: '10% de desconto na primeira compra' },
    { code: 'FRETE20', description: 'R$ 20 de desconto no frete' },
    { code: 'NATAL15', description: '15% de desconto em produtos selecionados' }
  ],
  
  // Animações
  ANIMATION_DURATION: 300,
  MODAL_ANIMATION_DURATION: 200,
  
  // Mensagens
  MESSAGES: {
    EMPTY_CART: 'Seu carrinho está vazio',
    EMPTY_CART_SUBTITLE: 'Adicione produtos para continuar comprando',
    STOCK_ALERT: 'Estoque limitado!',
    LAST_UNIT: 'Última unidade!',
    FREE_SHIPPING: 'Frete grátis',
    CALCULATING_SHIPPING: 'Calculando...',
    INVALID_ZIP: 'CEP deve ter 8 dígitos',
    ZIP_NOT_FOUND: 'CEP não encontrado',
    COUPON_APPLIED: 'Cupom aplicado com sucesso!',
    INVALID_COUPON: 'Cupom inválido ou expirado',
    SHARE_SUCCESS: 'Link copiado!',
    SHARE_ERROR: 'Erro ao copiar link'
  },
  
  // Cores do tema
  COLORS: {
    PRIMARY: '#00BFB3',
    PRIMARY_DARK: '#00A89D',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    GRAY: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    }
  }
};

// Tipos de modalidade de frete
export const SHIPPING_MODES = {
  INDIVIDUAL: 'individual',
  GROUPED: 'grouped',
  EXPRESS: 'express'
} as const;

// Status de cupom
export const COUPON_STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  EXPIRED: 'expired',
  ALREADY_USED: 'already_used'
} as const; 