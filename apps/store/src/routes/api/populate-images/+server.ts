import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

// Cores para os placeholders
const colors = ['3B82F6', '10B981', 'F59E0B', 'EF4444', '8B5CF6', 'EC4899', '14B8A6', 'F97316'];

// Função para gerar URL de placeholder
function generatePlaceholderUrl(productName: string, imageIndex: number): string {
  const colorIndex = (productName.length + imageIndex) % colors.length;
  const color = colors[colorIndex];
  const text = productName.substring(0, 25).replace(/ /g, '+');
  return `https://via.placeholder.com/600x800/${color}/FFFFFF?text=${text}`;
}

export const POST: RequestHandler = async () => {
  try {
    const xata = getXataClient();
    
    // Buscar produtos sem imagens (limitado a 50 para não sobrecarregar)
    const products = await xata.db.products
      .filter({ is_active: true })
      .select(['id', 'name'])
      .getPaginated({ pagination: { size: 50 } });
    
    let imagesCreated = 0;
    const errors: string[] = [];
    
    for (const product of products.records) {
      try {
        // Verificar se o produto já tem imagens
        const existingImages = await xata.db.product_images
          .filter({ product_id: product.id })
          .getFirst();
        
        if (!existingImages) {
          // Criar 3 imagens para cada produto
          const imagePromises = [];
          
          for (let i = 1; i <= 3; i++) {
            imagePromises.push(
              xata.db.product_images.create({
                id: `img-${product.id}-${i}-${Date.now()}`,
                product_id: product.id,
                image_url: generatePlaceholderUrl(product.name, i),
                alt_text: `${product.name} - Imagem ${i}`,
                display_order: i,
                is_primary: i === 1
              })
            );
          }
          
          await Promise.all(imagePromises);
          imagesCreated += 3;
        }
      } catch (error) {
        errors.push(`Erro ao criar imagens para ${product.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    // Contar total de imagens
    const totalImages = await xata.sql<{ total: number }>`
      SELECT COUNT(*) as total FROM product_images
    `;
    
    return json({
      success: true,
      data: {
        productsProcessed: products.records.length,
        imagesCreated,
        totalImagesInDatabase: totalImages.records[0]?.total || 0,
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (error) {
    console.error('Erro ao popular imagens:', error);
    return json({
      success: false,
      error: { 
        message: 'Erro ao popular imagens',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
}; 