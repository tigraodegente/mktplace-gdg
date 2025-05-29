import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      console.log('🎯 Criando cupons de exemplo...');

      // 1. Cupom global - Primeira compra
      await db.query`
        INSERT INTO coupons (
          code, name, description, type, value, scope,
          min_order_amount, max_uses, is_first_purchase_only,
          starts_at, expires_at, is_active
        ) VALUES (
          'BEMVINDO10', 'Boas-vindas 10% OFF', 
          'Desconto especial para primeira compra', 
          'percentage', 10.00, 'global',
          50.00, 1000, true,
          NOW(), NOW() + INTERVAL '30 days', true
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          expires_at = EXCLUDED.expires_at
      `;

      // 2. Cupom de valor fixo global
      await db.query`
        INSERT INTO coupons (
          code, name, description, type, value, scope,
          min_order_amount, max_uses, max_uses_per_customer,
          starts_at, expires_at, is_active
        ) VALUES (
          'DESCONTO50', 'R$ 50 OFF', 
          'Desconto de R$ 50 em compras acima de R$ 200', 
          'fixed_amount', 50.00, 'global',
          200.00, 500, 1,
          NOW(), NOW() + INTERVAL '60 days', true
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          expires_at = EXCLUDED.expires_at
      `;

      // 3. Cupom de frete grátis (automático)
      await db.query`
        INSERT INTO coupons (
          code, name, description, type, value, scope,
          min_order_amount, max_uses, is_automatic,
          starts_at, expires_at, is_active
        ) VALUES (
          'FRETEGRATIS', 'Frete Grátis', 
          'Frete grátis para compras acima de R$ 150', 
          'free_shipping', 0.00, 'global',
          150.00, NULL, true,
          NOW(), NOW() + INTERVAL '90 days', true
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          expires_at = EXCLUDED.expires_at
      `;

      // 4. Cupom black friday (automático)
      await db.query`
        INSERT INTO coupons (
          code, name, description, type, value, scope,
          max_discount_amount, is_automatic,
          starts_at, expires_at, is_active
        ) VALUES (
          'BLACKFRIDAY', 'Black Friday 30% OFF', 
          'Desconto automático de Black Friday (máximo R$ 200)', 
          'percentage', 30.00, 'global',
          200.00, true,
          NOW(), NOW() + INTERVAL '7 days', true
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          expires_at = EXCLUDED.expires_at
      `;

      // 5. Cupom teste simples
      await db.query`
        INSERT INTO coupons (
          code, name, description, type, value, scope,
          is_active, starts_at, expires_at
        ) VALUES (
          'TESTE10', 'Teste 10% OFF', 
          'Cupom de teste para 10% de desconto', 
          'percentage', 10.00, 'global',
          true, NOW(), NOW() + INTERVAL '365 days'
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          expires_at = EXCLUDED.expires_at
      `;

      // 6. Cupom de R$ 20 OFF
      await db.query`
        INSERT INTO coupons (
          code, name, description, type, value, scope,
          min_order_amount, max_uses, is_active,
          starts_at, expires_at
        ) VALUES (
          'ECONOMIZE20', 'R$ 20 OFF', 
          'Desconto de R$ 20 em compras acima de R$ 100', 
          'fixed_amount', 20.00, 'global',
          100.00, 1000, true,
          NOW(), NOW() + INTERVAL '45 days'
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          expires_at = EXCLUDED.expires_at
      `;

      console.log('✅ Cupons de exemplo criados');

      return {
        success: true,
        message: 'Cupons de exemplo criados com sucesso',
        coupons_created: [
          'BEMVINDO10 - 10% OFF primeira compra',
          'DESCONTO50 - R$ 50 OFF acima de R$ 200',
          'FRETEGRATIS - Frete grátis (automático)',
          'BLACKFRIDAY - 30% OFF (automático)',
          'TESTE10 - 10% OFF teste',
          'ECONOMIZE20 - R$ 20 OFF acima de R$ 100'
        ]
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao criar cupons de exemplo:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 