import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Criar tabela de movimentações de estoque
      await db.query`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          reason VARCHAR(100) NOT NULL,
          reference_id UUID,
          notes TEXT,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Criar índices separadamente
      await db.query`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product 
        ON stock_movements(product_id)
      `;

      await db.query`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_type 
        ON stock_movements(type)
      `;

      await db.query`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at 
        ON stock_movements(created_at DESC)
      `;

      await db.query`
        CREATE INDEX IF NOT EXISTS idx_stock_movements_reference 
        ON stock_movements(reference_id)
      `;

      // Verificar se a tabela foi criada
      const tableCheck = await db.query`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'stock_movements'
      `;

      if (tableCheck.length > 0) {
        console.log('✅ Tabela stock_movements criada com sucesso');
        
        // Criar alguns registros de exemplo
        const sampleProducts = await db.query`
          SELECT id FROM products LIMIT 3
        `;

        if (sampleProducts.length > 0) {
          for (const product of sampleProducts) {
            await db.query`
              INSERT INTO stock_movements (
                product_id, type, quantity, reason, notes
              ) VALUES (
                ${product.id}, 'in', 100, 'initial_stock', 'Estoque inicial do produto'
              )
            `;
          }
          console.log('✅ Registros de exemplo criados');
        }

        return {
          success: true,
          message: 'Tabela stock_movements criada com sucesso'
        };
      } else {
        throw new Error('Falha ao criar tabela');
      }
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao criar tabela:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 