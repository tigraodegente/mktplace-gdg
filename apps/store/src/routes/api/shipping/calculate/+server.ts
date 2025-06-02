/**
 * API Endpoint: Calcular Frete Real
 * 
 * POST /api/shipping/calculate
 * Calcula opções de frete usando dados Frenet + sistema universal
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UnifiedShippingService } from '$lib/services/unifiedShippingService';
import type { CartItem } from '$lib/types/cart';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json();
    const { postalCode, items, sellerId } = body;

    console.log('📬 Requisição de cálculo de frete:', {
      postalCode,
      itemsLength: items?.length,
      sellerId,
      itemsType: Array.isArray(items) ? 'array' : typeof items
    });

    // Validações básicas
    if (!postalCode || !items || !Array.isArray(items)) {
      console.error('❌ Dados inválidos:', { postalCode, items });
      return json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_REQUEST', 
            message: 'CEP e itens são obrigatórios' 
          } 
        },
        { status: 400 }
      );
    }

    // Limpar CEP (remover caracteres especiais)
    const cleanPostalCode = postalCode.replace(/\D/g, '');
    
    if (cleanPostalCode.length !== 8) {
      return json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_POSTAL_CODE', 
            message: 'CEP deve ter 8 dígitos' 
          } 
        },
        { status: 400 }
      );
    }

    // Converter items da API para CartItem
    const cartItems: CartItem[] = items.map((item: any) => ({
      product: item.product,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize
    }));

    console.log('📦 CartItems convertidos:', {
      length: cartItems.length,
      isArray: Array.isArray(cartItems),
      firstItem: cartItems[0]
    });

    // Se for um seller específico, calcular apenas para ele
    if (sellerId) {
      const sellerItems = cartItems.filter(item => item.sellerId === sellerId);
      
      const quote = await UnifiedShippingService.calculateShippingForSeller(
        platform,
        {
          postalCode: cleanPostalCode,
          items: sellerItems.map(item => ({
            product: item.product,
            product_id: item.product.id,
            quantity: item.quantity,
            sellerId: item.sellerId,
            sellerName: item.sellerName,
            weight: (item.product as any).weight || 0.3,
            price: item.product.price,
            category_id: (item.product as any).category_id,
            height: (item.product as any).height,
            width: (item.product as any).width,
            length: (item.product as any).length
          })),
          sellerId,
          useCache: true
        }
      );

      return json({
        success: true,
        data: {
          postalCode: cleanPostalCode,
          sellerId,
          quote
        }
      });
    }

    // Calcular frete para todos os sellers
    const quotes = await UnifiedShippingService.calculateShippingForCart(
      platform,
      cleanPostalCode,
      cartItems
    );

    return json({
      success: true,
      data: {
        postalCode: cleanPostalCode,
        quotes,
        summary: {
          totalSellers: quotes.length,
          totalOptions: quotes.reduce((sum, q) => sum + q.options.length, 0),
          hasFreeShipping: quotes.some(q => q.options.some(opt => opt.isFree)),
          cheapestTotal: quotes.reduce((sum, q) => {
            const cheapest = q.options.reduce((min, opt) => 
              opt.price < min.price ? opt : min, q.options[0]
            );
            return sum + (cheapest?.price || 0);
          }, 0)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    
    return json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Erro interno do servidor',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        } 
      },
      { status: 500 }
    );
  }
}; 