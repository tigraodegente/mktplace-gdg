import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      console.log('🎫 Criando tabelas do sistema de cupons...');

      // 1. Tabela principal de cupons
      await db.query`
        CREATE TABLE IF NOT EXISTS coupons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          
          -- Tipo e valor do desconto
          type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping', 'free_product')),
          value DECIMAL(10,2) NOT NULL,
          
          -- Nível de aplicação
          scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'seller', 'product', 'category')),
          seller_id UUID REFERENCES sellers(id),
          
          -- Condições de ativação
          min_order_amount DECIMAL(10,2) DEFAULT 0,
          min_quantity INTEGER DEFAULT 1,
          max_discount_amount DECIMAL(10,2), -- Valor máximo de desconto
          
          -- Limitações de uso
          max_uses INTEGER, -- Total de usos permitidos
          max_uses_per_customer INTEGER DEFAULT 1,
          current_uses INTEGER DEFAULT 0,
          
          -- Validade temporal
          starts_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          
          -- Configurações especiais
          is_active BOOLEAN DEFAULT true,
          is_automatic BOOLEAN DEFAULT false, -- Aplicado automaticamente
          is_cumulative BOOLEAN DEFAULT false, -- Pode acumular com outros cupons
          is_first_purchase_only BOOLEAN DEFAULT false,
          
          -- Restrições regionais
          allowed_regions TEXT[], -- Array de estados/CEPs permitidos
          
          -- Metadados
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // 2. Tabela de produtos elegíveis
      await db.query`
        CREATE TABLE IF NOT EXISTS coupon_products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(coupon_id, product_id)
        )
      `;

      // 3. Tabela de categorias elegíveis
      await db.query`
        CREATE TABLE IF NOT EXISTS coupon_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
          category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(coupon_id, category_id)
        )
      `;

      // 4. Tabela de histórico de uso
      await db.query`
        CREATE TABLE IF NOT EXISTS coupon_usage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES coupons(id),
          user_id UUID REFERENCES users(id),
          order_id UUID REFERENCES orders(id),
          session_id VARCHAR(255), -- Para usuários não logados
          
          -- Detalhes do uso
          discount_amount DECIMAL(10,2) NOT NULL,
          original_amount DECIMAL(10,2) NOT NULL,
          final_amount DECIMAL(10,2) NOT NULL,
          
          -- Metadados do uso
          user_ip INET,
          user_agent TEXT,
          applied_to JSONB, -- Produtos/sellers onde foi aplicado
          
          used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // 5. Tabela de condições especiais
      await db.query`
        CREATE TABLE IF NOT EXISTS coupon_conditions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
          
          -- Tipo de condição
          condition_type VARCHAR(50) NOT NULL, -- 'day_of_week', 'time_range', 'user_segment', etc
          condition_value JSONB NOT NULL, -- Valor da condição em JSON
          
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      console.log('✅ Tabelas de cupons criadas com sucesso');

      return {
        success: true,
        message: 'Sistema de cupons criado com sucesso',
        tables_created: [
          'coupons',
          'coupon_products', 
          'coupon_categories',
          'coupon_usage',
          'coupon_conditions'
        ]
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao criar sistema de cupons:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 