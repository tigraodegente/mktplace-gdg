/**
 * API de Processamento da Fila de Retry
 * 
 * POST /api/integrations/queue/process - Processar fila manualmente
 * GET /api/integrations/queue/process - Status da fila
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { retryEngine } from '$lib/services/integrations/RetryEngine';

// ============================================================================
// GET - STATUS DA FILA
// ============================================================================

export const GET = async ({ url, platform }: { url: URL; platform: any }) => {
  try {
    const searchParams = url.searchParams;
    const providerId = searchParams.get('providerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('📋 [QueueAPI] Consultando fila:', { providerId, status, page, limit });

    const result = await getDatabase(platform, async (db) => {
      // Construir query dinâmica
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (providerId) {
        whereConditions.push(`irq.provider_id = $${paramIndex}`);
        queryParams.push(providerId);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`irq.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Buscar itens da fila
      const items = await db.query(`
        SELECT 
          irq.*,
          ip.name as provider_name,
          ip.display_name as provider_display_name,
          ip.type as provider_type
        FROM integration_retry_queue irq
        JOIN integration_providers ip ON irq.provider_id = ip.id
        ${whereClause}
        ORDER BY 
          CASE irq.status 
            WHEN 'processing' THEN 1 
            WHEN 'pending' THEN 2 
            WHEN 'retrying' THEN 3 
            ELSE 4 
          END,
          irq.priority ASC, 
          irq.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, limit, offset]);

      // Contar total
      const totalResult = await db.query(`
        SELECT COUNT(*) as total
        FROM integration_retry_queue irq
        JOIN integration_providers ip ON irq.provider_id = ip.id
        ${whereClause}
      `, queryParams);

      // Estatísticas gerais
      const statsResult = await db.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(attempts) as avg_attempts
        FROM integration_retry_queue irq
        JOIN integration_providers ip ON irq.provider_id = ip.id
        ${whereClause.replace('WHERE', whereClause ? 'AND' : 'WHERE')} ${whereClause ? '' : 'WHERE'} irq.created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY status
        ORDER BY status
      `);

      const total = parseInt(totalResult[0].total);

      return {
        items: items.map(item => ({
          id: item.id,
          providerId: item.provider_id,
          providerName: item.provider_name,
          providerDisplayName: item.provider_display_name,
          providerType: item.provider_type,
          integrationType: item.integration_type,
          operation: item.operation,
          referenceId: item.reference_id,
          referenceType: item.reference_type,
          status: item.status,
          attempts: item.attempts,
          maxAttempts: item.max_attempts,
          nextRetryAt: item.next_retry_at,
          lastError: item.last_error,
          responseTimeMs: item.response_time_ms,
          priority: item.priority,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          startedAt: item.started_at,
          completedAt: item.completed_at,
          externalId: item.external_id
        })),
        stats: statsResult.reduce((acc, stat) => {
          acc[stat.status] = {
            count: parseInt(stat.count),
            avgAttempts: parseFloat(stat.avg_attempts || '0')
          };
          return acc;
        }, {} as Record<string, any>),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      };
    });

    console.log(`✅ [QueueAPI] Encontrados ${result.items.length} itens na fila`);

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ [QueueAPI] Erro ao consultar fila:', error);
    return json({
      success: false,
      error: {
        code: 'QUEUE_QUERY_ERROR',
        message: 'Erro ao consultar fila de retry',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
};

// ============================================================================
// POST - PROCESSAR FILA
// ============================================================================

export const POST = async ({ request, platform }: { request: Request; platform: any }) => {
  try {
    const data = await request.json();
    const { limit = 50, providerId, forceProcess = false } = data;

    console.log('🔄 [QueueAPI] Processando fila:', { limit, providerId, forceProcess });

    const startTime = Date.now();

    // Se provider específico, filtrar apenas ele
    if (providerId) {
      const result = await processSpecificProvider(platform, providerId, limit, forceProcess);
      
      return json({
        success: true,
        data: {
          processed: result.processed,
          providerId,
          duration: Date.now() - startTime,
          results: result.results
        }
      });
    }

    // Processar fila geral
    const processed = await retryEngine.processRetryQueue(platform, limit);

    // Buscar estatísticas após processamento
    const stats = await getQueueStats(platform);

    console.log(`✅ [QueueAPI] Processados ${processed} itens em ${Date.now() - startTime}ms`);

    return json({
      success: true,
      data: {
        processed,
        duration: Date.now() - startTime,
        queueStats: stats
      }
    });

  } catch (error) {
    console.error('❌ [QueueAPI] Erro ao processar fila:', error);
    return json({
      success: false,
      error: {
        code: 'QUEUE_PROCESS_ERROR',
        message: 'Erro ao processar fila de retry',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function processSpecificProvider(
  platform: any, 
  providerId: string, 
  limit: number,
  forceProcess: boolean
): Promise<{ processed: number; results: any[] }> {
  
  return await getDatabase(platform, async (db) => {
    const whereClause = forceProcess 
      ? 'WHERE irq.provider_id = $1 AND irq.status IN (\'pending\', \'retrying\', \'failed\')'
      : 'WHERE irq.provider_id = $1 AND irq.status IN (\'pending\', \'retrying\') AND (irq.next_retry_at IS NULL OR irq.next_retry_at <= NOW()) AND irq.attempts < irq.max_attempts';

    // Buscar itens específicos do provider
    const items = await db.query(`
      SELECT 
        irq.*,
        ip.name as provider_name,
        ip.retry_config
      FROM integration_retry_queue irq
      JOIN integration_providers ip ON irq.provider_id = ip.id
      ${whereClause}
      ORDER BY irq.priority ASC, irq.created_at ASC
      LIMIT $2
    `, [providerId, limit]);

    if (items.length === 0) {
      return { processed: 0, results: [] };
    }

    const results = [];

    for (const item of items) {
      try {
        // Marcar como processing
        await db.query(`
          UPDATE integration_retry_queue 
          SET status = 'processing', attempts = attempts + 1, started_at = NOW()
          WHERE id = $1
        `, [item.id]);

        // Simular processamento (aqui seria chamada real para o provider)
        const success = Math.random() > 0.3; // 70% de chance de sucesso
        const responseTime = Math.floor(Math.random() * 2000) + 100;

        if (success) {
          // Marcar como sucesso
          await db.query(`
            UPDATE integration_retry_queue 
            SET 
              status = 'success',
              completed_at = NOW(),
              response_time_ms = $1,
              external_id = $2,
              response_data = $3
            WHERE id = $4
          `, [
            responseTime,
            `ext_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
            JSON.stringify({ processed: true, timestamp: new Date().toISOString() }),
            item.id
          ]);

          results.push({
            id: item.id,
            status: 'success',
            responseTime
          });

        } else {
          // Verificar se deve fazer retry
          if (item.attempts + 1 < item.max_attempts && !forceProcess) {
            const nextRetry = new Date(Date.now() + (item.attempts + 1) * 60000); // +1 min por tentativa
            
            await db.query(`
              UPDATE integration_retry_queue 
              SET 
                status = 'retrying',
                next_retry_at = $1,
                last_error = $2,
                error_history = error_history || $3::jsonb
              WHERE id = $4
            `, [
              nextRetry,
              'Falha simulada no processamento',
              JSON.stringify([{
                error: 'Simulated failure',
                timestamp: new Date().toISOString(),
                attempt: item.attempts + 1
              }]),
              item.id
            ]);

            results.push({
              id: item.id,
              status: 'retrying',
              nextRetryAt: nextRetry
            });

          } else {
            // Marcar como failed
            await db.query(`
              UPDATE integration_retry_queue 
              SET 
                status = 'failed',
                completed_at = NOW(),
                last_error = $1,
                error_history = error_history || $2::jsonb
              WHERE id = $3
            `, [
              'Esgotadas todas as tentativas (simulação)',
              JSON.stringify([{
                error: 'Max attempts reached',
                timestamp: new Date().toISOString(),
                finalAttempt: item.attempts + 1
              }]),
              item.id
            ]);

            results.push({
              id: item.id,
              status: 'failed',
              error: 'Max attempts reached'
            });
          }
        }

      } catch (error) {
        console.error(`Erro ao processar item ${item.id}:`, error);
        
        await db.query(`
          UPDATE integration_retry_queue 
          SET status = 'failed', last_error = $1, completed_at = NOW()
          WHERE id = $2
        `, [
          error instanceof Error ? error.message : 'Erro desconhecido',
          item.id
        ]);

        results.push({
          id: item.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return { processed: results.length, results };
  });
}

async function getQueueStats(platform: any): Promise<any> {
  return await getDatabase(platform, async (db) => {
    const stats = await db.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(attempts) as avg_attempts,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
      FROM integration_retry_queue
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY status
      ORDER BY status
    `);

    return stats.reduce((acc, stat) => {
      acc[stat.status] = {
        count: parseInt(stat.count),
        avgAttempts: parseFloat(stat.avg_attempts || '0'),
        avgAgeSeconds: parseFloat(stat.avg_age_seconds || '0')
      };
      return acc;
    }, {} as Record<string, any>);
  });
} 