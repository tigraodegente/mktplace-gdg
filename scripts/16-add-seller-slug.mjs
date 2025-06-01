import { createDatabase } from '../apps/store/src/lib/db/database.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function addSellerSlug() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('🏪 Adicionando slug aos vendedores...\n');
    
    // Adicionar coluna slug se não existir
    await db.query(`
      ALTER TABLE sellers 
      ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE
    `);
    
    console.log('✅ Coluna slug adicionada!');
    
    // Gerar slugs para vendedores existentes
    console.log('\n📝 Gerando slugs...');
    
    const sellers = await db.query(`
      SELECT id, company_name 
      FROM sellers 
      WHERE slug IS NULL
    `);
    
    for (const seller of sellers) {
      // Gerar slug a partir do nome da empresa
      const slug = seller.company_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
        .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
      
      // Verificar se o slug já existe e adicionar número se necessário
      let finalSlug = slug;
      let counter = 1;
      
      while (true) {
        const existing = await db.query(
          `SELECT id FROM sellers WHERE slug = $1 AND id != $2`,
          finalSlug,
          seller.id
        );
        
        if (existing.length === 0) break;
        
        finalSlug = `${slug}-${counter}`;
        counter++;
      }
      
      await db.query(
        `UPDATE sellers SET slug = $1 WHERE id = $2`,
        finalSlug,
        seller.id
      );
      
      console.log(`✓ ${seller.company_name} → ${finalSlug}`);
    }
    
    // Criar índice para melhor performance
    console.log('\n🔍 Criando índice...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sellers_slug ON sellers(slug);
    `);
    
    // Verificar resultados
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(slug) as with_slug,
        COUNT(DISTINCT slug) as unique_slugs
      FROM sellers
    `);
    
    console.log('\n📊 Estatísticas:');
    console.table(stats);
    
    console.log('\n✅ Processo concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

addSellerSlug(); 