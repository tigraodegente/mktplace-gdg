import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';

// GET - Listar categorias
export const GET: RequestHandler = async ({ url }) => {
  try {
    console.log('🔌 Dev: NEON - Buscando categorias');
    const db = getDatabase();
    
    // Parâmetros
    const tree = url.searchParams.get('tree') === 'true';
    const activeOnly = url.searchParams.get('active') !== 'false';
    
    let categories;
    
    if (tree) {
      // Buscar em formato de árvore
      const query = `
        WITH RECURSIVE category_tree AS (
          SELECT 
            id, name, slug, description, image_url,
            parent_id, position, is_active,
            created_at, updated_at,
            0 as level,
            ARRAY[id] as path
          FROM categories
          WHERE parent_id IS NULL ${activeOnly ? 'AND is_active = true' : ''}
          
          UNION ALL
          
          SELECT 
            c.id, c.name, c.slug, c.description, c.image_url,
            c.parent_id, c.position, c.is_active,
            c.created_at, c.updated_at,
            ct.level + 1,
            ct.path || c.id
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
          ${activeOnly ? 'WHERE c.is_active = true' : ''}
        )
        SELECT * FROM category_tree
        ORDER BY path, position, name
      `;
      
      categories = await db.query(query);
    } else {
      // Buscar lista simples com contagem correta de produtos
      const conditions = activeOnly ? 'WHERE c.is_active = true' : '';
      
      const listQuery = `
        SELECT 
          c.*,
          pc.name as parent_name,
          pc.slug as parent_slug,
          COALESCE(prod_count.count, 0) as product_count,
          COALESCE(sub_count.count, 0) as subcategory_count
        FROM categories c
        LEFT JOIN categories pc ON pc.id = c.parent_id
        LEFT JOIN (
          SELECT 
            pc.category_id,
            COUNT(DISTINCT p.id) as count
          FROM product_categories pc
          JOIN products p ON p.id = pc.product_id
          WHERE p.is_active = true
          GROUP BY pc.category_id
        ) prod_count ON prod_count.category_id = c.id
        LEFT JOIN (
          SELECT 
            parent_id,
            COUNT(*) as count
          FROM categories
          WHERE parent_id IS NOT NULL
          GROUP BY parent_id
        ) sub_count ON sub_count.parent_id = c.id
        ${conditions}
        ORDER BY c.position, c.name
      `;
      
      categories = await db.query(listQuery);
    }
    
    // Buscar estatísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root,
        COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as subcategories
      FROM categories
    `;
    
    const statsResult = await db.query(statsQuery);
    const stats = statsResult[0];
    
    console.log('✅ Categorias encontradas:', categories.length);
    console.log('✅ Estatísticas:', stats);
    
    // Formatar resposta compatível com AdminPageTemplate
    const formatted = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image_url: cat.image_url,
      icon: cat.icon,
      parent_id: cat.parent_id,
      parent_name: cat.parent_name,
      parent_slug: cat.parent_slug,
      position: cat.position || 0,
      is_active: cat.is_active,
      product_count: parseInt(cat.product_count) || 0,
      subcategory_count: parseInt(cat.subcategory_count) || 0,
      level: cat.level || 0,
      created_at: cat.created_at,
      updated_at: cat.updated_at
    }));
    
    return json({
      success: true,
      data: tree ? buildTree(formatted) : formatted,
      meta: {
        total: formatted.length,
        page: 1,
        pageSize: formatted.length
      },
      stats: {
        total_categories: parseInt(stats.total) || 0,
        active_categories: parseInt(stats.active) || 0,
        inactive_categories: (parseInt(stats.total) || 0) - (parseInt(stats.active) || 0),
        without_products: formatted.filter(c => c.product_count === 0).length,
        root_categories: parseInt(stats.root) || 0,
        subcategories: parseInt(stats.subcategories) || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    return json({
      success: false,
      error: 'Erro ao buscar categorias'
    }, { status: 500 });
  }
};

// POST - Criar categoria
export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('🔌 Dev: NEON - Criando categoria');
    const db = getDatabase();
    const data = await request.json();
    
    // Validações
    if (!data.name || !data.slug) {
      return json({
        success: false,
        error: 'Nome e slug são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar slug duplicado
    const existingQuery = 'SELECT id FROM categories WHERE slug = $1';
    const existing = await db.query(existingQuery, [data.slug]);
    
    if (existing.length > 0) {
      return json({
        success: false,
        error: 'Slug já existe'
      }, { status: 400 });
    }
    
    // Inserir categoria
    const insertQuery = `
      INSERT INTO categories (
        name, slug, description, 
        image_url, parent_id, 
        position, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const result = await db.query(insertQuery, [
      data.name,
      data.slug, 
      data.description || null,
      data.image_url || null,
      data.parent_id || null,
      data.position || 0,
      data.is_active !== false
    ]);
    
    console.log('✅ Categoria criada:', result[0].id);
    
    return json({
      success: true,
      data: {
        id: result[0].id,
        message: 'Categoria criada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar categoria:', error);
    return json({
      success: false,
      error: 'Erro ao criar categoria'
    }, { status: 500 });
  }
};

// PUT - Atualizar categoria
export const PUT: RequestHandler = async ({ request }) => {
  try {
    console.log('🔌 Dev: NEON - Atualizando categoria');
    const db = getDatabase();
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID da categoria é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se não está criando loop (categoria pai é filha dela mesma)
    if (data.parent_id) {
      const isDescendant = await checkIsDescendant(db, data.id, data.parent_id);
      if (isDescendant) {
        return json({
          success: false,
          error: 'Não é possível definir uma subcategoria como pai'
        }, { status: 400 });
      }
    }
    
    // Atualizar categoria
    const updateQuery = `
      UPDATE categories SET
        name = $1,
        slug = $2,
        description = $3,
        image_url = $4,
        parent_id = $5,
        position = $6,
        is_active = $7,
        updated_at = NOW()
      WHERE id = $8
    `;
    
    await db.query(updateQuery, [
      data.name,
      data.slug,
      data.description || null,
      data.image_url || null,
      data.parent_id || null,
      data.position || 0,
      data.is_active !== false,
      data.id
    ]);
    
    console.log('✅ Categoria atualizada:', data.id);
    
    return json({
      success: true,
      data: {
        message: 'Categoria atualizada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating category:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar categoria'
    }, { status: 500 });
  }
};

// DELETE - Excluir categoria
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    console.log('🔌 Dev: NEON - Excluindo categoria');
    const db = getDatabase();
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID da categoria é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se tem produtos via product_categories
    const productQuery = 'SELECT COUNT(*) as count FROM product_categories WHERE category_id = $1';
    const productResult = await db.query(productQuery, [id]);
    const productCount = parseInt(productResult[0]?.count || '0');
    
    if (productCount > 0) {
      return json({
        success: false,
        error: `Categoria possui ${productCount} produtos. Remova os produtos primeiro.`
      }, { status: 400 });
    }
    
    // Verificar se tem subcategorias
    const subQuery = 'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1';
    const subResult = await db.query(subQuery, [id]);
    const subCount = parseInt(subResult[0]?.count || '0');
    
    if (subCount > 0) {
      return json({
        success: false,
        error: `Categoria possui ${subCount} subcategorias. Remova as subcategorias primeiro.`
      }, { status: 400 });
    }
    
    // Excluir categoria
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    
    console.log('✅ Categoria excluída:', id);
    
    return json({
      success: true,
      data: {
        message: 'Categoria excluída com sucesso'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir categoria:', error);
    return json({
      success: false,
      error: 'Erro ao excluir categoria'
    }, { status: 500 });
  }
};

// Funções auxiliares
function buildTree(categories: any[]): any[] {
  const map = new Map();
  const roots: any[] = [];
  
  // Criar mapa
  categories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [] });
  });
  
  // Construir árvore
  categories.forEach(cat => {
    if (cat.parentId) {
      const parent = map.get(cat.parentId);
      if (parent) {
        parent.children.push(map.get(cat.id));
      }
    } else {
      roots.push(map.get(cat.id));
    }
  });
  
  return roots;
}

async function checkIsDescendant(db: any, parentId: string, childId: string): Promise<boolean> {
  const query = `
    WITH RECURSIVE descendants AS (
      SELECT id FROM categories WHERE id = $1
      UNION ALL
      SELECT c.id FROM categories c
      INNER JOIN descendants d ON c.parent_id = d.id
    )
    SELECT EXISTS(SELECT 1 FROM descendants WHERE id = $2) as is_descendant
  `;
  
  const result = await db.query(query, [parentId, childId]);
  return result[0]?.is_descendant || false;
} 