/**
 * Templates de colunas pré-configurados
 * Centraliza TODAS as configurações de colunas reutilizáveis
 */

import { 
  statusRenderer, 
  productStatusRenderer,
  orderStatusRenderer,
  priceRenderer, 
  dateRenderer, 
  dateTimeRenderer,
  imageRenderer,
  productImageRenderer,
  stockRenderer,
  productInfoRenderer,
  customerRenderer,
  orderIdRenderer,
  numberRenderer,
  percentageRenderer,
  booleanRenderer,
  phoneRenderer,
  documentRenderer,
  ratingRenderer
} from './tableRenderers';

// Interface para colunas tipadas
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
  render?: (value: any, row: T) => string;
}

/**
 * Templates básicos - funciona para qualquer entidade
 */
export const ColumnTemplates = {
  // IDs e identificadores
  id: (label = 'ID', width = '100px'): TableColumn => ({
    key: 'id',
    label,
    width,
    sortable: true,
    render: (value: string) => `<span class="font-mono text-sm">${value}</span>`
  }),

  shortId: (label = 'ID', width = '120px'): TableColumn => ({
    key: 'id', 
    label,
    width,
    render: (value: string) => `<span class="font-mono text-sm">${value?.slice(0, 8) || 'N/A'}</span>`
  }),

  // Nomes e títulos
  name: (label = 'Nome'): TableColumn => ({
    key: 'name',
    label,
    sortable: true,
    render: (value: string) => `<span class="font-medium text-gray-900">${value || 'Sem nome'}</span>`
  }),

  title: (label = 'Título'): TableColumn => ({
    key: 'title',
    label,
    sortable: true,
    render: (value: string) => `<span class="font-medium text-gray-900">${value || 'Sem título'}</span>`
  }),

  // Status genérico
  status: (label = 'Status'): TableColumn => ({
    key: 'status',
    label,
    sortable: true,
    align: 'center',
    render: statusRenderer
  }),

  // Preços e valores
  price: (key = 'price', label = 'Preço'): TableColumn => ({
    key,
    label,
    sortable: true,
    align: 'right',
    render: priceRenderer
  }),

  // Datas
  date: (key = 'created_at', label = 'Data'): TableColumn => ({
    key,
    label,
    sortable: true,
    hideOnMobile: true,
    render: dateRenderer
  }),

  dateTime: (key = 'created_at', label = 'Data/Hora'): TableColumn => ({
    key,
    label,
    sortable: true,
    hideOnMobile: true,
    render: dateTimeRenderer
  }),

  // Imagens
  image: (key = 'image', label = 'Imagem', width = '80px'): TableColumn => ({
    key,
    label,
    width,
    align: 'center',
    render: imageRenderer
  }),

  // Números
  number: (key: string, label: string): TableColumn => ({
    key,
    label,
    sortable: true,
    align: 'right',
    render: numberRenderer
  }),

  percentage: (key: string, label: string): TableColumn => ({
    key,
    label,
    sortable: true,
    align: 'right',
    render: percentageRenderer
  }),

  // Booleanos
  boolean: (key: string, label: string): TableColumn => ({
    key,
    label,
    sortable: true,
    align: 'center',
    render: booleanRenderer
  }),

  // Contatos
  phone: (key = 'phone', label = 'Telefone'): TableColumn => ({
    key,
    label,
    hideOnMobile: true,
    render: phoneRenderer
  }),

  email: (key = 'email', label = 'E-mail'): TableColumn => ({
    key,
    label,
    hideOnMobile: true,
    render: (value: string) => `<span class="text-blue-600">${value || '-'}</span>`
  }),

  document: (key = 'document', label = 'CPF/CNPJ'): TableColumn => ({
    key,
    label,
    hideOnMobile: true,
    render: documentRenderer
  }),

  // Avaliações
  rating: (key = 'rating', label = 'Avaliação'): TableColumn => ({
    key,
    label,
    sortable: true,
    align: 'center',
    render: ratingRenderer
  })
};

/**
 * Templates específicos para produtos
 */
export const ProductColumns = {
  image: (): TableColumn => ({
    key: 'images',
    label: 'Imagem',
    width: '80px',
    align: 'center',
    render: productImageRenderer
  }),

  info: (): TableColumn => ({
    key: 'name',
    label: 'Produto',
    sortable: true,
    render: productInfoRenderer
  }),

  status: (): TableColumn => ({
    key: 'is_active',
    label: 'Status',
    sortable: true,
    align: 'center',
    render: productStatusRenderer
  }),

  stock: (): TableColumn => ({
    key: 'stock_quantity',
    label: 'Estoque',
    sortable: true,
    align: 'center',
    render: stockRenderer
  }),

  category: (): TableColumn => ({
    key: 'category',
    label: 'Categoria',
    sortable: true,
    hideOnMobile: true,
    render: (value: any) => `<span class="text-sm">${value?.name || 'Sem categoria'}</span>`
  }),

  brand: (): TableColumn => ({
    key: 'brand',
    label: 'Marca',
    sortable: true,
    hideOnMobile: true,
    render: (value: any) => `<span class="text-sm">${value?.name || 'Sem marca'}</span>`
  })
};

/**
 * Templates específicos para pedidos
 */
export const OrderColumns = {
  id: (): TableColumn => ({
    key: 'id',
    label: 'Pedido',
    width: '120px',
    render: orderIdRenderer
  }),

  customer: (): TableColumn => ({
    key: 'customer',
    label: 'Cliente',
    sortable: true,
    render: customerRenderer
  }),

  status: (): TableColumn => ({
    key: 'status',
    label: 'Status',
    sortable: true,
    align: 'center',
    render: orderStatusRenderer
  }),

  total: (): TableColumn => ({
    key: 'total',
    label: 'Total',
    sortable: true,
    align: 'right',
    render: priceRenderer
  }),

  items: (): TableColumn => ({
    key: 'items_count',
    label: 'Itens',
    sortable: true,
    align: 'center',
    hideOnMobile: true,
    render: (value: number) => `<span class="font-medium">${value || 0}</span>`
  }),

  payment: (): TableColumn => ({
    key: 'payment_method',
    label: 'Pagamento',
    hideOnMobile: true,
    render: (value: string) => `<span class="text-sm">${value || 'Não informado'}</span>`
  })
};

/**
 * Templates específicos para usuários
 */
export const UserColumns = {
  avatar: (): TableColumn => ({
    key: 'avatar',
    label: 'Avatar',
    width: '60px',
    align: 'center',
    render: (value: string, row: any) => {
      const imageUrl = value || `/api/placeholder/48/48?text=${encodeURIComponent((row.name || 'U').charAt(0))}`;
      return `<img src="${imageUrl}" alt="${row.name || 'Usuário'}" class="w-10 h-10 rounded-full object-cover" />`;
    }
  }),

  info: (): TableColumn => ({
    key: 'name',
    label: 'Usuário',
    sortable: true,
    render: (value: string, row: any) => `
      <div>
        <div class="font-medium text-gray-900">${value || 'Sem nome'}</div>
        <div class="text-sm text-gray-500">${row.email || 'Sem email'}</div>
      </div>
    `
  }),

  role: (): TableColumn => ({
    key: 'role',
    label: 'Função',
    sortable: true,
    align: 'center',
    render: (value: string) => {
      const roleNames = {
        admin: 'Administrador',
        seller: 'Vendedor', 
        customer: 'Cliente',
        manager: 'Gerente'
      };
      const roleColors = {
        admin: 'bg-red-100 text-red-800',
        seller: 'bg-blue-100 text-blue-800',
        customer: 'bg-green-100 text-green-800',
        manager: 'bg-purple-100 text-purple-800'
      };
      const name = (roleNames as any)[value] || value;
      const color = (roleColors as any)[value] || 'bg-gray-100 text-gray-800';
      return `<span class="px-2 py-1 text-xs font-medium rounded-full ${color}">${name}</span>`;
    }
  }),

  lastLogin: (): TableColumn => ({
    key: 'last_login',
    label: 'Último acesso',
    sortable: true,
    hideOnMobile: true,
    render: (value: string) => {
      if (!value) return '<span class="text-gray-400">Nunca</span>';
      const date = new Date(value);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '<span class="text-green-600">Hoje</span>';
      if (diffDays === 1) return '<span class="text-yellow-600">Ontem</span>';
      if (diffDays < 7) return `<span class="text-yellow-600">${diffDays} dias</span>`;
      return `<span class="text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
    }
  })
};

/**
 * Conjuntos de colunas pré-configurados para páginas completas
 */
export const PageColumnSets = {
  produtos: [
    ProductColumns.image(),
    ProductColumns.info(),
    ColumnTemplates.price('price', 'Preço'),
    ProductColumns.stock(),
    ProductColumns.category(),
    ProductColumns.status(),
    ColumnTemplates.date('created_at', 'Criado em')
  ],

  pedidos: [
    OrderColumns.id(),
    OrderColumns.customer(),
    OrderColumns.total(),
    OrderColumns.status(),
    OrderColumns.items(),
    ColumnTemplates.date('created_at', 'Data')
  ],

  usuarios: [
    UserColumns.avatar(),
    UserColumns.info(),
    UserColumns.role(),
    UserColumns.lastLogin(),
    ColumnTemplates.boolean('is_active', 'Ativo'),
    ColumnTemplates.date('created_at', 'Cadastrado em')
  ],

  categorias: [
    ColumnTemplates.image('image', 'Ícone'),
    ColumnTemplates.name('Categoria'),
    ColumnTemplates.number('products_count', 'Produtos'),
    ColumnTemplates.boolean('is_active', 'Ativo'),
    ColumnTemplates.date('created_at', 'Criado em')
  ],

  marcas: [
    ColumnTemplates.image('logo', 'Logo'),
    ColumnTemplates.name('Marca'),
    ColumnTemplates.number('products_count', 'Produtos'),
    ColumnTemplates.boolean('is_active', 'Ativo'),
    ColumnTemplates.date('created_at', 'Criado em')
  ],

  cupons: [
    ColumnTemplates.name('code', 'Código'),
    ColumnTemplates.name('name', 'Nome'),
    ColumnTemplates.percentage('discount_value', 'Desconto'),
    ColumnTemplates.number('usage_count', 'Usos'),
    ColumnTemplates.date('expires_at', 'Expira em'),
    ColumnTemplates.boolean('is_active', 'Ativo')
  ]
}; 