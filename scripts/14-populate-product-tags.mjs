import { createDatabase } from '../packages/db-hyperdrive/dist/index.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function populateProductTags() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('🏷️ Populando tags dos produtos...\n');
    
    // Tags por categoria
    const tagsByCategory = {
      smartphones: ['5G', 'Dual SIM', 'NFC', 'Carregamento Rápido', 'Câmera Tripla', 'Tela AMOLED', 'À Prova D\'água'],
      notebooks: ['SSD', 'Tela Touch', 'Ultrabook', 'Gaming', 'Teclado Iluminado', 'Thunderbolt', 'Leve'],
      playstation: ['4K', 'HDR', 'Ray Tracing', 'SSD Ultra Rápido', 'Retrocompatível', 'Online', 'Controle Sem Fio'],
      tvs: ['Smart TV', '4K', 'HDR10+', 'Dolby Vision', 'WiFi', 'Bluetooth', 'Comando de Voz'],
      'fones-ouvido': ['Bluetooth', 'Cancelamento de Ruído', 'Sem Fio', 'Microfone', 'Bass Boost', 'Dobrável', 'Esportivo']
    };
    
    // Atualizar produtos com tags baseadas em suas categorias
    for (const [categorySlug, tags] of Object.entries(tagsByCategory)) {
      console.log(`📌 Adicionando tags para categoria: ${categorySlug}`);
      
      // Buscar produtos da categoria
      const products = await db.query(`
        SELECT p.id, p.name 
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE c.slug = $1
      `, categorySlug);
      
      // Atualizar cada produto com tags aleatórias
      for (const product of products) {
        // Selecionar 3-5 tags aleatórias
        const numTags = Math.floor(Math.random() * 3) + 3;
        const selectedTags = [...tags].sort(() => 0.5 - Math.random()).slice(0, numTags);
        
        // Tags específicas baseadas no nome do produto
        if (product.name.toLowerCase().includes('pro')) selectedTags.push('Premium');
        if (product.name.toLowerCase().includes('plus')) selectedTags.push('Versão Plus');
        if (product.name.toLowerCase().includes('ultra')) selectedTags.push('Ultra Performance');
        if (product.name.toLowerCase().includes('mini')) selectedTags.push('Compacto');
        if (product.name.toLowerCase().includes('max')) selectedTags.push('Tela Grande');
        
        await db.query(`
          UPDATE products 
          SET tags = $1
          WHERE id = $2
        `, [...new Set(selectedTags)], product.id);
      }
    }
    
    // Adicionar tags gerais baseadas em características
    console.log('\n🎯 Adicionando tags baseadas em características...');
    
    // Produtos com desconto
    await db.query(`
      UPDATE products 
      SET tags = array_cat(tags, ARRAY['Oferta', 'Desconto'])
      WHERE original_price > 0 AND price < original_price
      AND NOT 'Oferta' = ANY(tags)
    `);
    
    // Produtos novos (últimos 7 dias)
    await db.query(`
      UPDATE products 
      SET tags = array_cat(tags, ARRAY['Lançamento', 'Novo'])
      WHERE created_at > NOW() - INTERVAL '7 days'
      AND NOT 'Lançamento' = ANY(tags)
    `);
    
    // Produtos mais vendidos
    await db.query(`
      UPDATE products 
      SET tags = array_cat(tags, ARRAY['Mais Vendido', 'Popular'])
      WHERE sales_count > 50
      AND NOT 'Mais Vendido' = ANY(tags)
    `);
    
    // Produtos premium (preço alto)
    await db.query(`
      UPDATE products 
      SET tags = array_cat(tags, ARRAY['Premium', 'Luxo'])
      WHERE price > 5000
      AND NOT 'Premium' = ANY(tags)
    `);
    
    // Verificar resultados
    const stats = await db.query(`
      SELECT 
        unnest(tags) as tag,
        COUNT(*) as count
      FROM products
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY tag
      ORDER BY count DESC, tag
      LIMIT 20
    `);
    
    console.log('\n📊 Tags mais populares:');
    console.table(stats);
    
    const productStats = await db.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN tags IS NOT NULL AND array_length(tags, 1) > 0 THEN 1 END) as products_with_tags,
        AVG(array_length(tags, 1)) as avg_tags_per_product
      FROM products
    `);
    
    console.log('\n📈 Estatísticas gerais:');
    console.table(productStats);
    
    console.log('\n✅ Tags populadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

populateProductTags(); 