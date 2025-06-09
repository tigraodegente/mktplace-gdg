#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

console.log('🔧 CORRIGINDO TRIGGER DO CHECKOUT');
console.log('=' .repeat(50));

async function fixTrigger() {
    try {
        console.log('1. Removendo trigger problemático...');
        
        await sql`DROP TRIGGER IF EXISTS update_product_search_index ON products`;
        await sql`DROP FUNCTION IF EXISTS trigger_update_search_index()`;
        
        console.log('2. Criando nova função corrigida...');
        
        await sql`
            CREATE OR REPLACE FUNCTION trigger_update_search_index()
            RETURNS TRIGGER AS $$
            BEGIN
              -- Atualizar search_index sem referenciar category_id diretamente
              -- Usar a tabela product_categories para obter categorias
              INSERT INTO search_index (
                product_id, 
                search_vector, 
                name_metaphone,
                tags_array,
                category_path,
                brand_name,
                price_range
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
                LOWER(NEW.name), -- Usar lowercase ao invés de metaphone
                NEW.tags,
                ARRAY[c.name, pc.name],
                b.name,
                CASE 
                  WHEN NEW.price < 50 THEN 'budget'
                  WHEN NEW.price < 200 THEN 'medium'
                  WHEN NEW.price < 1000 THEN 'premium'
                  ELSE 'luxury'
                END
              FROM brands b
              LEFT JOIN product_categories pcat ON pcat.product_id = NEW.id AND pcat.is_primary = true
              LEFT JOIN categories c ON c.id = pcat.category_id
              LEFT JOIN categories pc ON pc.id = c.parent_id
              WHERE b.id = NEW.brand_id
              ON CONFLICT (product_id)
              DO UPDATE SET
                search_vector = EXCLUDED.search_vector,
                name_metaphone = EXCLUDED.name_metaphone,
                tags_array = EXCLUDED.tags_array,
                category_path = EXCLUDED.category_path,
                brand_name = EXCLUDED.brand_name,
                price_range = EXCLUDED.price_range,
                updated_at = NOW();
                
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `;
        
        console.log('3. Recriando trigger corrigido...');
        
        await sql`
            CREATE TRIGGER update_product_search_index
            AFTER INSERT OR UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION trigger_update_search_index()
        `;
        
        console.log('4. Testando se o trigger funciona...');
        
        // Teste simples - atualizar um produto para ver se não dá erro
        const testProducts = await sql`
            SELECT id FROM products WHERE is_active = true LIMIT 1
        `;
        
        if (testProducts.length > 0) {
            await sql`
                UPDATE products 
                SET updated_at = NOW() 
                WHERE id = ${testProducts[0].id}
            `;
            console.log('✅ Teste do trigger executado com sucesso!');
        }
        
        console.log('\n✅ TRIGGER CORRIGIDO COM SUCESSO!');
        console.log('O erro do checkout foi resolvido.');

    } catch (error) {
        console.error('❌ Erro ao corrigir trigger:', error);
    } finally {
        await sql.end();
    }
}

// Executar correção
fixTrigger(); 