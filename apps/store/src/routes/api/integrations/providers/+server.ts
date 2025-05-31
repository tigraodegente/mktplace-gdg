/**
 * API de Gerenciamento de Providers de Integração
 * 
 * GET /api/integrations/providers - Listar providers
 * POST /api/integrations/providers - Criar provider
 */

import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// ============================================================================
// GET - LISTAR PROVIDERS
// ============================================================================

export const GET = async ({ url, platform }: { url: URL; platform: any }) => {
  try {
    const searchParams = url.searchParams;
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('🔍 [ProvidersAPI] Listando providers:', { type, isActive, search, page, limit });

    const result = await withDatabase(platform, async (db) => {
      // Construir query dinâmica
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (type) {
        whereConditions.push(`type = $${paramIndex}`);
        queryParams.push(type);
        paramIndex++;
      }

      if (isActive !== null) {
        whereConditions.push(`is_active = $${paramIndex}`);
        queryParams.push(isActive === 'true');
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Buscar providers com métricas via LEFT JOIN
      const providers = await db.query(`
        SELECT 
          ip.id,
          ip.name,
          ip.display_name,
          ip.type,
          ip.description,
          ip.is_active,
          ip.is_sandbox,
          ip.priority,
          ip.success_rate,
          ip.avg_response_time,
          ip.last_success_at,
          ip.last_failure_at,
          ip.created_at,
          ip.updated_at,
          COALESCE(recent_metrics.total_requests_24h, 0) as requests_24h,
          COALESCE(recent_metrics.success_rate_24h, 0) as success_rate_24h,
          COALESCE(recent_metrics.avg_response_time_24h, 0) as avg_response_time_24h,
          COALESCE(queue_status.pending_items, 0) as pending_retries,
          COALESCE(queue_status.processing_items, 0) as processing_items,
          COALESCE(queue_status.failed_items, 0) as failed_items
        FROM integration_providers ip
        
        LEFT JOIN (
          SELECT 
            provider_id,
            SUM(total_requests) as total_requests_24h,
            AVG(success_rate) as success_rate_24h,
            AVG(avg_response_time_ms) as avg_response_time_24h
          FROM integration_metrics
          WHERE period_start >= NOW() - INTERVAL '24 hours'
          GROUP BY provider_id
        ) recent_metrics ON ip.id = recent_metrics.provider_id
        
        LEFT JOIN (
          SELECT 
            provider_id,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_items,
            COUNT(*) FILTER (WHERE status = 'processing') as processing_items,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_items
          FROM integration_retry_queue
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY provider_id
        ) queue_status ON ip.id = queue_status.provider_id
        
        ${whereClause}
        ORDER BY ip.priority ASC, ip.name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);

      // Contar total
      const totalResult = await db.query(`
        SELECT COUNT(*) as total
        FROM integration_providers
        ${whereClause}
      `, queryParams);

      const total = parseInt(totalResult[0].total);

      return {
        providers: providers.map(p => ({
          id: p.id,
          name: p.name,
          displayName: p.display_name,
          type: p.type,
          description: p.description,
          isActive: p.is_active,
          isSandbox: p.is_sandbox,
          priority: p.priority,
          successRate: parseFloat(p.success_rate || '0'),
          avgResponseTime: parseInt(p.avg_response_time || '0'),
          lastSuccessAt: p.last_success_at,
          lastFailureAt: p.last_failure_at,
          stats: {
            requests24h: parseInt(p.requests_24h || '0'),
            successRate24h: parseFloat(p.success_rate_24h || '0'),
            avgResponseTime24h: parseInt(p.avg_response_time_24h || '0'),
            pendingRetries: parseInt(p.pending_retries || '0'),
            processingItems: parseInt(p.processing_items || '0'),
            failedItems: parseInt(p.failed_items || '0')
          },
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      };
    });

    console.log(`✅ [ProvidersAPI] Encontrados ${result.providers.length} providers`);

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ [ProvidersAPI] Erro ao listar providers:', error);
    return json({
      success: false,
      error: {
        code: 'PROVIDERS_LIST_ERROR',
        message: 'Erro ao listar providers',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
};

// ============================================================================
// POST - CRIAR/ATUALIZAR PROVIDER
// ============================================================================

export const POST = async ({ request, platform }: { request: Request; platform: any }) => {
  try {
    const data = await request.json();
    
    const {
      name,
      displayName,
      type,
      description,
      isActive,
      isSandbox,
      priority,
      config,
      retryConfig,
      webhookUrl,
      webhookSecret,
      webhookEvents
    } = data;

    // Validações básicas
    if (!name || !displayName || !type) {
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nome, nome de exibição e tipo são obrigatórios'
        }
      }, { status: 400 });
    }

    console.log('➕ [ProvidersAPI] Criando/atualizando provider:', { name, type });

    const result = await withDatabase(platform, async (db) => {
      // Verificar se já existe
      const existing = await db.query(`
        SELECT id FROM integration_providers WHERE name = $1
      `, [name]);

      if (existing.length > 0) {
        // Atualizar existente
        const updated = await db.query(`
          UPDATE integration_providers SET
            display_name = $1,
            type = $2,
            description = $3,
            is_active = $4,
            is_sandbox = $5,
            priority = $6,
            config = $7,
            retry_config = $8,
            webhook_url = $9,
            webhook_secret = $10,
            webhook_events = $11,
            updated_at = NOW()
          WHERE name = $12
          RETURNING *
        `, [
          displayName,
          type,
          description,
          isActive || false,
          isSandbox || false,
          priority || 1,
          JSON.stringify(config || {}),
          JSON.stringify(retryConfig || {
            maxAttempts: 3,
            backoffType: 'exponential',
            baseDelay: 1000,
            maxDelay: 30000,
            retryableErrors: ['timeout', '5xx', 'network_error'],
            nonRetryableErrors: ['4xx', 'invalid_credentials']
          }),
          webhookUrl,
          webhookSecret,
          JSON.stringify(webhookEvents || []),
          name
        ]);

        return { provider: updated[0], isNew: false };
      } else {
        // Criar novo
        const created = await db.query(`
          INSERT INTO integration_providers (
            name,
            display_name,
            type,
            description,
            is_active,
            is_sandbox,
            priority,
            config,
            retry_config,
            webhook_url,
            webhook_secret,
            webhook_events
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `, [
          name,
          displayName,
          type,
          description,
          isActive || false,
          isSandbox || false,
          priority || 1,
          JSON.stringify(config || {}),
          JSON.stringify(retryConfig || {
            maxAttempts: 3,
            backoffType: 'exponential',
            baseDelay: 1000,
            maxDelay: 30000,
            retryableErrors: ['timeout', '5xx', 'network_error'],
            nonRetryableErrors: ['4xx', 'invalid_credentials']
          }),
          webhookUrl,
          webhookSecret,
          JSON.stringify(webhookEvents || [])
        ]);

        return { provider: created[0], isNew: true };
      }
    });

    const provider = {
      id: result.provider.id,
      name: result.provider.name,
      displayName: result.provider.display_name,
      type: result.provider.type,
      description: result.provider.description,
      isActive: result.provider.is_active,
      isSandbox: result.provider.is_sandbox,
      priority: result.provider.priority,
      config: result.provider.config,
      retryConfig: result.provider.retry_config,
      webhookUrl: result.provider.webhook_url,
      webhookSecret: result.provider.webhook_secret,
      webhookEvents: result.provider.webhook_events,
      createdAt: result.provider.created_at,
      updatedAt: result.provider.updated_at
    };

    console.log(`✅ [ProvidersAPI] Provider ${result.isNew ? 'criado' : 'atualizado'}:`, provider.name);

    return json({
      success: true,
      data: {
        provider,
        isNew: result.isNew
      }
    });

  } catch (error) {
    console.error('❌ [ProvidersAPI] Erro ao criar/atualizar provider:', error);
    return json({
      success: false,
      error: {
        code: 'PROVIDER_SAVE_ERROR',
        message: 'Erro ao salvar provider',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
}; 