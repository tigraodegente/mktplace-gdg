import { json } from '@sveltejs/kit';
import { AppmaxService } from '$lib/services/integrations/appmax/service';
import { getDatabase } from '$lib/db';
import { logger } from '$lib/utils/logger';
import type { AppmaxPayment } from '../../../../../../../../packages/shared-types/src/integrations/appmax';

export const POST = async ({ request, platform, locals }: any) => {
  try {
    // Verificar autenticação
    if (!locals.user) {
      return json({
        success: false,
        error: { message: 'Usuário não autenticado' }
      }, { status: 401 });
    }
    
    const data = await request.json();
    const { orderId, paymentMethod, installments, cardData, pixData, boletoData } = data;
    
    // Validar dados básicos
    if (!orderId) {
      return json({
        success: false,
        error: { message: 'ID do pedido é obrigatório' }
      }, { status: 400 });
    }
    
    if (!paymentMethod) {
      return json({
        success: false,
        error: { message: 'Método de pagamento é obrigatório' }
      }, { status: 400 });
    }
    
    // Verificar se o pedido pertence ao usuário
    const db = getDatabase(platform);
    const orders = await db.query`
      SELECT id, user_id, status, payment_status, total
      FROM orders
      WHERE id = ${orderId} AND user_id = ${locals.user.id}
      LIMIT 1
    `;
    
    const order = orders[0];
    if (!order) {
      return json({
        success: false,
        error: { message: 'Pedido não encontrado' }
      }, { status: 404 });
    }
    
    // Verificar se o pedido já foi pago
    if (order.payment_status === 'paid') {
      return json({
        success: false,
        error: { message: 'Pedido já foi pago' }
      }, { status: 400 });
    }
    
    // Obter configuração da AppMax
    const config = await AppmaxService.getConfig(platform);
    if (!config) {
      logger.error('AppMax configuration not found');
      return json({
        success: false,
        error: { message: 'Gateway de pagamento não configurado' }
      }, { status: 500 });
    }
    
    // Inicializar serviço
    const appmaxService = new AppmaxService(config);
    
    // Sincronizar cliente com AppMax
    const appmaxCustomer = await appmaxService.syncCustomer(
      platform, 
      locals.user.id
    );
    
    if (!appmaxCustomer || !appmaxCustomer.id) {
      return json({
        success: false,
        error: { message: 'Erro ao sincronizar cliente' }
      }, { status: 500 });
    }
    
    // Criar pedido na AppMax
    const appmaxOrder = await appmaxService.createOrder(
      platform,
      orderId,
      appmaxCustomer.id
    );
    
    if (!appmaxOrder) {
      return json({
        success: false,
        error: { message: 'Erro ao criar pedido no gateway' }
      }, { status: 500 });
    }
    
    // Preparar dados do pagamento
    const paymentData: Partial<AppmaxPayment> = {
      method: paymentMethod as any,
      installments
    };
    
    // Adicionar dados específicos do método de pagamento
    switch (paymentMethod) {
      case 'credit_card':
      case 'debit_card':
        if (!cardData) {
          return json({
            success: false,
            error: { message: 'Dados do cartão são obrigatórios' }
          }, { status: 400 });
        }
        
        // Validar dados do cartão
        if (!cardData.number || !cardData.holder || !cardData.expiry || !cardData.cvv) {
          return json({
            success: false,
            error: { message: 'Dados do cartão incompletos' }
          }, { status: 400 });
        }
        
        paymentData.card = {
          number: cardData.number.replace(/\s/g, ''),
          holder: cardData.holder.toUpperCase(),
          expiry: cardData.expiry,
          cvv: cardData.cvv
        };
        break;
        
      case 'pix':
        paymentData.pix = {
          expiresIn: pixData?.expiresIn || 3600 // 1 hora padrão
        };
        break;
        
      case 'boleto':
        if (!boletoData?.dueDate) {
          return json({
            success: false,
            error: { message: 'Data de vencimento do boleto é obrigatória' }
          }, { status: 400 });
        }
        
        paymentData.boleto = {
          dueDate: boletoData.dueDate,
          instructions: boletoData.instructions
        };
        break;
        
      default:
        return json({
          success: false,
          error: { message: 'Método de pagamento inválido' }
        }, { status: 400 });
    }
    
    // Processar pagamento
    const paymentResponse = await appmaxService.processPayment(
      platform,
      orderId,
      paymentData
    );
    
    if (!paymentResponse.success) {
      return json({
        success: false,
        error: paymentResponse.error || { message: 'Erro ao processar pagamento' }
      }, { status: 400 });
    }
    
    logger.info('Payment created successfully', {
      orderId,
      paymentId: paymentResponse.payment?.id,
      method: paymentMethod
    });
    
    // Retornar resposta
    return json({
      success: true,
      data: {
        paymentId: paymentResponse.payment?.id,
        status: paymentResponse.payment?.status,
        method: paymentResponse.payment?.method,
        amount: paymentResponse.payment?.amount,
        // Dados específicos do método
        pix: paymentResponse.payment?.pix,
        boleto: paymentResponse.payment?.boleto,
        card: paymentResponse.payment?.card
      }
    });
    
  } catch (error) {
    logger.error('Failed to create payment', {
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