import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      console.log('🔄 Migrando tabela de cupons existente...');

      // Adicionar colunas que faltam na tabela existente
      const migrations = [
        // Nome do cupom
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS name VARCHAR(200)`,
        
        // Escopo (global, seller, product, category)
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'global'`,
        
        // Seller ID para cupons específicos
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS seller_id UUID`,
        
        // Quantidade mínima de itens
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 1`,
        
        // Limite de usos por cliente
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses_per_customer INTEGER DEFAULT 1`,
        
        // Configurações especiais
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false`,
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_cumulative BOOLEAN DEFAULT false`,
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_first_purchase_only BOOLEAN DEFAULT false`,
        
        // Restrições regionais
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS allowed_regions TEXT[]`,
        
        // Criado por
        `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS created_by UUID`,
        
        // Renomear colunas para compatibilidade
        `ALTER TABLE coupons RENAME COLUMN minimum_amount TO min_order_amount`,
        `ALTER TABLE coupons RENAME COLUMN maximum_discount TO max_discount_amount`,
        `ALTER TABLE coupons RENAME COLUMN usage_limit TO max_uses`,
        `ALTER TABLE coupons RENAME COLUMN used_count TO current_uses`,
        `ALTER TABLE coupons RENAME COLUMN valid_from TO starts_at`,
        `ALTER TABLE coupons RENAME COLUMN valid_until TO expires_at`
      ];

      for (const migration of migrations) {
        try {
          await db.query(migration);
          console.log('✅ Migração executada:', migration.slice(0, 50) + '...');
        } catch (error: any) {
          console.log('⚠️ Migração já aplicada ou erro:', migration.slice(0, 50) + '...');
        }
      }

      // Atualizar cupons existentes para ter scope
      await db.query`
        UPDATE coupons 
        SET scope = 'global', name = COALESCE(name, 'Cupom ' || code)
        WHERE scope IS NULL
      `;

      // Criar as outras tabelas se não existem
      await db.query`
        CREATE TABLE IF NOT EXISTS coupon_products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
          product_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(coupon_id, product_id)
        )
      `;

      await db.query`
        CREATE TABLE IF NOT EXISTS coupon_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
          category_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(coupon_id, category_id)
        )
      `;

      await db.query`
        CREATE TABLE IF NOT EXISTS coupon_usage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES coupons(id),
          user_id UUID,
          order_id UUID,
          session_id VARCHAR(255),
          
          discount_amount DECIMAL(10,2) NOT NULL,
          original_amount DECIMAL(10,2) NOT NULL,
          final_amount DECIMAL(10,2) NOT NULL,
          
          user_ip INET,
          user_agent TEXT,
          applied_to JSONB,
          
          used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      await db.query`
        CREATE TABLE IF NOT EXISTS coupon_conditions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
          
          condition_type VARCHAR(50) NOT NULL,
          condition_value JSONB NOT NULL,
          
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      console.log('✅ Migração da tabela de cupons concluída');

      return {
        success: true,
        message: 'Tabela de cupons migrada com sucesso',
        migrations_applied: migrations.length
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro na migração:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 