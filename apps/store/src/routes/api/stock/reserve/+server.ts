import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

interface ReserveRequest {
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  session_id: string; // ID da sessão do usuário
  expires_in_minutes?: number; // Padrão: 15 minutos
}

interface ReserveResponse {
  success: boolean;
  reservation_id?: string;
  expires_at?: string;
  error?: {
    code: string;
    message: string;
    failed_items?: Array<{
      product_id: string;
      requested: number;
      available: number;
    }>;
  };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json() as ReserveRequest;
    
    // Validações
    if (!body.items || body.items.length === 0) {
      return json({
        success: false,
        error: {
          code: 'EMPTY_ITEMS',
          message: 'Nenhum item para reservar'
        }
      } as ReserveResponse, { status: 400 });
    }

    if (!body.session_id) {
      return json({
        success: false,
        error: {
          code: 'MISSING_SESSION',
          message: 'ID de sessão é obrigatório'
        }
      } as ReserveResponse, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Criar tabela de reservas se não existir
      await createReservationsTable(db);

      // Limpar reservas expiradas
      await cleanupExpiredReservations(db);

      // Validar disponibilidade de estoque
      const stockValidation = await validateStockAvailability(db, body.items);
      if (!stockValidation.success) {
        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Estoque insuficiente para alguns itens',
            failed_items: stockValidation.failed_items
          }
        };
      }

      // Calcular tempo de expiração
      const expiresInMinutes = body.expires_in_minutes || 15;
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      // Criar a reserva principal
      const reservationResult = await db.query`
        INSERT INTO stock_reservations (
          session_id, status, expires_at, created_at
        ) VALUES (
          ${body.session_id}, 'active', ${expiresAt.toISOString()}, NOW()
        )
        RETURNING id, expires_at
      `;

      const reservation = reservationResult[0];

      // Criar os itens da reserva
      for (const item of body.items) {
        await db.query`
          INSERT INTO stock_reservation_items (
            reservation_id, product_id, quantity, created_at
          ) VALUES (
            ${reservation.id}, ${item.product_id}, ${item.quantity}, NOW()
          )
        `;
      }

      console.log(`✅ Reserva criada: ${reservation.id} (expira em ${expiresInMinutes}min)`);

      return {
        success: true,
        reservation_id: reservation.id,
        expires_at: reservation.expires_at
      };
    });

    return json(result as ReserveResponse);

  } catch (error: any) {
    console.error('❌ Erro ao reservar estoque:', error);
    return json({
      success: false,
      error: {
        code: 'RESERVATION_FAILED',
        message: 'Erro interno do servidor'
      }
    } as ReserveResponse, { status: 500 });
  }
};

// ===== DELETE: Liberar reserva =====
export const DELETE: RequestHandler = async ({ url, platform }) => {
  try {
    const reservationId = url.searchParams.get('reservation_id');
    const sessionId = url.searchParams.get('session_id');

    if (!reservationId || !sessionId) {
      return json({
        success: false,
        error: 'reservation_id e session_id são obrigatórios'
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Liberar a reserva
      const releaseResult = await db.query`
        UPDATE stock_reservations 
        SET status = 'released', updated_at = NOW()
        WHERE id = ${reservationId} 
        AND session_id = ${sessionId}
        AND status = 'active'
        RETURNING id
      `;

      if (releaseResult.length === 0) {
        return {
          success: false,
          error: 'Reserva não encontrada ou já processada'
        };
      }

      console.log(`🔓 Reserva liberada: ${reservationId}`);

      return {
        success: true,
        message: 'Reserva liberada com sucesso'
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao liberar reserva:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// ===== FUNÇÕES AUXILIARES =====

async function createReservationsTable(db: any) {
  // Tabela principal de reservas
  await db.query`
    CREATE TABLE IF NOT EXISTS stock_reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'released', 'expired')),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Tabela de itens das reservas
  await db.query`
    CREATE TABLE IF NOT EXISTS stock_reservation_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_id UUID NOT NULL REFERENCES stock_reservations(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Índices para performance
  await db.query`
    CREATE INDEX IF NOT EXISTS idx_stock_reservations_session 
    ON stock_reservations(session_id)
  `;

  await db.query`
    CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires 
    ON stock_reservations(expires_at)
  `;

  await db.query`
    CREATE INDEX IF NOT EXISTS idx_stock_reservations_status 
    ON stock_reservations(status)
  `;
}

async function cleanupExpiredReservations(db: any) {
  const cleanupResult = await db.query`
    UPDATE stock_reservations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' 
    AND expires_at < NOW()
    RETURNING id
  `;

  if (cleanupResult.length > 0) {
    console.log(`🧹 ${cleanupResult.length} reservas expiradas limpas`);
  }
}

async function validateStockAvailability(db: any, items: ReserveRequest['items']) {
  const failedItems = [];

  for (const item of items) {
    // Buscar estoque atual e reservas ativas
    const stockInfo = await db.query`
      SELECT 
        p.quantity as current_stock,
        p.track_inventory,
        COALESCE(SUM(sri.quantity), 0) as reserved_quantity
      FROM products p
      LEFT JOIN stock_reservation_items sri ON sri.product_id = p.id
      LEFT JOIN stock_reservations sr ON sr.id = sri.reservation_id
        AND sr.status = 'active' 
        AND sr.expires_at > NOW()
      WHERE p.id = ${item.product_id}
      GROUP BY p.id, p.quantity, p.track_inventory
    `;

    if (stockInfo.length === 0) {
      failedItems.push({
        product_id: item.product_id,
        requested: item.quantity,
        available: 0
      });
      continue;
    }

    const stock = stockInfo[0];
    
    if (stock.track_inventory) {
      const availableStock = stock.current_stock - stock.reserved_quantity;
      
      if (availableStock < item.quantity) {
        failedItems.push({
          product_id: item.product_id,
          requested: item.quantity,
          available: availableStock
        });
      }
    }
  }

  return {
    success: failedItems.length === 0,
    failed_items: failedItems
  };
} 