/**
 * Universal Retry Engine
 * 
 * Engine universal para retry de integrações externas
 * Funciona com qualquer provider: pagamento, frete, notificação, etc.
 */

import { withDatabase } from '$lib/db';

// ============================================================================
// LOCAL TYPES (temporário até resolver imports)
// ============================================================================

export type IntegrationType = 'payment' | 'shipping' | 'notification' | 'analytics' | 'webhook';
export type RetryBackoffType = 'exponential' | 'linear' | 'fixed' | 'custom';
export type IntegrationStatus = 'pending' | 'processing' | 'retrying' | 'success' | 'failed' | 'cancelled';

export interface RetryConfig {
  maxAttempts: number;
  backoffType: RetryBackoffType;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
  customIntervals?: number[];
}

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
// RETRY ENGINE CLASS
// ============================================================================

export class UniversalRetryEngine {
  private static instance: UniversalRetryEngine;
  
  private constructor() {}
  
  static getInstance(): UniversalRetryEngine {
    if (!UniversalRetryEngine.instance) {
      UniversalRetryEngine.instance = new UniversalRetryEngine();
    }
    return UniversalRetryEngine.instance;
  }
  
  // ========================================================================
  // MAIN EXECUTION METHODS
  // ========================================================================
  
  /**
   * Executa operação com retry automático
   */
  async executeWithRetry<T>(
    platform: any,
    operation: () => Promise<IntegrationResponse>,
    request: IntegrationRequest,
    retryConfig?: RetryConfig
  ): Promise<IntegrationResult> {
    
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [RetryEngine] Iniciando operação: ${request.operation}`);
      
      // 1. Buscar configuração do provider
      const providerConfig = await this.getProviderConfig(platform, request.providerId);
      const finalRetryConfig = retryConfig || providerConfig.retryConfig;
      
      // 2. Criar item na fila de retry
      const queueItem = await this.createQueueItem(platform, request, finalRetryConfig);
      
      // 3. Tentar executar imediatamente
      const result = await this.attemptOperation(
        platform,
        operation,
        queueItem,
        providerConfig,
        startTime
      );
      
      // 4. Se sucesso, finalizar
      if (result.success) {
        await this.markAsSuccess(platform, queueItem.id, result, Date.now() - startTime);
        
        return {
          queueId: queueItem.id,
          status: 'success',
          attempts: 1,
          externalId: result.externalId,
          responseTime: result.responseTime,
          data: result.data
        };
      }
      
      // 5. Se falha, verificar se deve fazer retry
      const shouldRetry = this.shouldRetry(result.error!, finalRetryConfig);
      
      if (!shouldRetry) {
        await this.markAsFailed(platform, queueItem.id, result.error!, false);
        
        return {
          queueId: queueItem.id,
          status: 'failed',
          attempts: 1,
          lastError: result.error!.message
        };
      }
      
      // 6. Agendar retry
      await this.scheduleRetry(platform, queueItem.id, result.error!, finalRetryConfig);
      
      return {
        queueId: queueItem.id,
        status: 'retrying',
        attempts: 1,
        lastError: result.error!.message,
        nextRetryAt: this.calculateNextRetry(1, finalRetryConfig)
      };
      
    } catch (error) {
      console.error('❌ [RetryEngine] Erro crítico:', error);
      throw error;
    }
  }
  
  /**
   * Processa fila de retry
   */
  async processRetryQueue(platform: any, limit: number = 100): Promise<number> {
    console.log('🔄 [RetryEngine] Processando fila de retry...');
    
    return await withDatabase(platform, async (db) => {
      // Buscar itens elegíveis para retry
      const items = await db.query(`
        SELECT 
          irq.*,
          ip.name as provider_name,
          ip.retry_config,
          ip.config as provider_config
        FROM integration_retry_queue irq
        JOIN integration_providers ip ON irq.provider_id = ip.id
        WHERE irq.status IN ('pending', 'retrying')
        AND (irq.next_retry_at IS NULL OR irq.next_retry_at <= NOW())
        AND irq.attempts < irq.max_attempts
        AND ip.is_active = true
        ORDER BY irq.priority ASC, irq.created_at ASC
        LIMIT $1
      `, [limit]);
      
      if (items.length === 0) {
        console.log('📋 [RetryEngine] Nenhum item na fila para processar');
        return 0;
      }
      
      console.log(`📋 [RetryEngine] Processando ${items.length} itens...`);
      
      let processedCount = 0;
      
      for (const item of items) {
        try {
          await this.processQueueItem(platform, item);
          processedCount++;
        } catch (error) {
          console.error(`❌ [RetryEngine] Erro ao processar item ${item.id}:`, error);
          
          // Marcar como failed se houve erro crítico
          await this.markAsFailed(platform, item.id, {
            code: 'PROCESSING_ERROR',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            retryable: false
          }, true);
        }
      }
      
      console.log(`✅ [RetryEngine] Processados ${processedCount}/${items.length} itens`);
      return processedCount;
    });
  }
  
  // ========================================================================
  // QUEUE MANAGEMENT
  // ========================================================================
  
  private async createQueueItem(
    platform: any,
    request: IntegrationRequest,
    retryConfig: RetryConfig
  ): Promise<RetryQueueItem> {
    
    return await withDatabase(platform, async (db) => {
      const result = await db.query(`
        INSERT INTO integration_retry_queue (
          provider_id,
          integration_type,
          operation,
          reference_id,
          reference_type,
          request_data,
          max_attempts,
          retry_strategy,
          metadata,
          priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        request.providerId,
        this.getIntegrationType(request.operation),
        request.operation,
        request.referenceId,
        request.referenceType,
        JSON.stringify(request.data),
        retryConfig.maxAttempts,
        JSON.stringify(request.customRetryConfig || {}),
        JSON.stringify(request.metadata || {}),
        request.priority || 5
      ]);
      
      const queueItem = result[0];
      
      // Log da criação
      await this.logEvent(platform, request.providerId, queueItem.id, {
        eventType: 'queue_created',
        level: 'info',
        message: `Item adicionado à fila de retry`,
        operation: request.operation,
        referenceId: request.referenceId,
        referenceType: request.referenceType,
        metadata: {
          queueId: queueItem.id,
          maxAttempts: retryConfig.maxAttempts,
          priority: request.priority || 5
        }
      });
      
      return {
        id: queueItem.id,
        providerId: queueItem.provider_id,
        integrationType: queueItem.integration_type,
        operation: queueItem.operation,
        referenceId: queueItem.reference_id,
        referenceType: queueItem.reference_type,
        status: queueItem.status,
        requestData: queueItem.request_data,
        responseData: queueItem.response_data,
        externalId: queueItem.external_id,
        attempts: queueItem.attempts,
        maxAttempts: queueItem.max_attempts,
        retryStrategy: queueItem.retry_strategy,
        nextRetryAt: queueItem.next_retry_at,
        lastError: queueItem.last_error,
        errorHistory: queueItem.error_history || [],
        startedAt: queueItem.started_at,
        completedAt: queueItem.completed_at,
        responseTimeMs: queueItem.response_time_ms,
        metadata: queueItem.metadata,
        priority: queueItem.priority,
        createdAt: queueItem.created_at,
        updatedAt: queueItem.updated_at
      };
    });
  }
  
  private async processQueueItem(platform: any, item: any): Promise<void> {
    console.log(`🔄 [RetryEngine] Processando item ${item.id} - Tentativa ${item.attempts + 1}/${item.max_attempts}`);
    
    const startTime = Date.now();
    
    // Marcar como processing
    await this.updateQueueStatus(platform, item.id, 'processing', item.attempts + 1);
    
    try {
      // Aqui deveria chamar o provider específico
      // Por enquanto, vamos simular o processamento
      const success = await this.simulateProviderCall(item);
      
      const responseTime = Date.now() - startTime;
      
      if (success) {
        // Sucesso - marcar como completed
        await this.markAsSuccess(platform, item.id, {
          success: true,
          externalId: `ext_${Date.now()}`,
          data: { processed: true },
          responseTime
        }, responseTime);
        
        console.log(`✅ [RetryEngine] Item ${item.id} processado com sucesso`);
        
      } else {
        // Falha - verificar se deve tentar novamente
        const error = {
          code: 'PROCESSING_FAILED',
          message: 'Falha na simulação do processamento',
          retryable: true
        };
        
        if (item.attempts + 1 < item.max_attempts) {
          // Ainda há tentativas - agendar próximo retry
          await this.scheduleRetry(platform, item.id, error, item.retry_config);
          console.log(`⏳ [RetryEngine] Item ${item.id} agendado para retry`);
        } else {
          // Esgotaram as tentativas
          await this.markAsFailed(platform, item.id, error, true);
          console.log(`❌ [RetryEngine] Item ${item.id} falhou definitivamente`);
        }
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      await this.markAsFailed(platform, item.id, {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        retryable: false
      }, true);
      
      console.error(`❌ [RetryEngine] Erro ao processar item ${item.id}:`, error);
    }
  }
  
  // ========================================================================
  // STATUS MANAGEMENT
  // ========================================================================
  
  private async markAsSuccess(
    platform: any,
    queueId: string,
    response: IntegrationResponse,
    responseTime: number
  ): Promise<void> {
    
    await withDatabase(platform, async (db) => {
      await db.query(`
        UPDATE integration_retry_queue 
        SET 
          status = 'success',
          response_data = $1,
          external_id = $2,
          completed_at = NOW(),
          response_time_ms = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [
        JSON.stringify(response.data || {}),
        response.externalId,
        responseTime,
        queueId
      ]);
    });
  }
  
  private async markAsFailed(
    platform: any,
    queueId: string,
    error: { code: string; message: string; retryable: boolean },
    maxAttemptsReached: boolean
  ): Promise<void> {
    
    await withDatabase(platform, async (db) => {
      await db.query(`
        UPDATE integration_retry_queue 
        SET 
          status = 'failed',
          last_error = $1,
          error_history = error_history || $2::jsonb,
          completed_at = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [
        error.message,
        JSON.stringify([{
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
          maxAttemptsReached
        }]),
        maxAttemptsReached ? new Date() : null,
        queueId
      ]);
    });
  }
  
  private async scheduleRetry(
    platform: any,
    queueId: string,
    error: { code: string; message: string; retryable: boolean },
    retryConfig: RetryConfig
  ): Promise<void> {
    
    await withDatabase(platform, async (db) => {
      // Buscar tentativas atuais
      const current = await db.query(`
        SELECT attempts FROM integration_retry_queue WHERE id = $1
      `, [queueId]);
      
      const attempts = current[0]?.attempts || 0;
      const nextRetry = this.calculateNextRetry(attempts + 1, retryConfig);
      
      await db.query(`
        UPDATE integration_retry_queue 
        SET 
          status = 'retrying',
          next_retry_at = $1,
          last_error = $2,
          error_history = error_history || $3::jsonb,
          updated_at = NOW()
        WHERE id = $4
      `, [
        nextRetry,
        error.message,
        JSON.stringify([{
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
          attempt: attempts + 1
        }]),
        queueId
      ]);
    });
  }
  
  private async updateQueueStatus(
    platform: any,
    queueId: string,
    status: IntegrationStatus,
    attempts?: number
  ): Promise<void> {
    
    await withDatabase(platform, async (db) => {
      const updates = ['status = $1', 'updated_at = NOW()'];
      const values: any[] = [status];
      
      if (attempts !== undefined) {
        updates.push(`attempts = $${values.length + 1}`);
        values.push(attempts);
        
        if (status === 'processing') {
          updates.push('started_at = NOW()');
        }
      }
      
      await db.query(`
        UPDATE integration_retry_queue 
        SET ${updates.join(', ')}
        WHERE id = $${values.length + 1}
      `, [...values, queueId]);
    });
  }
  
  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  
  private calculateNextRetry(attempt: number, config: RetryConfig): Date {
    let delayMs: number;
    
    switch (config.backoffType) {
      case 'exponential':
        delayMs = config.baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delayMs = config.baseDelay * attempt;
        break;
      case 'custom':
        delayMs = config.customIntervals?.[attempt - 1] || config.baseDelay;
        break;
      case 'fixed':
      default:
        delayMs = config.baseDelay;
        break;
    }
    
    // Aplicar limite máximo
    delayMs = Math.min(delayMs, config.maxDelay);
    
    return new Date(Date.now() + delayMs);
  }
  
  private shouldRetry(
    error: { code: string; message: string; retryable: boolean },
    config: RetryConfig
  ): boolean {
    
    // Se o erro explicitamente diz que não é retryable
    if (error.retryable === false) {
      return false;
    }
    
    // Verificar se está na lista de erros não retryáveis
    if (config.nonRetryableErrors.some((pattern: string) => 
      error.code.includes(pattern) || error.message.includes(pattern)
    )) {
      return false;
    }
    
    // Verificar se está na lista de erros retryáveis
    if (config.retryableErrors.some((pattern: string) => 
      error.code.includes(pattern) || error.message.includes(pattern)
    )) {
      return true;
    }
    
    // Default: não fazer retry para erros desconhecidos
    return false;
  }
  
  private getIntegrationType(operation: string): string {
    if (operation.includes('payment') || operation.includes('pay')) {
      return 'payment';
    }
    if (operation.includes('shipping') || operation.includes('ship')) {
      return 'shipping';
    }
    if (operation.includes('notification') || operation.includes('notify')) {
      return 'notification';
    }
    if (operation.includes('webhook')) {
      return 'webhook';
    }
    return 'unknown';
  }
  
  private async getProviderConfig(platform: any, providerId: string): Promise<any> {
    return await withDatabase(platform, async (db) => {
      const result = await db.query(`
        SELECT * FROM integration_providers WHERE id = $1
      `, [providerId]);
      
      if (result.length === 0) {
        throw new Error(`Provider ${providerId} não encontrado`);
      }
      
      return result[0];
    });
  }
  
  private async attemptOperation(
    platform: any,
    operation: () => Promise<IntegrationResponse>,
    queueItem: RetryQueueItem,
    providerConfig: any,
    startTime: number
  ): Promise<IntegrationResponse> {
    
    try {
      // Log da tentativa
      await this.logEvent(platform, queueItem.providerId, queueItem.id, {
        eventType: 'request',
        level: 'info',
        message: `Executando operação ${queueItem.operation}`,
        operation: queueItem.operation,
        referenceId: queueItem.referenceId,
        referenceType: queueItem.referenceType,
        metadata: {
          attempt: queueItem.attempts + 1,
          maxAttempts: queueItem.maxAttempts
        }
      });
      
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      // Log do resultado
      await this.logEvent(platform, queueItem.providerId, queueItem.id, {
        eventType: result.success ? 'success' : 'error',
        level: result.success ? 'info' : 'error',
        message: result.success ? 'Operação executada com sucesso' : `Operação falhou: ${result.error?.message}`,
        operation: queueItem.operation,
        referenceId: queueItem.referenceId,
        referenceType: queueItem.referenceType,
        responseTimeMs: responseTime,
        metadata: {
          success: result.success,
          externalId: result.externalId,
          responseTime
        }
      });
      
      return {
        ...result,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Log do erro
      await this.logEvent(platform, queueItem.providerId, queueItem.id, {
        eventType: 'error',
        level: 'error',
        message: `Erro na execução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        operation: queueItem.operation,
        referenceId: queueItem.referenceId,
        referenceType: queueItem.referenceType,
        responseTimeMs: responseTime,
        metadata: {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      });
      
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          retryable: true
        },
        responseTime
      };
    }
  }
  
  private async simulateProviderCall(item: any): Promise<boolean> {
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 80% de chance de sucesso na simulação
    return Math.random() > 0.2;
  }
  
  private async logEvent(
    platform: any,
    providerId: string,
    queueId: string | null,
    event: {
      eventType: string;
      level: string;
      message: string;
      operation?: string;
      referenceId?: string;
      referenceType?: string;
      responseTimeMs?: number;
      metadata?: any;
    }
  ): Promise<void> {
    
    await withDatabase(platform, async (db) => {
      await db.query(`
        INSERT INTO integration_logs (
          provider_id,
          retry_queue_id,
          event_type,
          level,
          message,
          operation,
          reference_id,
          reference_type,
          response_time_ms,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        providerId,
        queueId,
        event.eventType,
        event.level,
        event.message,
        event.operation,
        event.referenceId,
        event.referenceType,
        event.responseTimeMs,
        JSON.stringify(event.metadata || {})
      ]);
    });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const retryEngine = UniversalRetryEngine.getInstance(); 