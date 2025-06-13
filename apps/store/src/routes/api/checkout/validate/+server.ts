import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
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
    console.log('✅ Checkout Validate - Estratégia híbrida iniciada');
    
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

    // Tentar validação com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 6 segundos para validação
      const queryPromise = (async () => {
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

        // STEP 1: Validar cada item do carrinho
        for (const item of items as CartItem[]) {
          const products = await db.query`
            SELECT id, name, price, quantity, is_active
            FROM products 
            WHERE id = ${item.productId}
            LIMIT 1
          `;

          const product = products[0];
          if (!product) {
            validation.errors.push(`Produto ${item.productId} não encontrado`);
            validation.isValid = false;
            continue;
          }

          if (!product.is_active) {
            validation.errors.push(`Produto ${product.name} não está disponível`);
            validation.isValid = false;
          }

          const available = product.quantity || 0;
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
            image: `/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`
          });

          if (isAvailable) {
            validation.totals.subtotal += itemTotal;
          }
        }

        // STEP 2: Calcular frete se CEP fornecido
        if (zipCode && validation.isValid) {
          const weight = validation.items.reduce((total, item) => total + (item.quantity * 0.5), 0);
          
          if (weight <= 2) {
            validation.totals.shipping = 15.90;
          } else if (weight <= 5) {
            validation.totals.shipping = 25.90;
          } else {
            validation.totals.shipping = 35.90;
          }
        }

        // STEP 3: Validar cupom se fornecido
        if (couponCode && validation.isValid) {
          const coupons = await db.query`
            SELECT id, code, type, value, min_order_amount, max_uses, current_uses, is_active
            FROM coupons 
            WHERE code = ${couponCode} AND is_active = true
            LIMIT 1
          `;

          const coupon = coupons[0];
          if (!coupon) {
            validation.errors.push('Cupom inválido ou expirado');
          } else if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
            validation.errors.push('Cupom esgotado');
          } else if (coupon.min_order_amount && validation.totals.subtotal < coupon.min_order_amount) {
            validation.errors.push(
              `Valor mínimo para este cupom: R$ ${parseFloat(coupon.min_order_amount).toFixed(2)}`
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

            validation.totals.discount = Math.min(
              validation.totals.discount, 
              validation.totals.subtotal + validation.totals.shipping
            );
          }
        }

        // STEP 4: Calcular total final
        validation.totals.total = validation.totals.subtotal + validation.totals.shipping - validation.totals.discount;

        if (validation.errors.length > 0) {
          validation.isValid = false;
        }

        return validation;
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 6000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Validação OK: ${result.isValid ? 'Válido' : 'Inválido'} (${result.errors.length} erros)`);
      
      return json({
        success: true,
        data: result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro na validação: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Validação básica sem banco (menos rigorosa mas funcional)
      const fallbackValidation: ValidationResult = {
        isValid: false,
        errors: ['Erro temporário na validação. Tente novamente em alguns instantes.'],
        items: items.map((item: CartItem) => ({
          productId: item.productId,
          name: `Produto ${item.productId}`,
          price: 99.99,
          quantity: item.quantity,
          available: 10,
          isAvailable: item.quantity <= 10,
          image: `/api/placeholder/300/400?text=Produto`
        })),
        totals: {
          subtotal: 0,
          shipping: 15.90,
          discount: 0,
          total: 15.90
        }
      };
      
      return json({
        success: true,
        data: fallbackValidation,
        source: 'fallback'
      });
    }

  } catch (error) {
    console.error('❌ Erro crítico checkout validate:', error);
    return json({
      success: false,
      error: { message: 'Erro na validação do checkout' }
    }, { status: 500 });
  }
}; 