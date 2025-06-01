/**
 * API de Teste do Sistema de Integrações
 * 
 * POST /api/integrations/test - Testar integrações com dados simulados
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { retryEngine } from '$lib/services/integrations/RetryEngine';
import type { IntegrationRequest } from '$lib/services/integrations/RetryEngine';

// ============================================================================
// POST - EXECUTAR TESTES
// ============================================================================

export const POST = async ({ request, platform }: { request: Request; platform: any }) => {
  try {
    const data = await request.json();
    const { 
      testType = 'all',
      count = 5,
      providerType,
      simulateFailures = true
    } = data;

    console.log('🧪 [TestAPI] Executando testes:', { testType, count, providerType, simulateFailures });

    const startTime = Date.now();
    const results = [];

    switch (testType) {
      case 'payment':
        const paymentResults = await testPaymentIntegrations(platform, count, simulateFailures);
        results.push(...paymentResults);
        break;

      case 'shipping':
        const shippingResults = await testShippingIntegrations(platform, count, simulateFailures);
        results.push(...shippingResults);
        break;

      case 'notification':
        const notificationResults = await testNotificationIntegrations(platform, count, simulateFailures);
        results.push(...notificationResults);
        break;

      case 'all':
      default:
        const allResults = await Promise.all([
          testPaymentIntegrations(platform, Math.ceil(count / 3), simulateFailures),
          testShippingIntegrations(platform, Math.ceil(count / 3), simulateFailures),
          testNotificationIntegrations(platform, Math.ceil(count / 3), simulateFailures)
        ]);
        results.push(...allResults.flat());
        break;
    }

    const duration = Date.now() - startTime;

    console.log(`✅ [TestAPI] Testes executados: ${results.length} operações em ${duration}ms`);

    return json({
      success: true,
      data: {
        testType,
        totalOperations: results.length,
        duration,
        results: results.map(r => ({
          operation: r.operation,
          providerId: r.providerId,
          queueId: r.result.queueId,
          status: r.result.status,
          attempts: r.result.attempts,
          responseTime: r.result.responseTime,
          error: r.result.lastError
        })),
        summary: {
          successful: results.filter(r => r.result.status === 'success').length,
          pending: results.filter(r => r.result.status === 'pending').length,
          retrying: results.filter(r => r.result.status === 'retrying').length,
          failed: results.filter(r => r.result.status === 'failed').length
        }
      }
    });

  } catch (error) {
    console.error('❌ [TestAPI] Erro nos testes:', error);
    return json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: 'Erro ao executar testes',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
};

// ============================================================================
// FUNÇÕES DE TESTE ESPECÍFICAS
// ============================================================================

async function testPaymentIntegrations(platform: any, count: number, simulateFailures: boolean) {
  const results: any[] = [];
  
  // Buscar providers de pagamento ativos
  const providers = await getActiveProviders(platform, 'payment');
  
  if (providers.length === 0) {
    console.log('⚠️ Nenhum provider de pagamento ativo encontrado');
    return results;
  }

  for (let i = 0; i < count; i++) {
    const provider = providers[i % providers.length];
    const orderId = `test_order_${Date.now()}_${i}`;
    
    const request: IntegrationRequest = {
      providerId: provider.id,
      operation: 'process_payment',
      referenceId: orderId,
      referenceType: 'order',
      data: {
        amount: Math.floor(Math.random() * 50000) + 1000, // R$ 10,00 a R$ 500,00 em centavos
        method: ['pix', 'credit_card', 'boleto'][Math.floor(Math.random() * 3)],
        orderId: orderId,
        customerData: {
          name: `Cliente Teste ${i + 1}`,
          email: `teste${i + 1}@exemplo.com`,
          document: '11111111111'
        }
      },
      metadata: {
        testOperation: true,
        testIndex: i,
        testType: 'payment'
      },
      priority: Math.floor(Math.random() * 5) + 1
    };

    try {
      // Simular operação que pode falhar
      const mockOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
        
        if (simulateFailures && Math.random() < 0.4) { // 40% de falha simulada
          return {
            success: false,
            error: {
              code: ['TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR'][Math.floor(Math.random() * 3)],
              message: 'Erro simulado para teste',
              retryable: true
            },
            responseTime: Math.floor(Math.random() * 1000) + 100
          };
        }

        return {
          success: true,
          externalId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
          data: {
            transactionId: `txn_${Date.now()}`,
            status: 'approved',
            amount: request.data.amount
          },
          responseTime: Math.floor(Math.random() * 500) + 50
        };
      };

      const result = await retryEngine.executeWithRetry(platform, mockOperation, request);
      
      results.push({
        operation: 'process_payment',
        providerId: provider.id,
        providerName: provider.name,
        result
      });

    } catch (error) {
      console.error(`Erro no teste de pagamento ${i}:`, error);
    }
  }

  return results;
}

async function testShippingIntegrations(platform: any, count: number, simulateFailures: boolean) {
  const results: any[] = [];
  
  const providers = await getActiveProviders(platform, 'shipping');
  
  if (providers.length === 0) {
    console.log('⚠️ Nenhum provider de frete ativo encontrado');
    return results;
  }

  for (let i = 0; i < count; i++) {
    const provider = providers[i % providers.length];
    const orderId = `test_shipment_${Date.now()}_${i}`;
    
    const request: IntegrationRequest = {
      providerId: provider.id,
      operation: 'create_shipment',
      referenceId: orderId,
      referenceType: 'order',
      data: {
        orderId: orderId,
        origin: {
          postalCode: '01310-100',
          city: 'São Paulo',
          state: 'SP'
        },
        destination: {
          postalCode: ['20040-020', '30112-000', '40070-110'][Math.floor(Math.random() * 3)],
          city: ['Rio de Janeiro', 'Belo Horizonte', 'Salvador'][Math.floor(Math.random() * 3)],
          state: ['RJ', 'MG', 'BA'][Math.floor(Math.random() * 3)]
        },
        packages: [{
          weight: Math.floor(Math.random() * 5000) + 100, // 100g a 5kg
          dimensions: {
            height: Math.floor(Math.random() * 20) + 5,
            width: Math.floor(Math.random() * 30) + 10,
            length: Math.floor(Math.random() * 40) + 15
          }
        }],
        service: ['PAC', 'SEDEX', 'EXPRESSO'][Math.floor(Math.random() * 3)]
      },
      metadata: {
        testOperation: true,
        testIndex: i,
        testType: 'shipping'
      },
      priority: Math.floor(Math.random() * 5) + 1
    };

    try {
      const mockOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 200));
        
        if (simulateFailures && Math.random() < 0.3) { // 30% de falha
          return {
            success: false,
            error: {
              code: ['INVALID_POSTAL_CODE', 'SERVICE_UNAVAILABLE', 'TIMEOUT'][Math.floor(Math.random() * 3)],
              message: 'Erro simulado no frete',
              retryable: true
            },
            responseTime: Math.floor(Math.random() * 1500) + 200
          };
        }

        return {
          success: true,
          externalId: `ship_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
          data: {
            trackingCode: `BR${Math.random().toString().substr(2, 11)}`,
            service: request.data.service,
            estimatedDelivery: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            cost: Math.floor(Math.random() * 5000) + 500 // R$ 5,00 a R$ 50,00 em centavos
          },
          responseTime: Math.floor(Math.random() * 800) + 100
        };
      };

      const result = await retryEngine.executeWithRetry(platform, mockOperation, request);
      
      results.push({
        operation: 'create_shipment',
        providerId: provider.id,
        providerName: provider.name,
        result
      });

    } catch (error) {
      console.error(`Erro no teste de frete ${i}:`, error);
    }
  }

  return results;
}

async function testNotificationIntegrations(platform: any, count: number, simulateFailures: boolean) {
  const results: any[] = [];
  
  const providers = await getActiveProviders(platform, 'notification');
  
  if (providers.length === 0) {
    console.log('⚠️ Nenhum provider de notificação ativo encontrado');
    return results;
  }

  for (let i = 0; i < count; i++) {
    const provider = providers[i % providers.length];
    const notificationId = `test_notification_${Date.now()}_${i}`;
    
    const request: IntegrationRequest = {
      providerId: provider.id,
      operation: 'send_notification',
      referenceId: notificationId,
      referenceType: 'notification',
      data: {
        type: ['email', 'sms', 'push'][Math.floor(Math.random() * 3)],
        recipient: `teste${i + 1}@exemplo.com`,
        template: ['order_confirmation', 'payment_confirmation', 'shipping_update'][Math.floor(Math.random() * 3)],
        data: {
          orderNumber: `ORD${Math.random().toString().substr(2, 8)}`,
          customerName: `Cliente ${i + 1}`,
          amount: Math.floor(Math.random() * 50000) + 1000
        }
      },
      metadata: {
        testOperation: true,
        testIndex: i,
        testType: 'notification'
      },
      priority: Math.floor(Math.random() * 5) + 1
    };

    try {
      const mockOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 50));
        
        if (simulateFailures && Math.random() < 0.2) { // 20% de falha
          return {
            success: false,
            error: {
              code: ['INVALID_EMAIL', 'RATE_LIMIT', 'TEMPLATE_ERROR'][Math.floor(Math.random() * 3)],
              message: 'Erro simulado na notificação',
              retryable: Math.random() < 0.7 // 70% retryable
            },
            responseTime: Math.floor(Math.random() * 800) + 50
          };
        }

        return {
          success: true,
          externalId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
          data: {
            messageId: `msg_${Date.now()}`,
            status: 'sent',
            recipient: request.data.recipient,
            sentAt: new Date().toISOString()
          },
          responseTime: Math.floor(Math.random() * 300) + 25
        };
      };

      const result = await retryEngine.executeWithRetry(platform, mockOperation, request);
      
      results.push({
        operation: 'send_notification',
        providerId: provider.id,
        providerName: provider.name,
        result
      });

    } catch (error) {
      console.error(`Erro no teste de notificação ${i}:`, error);
    }
  }

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getActiveProviders(platform: any, type: string) {
  return await getDatabase(platform, async (db) => {
    const providers = await db.query(`
      SELECT id, name, display_name, type, config, retry_config
      FROM integration_providers
      WHERE type = $1 AND is_active = true
      ORDER BY priority ASC
    `, [type]);

    return providers;
  });
} 