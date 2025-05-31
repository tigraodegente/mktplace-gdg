/**
 * Types para Sistema Universal de Integrações Externas
 */

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export type IntegrationType = 'payment' | 'shipping' | 'notification' | 'analytics' | 'webhook';

export type RetryBackoffType = 'exponential' | 'linear' | 'fixed' | 'custom';

export type IntegrationStatus = 'pending' | 'processing' | 'retrying' | 'success' | 'failed' | 'cancelled';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export type EventType = 'request' | 'response' | 'error' | 'retry' | 'timeout' | 'success' | 'failure';

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  backoffType: RetryBackoffType;
  baseDelay: number;          // milliseconds
  maxDelay: number;           // milliseconds
  retryableErrors: string[];
  nonRetryableErrors: string[];
  customIntervals?: number[]; // Para backoffType = 'custom'
}

export interface ProviderConfig {
  apiUrl: string;
  sandboxUrl?: string;
  apiKey?: string;
  secretKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
  [key: string]: any; // Configurações específicas do provider
}

export interface EnvironmentConfig {
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  isCurrent: boolean;
  defaultTimeoutMs: number;
  defaultRetryAttempts: number;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
}

// ============================================================================
// PROVIDER INTERFACES
// ============================================================================

export interface IntegrationProvider {
  id: string;
  name: string;
  displayName: string;
  type: IntegrationType;
  description?: string;
  isActive: boolean;
  isSandbox: boolean;
  priority: number;
  config: ProviderConfig;
  retryConfig: RetryConfig;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents: string[];
  successRate: number;
  avgResponseTime: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OPERATION INTERFACES
// ============================================================================

export interface IntegrationRequest {
  providerId: string;
  operation: string;
  referenceId: string;
  referenceType: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  priority?: number;
  customRetryConfig?: Partial<RetryConfig>;
}

export interface IntegrationResponse {
  success: boolean;
  externalId?: string;
  data?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: any;
  };
  responseTime: number;
  metadata?: Record<string, any>;
}

export interface IntegrationResult {
  queueId: string;
  status: IntegrationStatus;
  attempts: number;
  externalId?: string;
  lastError?: string;
  nextRetryAt?: Date;
  completedAt?: Date;
  responseTime?: number;
  data?: Record<string, any>;
}

// ============================================================================
// QUEUE INTERFACES
// ============================================================================

export interface RetryQueueItem {
  id: string;
  providerId: string;
  integrationType: IntegrationType;
  operation: string;
  referenceId: string;
  referenceType: string;
  status: IntegrationStatus;
  requestData: Record<string, any>;
  responseData?: Record<string, any>;
  externalId?: string;
  attempts: number;
  maxAttempts: number;
  retryStrategy?: Partial<RetryConfig>;
  nextRetryAt?: Date;
  lastError?: string;
  errorHistory: string[];
  startedAt?: Date;
  completedAt?: Date;
  responseTimeMs?: number;
  metadata: Record<string, any>;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LOGGING INTERFACES
// ============================================================================

export interface IntegrationLog {
  id: string;
  providerId: string;
  retryQueueId?: string;
  eventType: EventType;
  level: LogLevel;
  message: string;
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders?: Record<string, any>;
  requestBody?: Record<string, any>;
  responseStatus?: number;
  responseHeaders?: Record<string, any>;
  responseBody?: Record<string, any>;
  responseTimeMs?: number;
  operation?: string;
  referenceId?: string;
  referenceType?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: Date;
}

// ============================================================================
// METRICS INTERFACES
// ============================================================================

export interface IntegrationMetrics {
  id: string;
  providerId: string;
  operation: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: 'minute' | 'hour' | 'day' | 'week' | 'month';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeoutRequests: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  p50ResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  successRate: number;
  errorRate: number;
  retryRate: number;
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
  metadata: Record<string, any>;
  createdAt: Date;
}

// ============================================================================
// PROVIDER STATUS INTERFACES
// ============================================================================

export interface ProviderStatus {
  id: string;
  name: string;
  displayName: string;
  type: IntegrationType;
  isActive: boolean;
  priority: number;
  successRate: number;
  avgResponseTime: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  requests24h: number;
  successRate24h: number;
  avgResponseTime24h: number;
  pendingRetries: number;
  processingItems: number;
  failedItems: number;
}

// ============================================================================
// WEBHOOK INTERFACES
// ============================================================================

export interface WebhookEvent {
  id: string;
  eventType: string;
  data: Record<string, any>;
  timestamp: Date;
  signature?: string;
  source: string;
}

export interface WebhookPayload {
  id: string;
  type: string;
  created_at: string;
  data: Record<string, any>;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface IntegrationApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    totalItems?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================================================
// SEARCH AND FILTER INTERFACES
// ============================================================================

export interface ProvidersFilter {
  type?: IntegrationType;
  isActive?: boolean;
  search?: string;
  environment?: string;
}

export interface LogsFilter {
  providerId?: string;
  level?: LogLevel;
  eventType?: EventType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  operation?: string;
  referenceId?: string;
}

export interface MetricsFilter {
  providerId?: string;
  operation?: string;
  periodType: 'minute' | 'hour' | 'day' | 'week' | 'month';
  startDate?: Date;
  endDate?: Date;
}

export interface QueueFilter {
  providerId?: string;
  status?: IntegrationStatus;
  operation?: string;
  priority?: number;
  referenceType?: string;
}

// ============================================================================
// DASHBOARD INTERFACES
// ============================================================================

export interface DashboardStats {
  totalProviders: number;
  activeProviders: number;
  totalRequests24h: number;
  successRate24h: number;
  avgResponseTime24h: number;
  pendingRetries: number;
  failedOperations24h: number;
  topErrors: Array<{
    error: string;
    count: number;
    providers: string[];
  }>;
  providerHealth: Array<{
    providerId: string;
    name: string;
    type: IntegrationType;
    health: 'healthy' | 'warning' | 'critical' | 'down';
    successRate: number;
    avgResponseTime: number;
    lastCheck: Date;
  }>;
}

export interface ProviderHealth {
  providerId: string;
  name: string;
  type: IntegrationType;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  checks: {
    connectivity: boolean;
    responseTime: number;
    errorRate: number;
    lastSuccess: Date;
    uptime: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}

// ============================================================================
// PROVIDER SPECIFIC INTERFACES
// ============================================================================

// Payment Provider específico
export interface PaymentProviderConfig extends ProviderConfig {
  supportedMethods: string[];
  supportedCurrencies?: string[];
  minimumAmount?: number;
  maximumAmount?: number;
  pixExpirationMinutes?: number;
  boletoExpirationDays?: number;
  webhookEvents: string[];
}

// Shipping Provider específico
export interface ShippingProviderConfig extends ProviderConfig {
  services: string[];
  supportedCountries?: string[];
  trackingUrl: string;
  contractNumber?: string;
  password?: string;
  calculateUrl?: string;
  trackingApi?: string;
}

// Notification Provider específico
export interface NotificationProviderConfig extends ProviderConfig {
  fromEmail?: string;
  fromName?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  templates: Record<string, string>;
  supportedChannels: string[];
}

// ============================================================================
// EXPORT ALL
// ============================================================================

// Exportar apenas quando os arquivos específicos forem criados
// export * from './payment';
// export * from './shipping';
// export * from './notification'; 