import { json } from '@sveltejs/kit';
import { AppmaxService } from '$lib/services/integrations/appmax/service';
import { AppmaxClient } from '$lib/services/integrations/appmax/client';
import { getDatabase } from '$lib/db';
import { logger } from '$lib/utils/logger';
import type { AppmaxWebhookPayload, AppmaxPaymentStatus } from '../../../../../../../../packages/shared-types/src/integrations/appmax';

export const POST = async ({ request, platform }: any) => {
  try {
    // Capturar assinatura do header
    const signature = request.headers.get('X-AppMax-Signature') || 
                     request.headers.get('x-appmax-signature');
    
    // Ler payload
    const rawBody = await request.text();
    const payload: AppmaxWebhookPayload = JSON.parse(rawBody);
    
    logger.info('AppMax webhook received', {
      event: payload.event,
      id: payload.id
    });
    
    // Obter configuração para validar assinatura
    const config = await AppmaxService.getConfig(platform);
    if (!config || !config.webhookSecret) {
      logger.error('AppMax webhook secret not configured');
      return json({ status: 'error' }, { status: 500 });
    }
    
    // Validar assinatura (se fornecida)
    if (signature) {
      const client = new AppmaxClient(config);
      const isValid = await client.validateWebhookSignature(
        rawBody,
        signature,
        config.webhookSecret
      );
      
      if (!isValid) {
        logger.warn('Invalid webhook signature', { signature });
        return json({ status: 'unauthorized' }, { status: 401 });
      }
    }
    
    const db = getDatabase(platform);
    
    // Processar evento baseado no tipo
    switch (payload.event) {
      case 'payment.approved':
        await handlePaymentApproved(db, payload);
        break;
        
      case 'payment.declined':
        await handlePaymentDeclined(db, payload);
        break;
        
      case 'payment.refunded':
        await handlePaymentRefunded(db, payload);
        break;
        
      case 'payment.cancelled':
        await handlePaymentCancelled(db, payload);
        break;
        
      case 'order.created':
      case 'order.updated':
        logger.info('Order event received', { event: payload.event });
        break;
        
      case 'customer.created':
      case 'customer.updated':
        logger.info('Customer event received', { event: payload.event });
        break;
        
      default:
        logger.warn('Unknown webhook event', { event: payload.event });
    }
    
    // Salvar webhook log
    await db.query`
      INSERT INTO webhook_logs (
        gateway,
        event_id,
        event_type,
        payload,
        signature,
        processed_at
      ) VALUES (
        'appmax',
        ${payload.id},
        ${payload.event},
        ${JSON.stringify(payload)},
        ${signature},
        NOW()
      )
    `;
    
    return json({ status: 'success' });
    
  } catch (error) {
    logger.error('Failed to process AppMax webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return json({ status: 'error' }, { status: 500 });
  }
};

// Handler para pagamento aprovado
async function handlePaymentApproved(db: any, payload: AppmaxWebhookPayload) {
  try {
    const payment = payload.data.payment;
    if (!payment) return;
    
    const internalOrderId = payment.metadata?.internalOrderId;
    if (!internalOrderId) {
      logger.warn('Internal order ID not found in payment metadata');
      return;
    }
    
    // Atualizar transação
    await db.query`
      UPDATE payment_transactions
      SET 
        status = 'completed',
        updated_at = NOW()
      WHERE 
        order_id = ${internalOrderId} AND
        external_transaction_id = ${payment.id}
    `;
    
    // Atualizar pedido
    await db.query`
      UPDATE orders
      SET 
        payment_status = 'paid',
        status = 'processing',
        paid_at = NOW()
      WHERE 
        id = ${internalOrderId} AND
        payment_status != 'paid'
    `;
    
    // Enviar email de confirmação (async)
    // TODO: Implementar envio de email
    
    logger.info('Payment approved webhook processed', {
      orderId: internalOrderId,
      paymentId: payment.id
    });
    
  } catch (error) {
    logger.error('Failed to handle payment approved', { error });
    throw error;
  }
}

// Handler para pagamento recusado
async function handlePaymentDeclined(db: any, payload: AppmaxWebhookPayload) {
  try {
    const payment = payload.data.payment;
    if (!payment) return;
    
    const internalOrderId = payment.metadata?.internalOrderId;
    if (!internalOrderId) return;
    
    // Atualizar transação
    await db.query`
      UPDATE payment_transactions
      SET 
        status = 'failed',
        updated_at = NOW()
      WHERE 
        order_id = ${internalOrderId} AND
        external_transaction_id = ${payment.id}
    `;
    
    // Atualizar pedido
    await db.query`
      UPDATE orders
      SET 
        payment_status = 'failed',
        status = 'payment_failed'
      WHERE 
        id = ${internalOrderId} AND
        payment_status = 'pending'
    `;
    
    logger.info('Payment declined webhook processed', {
      orderId: internalOrderId,
      paymentId: payment.id
    });
    
  } catch (error) {
    logger.error('Failed to handle payment declined', { error });
    throw error;
  }
}

// Handler para reembolso
async function handlePaymentRefunded(db: any, payload: AppmaxWebhookPayload) {
  try {
    const payment = payload.data.payment;
    if (!payment) return;
    
    const internalOrderId = payment.metadata?.internalOrderId;
    if (!internalOrderId) return;
    
    // Atualizar transação
    await db.query`
      UPDATE payment_transactions
      SET 
        status = 'refunded',
        updated_at = NOW()
      WHERE 
        order_id = ${internalOrderId} AND
        external_transaction_id = ${payment.id}
    `;
    
    // Atualizar pedido
    await db.query`
      UPDATE orders
      SET 
        payment_status = 'refunded',
        status = 'refunded',
        refunded_at = NOW()
      WHERE 
        id = ${internalOrderId}
    `;
    
    // Reverter estoque (se aplicável)
    // TODO: Implementar reversão de estoque
    
    logger.info('Payment refunded webhook processed', {
      orderId: internalOrderId,
      paymentId: payment.id
    });
    
  } catch (error) {
    logger.error('Failed to handle payment refunded', { error });
    throw error;
  }
}

// Handler para pagamento cancelado
async function handlePaymentCancelled(db: any, payload: AppmaxWebhookPayload) {
  try {
    const payment = payload.data.payment;
    if (!payment) return;
    
    const internalOrderId = payment.metadata?.internalOrderId;
    if (!internalOrderId) return;
    
    // Atualizar transação
    await db.query`
      UPDATE payment_transactions
      SET 
        status = 'cancelled',
        updated_at = NOW()
      WHERE 
        order_id = ${internalOrderId} AND
        external_transaction_id = ${payment.id}
    `;
    
    // Atualizar pedido (se ainda estiver pendente)
    await db.query`
      UPDATE orders
      SET 
        payment_status = 'cancelled',
        status = 'cancelled',
        cancelled_at = NOW()
      WHERE 
        id = ${internalOrderId} AND
        payment_status = 'pending'
    `;
    
    logger.info('Payment cancelled webhook processed', {
      orderId: internalOrderId,
      paymentId: payment.id
    });
    
  } catch (error) {
    logger.error('Failed to handle payment cancelled', { error });
    throw error;
  }
} 