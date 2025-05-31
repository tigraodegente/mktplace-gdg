import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      console.log('🔨 Criando tabela sessions...');
      // 1. Criar tabela sessions
      await db.execute`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          ip_address TEXT,
          user_agent TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      
      console.log('🔨 Criando tabela orders...');
      // 2. Criar tabela orders
      await db.execute`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_number TEXT UNIQUE NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending',
          payment_status TEXT NOT NULL DEFAULT 'pending',
          payment_method TEXT,
          subtotal NUMERIC(10,2) NOT NULL,
          shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
          discount NUMERIC(10,2) NOT NULL DEFAULT 0,
          total NUMERIC(10,2) NOT NULL,
          notes TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      
      console.log('🔨 Criando tabela order_items...');
      // 3. Criar tabela order_items
      await db.execute`
        CREATE TABLE IF NOT EXISTS order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES products(id),
          seller_id UUID REFERENCES sellers(id),
          price NUMERIC(10,2) NOT NULL,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          total NUMERIC(10,2) NOT NULL,
          commission_amount NUMERIC(10,2),
          seller_amount NUMERIC(10,2),
          fulfillment_status TEXT DEFAULT 'pending',
          tracking_info JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      
      console.log('🔨 Criando tabela addresses...');
      // 4. Criar tabela addresses
      await db.execute`
        CREATE TABLE IF NOT EXISTS addresses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('shipping', 'billing')),
          is_default BOOLEAN DEFAULT false,
          name TEXT NOT NULL,
          street TEXT NOT NULL,
          number TEXT NOT NULL,
          complement TEXT,
          district TEXT NOT NULL,
          city TEXT NOT NULL,
          state TEXT NOT NULL,
          country TEXT NOT NULL DEFAULT 'BR',
          postal_code TEXT NOT NULL,
          phone TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      
      console.log('🔨 Criando tabela cart_items...');
      // 5. Criar tabela cart_items
      await db.execute`
        CREATE TABLE IF NOT EXISTS cart_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES products(id),
          quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
          added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, product_id)
        )
      `;
      
      console.log('🔨 Criando índices...');
      // Criar índices essenciais
      await db.execute`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
      await db.execute`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
      await db.execute`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`;
      await db.execute`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
      await db.execute`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`;
      await db.execute`CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id)`;
      await db.execute`CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id)`;
      
      console.log('✅ Todas as tabelas criadas!');
      return { success: true };
    });
    
    return json({
      success: true,
      message: 'Todas as tabelas foram criadas com sucesso!',
      tables: ['sessions', 'orders', 'order_items', 'addresses', 'cart_items']
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao criar tabelas:', error);
    return json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}; 