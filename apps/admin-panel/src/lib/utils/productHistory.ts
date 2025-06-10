/**
 * Sistema Avançado de Histórico de Produtos
 * Captura TODAS as alterações com precisão
 */

// Mapeamento de campos para nomes amigáveis
const FIELD_LABELS: Record<string, string> = {
  // Básicos
  name: 'Nome',
  slug: 'Slug/URL',
  sku: 'SKU',
  barcode: 'Código de Barras',
  model: 'Modelo',
  description: 'Descrição',
  short_description: 'Descrição Curta',
  
  // Preços
  price: 'Preço',
  original_price: 'Preço Original',
  sale_price: 'Preço de Venda',
  cost: 'Custo',
  regular_price: 'Preço Regular',
  markup_percentage: 'Margem (%)',
  
  // Status e Configurações
  is_active: 'Status Ativo',
  status: 'Status',
  featured: 'Produto em Destaque',
  condition: 'Condição',
  
  // Estoque
  quantity: 'Quantidade em Estoque',
  stock_location: 'Localização do Estoque',
  track_inventory: 'Controlar Estoque',
  allow_backorder: 'Permitir Pré-venda',
  
  // Relacionamentos
  category_id: 'Categoria',
  brand_id: 'Marca',
  seller_id: 'Vendedor',
  
  // Dimensões e Peso
  weight: 'Peso',
  height: 'Altura',
  width: 'Largura',
  length: 'Comprimento',
  
  // Frete
  has_free_shipping: 'Frete Grátis',
  delivery_days_min: 'Prazo Mínimo (dias)',
  delivery_days_max: 'Prazo Máximo (dias)',
  seller_state: 'Estado do Vendedor',
  seller_city: 'Cidade do Vendedor',
  requires_shipping: 'Requer Frete',
  is_digital: 'Produto Digital',
  
  // SEO
  meta_title: 'Título SEO',
  meta_description: 'Descrição SEO',
  meta_keywords: 'Palavras-chave SEO',
  og_title: 'Título Open Graph',
  og_description: 'Descrição Open Graph',
  og_image: 'Imagem Open Graph',
  canonical_url: 'URL Canônica',
  seo_index: 'Indexar no Google',
  seo_follow: 'Seguir Links',
  
  // Arrays e Objetos
  tags: 'Tags',
  images: 'Imagens',
  attributes: 'Atributos para Filtros',
  specifications: 'Especificações Técnicas',
  
  // Avançado
  warranty_period: 'Período de Garantia',
  manufacturing_country: 'País de Fabricação',
  tax_class: 'Classe Tributária',
  care_instructions: 'Instruções de Cuidado',
  safety_certifications: 'Certificações de Segurança',
  age_group: 'Faixa Etária',
  
  // Variações
  has_variants: 'Possui Variações',
  product_options: 'Opções do Produto',
  product_variants: 'Variações do Produto'
};

// Campos que devem ser ignorados na comparação
const IGNORED_FIELDS = new Set([
  'id',
  'created_at',
  'updated_at',
  '_related_categories',
  '_suggested_variations',
  'tags_input',
  'meta_keywords_input',
  'cost_price',
  'sale_price', 
  'regular_price',
  'category_name',
  'brand_name',
  'vendor_name',
  'seller_name',
  'categories',
  'category_ids',
  'related_products',
  'upsell_products',
  'download_files',
  'images', // Ignorar por enquanto, tem lógica específica
  'product_options',
  'product_variants',
  'variant_type',
  'related_product_ids',
  'upsell_product_ids',
  'custom_fields'
]);

// Tipos de alteração para melhor categorização
export type ChangeType = 
  | 'basic_info'     // Nome, SKU, descrição
  | 'pricing'        // Preços, custos, margens
  | 'inventory'      // Estoque, localização
  | 'categories'     // Categoria, marca
  | 'attributes'     // Atributos para filtros
  | 'specifications' // Especificações técnicas
  | 'media'          // Imagens, arquivos
  | 'seo'            // Meta tags, SEO
  | 'shipping'       // Frete, dimensões
  | 'variants'       // Variações e opções
  | 'status'         // Status ativo, destaque
  | 'advanced';      // Outros campos

export interface DetailedChange {
  field: string;
  label: string;
  old: any;
  new: any;
  type: ChangeType;
  formatted?: {
    old: string;
    new: string;
  };
}

export interface ProductHistoryData {
  action: 'created' | 'updated' | 'deleted' | 'published' | 'unpublished' | 'duplicated';
  changes: Record<string, DetailedChange>;
  summary: string;
  totalChanges: number;
  changesByType: Record<ChangeType, number>;
}

/**
 * Compara dois estados de produto e retorna diferenças detalhadas
 */
export function compareProductStates(
  originalData: Record<string, any>,
  newData: Record<string, any>
): ProductHistoryData {
  const changes: Record<string, DetailedChange> = {};
  
  // Combinar todas as chaves de ambos os objetos
  const allKeys = new Set([
    ...Object.keys(originalData || {}),
    ...Object.keys(newData || {})
  ]);
  
  for (const key of allKeys) {
    // Pular campos ignorados
    if (IGNORED_FIELDS.has(key)) continue;
    
    const oldValue = originalData?.[key];
    const newValue = newData?.[key];
    
    // Comparar valores
    if (!isEqual(oldValue, newValue)) {
      const change = createDetailedChange(key, oldValue, newValue);
      if (change) {
        changes[key] = change;
      }
    }
  }
  
  const totalChanges = Object.keys(changes).length;
  const changesByType = countChangesByType(changes);
  const summary = generateSummary(changes, totalChanges);
  
  return {
    action: totalChanges > 0 ? 'updated' : 'created',
    changes,
    summary,
    totalChanges,
    changesByType
  };
}

/**
 * Cria uma alteração detalhada para um campo específico
 */
function createDetailedChange(
  field: string, 
  oldValue: any, 
  newValue: any
): DetailedChange | null {
  const label = FIELD_LABELS[field] || formatFieldName(field);
  const type = getChangeType(field);
  
  const change: DetailedChange = {
    field,
    label,
    old: oldValue,
    new: newValue,
    type,
    formatted: formatValues(field, oldValue, newValue)
  };
  
  return change;
}

/**
 * Determina o tipo de alteração baseado no campo
 */
function getChangeType(field: string): ChangeType {
  if (['name', 'slug', 'sku', 'barcode', 'model', 'description', 'short_description'].includes(field)) {
    return 'basic_info';
  }
  
  if (['price', 'original_price', 'sale_price', 'cost', 'regular_price', 'markup_percentage'].includes(field)) {
    return 'pricing';
  }
  
  if (['quantity', 'stock_location', 'track_inventory', 'allow_backorder'].includes(field)) {
    return 'inventory';
  }
  
  if (['category_id', 'brand_id', 'seller_id'].includes(field)) {
    return 'categories';
  }
  
  if (field === 'attributes') {
    return 'attributes';
  }
  
  if (field === 'specifications') {
    return 'specifications';
  }
  
  if (['images', 'gallery'].includes(field)) {
    return 'media';
  }
  
  if (['meta_title', 'meta_description', 'meta_keywords', 'og_title', 'og_description', 'og_image', 'canonical_url', 'seo_index', 'seo_follow'].includes(field)) {
    return 'seo';
  }
  
  if (['weight', 'height', 'width', 'length', 'has_free_shipping', 'delivery_days_min', 'delivery_days_max', 'requires_shipping', 'is_digital'].includes(field)) {
    return 'shipping';
  }
  
  if (['has_variants', 'product_options', 'product_variants'].includes(field)) {
    return 'variants';
  }
  
  if (['is_active', 'status', 'featured', 'condition'].includes(field)) {
    return 'status';
  }
  
  return 'advanced';
}

/**
 * Formata valores para exibição amigável
 */
function formatValues(field: string, oldValue: any, newValue: any): { old: string; new: string } {
  return {
    old: formatSingleValue(field, oldValue),
    new: formatSingleValue(field, newValue)
  };
}

/**
 * Formata um único valor para exibição
 */
function formatSingleValue(field: string, value: any): string {
  if (value === null || value === undefined) {
    return 'Não definido';
  }
  
  // Valores booleanos
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  
  // Preços
  if (['price', 'original_price', 'sale_price', 'cost', 'regular_price'].includes(field)) {
    const num = parseFloat(value);
    return isNaN(num) ? String(value) : `R$ ${num.toFixed(2)}`;
  }
  
  // Percentuais
  if (field === 'markup_percentage') {
    const num = parseFloat(value);
    return isNaN(num) ? String(value) : `${num.toFixed(1)}%`;
  }
  
  // Dimensões e peso
  if (['weight', 'height', 'width', 'length'].includes(field)) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    if (field === 'weight') {
      return `${num} kg`;
    } else {
      return `${num} cm`;
    }
  }
  
  // Arrays (tags, images)
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Nenhum';
    
    if (field === 'tags') {
      return value.join(', ');
    }
    
    if (field === 'images') {
      return `${value.length} imagem${value.length !== 1 ? 'ns' : ''}`;
    }
    
    if (field === 'meta_keywords') {
      return value.join(', ');
    }
    
    return `${value.length} item${value.length !== 1 ? 's' : ''}`;
  }
  
  // Objetos (attributes, specifications)
  if (typeof value === 'object' && value !== null) {
    if (field === 'attributes') {
      const keys = Object.keys(value);
      if (keys.length === 0) return 'Nenhum atributo';
      
      const summary = keys.map(key => {
        const values = Array.isArray(value[key]) ? value[key] : [value[key]];
        return `${key}: ${values.join(', ')}`;
      }).join(' | ');
      
      return summary.length > 100 ? `${keys.length} atributo${keys.length !== 1 ? 's' : ''}` : summary;
    }
    
    if (field === 'specifications') {
      const keys = Object.keys(value);
      if (keys.length === 0) return 'Nenhuma especificação';
      
      return `${keys.length} especificação${keys.length !== 1 ? 'ões' : ''}`;
    }
    
    return 'Objeto complexo';
  }
  
  // String longa - truncar
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...';
  }
  
  return String(value);
}

/**
 * Conta alterações por tipo
 */
function countChangesByType(changes: Record<string, DetailedChange>): Record<ChangeType, number> {
  const counts: Record<ChangeType, number> = {
    basic_info: 0,
    pricing: 0,
    inventory: 0,
    categories: 0,
    attributes: 0,
    specifications: 0,
    media: 0,
    seo: 0,
    shipping: 0,
    variants: 0,
    status: 0,
    advanced: 0
  };
  
  Object.values(changes).forEach(change => {
    counts[change.type]++;
  });
  
  return counts;
}

/**
 * Gera resumo inteligente das alterações
 */
function generateSummary(changes: Record<string, DetailedChange>, totalChanges: number): string {
  if (totalChanges === 0) {
    return 'Nenhuma alteração detectada';
  }
  
  if (totalChanges === 1) {
    const change = Object.values(changes)[0];
    return `${change.label} alterado`;
  }
  
  if (totalChanges === 2) {
    const changesList = Object.values(changes);
    return `${changesList[0].label} e ${changesList[1].label} alterados`;
  }
  
  if (totalChanges === 3) {
    const changesList = Object.values(changes);
    return `${changesList[0].label}, ${changesList[1].label} e ${changesList[2].label} alterados`;
  }
  
  // Para 4 ou mais alterações, mostrar as principais
  const allChanges = Object.values(changes);
  
  // Priorizar alterações mais importantes
  const priorityFields = ['name', 'price', 'sku', 'quantity', 'is_active', 'status'];
  const priorityChanges = allChanges.filter(change => priorityFields.includes(change.field));
  
  if (priorityChanges.length > 0) {
    if (priorityChanges.length === 1 && totalChanges <= 5) {
      // Mostrar o campo principal + alguns outros
      const otherChanges = allChanges.filter(c => !priorityFields.includes(c.field)).slice(0, 2);
      if (otherChanges.length === 1) {
        return `${priorityChanges[0].label} e ${otherChanges[0].label} alterados`;
      } else if (otherChanges.length === 2) {
        return `${priorityChanges[0].label}, ${otherChanges[0].label} e ${otherChanges[1].label} alterados`;
      }
    }
    
    if (priorityChanges.length >= 2) {
      return `${priorityChanges[0].label}, ${priorityChanges[1].label} e outros ${totalChanges - 2} campos alterados`;
    }
    
    return `${priorityChanges[0].label} e outros ${totalChanges - 1} campos alterados`;
  }
  
  // Se não há campos prioritários, listar alguns campos normais
  const firstThree = allChanges.slice(0, 3);
  if (totalChanges <= 3) {
    return firstThree.map(c => c.label).join(', ') + ' alterados';
  }
  
  return `${firstThree[0].label}, ${firstThree[1].label} e outros ${totalChanges - 2} campos alterados`;
}

/**
 * Nome amigável para tipos de alteração
 */
function getTypeDisplayName(type: ChangeType): string {
  const typeNames: Record<ChangeType, string> = {
    basic_info: 'informações básicas',
    pricing: 'preços',
    inventory: 'estoque',
    categories: 'categorização',
    attributes: 'atributos',
    specifications: 'especificações',
    media: 'mídia',
    seo: 'SEO',
    shipping: 'frete',
    variants: 'variações',
    status: 'status',
    advanced: 'configurações avançadas'
  };
  
  return typeNames[type] || type;
}

/**
 * Formata nome de campo quando não há label específico
 */
function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Comparação profunda de valores (incluindo arrays e objetos)
 * Otimizada para detecção de alterações em produtos
 */
function isEqual(a: any, b: any): boolean {
  // Mesma referência
  if (a === b) return true;
  
  // Normalizar valores null/undefined/empty
  const normalizedA = normalizeValue(a);
  const normalizedB = normalizeValue(b);
  
  // Após normalização, se são iguais
  if (normalizedA === normalizedB) return true;
  
  // Um é null/undefined e outro não (após normalização)
  if ((normalizedA == null) !== (normalizedB == null)) return false;
  
  // Ambos null/undefined
  if (normalizedA == null && normalizedB == null) return true;
  
  // Comparação de números com tolerância para conversões
  if (isNumeric(normalizedA) && isNumeric(normalizedB)) {
    return Number(normalizedA) === Number(normalizedB);
  }
  
  // Tipos diferentes
  if (typeof normalizedA !== typeof normalizedB) return false;
  
  // Arrays
  if (Array.isArray(normalizedA) && Array.isArray(normalizedB)) {
    if (normalizedA.length !== normalizedB.length) return false;
    return normalizedA.every((item, index) => isEqual(item, normalizedB[index]));
  }
  
  // Objetos
  if (typeof normalizedA === 'object' && typeof normalizedB === 'object') {
    const keysA = Object.keys(normalizedA);
    const keysB = Object.keys(normalizedB);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && isEqual(normalizedA[key], normalizedB[key])
    );
  }
  
  // Primitivos
  return normalizedA === normalizedB;
}

/**
 * Normaliza valores para comparação consistente
 */
function normalizeValue(value: any): any {
  // null, undefined, string vazia viram null
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Arrays vazios viram null
  if (Array.isArray(value) && value.length === 0) {
    return null;
  }
  
  // Objetos vazios viram null
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
    return null;
  }
  
  // Strings que representam números
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value);
  }
  
  // Strings 'true'/'false' viram boolean
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  
  return value;
}

/**
 * Verifica se um valor pode ser tratado como número
 */
function isNumeric(value: any): boolean {
  return !isNaN(value) && !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Função para registrar histórico na API
 */
export async function logProductHistory(
  productId: string,
  action: string,
  changes: Record<string, any>,
  customSummary?: string
): Promise<boolean> {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('Token não encontrado para registrar histórico');
      return false;
    }
    
    const response = await fetch(`/api/products/${productId}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action,
        changes,
        summary: customSummary
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Histórico registrado com sucesso');
      return true;
    } else {
      console.warn('⚠️ Erro ao registrar histórico:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao registrar histórico:', error);
    return false;
  }
} 