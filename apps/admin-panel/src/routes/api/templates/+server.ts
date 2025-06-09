import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    const search = url.searchParams.get('search') || '';
    const isActive = url.searchParams.get('isActive');

    let conditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== null) {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const query = `
      SELECT * FROM page_templates 
      ${whereClause}
      ORDER BY is_system DESC, display_name ASC
    `;

    const templates = await db.query(query, ...params);
    await db.close();

    return json({
      success: true,
      data: templates.map((template: any) => ({
        ...template,
        templateData: typeof template.template_data === 'string' 
          ? JSON.parse(template.template_data) 
          : template.template_data,
        defaultBlocks: typeof template.default_blocks === 'string'
          ? JSON.parse(template.default_blocks)
          : template.default_blocks
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar templates' }
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    const [template] = await db.query`
      INSERT INTO page_templates (
        name, display_name, description, preview_image,
        template_data, default_blocks, is_active
      ) VALUES (
        ${data.name}, ${data.displayName}, ${data.description}, 
        ${data.previewImage || null}, ${JSON.stringify(data.templateData)},
        ${JSON.stringify(data.defaultBlocks || [])}, ${data.isActive ?? true}
      ) RETURNING *
    `;

    await db.close();

    return json({
      success: true,
      data: {
        ...template,
        templateData: typeof template.template_data === 'string' 
          ? JSON.parse(template.template_data) 
          : template.template_data,
        defaultBlocks: typeof template.default_blocks === 'string'
          ? JSON.parse(template.default_blocks)
          : template.default_blocks
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar template:', error);
    return json({
      success: false,
      error: { message: 'Erro ao criar template' }
    }, { status: 500 });
  }
}; 