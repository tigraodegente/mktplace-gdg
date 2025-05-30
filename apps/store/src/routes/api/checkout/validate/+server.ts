import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

interface CartItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    available: number;
    isAvailable: boolean;
    image?: string;
  }>;
  totals: {
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
  };
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return json({ success: false, error: authResult.error }, { status: 401 });
    }

    const { items, zipCode, couponCode } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return json({
        success: false,
        error: { message: 'Carrinho vazio ou inválido' }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      const validation: ValidationResult = {
        isValid: true,
        errors: [],
        items: [],
        totals: {
          subtotal: 0,
          shipping: 0,
          discount: 0,
          total: 0
        }
      };

      // Validar cada item do carrinho
      for (const item of items as CartItem[]) {
        const product = await db.queryOne`
          SELECT 
            id, 
            name, 
            price, 
            stock_quantity,
            status,
            images
          FROM products 
          WHERE id = ${item.productId}
        `;

        if (!product) {
          validation.errors.push(`Produto ${item.productId} não encontrado`);
          validation.isValid = false;
          continue;
        }

        if (product.status !== 'active') {
          validation.errors.push(`Produto ${product.name} não está disponível`);
          validation.isValid = false;
        }

        const available = product.stock_quantity || 0;
        const isAvailable = available >= item.quantity;

        if (!isAvailable) {
          validation.errors.push(
            `Produto ${product.name}: apenas ${available} unidade(s) disponível(is), solicitado ${item.quantity}`
          );
          validation.isValid = false;
        }

        const itemPrice = parseFloat(product.price);
        const itemTotal = itemPrice * item.quantity;

        validation.items.push({
          productId: product.id,
          name: product.name,
          price: itemPrice,
          quantity: item.quantity,
          available,
          isAvailable,
          image: product.images?.[0] || null
        });

        if (isAvailable) {
          validation.totals.subtotal += itemTotal;
        }
      }

      // Calcular frete se CEP fornecido
      if (zipCode && validation.isValid) {
        try {
          // Simulação de cálculo de frete (integração com Frenet)
          const weight = validation.items.reduce((total, item) => total + (item.quantity * 0.5), 0); // 500g por item
          
          if (weight <= 2) {
            validation.totals.shipping = 15.90;
          } else if (weight <= 5) {
            validation.totals.shipping = 25.90;
          } else {
            validation.totals.shipping = 35.90;
          }
        } catch (error) {
          console.error('Erro ao calcular frete:', error);
          validation.totals.shipping = 15.90; // Valor padrão
        }
      }

      // Validar e aplicar cupom se fornecido
      if (couponCode && validation.isValid) {
        const coupon = await db.queryOne`
          SELECT 
            id, 
            code, 
            type, 
            value, 
            minimum_order_value,
            max_uses,
            used_count,
            expires_at,
            is_active
          FROM coupons 
          WHERE code = ${couponCode} 
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
        `;

        if (!coupon) {
          validation.errors.push('Cupom inválido ou expirado');
        } else if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
          validation.errors.push('Cupom esgotado');
        } else if (coupon.minimum_order_value && validation.totals.subtotal < coupon.minimum_order_value) {
          validation.errors.push(
            `Valor mínimo para este cupom: R$ ${parseFloat(coupon.minimum_order_value).toFixed(2)}`
          );
        } else {
          // Aplicar desconto
          if (coupon.type === 'percentage') {
            validation.totals.discount = (validation.totals.subtotal * parseFloat(coupon.value)) / 100;
          } else if (coupon.type === 'fixed') {
            validation.totals.discount = parseFloat(coupon.value);
          } else if (coupon.type === 'free_shipping') {
            validation.totals.discount = validation.totals.shipping;
          }

          // Garantir que desconto não seja maior que subtotal
          validation.totals.discount = Math.min(
            validation.totals.discount, 
            validation.totals.subtotal + validation.totals.shipping
          );
        }
      }

      // Calcular total final
      validation.totals.total = validation.totals.subtotal + validation.totals.shipping - validation.totals.discount;

      // Verificar se ainda é válido após todos os cálculos
      if (validation.errors.length > 0) {
        validation.isValid = false;
      }

      return validation;
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro na validação do checkout:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 