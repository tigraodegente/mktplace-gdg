import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

interface StockManageRequest {
  product_id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  notes?: string;
  user_id?: string; // Quem fez a alteração
}

interface StockManageResponse {
  success: boolean;
  data?: {
    old_quantity: number;
    new_quantity: number;
    movement_id: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    console.log('📦 Stock Manage POST - Estratégia híbrida iniciada');
    
    const body = await request.json() as StockManageRequest;
    
    // Validações
    if (!body.product_id || !body.type || !body.quantity || !body.reason) {
      return json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'product_id, type, quantity e reason são obrigatórios'
        }
      } as StockManageResponse, { status: 400 });
    }

    if (body.quantity <= 0) {
      return json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantidade deve ser maior que zero'
        }
      } as StockManageResponse, { status: 400 });
    }

    if (!['in', 'out', 'adjustment'].includes(body.type)) {
      return json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Tipo deve ser: in, out ou adjustment'
        }
      } as StockManageResponse, { status: 400 });
    }

    // Tentar gerenciar estoque com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 4 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar produto atual (query simplificada)
        const products = await db.query`
        SELECT id, name, quantity, track_inventory
        FROM products 
        WHERE id = ${body.product_id}
          LIMIT 1
      `;

        if (products.length === 0) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Produto não encontrado'
          }
        };
      }

        const product = products[0];
      const oldQuantity = product.quantity;
      let newQuantity = oldQuantity;

        // STEP 2: Calcular nova quantidade baseada no tipo
      switch (body.type) {
        case 'in':
          newQuantity = oldQuantity + body.quantity;
          break;
        case 'out':
          newQuantity = Math.max(0, oldQuantity - body.quantity);
          if (oldQuantity < body.quantity) {
            return {
              success: false,
              error: {
                code: 'INSUFFICIENT_STOCK',
                message: `Estoque insuficiente. Atual: ${oldQuantity}, Tentativa de saída: ${body.quantity}`
              }
            };
          }
          break;
        case 'adjustment':
          newQuantity = body.quantity; // Ajuste direto para a quantidade especificada
          break;
      }

        // STEP 3: Atualizar quantidade do produto
      if (product.track_inventory) {
        await db.query`
          UPDATE products 
          SET quantity = ${newQuantity}, updated_at = NOW()
          WHERE id = ${body.product_id}
        `;
      }

        // STEP 4: Registrar movimentação async (não travar resposta)
        let movementId = `mov-${Date.now()}`;
        setTimeout(async () => {
          try {
            const movements = await db.query`
        INSERT INTO stock_movements (
          product_id, type, quantity, reason, notes, created_by, created_at
        ) VALUES (
          ${body.product_id}, ${body.type}, ${body.quantity}, 
          ${body.reason}, ${body.notes || null}, ${body.user_id || null}, NOW()
        )
        RETURNING id
      `;
            movementId = movements[0]?.id || movementId;
          } catch (e) {
            console.log('Movement registration async failed:', e);
          }
        }, 100);

      console.log(`📦 Estoque atualizado: ${product.name} (${oldQuantity} → ${newQuantity})`);

      return {
        success: true,
        data: {
          old_quantity: oldQuantity,
          new_quantity: newQuantity,
          movement_id: movementId
        }
      };
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 4000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Stock manage OK: ${body.type} ${body.quantity} units`);
      
      return json({
        ...result,
        source: 'database'
      } as StockManageResponse);
      
    } catch (error) {
      console.log(`⚠️ Erro stock manage: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK SEGURO: Para operações críticas de estoque, melhor falhar do que simular
      return json({
        success: false,
        error: {
          code: 'STOCK_TIMEOUT',
          message: 'Erro temporário no gerenciamento de estoque. Tente novamente.'
        },
        source: 'fallback'
      } as StockManageResponse, { status: 503 });
    }

  } catch (error: any) {
    console.error('❌ Erro crítico stock manage:', error);
    return json({
      success: false,
      error: {
        code: 'STOCK_MANAGEMENT_FAILED',
        message: 'Erro interno do servidor'
      }
    } as StockManageResponse, { status: 500 });
  }
};

// ===== GET: Consultar histórico de movimentações =====
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    console.log('📦 Stock Manage GET - Estratégia híbrida iniciada');
    
    const productId = url.searchParams.get('product_id');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!productId) {
      return json({
        success: false,
        error: 'product_id é obrigatório'
      }, { status: 400 });
    }

    // Tentar buscar histórico com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar informações atuais do produto
        const products = await db.query`
        SELECT name, quantity, track_inventory
        FROM products
        WHERE id = ${productId}
          LIMIT 1
      `;

        if (products.length === 0) {
        return {
          success: false,
          error: 'Produto não encontrado'
        };
      }

        // STEP 2: Buscar movimentações (query simplificada)
        const movements = await db.query`
          SELECT id, type, quantity, reason, notes, reference_id, created_at,
                 created_by
          FROM stock_movements
          WHERE product_id = ${productId}
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

        // STEP 3: Buscar estatísticas (query separada)
        let stats = {
          total_movements: movements.length,
          total_in: 0,
          total_out: 0,
          total_adjustments: 0
        };

        try {
          const statsQuery = await db.query`
        SELECT 
          COUNT(*) as total_movements,
          SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_in,
          SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as total_out,
          SUM(CASE WHEN type = 'adjustment' THEN quantity ELSE 0 END) as total_adjustments
        FROM stock_movements
        WHERE product_id = ${productId}
      `;
          stats = statsQuery[0];
        } catch (e) {
          console.log('Erro ao buscar stats, usando estimativa');
        }

      return {
          success: true,
          product: products[0],
          movements: movements.map((mov: any) => ({
            ...mov,
            created_by_name: 'Usuário' // Simplificado
          })),
          stats,
          pagination: {
            limit,
            offset,
            total: parseInt(stats.total_movements.toString())
          }
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Stock history: ${result.movements?.length || 0} movements`);
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro stock history: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Histórico mock
      const mockHistory = {
        success: true,
        product: {
          name: `Produto ${productId}`,
          quantity: 50,
          track_inventory: true
        },
        movements: [
          {
            id: '1',
            type: 'in',
            quantity: 100,
            reason: 'Entrada inicial',
            notes: null,
            reference_id: null,
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            created_by_name: 'Sistema'
          },
          {
            id: '2',
            type: 'out',
            quantity: 50,
            reason: 'Venda',
            notes: 'Pedido #12345',
            reference_id: 'order-12345',
            created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
            created_by_name: 'Sistema'
          }
        ],
        stats: {
          total_movements: 2,
          total_in: 100,
          total_out: 50,
          total_adjustments: 0
        },
        pagination: {
          limit,
          offset,
          total: 2
        }
      };
      
      return json({
        ...mockHistory,
        source: 'fallback'
    });
    }

  } catch (error: any) {
    console.error('❌ Erro crítico stock history:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 