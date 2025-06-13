// Tipos para o Sistema de Campos Virtuais

export interface VirtualField {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  formula: string;
  dependencies: string[];
  ai_enabled: boolean;
  ai_prompt?: string;
  entity_type: EntityType;
  field_type: FieldType;
  format_options: FormatOptions;
  validation_rules: ValidationRules;
  is_active: boolean;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormulaTemplate {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  formula_template: string;
  required_fields: string[];
  category: string;
  is_system: boolean;
  created_at: string;
}

export type EntityType = 'products' | 'orders' | 'users' | 'categories' | 'sellers';

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'boolean' 
  | 'currency' 
  | 'percentage' 
  | 'date' 
  | 'url' 
  | 'email';

export interface FormatOptions {
  decimals?: number;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  currency?: string;
  locale?: string;
  dateFormat?: string;
}

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string; // JavaScript function as string
}

export interface CalculationContext {
  entityData: Record<string, any>;
  virtualFields?: VirtualField[];
  currentUser?: any;
  settings?: any;
}

export interface CalculationResult {
  value: any;
  formatted_value: string;
  error?: string;
  dependencies_met: boolean;
  calculation_time_ms: number;
}

export interface VirtualFieldsResponse {
  success: boolean;
  data?: VirtualField[];
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface FormulaTemplatesResponse {
  success: boolean;
  data?: FormulaTemplate[];
  error?: string;
  categories?: string[];
}

// Para uso na interface administrativa
export interface VirtualFieldFormData {
  name: string;
  display_name: string;
  description: string;
  formula: string;
  dependencies: string[];
  ai_enabled: boolean;
  ai_prompt: string;
  entity_type: EntityType;
  field_type: FieldType;
  format_options: FormatOptions;
  validation_rules: ValidationRules;
  is_active: boolean;
  sort_order: number;
}

// Para cálculos em lote
export interface BatchCalculationRequest {
  entity_type: EntityType;
  entity_ids: string[];
  virtual_field_names?: string[]; // Se não especificado, calcula todos
}

export interface BatchCalculationResponse {
  success: boolean;
  results: Record<string, Record<string, CalculationResult>>;
  errors?: Record<string, string>;
  timing: {
    total_time_ms: number;
    per_entity_avg_ms: number;
  };
}

// Para sistema de cache
export interface CachedCalculation {
  entity_id: string;
  field_name: string;
  value: any;
  formatted_value: string;
  calculated_at: string;
  expires_at: string;
  dependencies_hash: string;
}

// Para logs e auditoria
export interface CalculationLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  virtual_field_name: string;
  input_data: Record<string, any>;
  output_value: any;
  calculation_time_ms: number;
  error?: string;
  created_at: string;
  created_by?: string;
}

// Para integração com IA
export interface AICalculationRequest {
  virtual_field: VirtualField;
  context: CalculationContext;
  current_value?: any;
}

export interface AICalculationResponse {
  suggested_value: any;
  confidence: number;
  reasoning: string;
  alternative_values?: Array<{
    value: any;
    reasoning: string;
    confidence: number;
  }>;
}

// Utilitários para validação
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// Para filtros e busca
export interface VirtualFieldFilters {
  entity_type?: EntityType;
  field_type?: FieldType;
  ai_enabled?: boolean;
  is_active?: boolean;
  category?: string;
  search?: string;
  created_by?: string;
  created_after?: string;
  created_before?: string;
}

// Para estatísticas e relatórios
export interface VirtualFieldStats {
  total_fields: number;
  active_fields: number;
  ai_enabled_fields: number;
  by_entity_type: Record<EntityType, number>;
  by_field_type: Record<FieldType, number>;
  most_used_dependencies: Array<{
    field: string;
    usage_count: number;
  }>;
  performance_metrics: {
    avg_calculation_time_ms: number;
    slowest_fields: Array<{
      field_name: string;
      avg_time_ms: number;
    }>;
  };
}

// Para importação/exportação
export interface VirtualFieldExport {
  virtual_fields: VirtualField[];
  formula_templates: FormulaTemplate[];
  export_metadata: {
    exported_at: string;
    exported_by: string;
    version: string;
    entity_types: EntityType[];
  };
}

export interface VirtualFieldImportResult {
  success: boolean;
  imported_fields: number;
  skipped_fields: number;
  imported_templates: number;
  skipped_templates: number;
  errors: string[];
  warnings: string[];
}

// Constantes úteis
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto',
  number: 'Número',
  boolean: 'Verdadeiro/Falso',
  currency: 'Moeda',
  percentage: 'Porcentagem',
  date: 'Data',
  url: 'URL',
  email: 'Email'
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  products: 'Produtos',
  orders: 'Pedidos',
  users: 'Usuários',
  categories: 'Categorias',
  sellers: 'Vendedores'
};

export const DEFAULT_FORMAT_OPTIONS: Record<FieldType, FormatOptions> = {
  text: {},
  number: { decimals: 2 },
  boolean: {},
  currency: { decimals: 2, prefix: 'R$ ', locale: 'pt-BR' },
  percentage: { decimals: 1, suffix: '%' },
  date: { dateFormat: 'DD/MM/YYYY' },
  url: {},
  email: {}
}; 