import { createDatabase } from '../apps/store/src/lib/db/database.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function populateLocationData() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('📍 Populando dados de localização...\n');
    
    // Estados e cidades brasileiras
    const locations = [
      { state: 'SP', city: 'São Paulo' },
      { state: 'SP', city: 'Campinas' },
      { state: 'SP', city: 'Santos' },
      { state: 'RJ', city: 'Rio de Janeiro' },
      { state: 'RJ', city: 'Niterói' },
      { state: 'MG', city: 'Belo Horizonte' },
      { state: 'MG', city: 'Uberlândia' },
      { state: 'RS', city: 'Porto Alegre' },
      { state: 'RS', city: 'Caxias do Sul' },
      { state: 'PR', city: 'Curitiba' },
      { state: 'PR', city: 'Londrina' },
      { state: 'SC', city: 'Florianópolis' },
      { state: 'SC', city: 'Joinville' },
      { state: 'BA', city: 'Salvador' },
      { state: 'PE', city: 'Recife' },
      { state: 'CE', city: 'Fortaleza' },
      { state: 'DF', city: 'Brasília' },
      { state: 'GO', city: 'Goiânia' },
      { state: 'PA', city: 'Belém' },
      { state: 'AM', city: 'Manaus' }
    ];
    
    // Adicionar colunas de localização se não existirem
    console.log('🔧 Adicionando colunas de localização...');
    
    await db.query(`
      ALTER TABLE sellers 
      ADD COLUMN IF NOT EXISTS state VARCHAR(2),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100)
    `);
    
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS seller_state VARCHAR(2),
      ADD COLUMN IF NOT EXISTS seller_city VARCHAR(100)
    `);
    
    // Atualizar vendedores com localizações aleatórias
    console.log('🏪 Atualizando localização dos vendedores...');
    
    const sellers = await db.query(`SELECT id FROM sellers`);
    
    for (const seller of sellers) {
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      await db.query(`
        UPDATE sellers 
        SET state = $1, city = $2
        WHERE id = $3
      `, location.state, location.city, seller.id);
    }
    
    // Atualizar produtos com localização do vendedor
    console.log('📦 Atualizando localização dos produtos...');
    
    await db.query(`
      UPDATE products p
      SET 
        seller_state = s.state,
        seller_city = s.city
      FROM sellers s
      WHERE p.seller_id = s.id
    `);
    
    // Verificar resultados
    const stats = await db.query(`
      SELECT 
        seller_state as state,
        seller_city as city,
        COUNT(*) as product_count
      FROM products
      WHERE seller_state IS NOT NULL
      GROUP BY seller_state, seller_city
      ORDER BY product_count DESC
    `);
    
    console.log('\n📊 Distribuição de produtos por localização:');
    console.table(stats);
    
    // Criar índices para melhor performance
    console.log('\n🔍 Criando índices...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sellers_location ON sellers(state, city);
      CREATE INDEX IF NOT EXISTS idx_products_seller_location ON products(seller_state, seller_city);
    `);
    
    console.log('\n✅ Dados de localização populados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

populateLocationData(); 