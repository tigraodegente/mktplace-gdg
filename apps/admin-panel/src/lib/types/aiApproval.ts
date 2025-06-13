// Tipos para o Sistema de Aprovação de IA

export interface AIAnalysisSession {
  id: string;
  entity_type: string;
  entity_id: string;
  total_suggestions: number;
  approved_suggestions: number;
  rejected_suggestions: number;
  pending_suggestions: number;
  status: SessionStatus;
  analysis_data?: any;
  created_by: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
  
  // From view
  created_by_name?: string;
  created_by_email?: string;
  approval_rate?: number;
  completion_time_minutes?: number;
}

export interface AISuggestion {
  id: string;
  session_id: string;
  field_name: string;
  field_label: string;
  current_value?: any;
  suggested_value: any;
  confidence: number;
  reasoning: string;
  source: SuggestionSource;
  category: string;
  status: SuggestionStatus;
  extra_info?: any;
  approved_by?: string;
  approved_at?: string;
  applied_at?: string;
  rejection_reason?: string;
  created_at: string;
  
  // From view
  entity_type?: string;
  entity_id?: string;
  session_status?: SessionStatus;
  approved_by_name?: string;
  approved_by_email?: string;
}

export interface AIApprovalHistory {
  id: string;
  session_id: string;
  suggestion_id: string;
  action: ApprovalAction;
  previous_status: string;
  new_status: string;
  notes?: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface AIApprovalSettings {
  id: string;
  user_id: string;
  role?: string;
  entity_type: string;
  
  // Auto-approval settings
  auto_approve_enabled: boolean;
  auto_approve_confidence_threshold: number;
  auto_approve_categories: string[];
  auto_approve_fields: string[];
  
  // Notification settings
  email_notifications: boolean;
  notification_types: NotificationType[];
  
  // Interface settings
  default_view: ViewType;
  show_low_confidence: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface AIApprovalTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  entity_type: string;
  rules: ApprovalRules;
  is_active: boolean;
  is_system: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AIApprovalNotification {
  id: string;
  session_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface AIApprovalMetrics {
  id: string;
  date: string;
  user_id: string;
  entity_type: string;
  
  // Daily counters
  total_sessions: number;
  total_suggestions: number;
  approved_suggestions: number;
  rejected_suggestions: number;
  auto_approved_suggestions: number;
  
  // Performance metrics
  avg_confidence?: number;
  avg_approval_time_minutes?: number;
  most_approved_category?: string;
  most_rejected_category?: string;
  
  // Category breakdown
  category_stats?: CategoryStats;
  
  created_at: string;
}

// Enums e Types
export type SessionStatus = 
  | 'pending' 
  | 'partially_approved' 
  | 'completed' 
  | 'cancelled';

export type SuggestionStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'applied';

export type SuggestionSource = 
  | 'ai' 
  | 'similar_products' 
  | 'category_template';

export type ApprovalAction = 
  | 'approved' 
  | 'rejected' 
  | 'applied' 
  | 'bulk_approved' 
  | 'auto_approved' 
  | 'auto_rejected';

export type NotificationType = 
  | 'new_session' 
  | 'high_confidence' 
  | 'completed_session' 
  | 'needs_review' 
  | 'auto_approved' 
  | 'bulk_operation';

export type ViewType = 
  | 'by_category' 
  | 'by_confidence' 
  | 'chronological' 
  | 'by_status';

// Structured types
export interface ApprovalRules {
  auto_approve_if?: {
    confidence_above?: number;
    fields?: string[];
    categories?: string[];
    exclude_if_empty_current?: boolean;
    always?: boolean;
  };
  auto_reject_if?: {
    confidence_below?: number;
    contains_words?: string[];
    fields?: string[];
    categories?: string[];
  };
  require_manual_review?: {
    fields?: string[];
    categories?: string[];
    confidence_below?: number;
    always?: boolean;
  };
}

export interface CategoryStats {
  [category: string]: {
    approved: number;
    rejected: number;
    pending: number;
    auto_approved: number;
  };
}

// Request/Response types
export interface CreateSessionRequest {
  entity_type: string;
  entity_id: string;
  suggestions: CreateSuggestionData[];
  analysis_data?: any;
}

export interface CreateSuggestionData {
  field_name: string;
  field_label: string;
  current_value?: any;
  suggested_value: any;
  confidence: number;
  reasoning: string;
  source?: SuggestionSource;
  category: string;
  extra_info?: any;
}

export interface ApprovalRequest {
  suggestion_ids: string[];
  action: 'approve' | 'reject';
  notes?: string;
  apply_immediately?: boolean;
}

export interface BulkApprovalRequest {
  session_id: string;
  criteria: {
    categories?: string[];
    confidence_above?: number;
    confidence_below?: number;
    fields?: string[];
    statuses?: SuggestionStatus[];
  };
  action: 'approve' | 'reject';
  notes?: string;
  apply_immediately?: boolean;
}

export interface ApprovalResponse {
  success: boolean;
  affected_suggestions: number;
  applied_suggestions?: number;
  errors?: string[];
  session_updated?: {
    status: SessionStatus;
    pending_suggestions: number;
    approved_suggestions: number;
    rejected_suggestions: number;
  };
}

export interface SessionsResponse {
  success: boolean;
  data?: AIAnalysisSession[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    filters?: any;
  };
  error?: string;
}

export interface SuggestionsResponse {
  success: boolean;
  data?: AISuggestion[];
  meta?: {
    total: number;
    by_status?: Record<SuggestionStatus, number>;
    by_category?: Record<string, number>;
    by_confidence?: {
      high: number; // >80
      medium: number; // 50-80
      low: number; // <50
    };
  };
  error?: string;
}

export interface MetricsResponse {
  success: boolean;
  data?: {
    daily_metrics: AIApprovalMetrics[];
    summary: {
      total_sessions_period: number;
      total_suggestions_period: number;
      avg_approval_rate: number;
      avg_confidence: number;
      most_active_categories: Array<{
        category: string;
        suggestions_count: number;
        approval_rate: number;
      }>;
    };
  };
  error?: string;
}

// Filter types
export interface SessionFilters {
  entity_type?: string;
  entity_id?: string;
  status?: SessionStatus;
  created_by?: string;
  created_after?: string;
  created_before?: string;
  has_pending?: boolean;
  approval_rate_above?: number;
  approval_rate_below?: number;
}

export interface SuggestionFilters {
  session_id?: string;
  field_name?: string;
  category?: string;
  status?: SuggestionStatus;
  source?: SuggestionSource;
  confidence_above?: number;
  confidence_below?: number;
  approved_by?: string;
  created_after?: string;
  created_before?: string;
}

// Form data types
export interface ApprovalSettingsFormData {
  auto_approve_enabled: boolean;
  auto_approve_confidence_threshold: number;
  auto_approve_categories: string[];
  auto_approve_fields: string[];
  email_notifications: boolean;
  notification_types: NotificationType[];
  default_view: ViewType;
  show_low_confidence: boolean;
}

export interface ApprovalTemplateFormData {
  name: string;
  description: string;
  category: string;
  entity_type: string;
  rules: ApprovalRules;
  is_active: boolean;
}

// UI State types
export interface ApprovalUIState {
  selectedSuggestions: string[];
  currentView: ViewType;
  expandedCategories: string[];
  filters: SuggestionFilters;
  sortBy: 'confidence' | 'created_at' | 'field_name' | 'category';
  sortOrder: 'asc' | 'desc';
  showAppliedOnly: boolean;
  showRejectedOnly: boolean;
  groupByCategory: boolean;
}

// Validation types
export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Statistics and Analytics
export interface ApprovalAnalytics {
  period: {
    start_date: string;
    end_date: string;
  };
  overview: {
    total_sessions: number;
    total_suggestions: number;
    approval_rate: number;
    auto_approval_rate: number;
    avg_time_to_approve_minutes: number;
  };
  by_category: Array<{
    category: string;
    total_suggestions: number;
    approved: number;
    rejected: number;
    approval_rate: number;
    avg_confidence: number;
  }>;
  by_user: Array<{
    user_id: string;
    user_name: string;
    sessions_created: number;
    suggestions_approved: number;
    suggestions_rejected: number;
    avg_approval_time_minutes: number;
  }>;
  confidence_distribution: {
    high_confidence: number; // 80-100
    medium_confidence: number; // 50-79
    low_confidence: number; // 0-49
  };
  trends: {
    daily_approval_rates: Array<{
      date: string;
      approval_rate: number;
      total_suggestions: number;
    }>;
  };
}

// Constants
export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  applied: 'Aplicado'
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  pending: 'Pendente',
  partially_approved: 'Parcialmente Aprovado',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  new_session: 'Nova Sessão',
  high_confidence: 'Alta Confiança',
  completed_session: 'Sessão Concluída',
  needs_review: 'Necessita Revisão',
  auto_approved: 'Auto-Aprovado',
  bulk_operation: 'Operação em Lote'
};

export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  by_category: 'Por Categoria',
  by_confidence: 'Por Confiança',
  chronological: 'Cronológico',
  by_status: 'Por Status'
};

export const CONFIDENCE_LEVELS = {
  HIGH: { min: 80, max: 100, label: 'Alta', color: 'green' },
  MEDIUM: { min: 50, max: 79, label: 'Média', color: 'yellow' },
  LOW: { min: 0, max: 49, label: 'Baixa', color: 'red' }
} as const;

// Helper functions types
export type ConfidenceLevel = keyof typeof CONFIDENCE_LEVELS;

export interface ConfidenceLevelInfo {
  level: ConfidenceLevel;
  label: string;
  color: string;
  percentage: number;
}

// Auto-approval evaluation
export interface AutoApprovalEvaluation {
  should_auto_approve: boolean;
  should_auto_reject: boolean;
  requires_manual_review: boolean;
  matching_rules: string[];
  reasoning: string;
}

// Workflow state management
export interface WorkflowState {
  current_step: 'analysis' | 'review' | 'approval' | 'application' | 'completed';
  progress_percentage: number;
  can_proceed: boolean;
  blockers: string[];
  next_actions: string[];
} 