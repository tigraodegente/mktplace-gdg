import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

interface QueueItem {
  id: string;
  payment_id: string;
  attempts: number;
  max_attempts: number;
  error_message?: string;
  payment: {
    id: string;
    order_id: string;
    method: string;
    status: string;
    amount: number;
    payment_data: any;
    external_id: string;
  };
}

export const POST: RequestHandler = async ({ platform }) => {
  try {
    console.log('🔄 Iniciando processamento da fila de pagamentos...');

    const result = await withDatabase(platform, async (db) => {
      // Buscar itens pendentes na fila
      const queueItems = await db.query`
        SELECT 
          pq.id,
          pq.payment_id,
          pq.attempts,
          pq.max_attempts,
          pq.error_message,
          p.id as payment_id_ref,
          p.order_id,
          p.method,
          p.status as payment_status,
          p.amount,
          p.payment_data,
          p.external_id
        FROM payment_queue pq
        JOIN payments p ON pq.payment_id = p.id
        WHERE pq.status IN ('pending', 'retrying')
        AND pq.scheduled_at <= NOW()
        ORDER BY pq.created_at ASC
        LIMIT 10
      `;

      if (queueItems.length === 0) {
        return { processed: 0, message: 'Nenhum item na fila para processar' };
      }

      console.log(`📋 Encontrados ${queueItems.length} itens para processar`);

      const results = [];

      for (const item of queueItems) {
        try {
          // Atualizar status para processing
          await db.query`
            UPDATE payment_queue 
            SET status = 'processing', processed_at = NOW()
            WHERE id = ${item.id}
          `;

          // Simular processamento do pagamento
          const success = await processPayment(item);

          if (success) {
            // Sucesso - marcar como completed
            await db.query`
              UPDATE payment_queue 
              SET status = 'completed'
              WHERE id = ${item.id}
            `;

            // Atualizar status do pagamento
            await db.query`
              UPDATE payments 
              SET status = 'paid', paid_at = NOW(),
                  gateway_response = ${JSON.stringify({
                    processed_at: new Date().toISOString(),
                    retry_attempt: item.attempts + 1,
                    status: 'approved'
                  })}
              WHERE id = ${item.payment_id}
            `;

            // Atualizar pedido
            await db.query`
              UPDATE orders 
              SET status = 'paid', payment_status = 'paid'
              WHERE id = ${item.order_id}
            `;

            // Adicionar email de confirmação
            await db.query`
              INSERT INTO email_queue (
                to_email, to_name, subject, template, template_data
              ) SELECT 
                u.email, u.name, 
                CONCAT('Pagamento confirmado - Pedido ', o.order_number),
                'payment_confirmed',
                JSON_BUILD_OBJECT(
                  'order_number', o.order_number,
                  'amount', p.amount,
                  'method', p.method
                )
              FROM orders o
              JOIN users u ON o.user_id = u.id
              JOIN payments p ON o.id = p.order_id
              WHERE o.id = ${item.order_id}
            `;

            results.push({
              queueId: item.id,
              paymentId: item.payment_id,
              status: 'completed',
              attempts: item.attempts + 1
            });

            console.log(`✅ Pagamento ${item.payment_id} processado com sucesso`);

          } else {
            // Falha - verificar se deve tentar novamente
            const newAttempts = item.attempts + 1;
            
            if (newAttempts < item.max_attempts) {
              // Ainda há tentativas - agendar retry
              const nextAttempt = new Date(Date.now() + (newAttempts * 60 * 1000)); // 1min, 2min, 3min
              
              await db.query`
                UPDATE payment_queue 
                SET status = 'retrying',
                    attempts = ${newAttempts},
                    error_message = 'Falha no processamento - tentativa automática agendada',
                    scheduled_at = ${nextAttempt}
                WHERE id = ${item.id}
              `;

              results.push({
                queueId: item.id,
                paymentId: item.payment_id,
                status: 'retrying',
                attempts: newAttempts,
                nextAttempt: nextAttempt.toISOString()
              });

              console.log(`⏳ Pagamento ${item.payment_id} falhou - retry ${newAttempts}/${item.max_attempts} agendado para ${nextAttempt.toLocaleString()}`);

            } else {
              // Esgotaram as tentativas - marcar como failed
              await db.query`
                UPDATE payment_queue 
                SET status = 'failed',
                    attempts = ${newAttempts},
                    error_message = 'Máximo de tentativas excedido'
                WHERE id = ${item.id}
              `;

              // Atualizar status do pagamento
              await db.query`
                UPDATE payments 
                SET status = 'failed',
                    gateway_response = ${JSON.stringify({
                      failed_at: new Date().toISOString(),
                      final_attempt: newAttempts,
                      reason: 'Max attempts exceeded'
                    })}
                WHERE id = ${item.payment_id}
              `;

              // Atualizar pedido para cancelled
              await db.query`
                UPDATE orders 
                SET status = 'cancelled', payment_status = 'failed'
                WHERE id = ${item.order_id}
              `;

              // Restaurar estoque
              await db.query`
                UPDATE products 
                SET stock_quantity = stock_quantity + oi.quantity
                FROM order_items oi
                WHERE products.id = oi.product_id 
                AND oi.order_id = ${item.order_id}
              `;

              // Email de falha
              await db.query`
                INSERT INTO email_queue (
                  to_email, to_name, subject, template, template_data
                ) SELECT 
                  u.email, u.name, 
                  CONCAT('Falha no pagamento - Pedido ', o.order_number),
                  'payment_failed',
                  JSON_BUILD_OBJECT(
                    'order_number', o.order_number,
                    'amount', p.amount,
                    'method', p.method,
                    'attempts', ${newAttempts}
                  )
                FROM orders o
                JOIN users u ON o.user_id = u.id
                JOIN payments p ON o.id = p.order_id
                WHERE o.id = ${item.order_id}
              `;

              results.push({
                queueId: item.id,
                paymentId: item.payment_id,
                status: 'failed',
                attempts: newAttempts
              });

              console.log(`❌ Pagamento ${item.payment_id} falhou definitivamente após ${newAttempts} tentativas`);
            }
          }

        } catch (error) {
          console.error(`❌ Erro ao processar item ${item.id}:`, error);
          
          // Em caso de erro no processamento, marcar como failed
          await db.query`
            UPDATE payment_queue 
            SET status = 'failed',
                error_message = ${error instanceof Error ? error.message : 'Erro desconhecido'}
            WHERE id = ${item.id}
          `;

          results.push({
            queueId: item.id,
            paymentId: item.payment_id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      return {
        processed: results.length,
        results: results
      };
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erro no processamento da fila:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
};

// Simular processamento de pagamento (aqui seria a integração real com gateways)
async function processPayment(item: any): Promise<boolean> {
  // Simular falha em 30% dos casos para testar retry
  const shouldFail = Math.random() < 0.3;
  
  if (shouldFail) {
    console.log(`💥 Simulando falha no pagamento ${item.payment_id}`);
    return false;
  }

  // Simular tempo de processamento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`✅ Simulando sucesso no pagamento ${item.payment_id}`);
  return true;
} 