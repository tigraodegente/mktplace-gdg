/**
 * API Endpoint: Calcular Frete Real
 * 
 * POST /api/shipping/calculate
 * Calcula opções de frete usando dados Frenet + sistema universal
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UniversalShippingService } from '$lib/services/universalShippingService';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json();
    const { postalCode, items, sellerId } = body;

    // Validações básicas
    if (!postalCode || !items || !Array.isArray(items)) {
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

    // Se for um seller específico, calcular apenas para ele
    if (sellerId) {
      const quote = await UniversalShippingService.calculateShippingForSeller(
        platform,
        sellerId,
        cleanPostalCode,
        items
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

    // Se não especificar seller, agrupar por seller automaticamente
    const itemsBySeller: Record<string, any[]> = {};
    
    items.forEach((item: any) => {
      const sellerKey = item.sellerId || 'default-seller';
      if (!itemsBySeller[sellerKey]) {
        itemsBySeller[sellerKey] = [];
      }
      itemsBySeller[sellerKey].push(item);
    });

    // Calcular frete para todos os sellers
    const quotes = await UniversalShippingService.calculateShippingForCart(
      platform,
      cleanPostalCode,
      itemsBySeller
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