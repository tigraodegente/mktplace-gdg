import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    console.log('🚛 Check Shipping - Estratégia híbrida iniciada');
    
    // Tentar verificar shipping com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        // STEP 1: Verificar tabelas de shipping (query simplificada)
        let tables = [];
        try {
          tables = await db.query`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE 'shipping%' 
        ORDER BY table_name
            LIMIT 10
      `;
        } catch (e) {
          console.log('Erro ao buscar tabelas shipping');
          tables = [];
        }

        // STEP 2: Verificar contadores (queries separadas simples)
      const counts: any = {};
      
        // Verificar cada tabela individualmente com try/catch
        const tablesToCheck = ['shipping_carriers', 'shipping_zones', 'shipping_rates', 'shipping_base_rates', 'shipping_calculated_options'];
        
        for (const tableName of tablesToCheck) {
          if (tables.some((t: any) => t.table_name === tableName)) {
        try {
              const result = await db.query`SELECT COUNT(*) as count FROM ${tableName} LIMIT 1`;
              counts[tableName] = parseInt(result[0]?.count || '0');
        } catch (err) {
              counts[tableName] = 0;
            }
        }
      }

        // STEP 3: Verificar zona SP (query simplificada)
      let spZoneExists = false;
        if (tables.some((t: any) => t.table_name === 'shipping_zones')) {
        try {
          const spCheck = await db.query`
            SELECT COUNT(*) as count 
            FROM shipping_zones 
            WHERE uf = 'SP' AND is_active = true
              LIMIT 1
          `;
            spZoneExists = parseInt(spCheck[0]?.count || '0') > 0;
        } catch (err) {
          spZoneExists = false;
        }
      }

      return {
          database: 'PostgreSQL via Hyperdrive',
          shipping_tables: tables.map((t: any) => t.table_name),
        table_counts: counts,
        sp_zone_exists: spZoneExists,
        total_shipping_tables: tables.length
      };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Shipping check OK: ${result.total_shipping_tables} tabelas`);
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro check-shipping: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível verificar o status do sistema de frete',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Erro crítico check shipping:', error);
    return json({
      error: 'Erro ao verificar sistema de shipping',
      database: 'PostgreSQL via Hyperdrive (erro)',
      source: 'error'
    }, { status: 500 });
  }
}; 