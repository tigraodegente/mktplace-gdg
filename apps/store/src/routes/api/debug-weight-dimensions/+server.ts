import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const action = url.searchParams.get('action') || 'check';
    
    const result = await withDatabase(platform, async (db) => {
      
      if (action === 'check') {
        // Verificar dados existentes
        const stats = await db.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(weight) as com_peso,
            COUNT(height) as com_altura,
            COUNT(width) as com_largura,
            COUNT(length) as com_comprimento,
            AVG(weight) as peso_medio,
            AVG(height) as altura_media,
            AVG(width) as largura_media,
            AVG(length) as comprimento_medio
          FROM products 
          WHERE is_active = true
        `);
        
        const samples = await db.query(`
          SELECT 
            name, weight, height, width, length 
          FROM products 
          WHERE is_active = true 
          ORDER BY created_at DESC 
          LIMIT 10
        `);
        
        return {
          stats: stats[0],
          samples: samples,
          message: 'Dados verificados com sucesso'
        };
        
      } else if (action === 'update') {
        // Atualizar produtos sem peso/dimensões com valores padrão
        const updateResult = await db.query(`
          UPDATE products SET
            weight = CASE 
              WHEN weight IS NULL THEN 0.5 
              ELSE weight 
            END,
            height = CASE 
              WHEN height IS NULL THEN 10 
              ELSE height 
            END,
            width = CASE 
              WHEN width IS NULL THEN 10 
              ELSE width 
            END,
            length = CASE 
              WHEN length IS NULL THEN 15 
              ELSE length 
            END,
            updated_at = NOW()
          WHERE is_active = true
            AND (weight IS NULL OR height IS NULL OR width IS NULL OR length IS NULL)
          RETURNING id, name, weight, height, width, length
        `);
        
        return {
          updated: updateResult.length,
          products: updateResult.slice(0, 10), // Mostrar apenas 10 exemplos
          message: `${updateResult.length} produtos atualizados com peso/dimensões padrão`
        };
        
      } else {
        throw new Error('Action inválida. Use: check ou update');
      }
    });
    
    return json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('Erro ao verificar peso/dimensões:', error);
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Erro: ${error?.message || 'Erro desconhecido'}`
      }
    }, { status: 500 });
  }
}; 