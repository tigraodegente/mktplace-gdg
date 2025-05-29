import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

export const GET = async ({ platform }: { platform?: any }) => {
  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL?.substring(0, 50) + '...',
      platform: !!platform,
      env: !!(platform as any)?.env
    };
    
    const result = await withDatabase(platform, async (db) => {
      // Test basic connection
      const connectionTest = await db.query`SELECT 1 as test`;
      debugInfo.connectionTest = connectionTest[0]?.test === 1 ? 'OK' : 'FAILED';
      
      // Count categories
      const categoryCount = await db.query`SELECT COUNT(*) as total FROM categories`;
      debugInfo.totalCategories = categoryCount[0]?.total;
      
      // Get all categories
      const allCategories = await db.query`
        SELECT id, name, slug, is_active, created_at 
        FROM categories 
        ORDER BY created_at DESC
      `;
      debugInfo.categories = allCategories.map((cat: any) => ({
        name: cat.name,
        slug: cat.slug,
        active: cat.is_active,
        created: cat.created_at
      }));
      
      // Count products
      const productCount = await db.query`SELECT COUNT(*) as total FROM products`;
      debugInfo.totalProducts = productCount[0]?.total;
      
      return debugInfo;
    });
    
    return json({
      success: true,
      debug: result
    });
    
  } catch (error) {
    console.error('[Debug DB] Error:', error);
    
    return json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}; 