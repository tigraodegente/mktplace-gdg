import { readFileSync } from 'fs';
import { getDatabase } from '../apps/admin-panel/src/lib/db/index.ts';

async function executeShippingSchema() {
  try {
    // Ler o arquivo SQL
    const sqlContent = readFileSync('schema/shipping_complete_schema.sql', 'utf-8');
    
    // Simular platform object (para funcionar no Node.js)
    const mockPlatform = { env: {} };
    
    // Conectar ao banco
    const db = getDatabase(mockPlatform);
    
    console.log('🚀 Executando schema de frete...');
    
    // Executar o SQL completo
    await db.query(sqlContent);
    
    await db.close();
    
    console.log('✅ Schema de frete executado com sucesso!');
    console.log('📦 Tabelas criadas: shipping_carriers, shipping_zones, shipping_base_rates, shipments, shipping_quotes');
    console.log('🔍 Índices e triggers criados');
    console.log('📊 Dados iniciais inseridos');
    
  } catch (error) {
    console.error('❌ Erro ao executar schema:', error);
    process.exit(1);
  }
}

executeShippingSchema(); 