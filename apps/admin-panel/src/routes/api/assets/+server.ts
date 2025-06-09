import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const fileType = url.searchParams.get('fileType') || '';
    const offset = (page - 1) * limit;

    let conditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(filename ILIKE $${paramIndex} OR alt_text ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (fileType) {
      conditions.push(`file_type = $${paramIndex}`);
      params.push(fileType);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Buscar total de registros
    const totalResult = await db.query(`SELECT COUNT(*) as total FROM page_assets ${whereClause}`, ...params);
    const total = parseInt(totalResult[0].total);

    // Buscar assets com paginação
    const assets = await db.query(`
      SELECT * FROM page_assets 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...params, limit, offset);

    await db.close();

    return json({
      success: true,
      data: assets.map((asset: any) => ({
        ...asset,
        tags: typeof asset.tags === 'string' ? JSON.parse(asset.tags) : asset.tags,
        metadata: typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar assets:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar assets' }
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return json({
        success: false,
        error: { message: 'Nenhum arquivo foi enviado' }
      }, { status: 400 });
    }

    const uploadedAssets = [];

    for (const file of files) {
      // Simulação de upload - em produção seria para AWS S3/Cloudflare R2
      const fileId = crypto.randomUUID();
      const filename = `${Date.now()}-${file.name}`;
      const url = `/uploads/${filename}`; // Seria a URL real do CDN

      const [asset] = await db.query`
        INSERT INTO page_assets (
          filename, original_filename, file_type, file_size,
          mime_type, url, width, height
        ) VALUES (
          ${filename}, ${file.name}, ${file.type.split('/')[0]},
          ${file.size}, ${file.type}, ${url}, 
          ${file.type.startsWith('image/') ? 1920 : null},
          ${file.type.startsWith('image/') ? 1080 : null}
        ) RETURNING *
      `;

      uploadedAssets.push({
        ...asset,
        tags: [],
        metadata: {}
      });
    }

    await db.close();

    return json({
      success: true,
      data: uploadedAssets
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return json({
      success: false,
      error: { message: 'Erro ao fazer upload dos arquivos' }
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    const ids = url.searchParams.get('ids')?.split(',') || [];

    if (!ids.length) {
      return json({
        success: false,
        error: { message: 'Nenhum ID fornecido' }
      }, { status: 400 });
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    await db.query(`DELETE FROM page_assets WHERE id IN (${placeholders})`, ...ids);

    await db.close();

    return json({
      success: true,
      data: { deletedCount: ids.length }
    });

  } catch (error) {
    console.error('Erro ao deletar assets:', error);
    return json({
      success: false,
      error: { message: 'Erro ao deletar assets' }
    }, { status: 500 });
  }
}; 