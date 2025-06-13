import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { optionalAuth } from '$lib/utils/auth';
import ShippingIntegration from '$lib/services/shipping';

// Tipos para checkout de convidado
interface GuestData {
  email: string;
  name: string;
  phone: string;
  acceptsMarketing: boolean;
  sessionId: string;
}
import { AppmaxService } from '$lib/services/integrations/appmax/service';
import { logger } from '$lib/utils/logger';

interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
    selectedColor?: string;
    selectedSize?: string;
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
  // Dados do convidado (obrigatórios quando não logado)
  guestData?: GuestData;
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
    const orderData: CreateOrderRequest = await request.json();
    
    // Verificar autenticação (opcional - permite checkout como convidado)
    const authResult = await optionalAuth(cookies, platform);

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

    // Debug: log do estado de autenticação e dados recebidos
    console.log('🔍 [CREATE-ORDER] Estado da requisição:', {
      hasUser: !!authResult.user,
      userId: authResult.user?.id || 'N/A',
      hasGuestData: !!orderData.guestData,
      guestEmail: orderData.guestData?.email || 'N/A'
    });

    // Validar dados de convidado se não estiver logado
    if (!authResult.user && !orderData.guestData) {
      console.log('❌ [CREATE-ORDER] Usuário não logado e sem dados de convidado');
      return json({
        success: false,
        error: { 
          message: 'Para checkout sem login, é necessário fornecer dados de convidado (email, telefone).',
          code: 'GUEST_DATA_REQUIRED'
        }
      }, { status: 400 });
    }

    // Validar campos obrigatórios do convidado
    if (!authResult.user && orderData.guestData) {
      const { email, name, phone, sessionId } = orderData.guestData;
      if (!email || !name || !phone || !sessionId) {
        console.log('❌ [CREATE-ORDER] Dados de convidado incompletos:', { email: !!email, name: !!name, phone: !!phone, sessionId: !!sessionId });
        return json({
          success: false,
          error: { 
            message: 'Email, nome, telefone e sessionId são obrigatórios para checkout de convidado.',
            code: 'GUEST_DATA_INCOMPLETE',
            details: { email: !!email, name: !!name, phone: !!phone, sessionId: !!sessionId }
          }
        }, { status: 400 });
      }
    }

    // Tentar criar pedido com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 10 segundos para operação crítica
      const queryPromise = (async () => {
        // Usar transação para manter integridade
        return await db.transaction(async (sql) => {
          console.log('[CREATE-ORDER] Transação iniciada');
          
          // STEP 1: Validar produtos e calcular totais
          let subtotal = 0;
          const orderItems = [];

          for (const item of orderData.items) {
            console.log(`[CREATE-ORDER] Validando produto: ${item.productId}`);
            
            const products = await sql`
              SELECT id, name, price, quantity, is_active
              FROM products 
              WHERE id = ${item.productId} AND is_active = true
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

          console.log('[CREATE-ORDER] Produtos validados, criando pedido...');

          // STEP 2: Calcular frete
          const shippingCost = subtotal > 100 ? 0 : 15.90;

          // STEP 3: Aplicar cupom se fornecido
          let discount = 0;
          if (orderData.couponCode) {
                    const coupons = await sql`
          SELECT id, code, type, value, min_order_amount, max_uses, current_uses, is_active
          FROM coupons 
          WHERE code = ${orderData.couponCode} AND is_active = true
        `;
            
            const coupon = coupons[0];
            if (!coupon) {
              throw new Error('Cupom inválido ou expirado');
            }

            if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
              throw new Error('Cupom esgotado');
            }

            if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
              throw new Error(`Valor mínimo para este cupom: R$ ${parseFloat(coupon.min_order_amount).toFixed(2)}`);
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

          // STEP 5: Criar pedido
          
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
              notes,
              guest_email,
              guest_name,
              guest_phone,
              guest_accepts_marketing,
              guest_session_id
            ) VALUES (
              ${authResult.user?.id || null}, 
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
              ${orderData.notes || null},
              ${orderData.guestData?.email || null},
              ${orderData.guestData?.name || null},
              ${orderData.guestData?.phone || null},
              ${orderData.guestData?.acceptsMarketing || false},
              ${orderData.guestData?.sessionId || null}
            ) RETURNING id, order_number, total, created_at
          `;
          
          const order = orders[0];
          console.log(`[CREATE-ORDER] Pedido criado: ${order.order_number}`);

          // STEP 6: Adicionar itens e reduzir estoque
          for (const [index, item] of orderItems.entries()) {
            
            // Buscar seller_id do produto para o order_item
            let sellerId = '0c882099-6a71-4f35-88b3-a467322be13b'; // Fallback padrão
            
            try {
              const productSeller = await sql`
                SELECT seller_id FROM products WHERE id = ${item.productId}
              `;
              
              if (productSeller[0]?.seller_id) {
                sellerId = productSeller[0].seller_id;
              }
            } catch (sellerError) {
              // Usar fallback silenciosamente
            }
            
            // Buscar dados originais do request para cores/tamanhos
            const originalItem = orderData.items.find(reqItem => reqItem.productId === item.productId);
            
            await sql`
              INSERT INTO order_items (
                order_id, product_id, seller_id, quantity, price, total, 
                selected_color, selected_size, status
              ) VALUES (
                ${order.id}, ${item.productId}, ${sellerId}, ${item.quantity}, 
                ${item.unitPrice}, ${item.totalPrice},
                ${originalItem?.selectedColor || null},
                ${originalItem?.selectedSize || null}, 
                'pending'
              )
            `;

            // Atualizar estoque - REABILITADO com abordagem compatível
            try {
              // Buscar estoque atual
              const stockResult = await sql`
                SELECT quantity FROM products WHERE id = ${item.productId}
              `;
              
              if (stockResult && stockResult.length > 0) {
                const currentQuantity = parseInt(stockResult[0].quantity) || 0;
                const newQuantity = Math.max(0, currentQuantity - item.quantity);
                
                // UPDATE simples e compatível
                await sql`
                  UPDATE products 
                  SET quantity = ${newQuantity}
                  WHERE id = ${item.productId}
                `;
                
                console.log(`[CREATE-ORDER] Estoque atualizado: produto ${item.productId}, de ${currentQuantity} para ${newQuantity}`);
                
                // Criar movimento de estoque para rastreabilidade
                try {
                  await sql`
                    INSERT INTO stock_movements (
                      product_id,
                      type,
                      quantity,
                      reason,
                      reference_id,
                      notes,
                      created_by
                    ) VALUES (
                      ${item.productId},
                      'out',
                      ${item.quantity},
                      'Venda',
                      ${order.id},
                      ${`Pedido ${order.order_number}`},
                      ${authResult.user?.id || null}
                    )
                  `;
                  console.log(`[CREATE-ORDER] Movimento de estoque registrado para produto ${item.productId}`);
                } catch (movementError) {
                  console.log(`[CREATE-ORDER] Erro ao criar movimento de estoque (não crítico): ${movementError}`);
                  // Continuar sem falhar - o importante é que o estoque foi atualizado
                }
              }
            } catch (stockError) {
              console.error(`[CREATE-ORDER] Erro crítico ao atualizar estoque: ${stockError}`);
              // Log detalhado para debug em produção
              console.error('[CREATE-ORDER] Detalhes do erro:', {
                productId: item.productId,
                orderId: order.id,
                errorMessage: stockError instanceof Error ? stockError.message : String(stockError),
                errorStack: stockError instanceof Error ? stockError.stack : undefined
              });
              // Não falhar a transação - pedido já foi criado
              // Administrador pode ajustar estoque manualmente se necessário
            }
          }

          console.log('[CREATE-ORDER] Itens criados com sucesso');

          // STEP 7: Incrementar uso do cupom
          if (orderData.couponCode) {
            await sql`
              UPDATE coupons 
              SET current_uses = current_uses + 1
              WHERE code = ${orderData.couponCode}
            `;
          }

          // STEP 8: Adicionar log de histórico
          try {
            await sql`
              INSERT INTO order_status_history (order_id, new_status, created_by, created_by_type, notes)
              VALUES (${order.id}, 'pending', ${authResult.user?.id || null}, ${authResult.user ? 'user' : 'guest'}, 'Pedido criado')
            `;
          } catch (historyError) {
            // Não crítico
          }

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
              user_id: authResult.user?.id || null,
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
                
                // 1. Sincronizar cliente (apenas para usuários logados)
                if (authResult.user?.id) {
                  const appmaxCustomer = await appmaxService.syncCustomer(
                    platform,
                    authResult.user.id
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
              logger.info('Order sent to shipping provider', {
                orderId: result.order.orderNumber,
                provider: shippingResult.provider
              });
            } else {
              logger.warn('Shipping integration failed', {
                orderId: result.order.orderNumber,
                error: shippingResult.error
              });
            }
          }).catch((error) => {
            logger.error('Critical shipping integration error', {
              orderId: result.order.orderNumber,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          });
          
        } catch (error) {
          logger.error('Failed to start shipping integration', { error });
        }
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.log(`[CREATE-ORDER] Erro na transação: ${errorMessage}`, error);
      
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