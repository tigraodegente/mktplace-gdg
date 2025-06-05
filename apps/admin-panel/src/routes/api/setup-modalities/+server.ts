import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Ler o arquivo SQL do schema
    const schemaPath = join(process.cwd(), '..', '..', 'schema', 'shipping_modalities_complete.sql');
    const sqlContent = readFileSync(schemaPath, 'utf-8');
    
    console.log('🚀 Executando schema de modalidades...');
    
    // Executar o SQL completo
    await db.query(sqlContent);
    
    await db.close();
    
    console.log('✅ Schema de modalidades executado com sucesso!');
    
    return json({
      success: true,
      message: 'Schema de modalidades executado com sucesso!',
      details: {
        tabela: 'shipping_modalities',
        modalidades: ['PAC', 'SEDEX', 'SEDEX Express', 'Transportadora', 'Retirada na Loja'],
        indices_criados: 3,
        trigger_criado: 'update_shipping_modalities_updated_at'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao executar schema de modalidades:', error);
    return json({
      success: false,
      error: `Erro ao executar schema: ${String(error)}`
    }, { status: 500 });
  }
}; 