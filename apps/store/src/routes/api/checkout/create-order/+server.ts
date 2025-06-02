import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';
import ShippingIntegration from '$lib/services/shipping';
import { AppmaxService } from '$lib/services/integrations/appmax/service';
import { logger } from '$lib/utils/logger';

interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
  }>;
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
  paymentData?: any; // Dados do pagamento (cartão tokenizado, etc)
  couponCode?: string;
  notes?: string;
}

// Função para decidir qual gateway usar
async function selectPaymentGateway(
  platform: any,
  paymentMethod: string,
  orderTotal: number
): Promise<'appmax' | 'default' | null> {
  try {
    const db = getDatabase(platform);
    
    // Buscar gateways ativos e suas configurações
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
    
    // Lógica de decisão (pode ser customizada)
    // Exemplo: usar AppMax para PIX e cartões, outro gateway para boleto
    for (const gateway of gateways) {
      let supportedMethods = [];
      
      try {
        // Verificar se já é um array (vindo do banco como JSONB)
        if (Array.isArray(gateway.supported_methods)) {
          supportedMethods = gateway.supported_methods;
        } else if (typeof gateway.supported_methods === 'string') {
          // Se for string, tentar fazer parse
          const rawMethods = gateway.supported_methods;
          
          // Corrigir erro comum de digitação antes do parse
          const correctedMethods = rawMethods.replace(/credit_car/g, 'credit_card');
          
          supportedMethods = JSON.parse(correctedMethods);
        } else {
          // Se não for nem array nem string, usar array vazio
          supportedMethods = [];
        }
      } catch (parseError) {
        logger.error('Failed to parse supported_methods for gateway', {
          gateway: gateway.name,
          supported_methods: gateway.supported_methods,
          error: parseError
        });
        // Continuar para o próximo gateway se falhar o parse
        continue;
      }
      
      // Verificar se o gateway suporta o método
      if (!supportedMethods.includes(paymentMethod)) continue;
      
      // Verificar limites de valor
      if (gateway.min_amount && orderTotal < gateway.min_amount) continue;
      if (gateway.max_amount && orderTotal > gateway.max_amount) continue;
      
      // Retornar o primeiro gateway que atende aos critérios
      return gateway.name;
    }
    
    return 'default'; // Gateway padrão se nenhum atender
  } catch (error) {
    logger.error('Failed to select payment gateway', { error });
    return null;
  }
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    console.log('🛒 Create Order v2.0 - Query SQL corrigida definitivamente');
    console.log('🛒 Create Order - Estratégia híbrida com integração de transportadoras iniciada');
    
    // Verificar autenticação
    console.log('🔐 Verificando autenticação...');
    const authResult = await requireAuth(cookies, platform);
    
    if (!authResult.success) {
      console.log('❌ Autenticação falhou:', authResult.error);
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    console.log('✅ Autenticação OK para:', authResult.user?.email);

    const orderData: CreateOrderRequest = await request.json();

    // Validar dados obrigatórios
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return json({
        success: false,
        error: { message: 'Itens do pedido são obrigatórios' }
      }, { status: 400 });
    }

    if (!orderData.shippingAddress || !orderData.paymentMethod) {
      return json({
        success: false,
        error: { message: 'Endereço de entrega e método de pagamento são obrigatórios' }
      }, { status: 400 });
    }

    // Tentar criar pedido com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 10 segundos para operação crítica
      const queryPromise = (async () => {
        // Usar transação para manter integridade
        return await db.transaction(async (sql) => {
          console.log('🔄 Iniciando transação...');
          
          // STEP 1: Validar produtos e calcular totais
          let subtotal = 0;
          const orderItems = [];

          for (const item of orderData.items) {
            const products = await sql`
              SELECT id, name, price, quantity, is_active
              FROM products 
              WHERE id = ${item.productId} AND is_active = true
              LIMIT 1
            `;
            
            const product = products[0];
            if (!product) {
              throw new Error(`Produto ${item.productId} não encontrado`);
            }

            if (product.quantity < item.quantity) {
              throw new Error(`Estoque insuficiente para ${product.name}`);
            }

            const itemPrice = parseFloat(product.price);
            const itemTotal = itemPrice * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
              productId: product.id,
              productName: product.name,
              quantity: item.quantity,
              unitPrice: itemPrice,
              totalPrice: itemTotal
            });
          }

          // STEP 2: Calcular frete
          const shippingCost = subtotal > 100 ? 0 : 15.90;

          // STEP 3: Aplicar cupom se fornecido
          let discount = 0;
          if (orderData.couponCode) {
            const coupons = await sql`
              SELECT id, code, type, value, minimum_order_value, max_uses, used_count, is_active
              FROM coupons 
              WHERE code = ${orderData.couponCode} AND is_active = true
              LIMIT 1
            `;
            
            const coupon = coupons[0];
            if (!coupon) {
              throw new Error('Cupom inválido ou expirado');
            }

            if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
              throw new Error('Cupom esgotado');
            }

            if (coupon.minimum_order_value && subtotal < coupon.minimum_order_value) {
              throw new Error(`Valor mínimo para este cupom: R$ ${parseFloat(coupon.minimum_order_value).toFixed(2)}`);
            }

            // Calcular desconto
            if (coupon.type === 'percentage') {
              discount = (subtotal * parseFloat(coupon.value)) / 100;
            } else if (coupon.type === 'fixed') {
              discount = parseFloat(coupon.value);
            } else if (coupon.type === 'free_shipping') {
              discount = shippingCost;
            }

            discount = Math.min(discount, subtotal + shippingCost);
          }

          const total = subtotal + shippingCost - discount;

          // STEP 4: Gerar número do pedido
          const orderNumber = `MP${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

          console.log('📦 Criando pedido:', orderNumber);

          // STEP 5: Criar pedido - Query simplificada para debug
          console.log('🔍 Debug: Iniciando criação do pedido...');
          console.log('🔍 Debug: user_id:', authResult.user!.id);
          console.log('🔍 Debug: orderNumber:', orderNumber);
          console.log('🔍 Debug: paymentMethod:', orderData.paymentMethod);
          console.log('🔍 Debug: subtotal:', subtotal);
          console.log('🔍 Debug: shippingCost:', shippingCost);
          console.log('🔍 Debug: discount:', discount);
          console.log('🔍 Debug: total:', total);
          
          const orders = await sql`
            INSERT INTO orders (
              user_id, 
              order_number, 
              status, 
              payment_status, 
              payment_method,
              subtotal, 
              shipping_cost, 
              discount_amount, 
              total, 
              shipping_address,
              coupon_code, 
              notes
            ) VALUES (
              ${authResult.user!.id}, 
              ${orderNumber}, 
              'pending', 
              'pending', 
              ${orderData.paymentMethod},
              ${subtotal}, 
              ${shippingCost}, 
              ${discount}, 
              ${total}, 
              ${JSON.stringify(orderData.shippingAddress)}::jsonb,
              ${orderData.couponCode || null}, 
              ${orderData.notes || null}
            ) RETURNING id, order_number, total, created_at
          `;
          
          console.log('✅ Debug: Pedido criado com sucesso!');
          const order = orders[0];

          // STEP 6: Adicionar itens e reduzir estoque
          console.log('🔍 Debug: STEP 6 - Iniciando criação de order_items...');
          console.log('🔍 Debug: orderItems.length:', orderItems.length);
          
          for (const [index, item] of orderItems.entries()) {
            console.log(`🔍 Debug: Processando item ${index + 1}/${orderItems.length}: ${item.productName}`);
            
            // Buscar seller_id do produto para o order_item
            console.log(`🔍 Debug: Buscando seller_id para produto ${item.productId}...`);
            const productSeller = await sql`
              SELECT seller_id FROM products WHERE id = ${item.productId} LIMIT 1
            `;
            
            const sellerId = productSeller[0]?.seller_id || '0c882099-6a71-4f35-88b3-a467322be13b'; // Fallback para seller padrão
            console.log(`🔍 Debug: Seller encontrado: ${sellerId}`);
            
            console.log(`🔍 Debug: Inserindo order_item...`);
            console.log(`🔍 Debug: order.id: ${order.id}`);
            console.log(`🔍 Debug: productId: ${item.productId}`);
            console.log(`🔍 Debug: sellerId: ${sellerId}`);
            console.log(`🔍 Debug: quantity: ${item.quantity}`);
            console.log(`🔍 Debug: unitPrice: ${item.unitPrice}`);
            console.log(`🔍 Debug: totalPrice: ${item.totalPrice}`);
            
            await sql`
              INSERT INTO order_items (order_id, product_id, seller_id, quantity, price, total, status)
              VALUES (${order.id}, ${item.productId}, ${sellerId}, ${item.quantity}, ${item.unitPrice}, ${item.totalPrice}, 'pending')
            `;
            console.log(`✅ Debug: Order_item ${index + 1} criado com sucesso!`);

            console.log(`🔍 Debug: Atualizando estoque do produto ${item.productId}...`);
            console.log(`🔍 Debug: Quantity: ${item.quantity}`);
            
            // NOVA ABORDAGEM: UPDATE de estoque com query segura
            try {
              console.log(`🔍 Debug: Usando nova abordagem para UPDATE do estoque...`);
              
              // Buscar estoque atual primeiro
              const currentStockResult = await sql`
                SELECT quantity FROM products WHERE id = ${item.productId}
              `;
              
              if (!currentStockResult[0]) {
                console.log(`⚠️ Debug: Produto não encontrado para atualização de estoque`);
              } else {
                const currentStock = parseInt(currentStockResult[0].quantity, 10);
                const newStock = Math.max(0, currentStock - item.quantity); // Nunca deixar negativo
                
                console.log(`🔍 Debug: Estoque atual: ${currentStock}, Novo estoque: ${newStock}`);
                
                // UPDATE simples e direto
                await sql`
                  UPDATE products 
                  SET quantity = ${newStock}
                  WHERE id = ${item.productId}
                `;
                
                console.log(`✅ Debug: Estoque atualizado com sucesso!`);
              }
            } catch (stockError) {
              console.log(`⚠️ Debug: Erro ao atualizar estoque (não crítico):`, stockError);
              console.log(`🔍 Debug: Continuando sem atualizar estoque para produto ${item.productId}`);
              // Não falhar a transação por causa do estoque
            }
          }
          
          console.log('✅ Debug: STEP 6 concluído - Todos os order_items criados!');

          // STEP 7: Incrementar uso do cupom
          if (orderData.couponCode) {
            console.log('🔍 Debug: STEP 7 - Incrementando uso do cupom...');
            await sql`
              UPDATE coupons 
              SET used_count = used_count + 1
              WHERE code = ${orderData.couponCode}
            `;
            console.log('✅ Debug: STEP 7 concluído - Cupom atualizado!');
          } else {
            console.log('🔍 Debug: STEP 7 - Sem cupom para atualizar');
          }

          // STEP 8: Adicionar log de histórico (simplificado)
          console.log('🔍 Debug: STEP 8 - Criando histórico...');
          try {
            await sql`
              INSERT INTO order_status_history (order_id, new_status, created_by, created_by_type, notes)
              VALUES (${order.id}, 'pending', ${authResult.user!.id}, 'user', 'Pedido criado')
            `;
            console.log('✅ Debug: STEP 8 concluído - Histórico criado!');
          } catch (historyError) {
            console.log('⚠️ Debug: Erro ao criar histórico (não crítico):', historyError);
          }

          console.log('✅ Pedido criado com sucesso!');

          // Retornar dados do pedido e itens para integração
          return {
            order: {
              id: order.id,
              orderNumber: order.order_number,
              total: parseFloat(order.total),
              status: 'pending',
              paymentStatus: 'pending',
              paymentMethod: orderData.paymentMethod,
              createdAt: order.created_at,
              // Dados para integração
              user_id: authResult.user!.id,
              shipping_cost: shippingCost,
              payment_status: 'pending'
            },
            totals: {
              subtotal,
              shipping: shippingCost,
              discount,
              total
            },
            items: orderItems.map(item => ({
              productId: item.productId,
              name: item.productName,
              quantity: item.quantity,
              price: item.unitPrice,
              total: item.totalPrice
            })),
            // Dados adicionais para integração
            orderItems: orderItems,
            shippingAddress: orderData.shippingAddress
          };
        });
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Pedido criado: ${result.order.orderNumber}`);
      
      // Variável para armazenar o gateway selecionado
      let selectedGateway: string | null = null;
      
      // =====================================================
      // INTEGRAÇÃO COM GATEWAY DE PAGAMENTO
      // =====================================================
      
      try {
        selectedGateway = await selectPaymentGateway(
          platform,
          orderData.paymentMethod,
          result.order.total
        );
        
        logger.info('Payment gateway selected', {
          orderId: result.order.id,
          gateway: selectedGateway,
          method: orderData.paymentMethod
        });
        
        // Se AppMax foi selecionada e está configurada
        if (selectedGateway === 'appmax') {
          const appmaxConfig = await AppmaxService.getConfig(platform);
          
          if (appmaxConfig) {
            logger.info('Processing payment with AppMax', {
              orderId: result.order.id
            });
            
            // Processar com AppMax de forma assíncrona
            setTimeout(async () => {
              try {
                const appmaxService = new AppmaxService(appmaxConfig);
                
                // 1. Sincronizar cliente
                const appmaxCustomer = await appmaxService.syncCustomer(
                  platform,
                  authResult.user!.id
                );
                
                if (appmaxCustomer?.id) {
                  // 2. Criar pedido na AppMax
                  await appmaxService.createOrder(
                    platform,
                    result.order.id.toString(),
                    appmaxCustomer.id
                  );
                  
                  logger.info('Order synced with AppMax', {
                    orderId: result.order.id
                  });
                }
              } catch (error) {
                logger.error('Failed to sync with AppMax', {
                  orderId: result.order.id,
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }, 100);
          }
        }
      } catch (error) {
        // Não falhar a criação do pedido por erro na seleção do gateway
        logger.error('Payment gateway selection failed', { error });
      }
      
      // =====================================================
      // INTEGRAÇÃO COM TRANSPORTADORAS (ASSÍNCRONA)
      // =====================================================
      
      if (ShippingIntegration.isEnabled()) {
        console.log(`🚚 Iniciando integração com transportadoras para pedido ${result.order.orderNumber}...`);
        
        try {
          // Enviar para transportadora de forma assíncrona (não bloqueia resposta)
          ShippingIntegration.sendOrder(
            result.order.id,
            result.order,
            result.orderItems,
            result.shippingAddress,
            platform
          ).then((shippingResult) => {
            if (shippingResult.success) {
              console.log(`🚚 ✅ Pedido ${result.order.orderNumber} enviado para transportadora ${shippingResult.provider}`);
            } else {
              console.warn(`🚚 ⚠️ Falha na integração para pedido ${result.order.orderNumber}: ${shippingResult.error}`);
            }
          }).catch((error) => {
            console.error(`🚚 ❌ Erro crítico na integração para pedido ${result.order.orderNumber}:`, error);
          });
          
        } catch (error) {
          console.error(`🚚 ❌ Erro ao iniciar integração:`, error);
        }
      } else {
        console.log(`🚚 ⚠️ Sistema de integração de transportadoras desabilitado`);
      }
      
      // =====================================================
      // RETORNAR RESPOSTA IMEDIATA
      // =====================================================
      
      return json({
        success: true,
        data: {
          order: result.order,
          totals: result.totals,
          items: result.items,
          // Informar qual gateway foi selecionado (para debug/admin)
          paymentGateway: selectedGateway || 'default'
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro na criação: ${error instanceof Error ? error.message : 'Erro'}`);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // FALLBACK SEGURO: NUNCA criar pedido inválido
      // Em caso de timeout ou erro crítico, sempre falhar
      
      // Retornar erro específico se for validação
      if (errorMessage.includes('Produto') || errorMessage.includes('Cupom') || errorMessage.includes('Estoque') || errorMessage.includes('Timeout')) {
        return json({
          success: false,
          error: { 
            message: errorMessage.includes('Timeout') 
              ? 'Erro temporário no servidor. Tente novamente em alguns instantes.'
              : errorMessage 
          },
          source: 'error'
        }, { status: errorMessage.includes('Timeout') ? 503 : 400 });
      }

      return json({
        success: false,
        error: { message: 'Erro interno do servidor' },
        source: 'error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro crítico create-order:', error);
    return json({
      success: false,
      error: { message: 'Erro ao processar pedido' }
    }, { status: 500 });
  }
}; 