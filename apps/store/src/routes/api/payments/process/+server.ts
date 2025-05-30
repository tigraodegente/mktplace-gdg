import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

interface PaymentRequest {
  orderId: string;
  method: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
  paymentData?: {
    // PIX
    pixKey?: string;
    
    // Cartão (dados tokenizados)
    cardToken?: string;
    installments?: number;
    
    // Boleto
    customerDocument?: string;
    
    // Dados gerais
    customerName?: string;
    customerEmail?: string;
  };
}

interface PaymentResponse {
  id: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  method: string;
  amount: number;
  paymentData: any;
  expiresAt?: string;
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return json({ success: false, error: authResult.error }, { status: 401 });
    }

    const paymentData: PaymentRequest = await request.json();

    if (!paymentData.orderId || !paymentData.method) {
      return json({
        success: false,
        error: { message: 'ID do pedido e método de pagamento são obrigatórios' }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar se o pedido existe e pertence ao usuário
      const order = await db.queryOne`
        SELECT 
          o.id, 
          o.order_number, 
          o.total, 
          o.status, 
          o.payment_status,
          o.user_id
        FROM orders o
        WHERE o.id = ${paymentData.orderId} 
        AND o.user_id = ${authResult.user!.id}
        AND o.status = 'pending'
        AND o.payment_status = 'pending'
      `;

      if (!order) {
        throw new Error('Pedido não encontrado ou já processado');
      }

      // Verificar se já não existe um pagamento pendente
      const existingPayment = await db.queryOne`
        SELECT id, status 
        FROM payments 
        WHERE order_id = ${paymentData.orderId} 
        AND status IN ('pending', 'processing')
      `;

      if (existingPayment) {
        throw new Error('Já existe um pagamento pendente para este pedido');
      }

      const amount = parseFloat(order.total);

      // Processar pagamento baseado no método
      let paymentResult: PaymentResponse;

      switch (paymentData.method) {
        case 'pix':
          paymentResult = await processPixPayment(amount, paymentData.paymentData);
          break;
        case 'credit_card':
        case 'debit_card':
          paymentResult = await processCardPayment(amount, paymentData.method, paymentData.paymentData);
          break;
        case 'boleto':
          paymentResult = await processBoletoPayment(amount, paymentData.paymentData);
          break;
        default:
          throw new Error('Método de pagamento não suportado');
      }

      // Salvar pagamento no banco
      const payment = await db.queryOne`
        INSERT INTO payments (
          order_id,
          external_id,
          gateway,
          method,
          status,
          amount,
          currency,
          payment_data,
          expires_at
        ) VALUES (
          ${paymentData.orderId},
          ${paymentResult.id},
          'mock',
          ${paymentData.method},
          ${paymentResult.status},
          ${amount},
          'BRL',
          ${JSON.stringify(paymentResult.paymentData)},
          ${paymentResult.expiresAt ? new Date(paymentResult.expiresAt) : null}
        ) RETURNING id, external_id, method, status, amount, payment_data, expires_at
      `;

      // Atualizar status do pedido para processing se o pagamento foi iniciado
      if (paymentResult.status === 'pending' || paymentResult.status === 'processing') {
        await db.query`
          UPDATE orders 
          SET payment_status = 'processing', payment_method = ${paymentData.method}
          WHERE id = ${paymentData.orderId}
        `;
      }

      // Adicionar à fila de processamento
      await db.query`
        INSERT INTO payment_queue (
          payment_id,
          status,
          attempts,
          max_attempts
        ) VALUES (
          ${payment.id},
          'pending',
          0,
          3
        )
      `;

      // Log no histórico
      await db.query`
        INSERT INTO order_status_history (
          order_id,
          previous_status,
          new_status,
          created_by,
          created_by_type,
          notes
        ) VALUES (
          ${paymentData.orderId},
          'pending',
          'processing',
          ${authResult.user!.id},
          'user',
          ${`Pagamento iniciado via ${paymentData.method.toUpperCase()}`}
        )
      `;

      return {
        payment: {
          id: payment.id,
          externalId: payment.external_id,
          method: payment.method,
          status: payment.status,
          amount: parseFloat(payment.amount),
          paymentData: payment.payment_data,
          expiresAt: payment.expires_at
        },
        order: {
          id: order.id,
          orderNumber: order.order_number,
          total: amount
        }
      };
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 400 });
  }
};

// Funções de processamento específicas para cada método (mockadas)
async function processPixPayment(amount: number, data?: any): Promise<PaymentResponse> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
  const qrCode = `00020126580014BR.GOV.BCB.PIX01368d957f4e-bbcf-4631-80dc-273fab0b0111520400005303986540${amount.toFixed(2)}5802BR5909Marketplace6009SaoPaulo62070503***6304`;
  
  return {
    id: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    status: 'pending',
    method: 'pix',
    amount,
    paymentData: {
      qrCode,
      copyPaste: qrCode,
      pixKey: data?.pixKey || 'marketplace@exemplo.com',
      expiresAt: expiresAt.toISOString(),
      instructions: 'Escaneie o QR Code ou use o código Pix copia e cola para realizar o pagamento'
    },
    expiresAt: expiresAt.toISOString()
  };
}

async function processCardPayment(amount: number, method: string, data?: any): Promise<PaymentResponse> {
  // Simular processamento de cartão
  const isApproved = Math.random() > 0.1; // 90% de aprovação
  
  return {
    id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    status: isApproved ? 'paid' : 'failed',
    method,
    amount,
    paymentData: {
      cardToken: data?.cardToken || 'mock_card_token',
      installments: data?.installments || 1,
      authorizationCode: isApproved ? `AUTH${Math.random().toString().substr(2, 6)}` : null,
      nsu: isApproved ? Math.random().toString().substr(2, 8) : null,
      tid: `TID${Date.now()}`,
      failureReason: !isApproved ? 'Cartão recusado pelo banco emissor' : null
    }
  };
}

async function processBoletoPayment(amount: number, data?: any): Promise<PaymentResponse> {
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 dias
  const barcodeNumber = `03399${Math.random().toString().substr(2, 39)}`;
  
  return {
    id: `boleto_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    status: 'pending',
    method: 'boleto',
    amount,
    paymentData: {
      barcodeNumber,
      digitableLine: barcodeNumber.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d{1})(\d{14})/, '$1.$2 $3.$4 $5.$6 $7 $8'),
      pdfUrl: `https://mockapi.com/boleto/${barcodeNumber}.pdf`,
      expiresAt: expiresAt.toISOString(),
      instructions: 'Pague o boleto em qualquer banco, casa lotérica ou pelo internet banking'
    },
    expiresAt: expiresAt.toISOString()
  };
} 