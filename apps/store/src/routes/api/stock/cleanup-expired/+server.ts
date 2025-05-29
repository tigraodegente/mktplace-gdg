import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      console.log('🧹 Iniciando limpeza de reservas expiradas...');

      // Limpar reservas expiradas
      const expiredReservations = await db.query`
        UPDATE stock_reservations 
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'active' 
        AND expires_at < NOW()
        RETURNING id, session_id, expires_at
      `;

      if (expiredReservations.length > 0) {
        console.log(`🗑️ ${expiredReservations.length} reservas expiradas limpas:`);
        expiredReservations.forEach(reservation => {
          console.log(`   - ID: ${reservation.id} (session: ${reservation.session_id})`);
        });
      } else {
        console.log('✅ Nenhuma reserva expirada encontrada');
      }

      // Estatísticas de reservas
      const stats = await db.query`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_reservations,
          COUNT(*) FILTER (WHERE status = 'expired') as expired_reservations,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_reservations,
          COUNT(*) FILTER (WHERE status = 'released') as released_reservations,
          COUNT(*) as total_reservations
        FROM stock_reservations
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;

      const reservationStats = stats[0];

      return {
        success: true,
        cleaned_count: expiredReservations.length,
        cleaned_reservations: expiredReservations.map(r => ({
          id: r.id,
          session_id: r.session_id,
          expired_at: r.expires_at
        })),
        stats: {
          active: parseInt(reservationStats.active_reservations),
          expired: parseInt(reservationStats.expired_reservations),
          confirmed: parseInt(reservationStats.confirmed_reservations),
          released: parseInt(reservationStats.released_reservations),
          total_24h: parseInt(reservationStats.total_reservations)
        }
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro na limpeza de reservas:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};

// GET: Consultar estatísticas sem fazer limpeza
export const GET: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Estatísticas gerais
      const generalStats = await db.query`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_reservations,
          COUNT(*) FILTER (WHERE status = 'expired') as expired_reservations,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_reservations,
          COUNT(*) FILTER (WHERE status = 'released') as released_reservations,
          COUNT(*) as total_reservations
        FROM stock_reservations
      `;

      // Reservas que vão expirar em breve (próximos 5 minutos)
      const soonToExpire = await db.query`
        SELECT COUNT(*) as count
        FROM stock_reservations
        WHERE status = 'active'
        AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '5 minutes'
      `;

      // Produtos mais reservados hoje
      const popularProducts = await db.query`
        SELECT 
          p.name,
          p.id,
          COUNT(sri.product_id) as reservation_count,
          SUM(sri.quantity) as total_reserved_quantity
        FROM stock_reservation_items sri
        JOIN stock_reservations sr ON sr.id = sri.reservation_id
        JOIN products p ON p.id = sri.product_id
        WHERE sr.created_at > CURRENT_DATE
        GROUP BY p.id, p.name
        ORDER BY reservation_count DESC
        LIMIT 5
      `;

      return {
        success: true,
        stats: {
          general: generalStats[0],
          soon_to_expire: parseInt(soonToExpire[0].count),
          popular_products: popularProducts
        }
      };
    });

    return json(result);

  } catch (error: any) {
    console.error('❌ Erro ao consultar estatísticas:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 