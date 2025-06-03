import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar categorias
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
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
      // Buscar lista simples
      const conditions = activeOnly ? 'WHERE c.is_active = true' : '';
      
      const listQuery = `
        SELECT 
          c.*,
          pc.name as parent_name,
          pc.slug as parent_slug,
          (
            SELECT COUNT(*) 
            FROM products p 
            WHERE p.category_id = c.id 
            AND p.is_active = true
          ) as product_count,
          (
            SELECT COUNT(*) 
            FROM categories sub 
            WHERE sub.parent_id = c.id
          ) as subcategory_count
        FROM categories c
        LEFT JOIN categories pc ON pc.id = c.parent_id
        ${conditions}
        ORDER BY c.position, c.name
      `;
      
      categories = await db.query(listQuery);
    }
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE c.is_active = true) as active,
        COUNT(*) FILTER (WHERE c.parent_id IS NULL) as root
      FROM categories c
    `;
    
    await db.close();
    
    // Formatar resposta
    const formatted = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.image_url,
      parentId: cat.parent_id,
      parentName: cat.parent_name,
      parentSlug: cat.parent_slug,
      position: cat.position,
      isActive: cat.is_active,
      productCount: cat.product_count || 0,
      subcategoryCount: cat.subcategory_count || 0,
      level: cat.level || 0,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at
    }));
    
    return json({
      success: true,
      data: {
        categories: tree ? buildTree(formatted) : formatted,
        stats: {
          total: stats.total || 0,
          active: stats.active || 0,
          root: stats.root || 0,
          featured: 0
        }
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
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações
    if (!data.name || !data.slug) {
      return json({
        success: false,
        error: 'Nome e slug são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar slug duplicado
    const [existing] = await db.query`
      SELECT id FROM categories WHERE slug = ${data.slug}
    `;
    
    if (existing) {
      await db.close();
      return json({
        success: false,
        error: 'Slug já existe'
      }, { status: 400 });
    }
    
    // Inserir categoria
    const [category] = await db.query`
      INSERT INTO categories (
        name, slug, description, 
        image_url, parent_id, 
        position, is_active
      ) VALUES (
        ${data.name}, ${data.slug}, ${data.description || null},
        ${data.imageUrl || null}, ${data.parentId || null},
        ${data.position || 0}, ${data.isActive !== false}
      ) RETURNING id
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: category.id,
        message: 'Categoria criada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating category:', error);
    return json({
      success: false,
      error: 'Erro ao criar categoria'
    }, { status: 500 });
  }
};

// PUT - Atualizar categoria
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID da categoria é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se não está criando loop (categoria pai é filha dela mesma)
    if (data.parentId) {
      const isDescendant = await checkIsDescendant(db, data.id, data.parentId);
      if (isDescendant) {
        await db.close();
        return json({
          success: false,
          error: 'Não é possível definir uma subcategoria como pai'
        }, { status: 400 });
      }
    }
    
    // Atualizar categoria
    await db.query`
      UPDATE categories SET
        name = ${data.name},
        slug = ${data.slug},
        description = ${data.description || null},
        image_url = ${data.imageUrl || null},
        parent_id = ${data.parentId || null},
        position = ${data.position || 0},
        is_active = ${data.isActive !== false},
        updated_at = NOW()
      WHERE id = ${data.id}
    `;
    
    await db.close();
    
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
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID da categoria é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se tem produtos
    const [productCount] = await db.query`
      SELECT COUNT(*) as count FROM products WHERE category_id = ${id}
    `;
    
    if (productCount.count > 0) {
      await db.close();
      return json({
        success: false,
        error: `Categoria possui ${productCount.count} produtos. Remova os produtos primeiro.`
      }, { status: 400 });
    }
    
    // Verificar se tem subcategorias
    const [subCount] = await db.query`
      SELECT COUNT(*) as count FROM categories WHERE parent_id = ${id}
    `;
    
    if (subCount.count > 0) {
      await db.close();
      return json({
        success: false,
        error: `Categoria possui ${subCount.count} subcategorias. Remova as subcategorias primeiro.`
      }, { status: 400 });
    }
    
    // Excluir categoria
    await db.query`DELETE FROM categories WHERE id = ${id}`;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Categoria excluída com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error deleting category:', error);
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
  const [result] = await db.query`
    WITH RECURSIVE descendants AS (
      SELECT id FROM categories WHERE id = ${parentId}
      UNION ALL
      SELECT c.id FROM categories c
      INNER JOIN descendants d ON c.parent_id = d.id
    )
    SELECT EXISTS(SELECT 1 FROM descendants WHERE id = ${childId}) as is_descendant
  `;
  
  return result.is_descendant;
} 