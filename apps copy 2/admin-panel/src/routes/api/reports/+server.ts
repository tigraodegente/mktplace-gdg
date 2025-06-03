import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Gerar relatórios
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    const reportType = url.searchParams.get('type') || 'sales';
    const period = url.searchParams.get('period') || 'month';
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    
    // Definir filtro de data
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
        case 'quarter':
          dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '90 days'`;
          break;
        case 'year':
          dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '365 days'`;
          break;
      }
    }
    
    switch (reportType) {
      case 'sales':
        // Relatório de vendas
        const [salesSummary] = await db.query(`
          SELECT 
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
            COALESCE(SUM(total_amount), 0) as total_revenue,
            COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as confirmed_revenue,
            AVG(total_amount) as avg_order_value
          FROM orders 
          WHERE 1=1 ${dateFilter}
        `);
        
        const salesByDate = await db.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as orders,
            COALESCE(SUM(total_amount), 0) as revenue
          FROM orders 
          WHERE status = 'completed' ${dateFilter}
          GROUP BY DATE(created_at)
          ORDER BY date
        `);
        
        await db.close();
        
        return json({
          success: true,
          data: {
            type: 'sales',
            period,
            summary: {
              totalOrders: salesSummary.total_orders || 0,
              completedOrders: salesSummary.completed_orders || 0,
              totalRevenue: Number(salesSummary.total_revenue || 0),
              confirmedRevenue: Number(salesSummary.confirmed_revenue || 0),
              avgOrderValue: Number(salesSummary.avg_order_value || 0)
            },
            chartData: salesByDate.map((s: any) => ({
              date: s.date,
              orders: s.orders || 0,
              revenue: Number(s.revenue || 0)
            }))
          }
        });
        
      case 'products':
        // Relatório de produtos
        const topProducts = await db.query(`
          SELECT 
            p.id, p.name, p.slug, p.price, p.quantity as stock,
            COALESCE(SUM(oi.quantity), 0) as total_sold,
            COALESCE(SUM(oi.price * oi.quantity), 0) as revenue,
            COUNT(r.id) as review_count,
            AVG(r.rating) as avg_rating
          FROM products p
          LEFT JOIN order_items oi ON oi.product_id = p.id
          LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
          LEFT JOIN reviews r ON r.product_id = p.id AND r.is_active = true
          WHERE p.is_active = true
          GROUP BY p.id, p.name, p.slug, p.price, p.quantity
          ORDER BY total_sold DESC
          LIMIT 50
        `);
        
        const [productStats] = await db.query(`
          SELECT 
            COUNT(*) as total_products,
            COUNT(*) FILTER (WHERE is_active = true) as active_products,
            COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock,
            COUNT(*) FILTER (WHERE quantity < 10) as low_stock
          FROM products
        `);
        
        await db.close();
        
        return json({
          success: true,
          data: {
            type: 'products',
            stats: {
              totalProducts: productStats.total_products || 0,
              activeProducts: productStats.active_products || 0,
              outOfStock: productStats.out_of_stock || 0,
              lowStock: productStats.low_stock || 0
            },
            topProducts: topProducts.map((p: any) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: Number(p.price),
              stock: p.stock || 0,
              totalSold: p.total_sold || 0,
              revenue: Number(p.revenue || 0),
              reviewCount: p.review_count || 0,
              avgRating: p.avg_rating ? Number(p.avg_rating).toFixed(1) : '0'
            }))
          }
        });
        
      case 'customers':
        // Relatório de clientes
        const [customerStats] = await db.query(`
          SELECT 
            COUNT(*) as total_customers,
            COUNT(*) FILTER (WHERE is_active = true) as active_customers,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_customers
          FROM users 
          WHERE role = 'customer'
        `);
        
        const topCustomers = await db.query(`
          SELECT 
            u.id, u.name, u.email,
            COUNT(o.id) as order_count,
            COALESCE(SUM(o.total_amount), 0) as total_spent,
            MAX(o.created_at) as last_order
          FROM users u
          LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'completed'
          WHERE u.role = 'customer'
          GROUP BY u.id, u.name, u.email
          ORDER BY total_spent DESC
          LIMIT 50
        `);
        
        await db.close();
        
        return json({
          success: true,
          data: {
            type: 'customers',
            stats: {
              totalCustomers: customerStats.total_customers || 0,
              activeCustomers: customerStats.active_customers || 0,
              newCustomers: customerStats.new_customers || 0
            },
            topCustomers: topCustomers.map((c: any) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              orderCount: c.order_count || 0,
              totalSpent: Number(c.total_spent || 0),
              lastOrder: c.last_order
            }))
          }
        });
        
      default:
        await db.close();
        return json({
          success: false,
          error: 'Tipo de relatório inválido'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error generating report:', error);
    return json({
      success: false,
      error: 'Erro ao gerar relatório'
    }, { status: 500 });
  }
}; 