// Configuração centralizada de cores e tema
export const theme = {
  colors: {
    primary: '#00BFB3',
    primaryHover: '#00A89D',
    secondary: '#6B7280',
    danger: '#DC2626',
    dangerHover: '#B91C1C',
    success: '#16A34A',
    warning: '#D97706',
    info: '#2563EB'
  },
  
  // Classes Tailwind para botões
  buttons: {
    primary: 'bg-[#00BFB3] hover:bg-[#00A89D] text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
    link: 'bg-transparent hover:underline text-[#00BFB3] p-0'
  },
  
  // Classes para cards de estatísticas
  statsCards: {
    total: {
      bg: 'bg-[#00BFB3]/10',
      icon: '#00BFB3'
    },
    active: {
      bg: 'bg-green-100',
      icon: '#16A34A'
    },
    warning: {
      bg: 'bg-amber-100',
      icon: '#D97706'
    },
    danger: {
      bg: 'bg-red-100',
      icon: '#DC2626'
    }
  }
} as const; 