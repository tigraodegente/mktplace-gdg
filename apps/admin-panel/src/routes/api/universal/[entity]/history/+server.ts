/**
 * Universal History API
 * GET /api/universal/{entity}/history?entity_id={id}
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { auditService } from '$lib/services/auditService';

export const GET: RequestHandler = async ({ params, url, platform }) => {
  try {
    const entityType = params.entity;
    const entityId = url.searchParams.get('entity_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const page = parseInt(url.searchParams.get('page') || '1');

    if (!entityType || !entityId) {
      return json({
        success: false,
        error: 'Entity type and entity_id are required',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    const history = await auditService.getEntityHistory(
      entityType,
      entityId,
      { 
        limit, 
        offset: page > 1 ? (page - 1) * limit : offset, 
        platform 
      }
    );

    const totalPages = Math.ceil((history.length || 0) / limit);

    return json({
      success: true,
      data: history,
      meta: {
        page,
        limit,
        total: history.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching entity history:', error);
    return json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}; 