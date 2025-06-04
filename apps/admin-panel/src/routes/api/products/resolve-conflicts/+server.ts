import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// POST - Resolver conflitos de SKU/slug específicos
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { sku, action, model } = await request.json();
    
    if (!sku) {
      await db.close();
      return json({
        success: false,
        error: 'SKU é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar produtos com SKU ou model conflitante
    const conflictingProducts = await db.query`
      SELECT 
        id, 
        name, 
        sku, 
        model,
        slug, 
        status, 
        is_active, 
        created_at, 
        updated_at
      FROM products 
      WHERE (sku = ${sku} ${model ? `OR model = ${model}` : ''})
      ORDER BY 
        CASE WHEN status = 'archived' THEN 1 ELSE 0 END,
        created_at DESC
    `;
    
    if (conflictingProducts.length === 0) {
      await db.close();
      return json({
        success: false,
        error: 'Nenhum produto encontrado com esse SKU/model'
      }, { status: 404 });
    }
    
    console.log(`🔍 Encontrados ${conflictingProducts.length} produtos com SKU/model "${sku}/${model || 'N/A'}":`, 
                conflictingProducts.map(p => `${p.name} (${p.status})`));
    
    if (action === 'analyze') {
      // Apenas retornar análise
      await db.close();
      return json({
        success: true,
        data: {
          conflictingProducts: conflictingProducts.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            model: p.model,
            slug: p.slug,
            status: p.status,
            isActive: p.is_active,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            canDelete: p.status === 'archived'
          })),
          recommendations: generateRecommendations(conflictingProducts)
        }
      });
    } else if (action === 'resolve_archived') {
      // Resolver conflitos automaticamente: modificar SKUs de produtos arquivados
      const archivedProducts = conflictingProducts.filter(p => p.status === 'archived');
      
      if (archivedProducts.length === 0) {
        await db.close();
        return json({
          success: false,
          error: 'Nenhum produto arquivado encontrado para resolver conflito'
        }, { status: 404 });
      }
      
      const timestamp = Date.now();
      const results = [];
      
      for (const product of archivedProducts) {
        const newSku = `${product.sku}_archived_${timestamp}`;
        const newSlug = `${product.slug}-archived-${timestamp}`;
        
        await db.query`
          UPDATE products 
          SET 
            sku = ${newSku},
            slug = ${newSlug},
            updated_at = NOW()
          WHERE id = ${product.id}::uuid
        `;
        
        results.push({
          id: product.id,
          name: product.name,
          oldSku: product.sku,
          newSku: newSku,
          oldSlug: product.slug,
          newSlug: newSlug
        });
        
        console.log(`✅ SKU/slug modificados: ${product.sku} → ${newSku}`);
      }
      
      await db.close();
      return json({
        success: true,
        message: `${results.length} produto(s) arquivado(s) modificado(s) para liberar SKU/slug`,
        data: results
      });
    } else if (action === 'delete_archived') {
      // Excluir definitivamente produtos arquivados
      const archivedProducts = conflictingProducts.filter(p => p.status === 'archived');
      
      if (archivedProducts.length === 0) {
        await db.close();
        return json({
          success: false,
          error: 'Nenhum produto arquivado encontrado para excluir'
        }, { status: 404 });
      }
      
      const results = [];
      
      for (const product of archivedProducts) {
        // Remover dependências primeiro
        await db.query`DELETE FROM product_categories WHERE product_id = ${product.id}::uuid`;
        await db.query`DELETE FROM product_images WHERE product_id = ${product.id}::uuid`;
        await db.query`DELETE FROM product_related WHERE product_id = ${product.id}::uuid OR related_product_id = ${product.id}::uuid`;
        await db.query`DELETE FROM product_upsells WHERE product_id = ${product.id}::uuid OR upsell_product_id = ${product.id}::uuid`;
        await db.query`DELETE FROM product_downloads WHERE product_id = ${product.id}::uuid`;
        
        // Excluir produto
        await db.query`DELETE FROM products WHERE id = ${product.id}::uuid`;
        
        results.push({
          id: product.id,
          name: product.name,
          sku: product.sku
        });
        
        console.log(`🗑️ Produto excluído definitivamente: ${product.name} (${product.sku})`);
      }
      
      await db.close();
      return json({
        success: true,
        message: `${results.length} produto(s) arquivado(s) excluído(s) definitivamente`,
        data: results
      });
    } else {
      await db.close();
      return json({
        success: false,
        error: 'Ação inválida. Use: analyze, resolve_archived ou delete_archived'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Erro ao resolver conflitos:', error);
    return json({
      success: false,
      error: 'Erro ao resolver conflitos'
    }, { status: 500 });
  }
};

function generateRecommendations(products: any[]) {
  const activeProducts = products.filter(p => p.status !== 'archived');
  const archivedProducts = products.filter(p => p.status === 'archived');
  
  const recommendations = [];
  
  if (archivedProducts.length > 0 && activeProducts.length === 0) {
    recommendations.push({
      type: 'safe_delete',
      message: `${archivedProducts.length} produto(s) arquivado(s) podem ser excluído(s) definitivamente`,
      action: 'delete_archived'
    });
  } else if (archivedProducts.length > 0 && activeProducts.length > 0) {
    recommendations.push({
      type: 'modify_archived',
      message: `Modificar SKU/slug dos ${archivedProducts.length} produto(s) arquivado(s) para liberar conflito`,
      action: 'resolve_archived'
    });
  }
  
  if (activeProducts.length > 1) {
    recommendations.push({
      type: 'manual_review',
      message: `${activeProducts.length} produtos ativos com mesmo SKU - revisar manualmente`,
      action: 'manual'
    });
  }
  
  return recommendations;
} 