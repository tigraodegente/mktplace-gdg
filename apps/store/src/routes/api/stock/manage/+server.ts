import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

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

    const result = await withDatabase(platform, async (db) => {
      // Buscar produto atual
      const productResult = await db.query`
        SELECT id, name, quantity, track_inventory
        FROM products 
        WHERE id = ${body.product_id}
      `;

      if (productResult.length === 0) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Produto não encontrado'
          }
        };
      }

      const product = productResult[0];
      const oldQuantity = product.quantity;
      let newQuantity = oldQuantity;

      // Calcular nova quantidade baseada no tipo
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

      // Atualizar quantidade do produto
      if (product.track_inventory) {
        await db.query`
          UPDATE products 
          SET quantity = ${newQuantity}, updated_at = NOW()
          WHERE id = ${body.product_id}
        `;
      }

      // Registrar movimentação
      const movementResult = await db.query`
        INSERT INTO stock_movements (
          product_id, type, quantity, reason, notes, created_by, created_at
        ) VALUES (
          ${body.product_id}, ${body.type}, ${body.quantity}, 
          ${body.reason}, ${body.notes || null}, ${body.user_id || null}, NOW()
        )
        RETURNING id
      `;

      const movementId = movementResult[0].id;

      console.log(`📦 Estoque atualizado: ${product.name} (${oldQuantity} → ${newQuantity})`);

      return {
        success: true,
        data: {
          old_quantity: oldQuantity,
          new_quantity: newQuantity,
          movement_id: movementId
        }
      };
    });

    return json(result as StockManageResponse);

  } catch (error: any) {
    console.error('❌ Erro ao gerenciar estoque:', error);
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
    const productId = url.searchParams.get('product_id');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!productId) {
      return json({
        success: false,
        error: 'product_id é obrigatório'
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Buscar movimentações do produto
      const movements = await db.query`
        SELECT 
          sm.id,
          sm.type,
          sm.quantity,
          sm.reason,
          sm.notes,
          sm.reference_id,
          sm.created_at,
          u.name as created_by_name
        FROM stock_movements sm
        LEFT JOIN users u ON u.id = sm.created_by
        WHERE sm.product_id = ${productId}
        ORDER BY sm.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Buscar informações atuais do produto
      const productInfo = await db.query`
        SELECT name, quantity, track_inventory
        FROM products
        WHERE id = ${productId}
      `;

      if (productInfo.length === 0) {
        return {
          success: false,
          error: 'Produto não encontrado'
        };
      }

      // Calcular estatísticas
      const stats = await db.query`
        SELECT 
          COUNT(*) as total_movements,
          SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_in,
          SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as total_out,
          SUM(CASE WHEN type = 'adjustment' THEN quantity ELSE 0 END) as total_adjustments
        FROM stock_movements
        WHERE product_id = ${productId}
      `;

      return {
        success: true,
        product: productInfo[0],
        movements: movements,
        stats: stats[0],
        pagination: {
          limit,
          offset,
          total: parseInt(stats[0].total_movements)
        }
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao consultar histórico:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 