/**
 * API Endpoint: Teste de Frete Simples
 * 
 * POST /api/shipping/test
 * Testa funções básicas do sistema de frete
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json();
    const { postalCode = '01310100' } = body;

    const result = await withDatabase(platform, async (db) => {
      // 1. Testar busca de carrier
      const carriers = await db.query(`
        SELECT id, name, type, is_active 
        FROM shipping_carriers 
        WHERE is_active = true
      `);

      // 2. Testar busca de zona por CEP
      const zones = await db.query(`
        SELECT * FROM find_shipping_zone($1)
      `, [postalCode]);

      // 3. Testar busca de shipping rates
      const rates = await db.query(`
        SELECT sr.*, sz.name as zone_name
        FROM shipping_rates sr
        JOIN shipping_zones sz ON sr.zone_id = sz.id
        WHERE sz.id = ANY($1)
      `, [zones.map((z: any) => z.zone_id)]);

      // 4. Testar configurações do seller
      const configs = await db.query(`
        SELECT ssc.*, sc.name as carrier_name
        FROM seller_shipping_configs ssc
        JOIN shipping_carriers sc ON ssc.carrier_id = sc.id
        WHERE ssc.is_enabled = true 
          AND sc.is_active = true
          AND (ssc.seller_id = $1 OR ssc.seller_id IS NULL)
        ORDER BY 
          CASE WHEN ssc.seller_id = $1 THEN 0 ELSE 1 END,
          ssc.priority ASC
      `, ['seller-1']);

      return {
        postalCode,
        carriers: carriers.length,
        zones: zones.length,
        rates: rates.length,
        configs: configs.length,
        details: {
          carriers,
          zones: zones.slice(0, 2), // Primeiras 2 zonas
          rates: rates.slice(0, 2), // Primeiras 2 rates
          configs: configs.slice(0, 3) // Primeiras 3 configs
        }
      };
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro no teste:', error);
    
    return json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Erro interno do servidor',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        } 
      },
      { status: 500 }
    );
  }
}; 