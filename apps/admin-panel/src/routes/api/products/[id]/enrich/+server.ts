import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index';

export const POST: RequestHandler = async ({ params, request, platform }) => {
    try {
        const { id } = params;
        const body = await request.json();
        
        // Buscar produto no banco
        const db = getDatabase(platform);
        const product = await db.query`
            SELECT * FROM products WHERE id = ${id}
        `;
        
        if (!product || product.length === 0) {
            return json({ success: false, error: 'Produto não encontrado' }, { status: 404 });
        }
        
        const productData = product[0];
        
        // Enriquecer produto usando o serviço AI existente
        const response = await fetch('/api/ai/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'enrich_all',
                currentData: productData,
                category: productData.category_name,
                ...body
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            return json({ success: false, error: errorData.error || 'Erro no serviço de IA' }, { status: response.status });
        }
        
        const enrichedResult = await response.json();
        
        if (enrichedResult.success && enrichedResult.data) {
            // Atualizar produto no banco com dados enriquecidos
            const enrichedData = enrichedResult.data;
            
            // 1. Primeiro, lidar com categoria separadamente
            if (enrichedData.category_suggestion?.primary_category_id) {
                try {
                    // Verificar se já existe relacionamento de categoria
                    const existingCategory = await db.query`
                        SELECT id FROM product_categories WHERE product_id = ${id}
                    `;

                    if (existingCategory.length > 0) {
                        // Atualizar categoria existente
                        await db.query`
                            UPDATE product_categories 
                            SET category_id = ${enrichedData.category_suggestion.primary_category_id}, 
                                is_primary = true
                            WHERE product_id = ${id}
                        `;
                    } else {
                        // Inserir nova categoria
                        await db.query`
                            INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
                            VALUES (${id}, ${enrichedData.category_suggestion.primary_category_id}, true, NOW())
                        `;
                    }
                    console.log(`✅ Categoria atualizada: ${enrichedData.category_suggestion.primary_category_id}`);
                } catch (categoryError) {
                    console.log(`⚠️ Erro ao atualizar categoria: ${categoryError.message}`);
                }
            }
            
            // 2. Atualizar campos da tabela products (SEM category_id)
            const updateQuery = `
                UPDATE products SET
                    name = COALESCE($1, name),
                    slug = COALESCE($2, slug),
                    sku = COALESCE($3, sku),
                    description = COALESCE($4, description),
                    short_description = COALESCE($5, short_description),
                    model = COALESCE($6, model),
                    barcode = COALESCE($7, barcode),
                    price = COALESCE($8, price),
                    cost = COALESCE($9, cost),
                    weight = COALESCE($10, weight),
                    height = COALESCE($11, height),
                    width = COALESCE($12, width),
                    length = COALESCE($13, length),
                    tags = COALESCE($14, tags),
                    meta_title = COALESCE($15, meta_title),
                    meta_description = COALESCE($16, meta_description),
                    meta_keywords = COALESCE($17, meta_keywords),
                    specifications = COALESCE($18, specifications),
                    attributes = COALESCE($19, attributes),
                    brand_id = COALESCE($20, brand_id),
                    care_instructions = COALESCE($21, care_instructions),
                    warranty_period = COALESCE($22, warranty_period),
                    manufacturing_country = COALESCE($23, manufacturing_country),
                    updated_at = NOW()
                WHERE id = $24
                RETURNING *
            `;
            
            const updatedProduct = await db.query(updateQuery, [
                enrichedData.enhanced_name || enrichedData.name,
                enrichedData.slug,
                enrichedData.sku,
                enrichedData.description,
                enrichedData.short_description,
                enrichedData.model,
                enrichedData.barcode,
                enrichedData.price ? parseFloat(enrichedData.price) : null,
                enrichedData.cost ? parseFloat(enrichedData.cost) : null,
                enrichedData.weight ? parseFloat(enrichedData.weight) : null,
                enrichedData.dimensions?.height ? parseFloat(enrichedData.dimensions.height) : null,
                enrichedData.dimensions?.width ? parseFloat(enrichedData.dimensions.width) : null,
                enrichedData.dimensions?.length ? parseFloat(enrichedData.dimensions.length) : null,
                enrichedData.tags ? JSON.stringify(enrichedData.tags) : null,
                enrichedData.meta_title,
                enrichedData.meta_description,
                enrichedData.meta_keywords ? JSON.stringify(enrichedData.meta_keywords) : null,
                enrichedData.suggested_specifications ? JSON.stringify(enrichedData.suggested_specifications) : null,
                enrichedData.suggested_attributes ? JSON.stringify(enrichedData.suggested_attributes) : null,
                enrichedData.brand_suggestion?.brand_id,
                enrichedData.care_instructions,
                enrichedData.warranty_period,
                enrichedData.manufacturing_country,
                id
            ]);
            
            await db.close();
            
            return json({
                success: true,
                message: 'Produto enriquecido com sucesso',
                data: updatedProduct[0],
                enrichmentData: enrichedData
            });
        } else {
            await db.close();
            return json({ success: false, error: 'Erro ao enriquecer produto' }, { status: 500 });
        }
        
    } catch (error) {
        console.error('Erro no enriquecimento do produto:', error);
        return json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        }, { status: 500 });
    }
}; 