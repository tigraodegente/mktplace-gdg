import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Verificar tabelas de shipping
      const tables = await db.query`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE 'shipping%' 
        ORDER BY table_name
      `;

      // Verificar contadores manualmente para tabelas específicas
      const counts: any = {};
      
      // Verificar cada tabela individualmente
      if (tables.some(t => t.table_name === 'shipping_carriers')) {
        try {
          const result = await db.query`SELECT COUNT(*) as count FROM shipping_carriers`;
          counts.shipping_carriers = result[0].count;
        } catch (err) {
          counts.shipping_carriers = 'error';
        }
      }

      if (tables.some(t => t.table_name === 'shipping_zones')) {
        try {
          const result = await db.query`SELECT COUNT(*) as count FROM shipping_zones`;
          counts.shipping_zones = result[0].count;
        } catch (err) {
          counts.shipping_zones = 'error';
        }
      }

      if (tables.some(t => t.table_name === 'shipping_rates')) {
        try {
          const result = await db.query`SELECT COUNT(*) as count FROM shipping_rates`;
          counts.shipping_rates = result[0].count;
        } catch (err) {
          counts.shipping_rates = 'error';
        }
      }

      // Verificar tabelas da importação Frenet
      if (tables.some(t => t.table_name === 'shipping_base_rates')) {
        try {
          const result = await db.query`SELECT COUNT(*) as count FROM shipping_base_rates`;
          counts.shipping_base_rates = result[0].count;
        } catch (err) {
          counts.shipping_base_rates = 'error';
        }
      }

      if (tables.some(t => t.table_name === 'shipping_calculated_options')) {
        try {
          const result = await db.query`SELECT COUNT(*) as count FROM shipping_calculated_options`;
          counts.shipping_calculated_options = result[0].count;
        } catch (err) {
          counts.shipping_calculated_options = 'error';
        }
      }

      if (tables.some(t => t.table_name === 'shipping_modalities')) {
        try {
          const result = await db.query`SELECT COUNT(*) as count FROM shipping_modalities WHERE is_active = true`;
          counts.shipping_modalities_active = result[0].count;
        } catch (err) {
          counts.shipping_modalities_active = 'error';
        }
      }

      // Verificar se existe zona para CEP de SP
      let spZoneExists = false;
      if (tables.some(t => t.table_name === 'shipping_zones')) {
        try {
          const spCheck = await db.query`
            SELECT COUNT(*) as count 
            FROM shipping_zones 
            WHERE uf = 'SP' AND is_active = true
          `;
          spZoneExists = spCheck[0].count > 0;
        } catch (err) {
          spZoneExists = false;
        }
      }

      return {
        database: 'PostgreSQL Local',
        shipping_tables: tables.map(t => t.table_name),
        table_counts: counts,
        sp_zone_exists: spZoneExists,
        total_shipping_tables: tables.length
      };
    });

    return json(result);

  } catch (error) {
    console.error('Erro ao verificar shipping:', error);
    return json({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      database: 'PostgreSQL Local (erro)'
    }, { status: 500 });
  }
}; 