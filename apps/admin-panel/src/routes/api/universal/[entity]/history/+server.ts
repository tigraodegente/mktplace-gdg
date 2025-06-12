/**
 * Universal History API
 * GET /api/universal/{entity}/history?entity_id={id}
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { universalCrudService } from '$lib/services/universalCrudService';

export const GET: RequestHandler = async ({ params, url, platform }) => {
  try {
    const entityType = params.entity;
    const entityId = url.searchParams.get('entity_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!entityType || !entityId) {
      return json({
        success: false,
        error: 'Entity type and entity_id are required',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    const result = await universalCrudService.getEntityHistory(
      entityType,
      entityId,
      { limit, offset, platform }
    );

    return json(result);
  } catch (error) {
    console.error('Error fetching entity history:', error);
    return json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}; 