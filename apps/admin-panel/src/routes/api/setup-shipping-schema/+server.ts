import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Ler o arquivo SQL do schema simplificado
    const schemaPath = join(process.cwd(), '..', '..', 'schema', 'shipping_simple_schema.sql');
    const sqlContent = readFileSync(schemaPath, 'utf-8');
    
    console.log('🚀 Executando schema simplificado de frete...');
    
    // Executar o SQL completo
    await db.query(sqlContent);
    
    await db.close();
    
    console.log('✅ Schema de frete executado com sucesso!');
    
    return json({
      success: true,
      message: 'Schema simplificado de frete executado com sucesso!',
      details: {
        action: 'Schema simplificado sem foreign keys problemáticas',
        tables_created: [
          'shipping_carriers (5 transportadoras)',
          'shipping_zones (5 zonas)', 
          'shipping_base_rates (dados exemplo)',
          'shipments (dados exemplo)',
          'shipping_quotes (dados exemplo)'
        ],
        features: [
          'Índices para performance',
          'Triggers para updated_at',
          'Dados iniciais completos',
          'Estrutura pronta para uso'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao executar schema:', error);
    return json({
      success: false,
      error: 'Erro ao executar schema de frete',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}; 