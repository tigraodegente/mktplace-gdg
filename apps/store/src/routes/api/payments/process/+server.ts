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
    holderName?: string;
    holderDocument?: string;
    holderPhone?: string;
    billingAddress?: any;
    
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
      const order = await db.query(`
        SELECT 
          o.id, 
          o.order_number, 
          o.total, 
          o.status, 
          o.payment_status,
          o.user_id
        FROM orders o
        WHERE o.id = $1 
        AND o.user_id = $2
        AND o.status = 'pending'
        AND o.payment_status = 'pending'
      `, [paymentData.orderId, authResult.user!.id]);

      if (!order || order.length === 0) {
        throw new Error('Pedido não encontrado ou já processado');
      }

      const orderData = order[0];

      // Verificar se já não existe um pagamento pendente
      const existingPayment = await db.query(`
        SELECT id, status 
        FROM payments 
        WHERE order_id = $1 
        AND status IN ('pending', 'processing')
      `, [paymentData.orderId]);

      if (existingPayment && existingPayment.length > 0) {
        throw new Error('Já existe um pagamento pendente para este pedido');
      }

      const amount = parseFloat(orderData.total);

      // Processar pagamento baseado no método usando gateway real
      let paymentResult: PaymentResponse;

      switch (paymentData.method) {
        case 'pix':
          paymentResult = await processRealPixPayment(amount, orderData, paymentData.paymentData);
          break;
        case 'credit_card':
        case 'debit_card':
          paymentResult = await processRealCardPayment(amount, orderData, paymentData.method, paymentData.paymentData);
          break;
        case 'boleto':
          paymentResult = await processRealBoletoPayment(amount, orderData, paymentData.paymentData);
          break;
        default:
          throw new Error('Método de pagamento não suportado');
      }

      // Salvar pagamento no banco
      const payment = await db.query(`
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, external_id, method, status, amount, payment_data, expires_at
      `, [
        paymentData.orderId,
        paymentResult.id,
        process.env.PAYMENT_GATEWAY || 'pagseguro',
        paymentData.method,
        paymentResult.status,
        amount,
        'BRL',
        JSON.stringify(paymentResult.paymentData),
        paymentResult.expiresAt ? new Date(paymentResult.expiresAt) : null
      ]);

      // Atualizar status do pedido
      if (paymentResult.status === 'paid') {
        await db.query(`
          UPDATE orders 
          SET payment_status = 'paid', payment_method = $1, status = 'confirmed'
          WHERE id = $2
        `, [paymentData.method, paymentData.orderId]);
      } else if (paymentResult.status === 'pending' || paymentResult.status === 'processing') {
        await db.query(`
          UPDATE orders 
          SET payment_status = 'processing', payment_method = $1
          WHERE id = $2
        `, [paymentData.method, paymentData.orderId]);
      }

      // Adicionar à fila de processamento se necessário
      if (paymentResult.status !== 'paid') {
        await db.query(`
          INSERT INTO payment_queue (
            payment_id,
            status,
            attempts,
            max_attempts
          ) VALUES ($1, $2, $3, $4)
        `, [payment[0].id, 'pending', 0, 3]);
      }

      // Log no histórico
      await db.query(`
        INSERT INTO order_status_history (
          order_id,
          previous_status,
          new_status,
          created_by,
          created_by_type,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        paymentData.orderId,
        'pending',
        paymentResult.status === 'paid' ? 'confirmed' : 'processing',
        authResult.user!.id,
        'user',
        `Pagamento iniciado via ${paymentData.method.toUpperCase()}`
      ]);

      return {
        payment: {
          id: payment[0].id,
          externalId: payment[0].external_id,
          method: payment[0].method,
          status: payment[0].status,
          amount: parseFloat(payment[0].amount),
          paymentData: payment[0].payment_data,
          expiresAt: payment[0].expires_at
        },
        order: {
          id: orderData.id,
          orderNumber: orderData.order_number,
          total: amount
        }
      };
    });

    console.log(`✅ Pagamento processado - Pedido: ${result.order.orderNumber}, Método: ${paymentData.method}, Status: ${result.payment.status}`);

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return json({
      success: false,
      error: { message: errorMessage }
    }, { status: 400 });
  }
};

// Implementações reais com gateway (PagSeguro como padrão)
async function processRealPixPayment(amount: number, order: any, data?: any): Promise<PaymentResponse> {
  try {
    const gateway = process.env.PAYMENT_GATEWAY || 'pagseguro';
    
    if (gateway === 'pagseguro' && process.env.PAGSEGURO_TOKEN) {
      return await processPagSeguroPixPayment(amount, order, data);
    }
    
    // Fallback para simulação em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      return simulatePixPayment(amount, order, data);
    }
    
    throw new Error('Gateway PIX não configurado');
  } catch (error) {
    console.error('Erro no pagamento PIX:', error);
    throw error;
  }
}

async function processRealCardPayment(amount: number, order: any, method: string, data?: any): Promise<PaymentResponse> {
  try {
    const gateway = process.env.PAYMENT_GATEWAY || 'pagseguro';
    
    if (gateway === 'pagseguro' && process.env.PAGSEGURO_TOKEN) {
      return await processPagSeguroCardPayment(amount, order, method, data);
    }
    
    if (process.env.NODE_ENV === 'development') {
      return simulateCardPayment(amount, order, method, data);
    }
    
    throw new Error('Gateway de cartão não configurado');
  } catch (error) {
    console.error('Erro no pagamento com cartão:', error);
    throw error;
  }
}

async function processRealBoletoPayment(amount: number, order: any, data?: any): Promise<PaymentResponse> {
  try {
    const gateway = process.env.PAYMENT_GATEWAY || 'pagseguro';
    
    if (gateway === 'pagseguro' && process.env.PAGSEGURO_TOKEN) {
      return await processPagSeguroBoletoPayment(amount, order, data);
    }
    
    if (process.env.NODE_ENV === 'development') {
      return simulateBoletoPayment(amount, order, data);
    }
    
    throw new Error('Gateway de boleto não configurado');
  } catch (error) {
    console.error('Erro no pagamento com boleto:', error);
    throw error;
  }
}

// Implementações PagSeguro reais
async function processPagSeguroPixPayment(amount: number, order: any, data?: any): Promise<PaymentResponse> {
  const apiUrl = process.env.PAGSEGURO_API_URL || 'https://ws.pagseguro.uol.com.br/v4';
  const token = process.env.PAGSEGURO_TOKEN;

  const pixPayment = {
    reference_id: order.order_number,
    description: `Pedido ${order.order_number}`,
    amount: {
      value: Math.round(amount * 100), // centavos
      currency: 'BRL'
    },
    payment_method: {
      type: 'PIX'
    },
    notification_urls: [
      `${process.env.APP_URL}/api/webhooks/pagseguro`
    ]
  };

  const response = await fetch(`${apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(pixPayment)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`PagSeguro PIX error: ${result.error_messages?.[0]?.description || 'Erro desconhecido'}`);
  }

  return {
    id: result.id,
    status: 'pending',
    method: 'pix',
    amount,
    paymentData: {
      qrCode: result.qr_codes?.[0]?.text,
      copyPaste: result.qr_codes?.[0]?.text,
      qrCodeImage: result.qr_codes?.[0]?.links?.[0]?.href,
      expiresAt: result.qr_codes?.[0]?.expiration_date,
      instructions: 'Escaneie o QR Code ou use o código Pix copia e cola'
    },
    expiresAt: result.qr_codes?.[0]?.expiration_date
  };
}

async function processPagSeguroCardPayment(amount: number, order: any, method: string, data?: any): Promise<PaymentResponse> {
  const apiUrl = process.env.PAGSEGURO_API_URL || 'https://ws.pagseguro.uol.com.br/v4';
  const token = process.env.PAGSEGURO_TOKEN;

  const cardPayment = {
    reference_id: order.order_number,
    description: `Pedido ${order.order_number}`,
    amount: {
      value: Math.round(amount * 100),
      currency: 'BRL'
    },
    payment_method: {
      type: 'CREDIT_CARD',
      installments: data?.installments || 1,
      capture: true,
      card: {
        encrypted: data?.cardToken,
        security_code: data?.securityCode,
        holder: {
          name: data?.holderName,
          tax_id: data?.holderDocument
        }
      }
    },
    notification_urls: [
      `${process.env.APP_URL}/api/webhooks/pagseguro`
    ]
  };

  const response = await fetch(`${apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(cardPayment)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`PagSeguro Card error: ${result.error_messages?.[0]?.description || 'Erro desconhecido'}`);
  }

  const charge = result.charges?.[0];
  const status = mapPagSeguroStatus(charge?.status || 'PENDING');

  return {
    id: result.id,
    status,
    method,
    amount,
    paymentData: {
      authorizationCode: charge?.payment_method?.card?.authorization_code,
      nsu: charge?.payment_method?.card?.nsu,
      tid: charge?.id,
      installments: data?.installments || 1
    }
  };
}

async function processPagSeguroBoletoPayment(amount: number, order: any, data?: any): Promise<PaymentResponse> {
  const apiUrl = process.env.PAGSEGURO_API_URL || 'https://ws.pagseguro.uol.com.br/v4';
  const token = process.env.PAGSEGURO_TOKEN;

  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  const boletoPayment = {
    reference_id: order.order_number,
    description: `Pedido ${order.order_number}`,
    amount: {
      value: Math.round(amount * 100),
      currency: 'BRL'
    },
    payment_method: {
      type: 'BOLETO',
      boleto: {
        due_date: dueDate.toISOString().split('T')[0],
        instruction_lines: {
          line_1: 'Pagamento processado para Marketplace GDG',
          line_2: `Pedido: ${order.order_number}`
        }
      }
    },
    notification_urls: [
      `${process.env.APP_URL}/api/webhooks/pagseguro`
    ]
  };

  const response = await fetch(`${apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(boletoPayment)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`PagSeguro Boleto error: ${result.error_messages?.[0]?.description || 'Erro desconhecido'}`);
  }

  const charge = result.charges?.[0];
  const boleto = charge?.payment_method?.boleto;

  return {
    id: result.id,
    status: 'pending',
    method: 'boleto',
    amount,
    paymentData: {
      barcodeNumber: boleto?.barcode,
      digitableLine: boleto?.formatted_barcode,
      pdfUrl: result.links?.find((link: any) => link.media === 'application/pdf')?.href,
      dueDate: boleto?.due_date,
      instructions: 'Pague o boleto em qualquer banco, casa lotérica ou pelo internet banking'
    },
    expiresAt: dueDate.toISOString()
  };
}

// Simulações para desenvolvimento (dados mais realistas)
function simulatePixPayment(amount: number, order: any, data?: any): Promise<PaymentResponse> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const qrCode = `00020126580014BR.GOV.BCB.PIX01368d957f4e-bbcf-4631-80dc-273fab0b0111520400005303986540${amount.toFixed(2)}5802BR5909Marketplace6009SaoPaulo62070503***6304`;
  
  return Promise.resolve({
    id: `sim_pix_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    status: 'pending',
    method: 'pix',
    amount,
    paymentData: {
      qrCode,
      copyPaste: qrCode,
      qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      expiresAt: expiresAt.toISOString(),
      instructions: 'Escaneie o QR Code ou use o código Pix copia e cola (SIMULAÇÃO)'
    },
    expiresAt: expiresAt.toISOString()
  });
}

function simulateCardPayment(amount: number, order: any, method: string, data?: any): Promise<PaymentResponse> {
  // 95% de aprovação em simulação
  const isApproved = Math.random() > 0.05;
  
  return Promise.resolve({
    id: `sim_card_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    status: isApproved ? 'paid' : 'failed',
    method,
    amount,
    paymentData: {
      authorizationCode: isApproved ? `AUTH${Math.random().toString().substr(2, 6)}` : null,
      nsu: isApproved ? Math.random().toString().substr(2, 8) : null,
      tid: `TID${Date.now()}`,
      installments: data?.installments || 1,
      failureReason: !isApproved ? 'Cartão recusado pelo banco emissor (simulação)' : null
    }
  });
}

function simulateBoletoPayment(amount: number, order: any, data?: any): Promise<PaymentResponse> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const barcodeNumber = `03399${Math.random().toString().substr(2, 39)}`;
  
  return Promise.resolve({
    id: `sim_boleto_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    status: 'pending',
    method: 'boleto',
    amount,
    paymentData: {
      barcodeNumber,
      digitableLine: barcodeNumber.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d{1})(\d{14})/, '$1.$2 $3.$4 $5.$6 $7 $8'),
      pdfUrl: `/api/boleto/generate/${order.order_number}`,
      dueDate: expiresAt.toISOString().split('T')[0],
      instructions: 'Pague o boleto em qualquer banco, casa lotérica (SIMULAÇÃO)'
    },
    expiresAt: expiresAt.toISOString()
  });
}

// Mapeamento de status do PagSeguro
function mapPagSeguroStatus(status: string): 'pending' | 'processing' | 'paid' | 'failed' {
  const statusMap: Record<string, 'pending' | 'processing' | 'paid' | 'failed'> = {
    'AUTHORIZED': 'paid',
    'PAID': 'paid',
    'IN_ANALYSIS': 'processing',
    'PENDING': 'pending',
    'DECLINED': 'failed',
    'CANCELED': 'failed'
  };
  return statusMap[status] || 'pending';
} 