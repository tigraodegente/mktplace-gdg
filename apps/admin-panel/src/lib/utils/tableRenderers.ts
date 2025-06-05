/**
 * Renderers centralizados para colunas de tabela
 * Centraliza TODA a formatação visual
 */

// Tipos para melhor tipagem
type StatusType = 'active' | 'inactive' | 'pending' | 'draft' | 'cancelled' | 'processing' | 'shipped' | 'delivered';
type StatusConfig = {
  class: string;
  label: string;
};

// Configurações de status reutilizáveis
const STATUS_CONFIGS: Record<StatusType, StatusConfig> = {
  active: { class: 'bg-green-100 text-green-800', label: 'Ativo' },
  inactive: { class: 'bg-gray-100 text-gray-800', label: 'Inativo' },
  pending: { class: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
  draft: { class: 'bg-gray-100 text-gray-800', label: 'Rascunho' },
  cancelled: { class: 'bg-red-100 text-red-800', label: 'Cancelado' },
  processing: { class: 'bg-blue-100 text-blue-800', label: 'Processando' },
  shipped: { class: 'bg-purple-100 text-purple-800', label: 'Enviado' },
  delivered: { class: 'bg-green-100 text-green-800', label: 'Entregue' }
};

// Renderer para status genérico
export const statusRenderer = (value: string): string => {
  const config = STATUS_CONFIGS[value as StatusType] || STATUS_CONFIGS.inactive;
  return `<span class="px-2 py-1 text-xs font-medium rounded-full ${config.class}">${config.label}</span>`;
};

// Renderer para status de produtos
export const productStatusRenderer = (row: any): string => {
  const status = row.is_active ? 'active' : 'inactive';
  return statusRenderer(status);
};

// Renderer para status de pedidos
export const orderStatusRenderer = (value: string): string => {
  const ORDER_LABELS: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando', 
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  };
  
  const label = ORDER_LABELS[value] || value;
  const config = STATUS_CONFIGS[value as StatusType] || STATUS_CONFIGS.pending;
  
  return `<span class="px-2 py-1 text-xs font-medium rounded-full ${config.class}">${label}</span>`;
};

// Renderer para preços
export const priceRenderer = (value: number): string => {
  if (typeof value !== 'number') return '-';
  return `<span class="font-medium">R$ ${value.toFixed(2)}</span>`;
};

// Renderer para datas
export const dateRenderer = (value: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
};

// Renderer para data e hora
export const dateTimeRenderer = (value: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`;
};

// Renderer para imagens
export const imageRenderer = (value: string, alt: string = 'Imagem'): string => {
  if (!value) return `<div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">Sem imagem</div>`;
  return `<img src="${value}" alt="${alt}" class="w-12 h-12 rounded-lg object-cover" />`;
};

// Renderer para imagem de produto
export const productImageRenderer = (value: string, row: any): string => {
  const imageUrl = row.images?.[0] || value || `/api/placeholder/60/60?text=${encodeURIComponent(row.name || 'Produto')}`;
  return imageRenderer(imageUrl, row.name || 'Produto');
};

// Renderer para estoque com cores
export const stockRenderer = (value: number): string => {
  if (typeof value !== 'number') return '-';
  
  let colorClass = 'bg-green-100 text-green-800'; // Estoque normal
  if (value === 0) colorClass = 'bg-red-100 text-red-800'; // Sem estoque
  else if (value < 10) colorClass = 'bg-yellow-100 text-yellow-800'; // Estoque baixo
  
  return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${value}</span>`;
};

// Renderer para informações de produto (nome + SKU)
export const productInfoRenderer = (value: string, row: any): string => {
  return `
    <div>
      <div class="font-medium text-gray-900">${row.name || 'Sem nome'}</div>
      <div class="text-sm text-gray-500">SKU: ${row.sku || 'N/A'}</div>
    </div>
  `;
};

// Renderer para informações de cliente
export const customerRenderer = (value: any): string => {
  const name = value?.name || value?.customer_name || 'Cliente não informado';
  const email = value?.email || value?.customer_email || 'Email não informado';
  
  return `
    <div>
      <div class="font-medium text-gray-900">${name}</div>
      <div class="text-sm text-gray-500">${email}</div>
    </div>
  `;
};

// Renderer para ID de pedido
export const orderIdRenderer = (value: string): string => {
  const shortId = value?.slice(0, 8) || 'N/A';
  return `<div class="font-mono text-sm font-medium">#${shortId}</div>`;
};

// Renderer para números formatados
export const numberRenderer = (value: number): string => {
  if (typeof value !== 'number') return '-';
  return `<span class="font-medium">${value.toLocaleString('pt-BR')}</span>`;
};

// Renderer para percentuais
export const percentageRenderer = (value: number): string => {
  if (typeof value !== 'number') return '-';
  return `<span class="font-medium">${value.toFixed(1)}%</span>`;
};

// Renderer para badges customizados
export const badgeRenderer = (value: string, variant: 'success' | 'warning' | 'danger' | 'info' = 'info'): string => {
  const variants = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800', 
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };
  
  return `<span class="px-2 py-1 text-xs font-medium rounded-full ${variants[variant]}">${value}</span>`;
};

// Renderer para links externos
export const linkRenderer = (value: string, text?: string): string => {
  if (!value) return '-';
  const displayText = text || value;
  return `<a href="${value}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">${displayText}</a>`;
};

// Renderer para telefones
export const phoneRenderer = (value: string): string => {
  if (!value) return '-';
  // Formato brasileiro: (11) 99999-9999
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    const formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    return `<span class="font-mono text-sm">${formatted}</span>`;
  }
  return `<span class="font-mono text-sm">${value}</span>`;
};

// Renderer para CPF/CNPJ
export const documentRenderer = (value: string): string => {
  if (!value) return '-';
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // CPF: 000.000.000-00
    const formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    return `<span class="font-mono text-sm">${formatted}</span>`;
  } else if (cleaned.length === 14) {
    // CNPJ: 00.000.000/0000-00
    const formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
    return `<span class="font-mono text-sm">${formatted}</span>`;
  }
  
  return `<span class="font-mono text-sm">${value}</span>`;
};

// Renderer booleano (Sim/Não)
export const booleanRenderer = (value: boolean): string => {
  const text = value ? 'Sim' : 'Não';
  const colorClass = value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${text}</span>`;
};

// Renderer para avaliações (estrelas)
export const ratingRenderer = (value: number): string => {
  if (typeof value !== 'number' || value < 0 || value > 5) return '-';
  
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(value)) return '★';
    if (i < value) return '☆';
    return '☆';
  }).join('');
  
  return `<span class="text-yellow-500 font-medium">${stars} ${value.toFixed(1)}</span>`;
}; 