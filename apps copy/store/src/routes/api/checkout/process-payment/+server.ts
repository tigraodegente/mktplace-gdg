import { json } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';
import { AppmaxService } from '$lib/services/integrations/appmax/service';
import { logger } from '$lib/utils/logger';

interface ProcessPaymentRequest {
  orderId: string;
  paymentData?: {
    // Para cartão
    cardNumber?: string;
    cardHolder?: string;
    cardExpiry?: string;
    cardCvv?: string;
    installments?: number;
    
    // Para PIX
    pixExpiresIn?: number;
    
    // Para boleto
    boletoDueDate?: string;
    boletoInstructions?: string;
  };
}

// Função para decidir qual gateway usar (mesma lógica do create-order)
async function selectPaymentGateway(
  platform: any,
  paymentMethod: string,
  orderTotal: number
): Promise<string> {
  try {
    const db = getDatabase(platform);
    
    const gateways = await db.query`
      SELECT 
        name,
        is_active,
        supported_methods,
        min_amount,
        max_amount,
        priority
      FROM payment_gateways
      WHERE is_active = true
      ORDER BY priority DESC
    `;
    
    for (const gateway of gateways) {
      const supportedMethods = JSON.parse(gateway.supported_methods || '[]');
      
      if (!supportedMethods.includes(paymentMethod)) continue;
      if (gateway.min_amount && orderTotal < gateway.min_amount) continue;
      if (gateway.max_amount && orderTotal > gateway.max_amount) continue;
      
      return gateway.name;
    }
    
    return 'default';
  } catch (error) {
    logger.error('Failed to select payment gateway', { error });
    return 'default';
  }
}

export const POST = async ({ request, platform, cookies }: any) => {
  try {
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const { orderId, paymentData } = await request.json() as ProcessPaymentRequest;
    
    if (!orderId) {
      return json({
        success: false,
        error: { message: 'ID do pedido é obrigatório' }
      }, { status: 400 });
    }
    
    const db = getDatabase(platform);
    
    // Buscar pedido
    const orders = await db.query`
      SELECT 
        o.id,
        o.user_id,
        o.order_number,
        o.total,
        o.payment_method,
        o.payment_status,
        o.external_order_id
      FROM orders o
      WHERE o.id = ${orderId} AND o.user_id = ${authResult.user!.id}
      LIMIT 1
    `;
    
    const order = orders[0];
    if (!order) {
      return json({
        success: false,
        error: { message: 'Pedido não encontrado' }
      }, { status: 404 });
    }
    
    // Verificar se já foi pago
    if (order.payment_status === 'paid') {
      return json({
        success: false,
        error: { message: 'Este pedido já foi pago' }
      }, { status: 400 });
    }
    
    // Selecionar gateway baseado no método e valor
    const selectedGateway = await selectPaymentGateway(
      platform,
      order.payment_method,
      parseFloat(order.total)
    );
    
    logger.info('Processing payment', {
      orderId: order.id,
      gateway: selectedGateway,
      method: order.payment_method
    });
    
    // Processar com o gateway selecionado
    let paymentResult: any = null;
    
    switch (selectedGateway) {
      case 'appmax':
        // Processar com AppMax
        const appmaxConfig = await AppmaxService.getConfig(platform);
        if (!appmaxConfig) {
          logger.error('AppMax not configured');
          return json({
            success: false,
            error: { message: 'Gateway de pagamento não configurado' }
          }, { status: 500 });
        }
        
        // Preparar dados do pagamento para AppMax
        const appmaxPaymentData: any = {
          method: order.payment_method as any,
          installments: paymentData?.installments || 1
        };
        
        // Adicionar dados específicos do método
        switch (order.payment_method) {
          case 'credit_card':
          case 'debit_card':
            if (!paymentData?.cardNumber || !paymentData?.cardHolder || 
                !paymentData?.cardExpiry || !paymentData?.cardCvv) {
              return json({
                success: false,
                error: { message: 'Dados do cartão incompletos' }
              }, { status: 400 });
            }
            
            appmaxPaymentData.card = {
              number: paymentData.cardNumber,
              holder: paymentData.cardHolder,
              expiry: paymentData.cardExpiry,
              cvv: paymentData.cardCvv
            };
            break;
            
          case 'pix':
            appmaxPaymentData.pix = {
              expiresIn: paymentData?.pixExpiresIn || 3600
            };
            break;
            
          case 'boleto':
            if (!paymentData?.boletoDueDate) {
              // Gerar data de vencimento padrão (3 dias úteis)
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 3);
              const defaultDueDate = dueDate.toISOString().split('T')[0];
              
              appmaxPaymentData.boleto = {
                dueDate: defaultDueDate,
                instructions: paymentData?.boletoInstructions
              };
            } else {
              appmaxPaymentData.boleto = {
                dueDate: paymentData.boletoDueDate,
                instructions: paymentData.boletoInstructions
              };
            }
            break;
        }
        
        // Chamar endpoint da AppMax
        const response = await fetch(`${request.url.origin}/api/payments/appmax/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            orderId: order.id,
            paymentMethod: order.payment_method,
            installments: appmaxPaymentData.installments,
            cardData: appmaxPaymentData.card,
            pixData: appmaxPaymentData.pix,
            boletoData: appmaxPaymentData.boleto
          })
        });
        
        paymentResult = await response.json();
        
        if (!response.ok || !paymentResult.success) {
          return json(paymentResult, { status: response.status });
        }
        
        break;
        
      default:
        // Gateway padrão (simulação)
        logger.info('Using default payment gateway', { orderId: order.id });
        
        // Simular processamento
        const isApproved = Math.random() > 0.1; // 90% de aprovação
        
        if (isApproved) {
          // Atualizar pedido como pago
          await db.query`
            UPDATE orders
            SET 
              payment_status = 'paid',
              status = 'processing',
              paid_at = NOW()
            WHERE id = ${orderId}
          `;
          
          paymentResult = {
            success: true,
            data: {
              paymentId: `PAY-${Date.now()}`,
              status: 'approved',
              method: order.payment_method,
              amount: parseFloat(order.total) * 100,
              gateway: 'default'
            }
          };
        } else {
          paymentResult = {
            success: false,
            error: {
              message: 'Pagamento recusado pelo emissor do cartão'
            }
          };
        }
        break;
    }
    
    // Adicionar informação do gateway usado na resposta
    if (paymentResult?.success && paymentResult?.data) {
      paymentResult.data.gateway = selectedGateway;
    }
    
    logger.info('Payment processed', {
      orderId: order.id,
      success: paymentResult?.success,
      gateway: selectedGateway
    });
    
    return json(paymentResult);
    
  } catch (error) {
    logger.error('Failed to process payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return json({
      success: false,
      error: { 
        message: 'Erro ao processar pagamento',
        details: error instanceof Error ? error.message : undefined
      }
    }, { status: 500 });
  }
}; 