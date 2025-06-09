import { json } from '@sveltejs/kit';
import { Database } from '$lib/db/database';

export async function POST() {
  const db = new Database(process.env.DATABASE_URL!);
  
  try {
    console.log('🔧 Iniciando correção do trigger...');
    
    // 1. Remover trigger antigo
    await db.query(`DROP TRIGGER IF EXISTS update_product_search_index ON products;`);
    await db.query(`DROP FUNCTION IF EXISTS trigger_update_search_index();`);
    
    console.log('🗑️ Trigger antigo removido');
    
    // 2. Criar nova função que funciona com many-to-many
    await db.query(`
      CREATE OR REPLACE FUNCTION trigger_update_search_index()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Deletar entrada existente
        DELETE FROM search_index WHERE product_id = NEW.id;
        
        -- Inserir nova entrada
        INSERT INTO search_index (
          product_id, search_vector, name_metaphone, tags_array, 
          category_path, brand_name, price_range
        )
        SELECT 
          NEW.id,
          to_tsvector('portuguese', 
            COALESCE(NEW.name, '') || ' ' || 
            COALESCE(NEW.description, '') || ' ' || 
            COALESCE(b.name, '') || ' ' ||
            COALESCE(c.name, '') || ' ' ||
            COALESCE(array_to_string(NEW.tags, ' '), '')
          ),
          LOWER(NEW.name),
          NEW.tags,
          ARRAY[c.name, pc.name],
          b.name,
          CASE 
            WHEN NEW.price < 50 THEN 'budget'
            WHEN NEW.price < 200 THEN 'medium'
            WHEN NEW.price < 1000 THEN 'premium'
            ELSE 'luxury'
          END
        FROM product_categories pcat
        LEFT JOIN categories c ON c.id = pcat.category_id
        LEFT JOIN categories pc ON pc.id = c.parent_id
        LEFT JOIN brands b ON b.id = NEW.brand_id
        WHERE pcat.product_id = NEW.id AND pcat.is_primary = true
        LIMIT 1;
        
        -- Fallback se não encontrou categoria primária
        IF NOT FOUND THEN
          INSERT INTO search_index (
            product_id, search_vector, name_metaphone, tags_array, 
            category_path, brand_name, price_range
          )
          SELECT 
            NEW.id,
            to_tsvector('portuguese', 
              COALESCE(NEW.name, '') || ' ' || 
              COALESCE(NEW.description, '') || ' ' || 
              COALESCE(b.name, '') || ' ' ||
              COALESCE(array_to_string(NEW.tags, ' '), '')
            ),
            LOWER(NEW.name),
            NEW.tags,
            ARRAY[]::text[],
            b.name,
            CASE 
              WHEN NEW.price < 50 THEN 'budget'
              WHEN NEW.price < 200 THEN 'medium'
              WHEN NEW.price < 1000 THEN 'premium'
              ELSE 'luxury'
            END
          FROM brands b WHERE b.id = NEW.brand_id;
        END IF;
          
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('🔧 Nova função criada');
    
    // 3. Recriar trigger
    await db.query(`
      CREATE TRIGGER update_product_search_index
          AFTER INSERT OR UPDATE ON products
          FOR EACH ROW
          EXECUTE FUNCTION trigger_update_search_index();
    `);
    
    console.log('✅ Trigger recriado com sucesso!');
    
    return json({
      success: true,
      message: 'Trigger corrigido com sucesso! Agora você pode salvar produtos normalmente.'
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir trigger:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 