import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Relatórios financeiros
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const period = url.searchParams.get('period') || 'month';
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const type = url.searchParams.get('type') || 'overview';
    
    // Definir período
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `AND created_at BETWEEN '${startDate}' AND '${endDate}'`;
    } else {
      switch (period) {
        case 'today':
          dateFilter = `AND DATE(created_at) = CURRENT_DATE`;
          break;
        case 'week':
          dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case 'month':
          dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
          break;
        case 'year':
          dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '365 days'`;
          break;
      }
    }
    
    if (type === 'overview') {
      // Resumo financeiro geral
      const [revenue] = await db.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COUNT(*) as total_orders,
          AVG(total_amount) as avg_order_value,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as confirmed_revenue
        FROM orders 
        WHERE 1=1 ${dateFilter}
      `);
      
      // Vendas por período
      const salesChart = await db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders 
        WHERE status = 'completed' ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date
      `);
      
      // Top produtos
      const topProducts = await db.query(`
        SELECT 
          p.name as product_name,
          p.slug as product_slug,
          SUM(oi.quantity) as total_sold,
          COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
        FROM order_items oi
        INNER JOIN products p ON p.id = oi.product_id
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'completed' ${dateFilter.replace('created_at', 'o.created_at')}
        GROUP BY p.id, p.name, p.slug
        ORDER BY revenue DESC
        LIMIT 10
      `);
      
      // Método de pagamento
      const paymentMethods = await db.query(`
        SELECT 
          payment_method,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders 
        WHERE status = 'completed' ${dateFilter}
        GROUP BY payment_method
        ORDER BY revenue DESC
      `);
      
      await db.close();
      
      return json({
        success: true,
        data: {
          overview: {
            totalRevenue: Number(revenue.total_revenue || 0),
            totalOrders: revenue.total_orders || 0,
            avgOrderValue: Number(revenue.avg_order_value || 0),
            completedOrders: revenue.completed_orders || 0,
            confirmedRevenue: Number(revenue.confirmed_revenue || 0),
            conversionRate: revenue.total_orders > 0 ? 
              ((revenue.completed_orders / revenue.total_orders) * 100).toFixed(2) : '0'
          },
          salesChart: salesChart.map((s: any) => ({
            date: s.date,
            orders: s.orders || 0,
            revenue: Number(s.revenue || 0)
          })),
          topProducts: topProducts.map((p: any) => ({
            productName: p.product_name,
            productSlug: p.product_slug,
            totalSold: p.total_sold || 0,
            revenue: Number(p.revenue || 0)
          })),
          paymentMethods: paymentMethods.map((pm: any) => ({
            method: pm.payment_method,
            count: pm.count || 0,
            revenue: Number(pm.revenue || 0)
          }))
        }
      });
      
    } else if (type === 'transactions') {
      // Transações detalhadas
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
      const offset = (page - 1) * limit;
      
      const transactions = await db.query(`
        SELECT 
          o.id, o.order_number, o.total_amount, o.payment_method,
          o.status, o.created_at, o.updated_at,
          u.name as customer_name, u.email as customer_email,
          COUNT(*) OVER() as total_count
        FROM orders o
        INNER JOIN users u ON u.id = o.user_id
        WHERE 1=1 ${dateFilter}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      const totalCount = transactions[0]?.total_count || 0;
      
      await db.close();
      
      return json({
        success: true,
        data: {
          transactions: transactions.map((t: any) => ({
            id: t.id,
            orderNumber: t.order_number,
            totalAmount: Number(t.total_amount),
            paymentMethod: t.payment_method,
            status: t.status,
            customerName: t.customer_name,
            customerEmail: t.customer_email,
            createdAt: t.created_at,
            updatedAt: t.updated_at
          })),
          pagination: {
            page,
            limit,
            total: parseInt(totalCount),
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });
      
    } else if (type === 'refunds') {
      // Relatório de reembolsos
      const refunds = await db.query(`
        SELECT 
          r.id, r.refund_amount, r.reason, r.status,
          r.created_at, r.processed_at,
          o.order_number, o.total_amount as order_total,
          u.name as customer_name,
          p.name as product_name
        FROM returns r
        INNER JOIN order_items oi ON oi.id = r.order_item_id
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        INNER JOIN users u ON u.id = o.user_id
        WHERE r.status IN ('approved', 'refunded') ${dateFilter.replace('created_at', 'r.created_at')}
        ORDER BY r.created_at DESC
      `);
      
      const [refundStats] = await db.query(`
        SELECT 
          COUNT(*) as total_refunds,
          COALESCE(SUM(refund_amount), 0) as total_refunded,
          AVG(refund_amount) as avg_refund
        FROM returns 
        WHERE status IN ('approved', 'refunded') ${dateFilter}
      `);
      
      await db.close();
      
      return json({
        success: true,
        data: {
          refunds: refunds.map((r: any) => ({
            id: r.id,
            refundAmount: Number(r.refund_amount || 0),
            reason: r.reason,
            status: r.status,
            orderNumber: r.order_number,
            orderTotal: Number(r.order_total),
            customerName: r.customer_name,
            productName: r.product_name,
            createdAt: r.created_at,
            processedAt: r.processed_at
          })),
          stats: {
            totalRefunds: refundStats.total_refunds || 0,
            totalRefunded: Number(refundStats.total_refunded || 0),
            avgRefund: Number(refundStats.avg_refund || 0)
          }
        }
      });
    }
    
    await db.close();
    return json({
      success: false,
      error: 'Tipo de relatório inválido'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return json({
      success: false,
      error: 'Erro ao buscar dados financeiros'
    }, { status: 500 });
  }
};

// POST - Ajuste financeiro manual
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações
    if (!data.type || !data.amount || !data.description) {
      return json({
        success: false,
        error: 'Tipo, valor e descrição são obrigatórios'
      }, { status: 400 });
    }
    
    // Inserir ajuste financeiro
    const [adjustment] = await db.query`
      INSERT INTO financial_adjustments (
        type, amount, description, reference_id,
        reference_type, admin_id, created_at
      ) VALUES (
        ${data.type}, ${data.amount}, ${data.description},
        ${data.referenceId || null}, ${data.referenceType || null},
        ${data.adminId || null}, NOW()
      ) RETURNING id
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: adjustment.id,
        message: 'Ajuste financeiro criado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating financial adjustment:', error);
    return json({
      success: false,
      error: 'Erro ao criar ajuste financeiro'
    }, { status: 500 });
  }
}; 