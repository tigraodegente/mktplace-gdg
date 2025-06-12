/**
 * Universal History Export API
 * GET /api/universal/{entity}/history/export?entity_id={id}&format={csv|json}
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { universalCrudService } from '$lib/services/universalCrudService';

export const GET: RequestHandler = async ({ params, url, platform }) => {
  try {
    const entityType = params.entity;
    const entityId = url.searchParams.get('entity_id');
    const format = url.searchParams.get('format') || 'csv';

    if (!entityType || !entityId) {
      return json({
        success: false,
        error: 'Entity type and entity_id are required',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    if (!['csv', 'json'].includes(format)) {
      return json({
        success: false,
        error: 'Format must be csv or json',
        code: 'INVALID_FORMAT'
      }, { status: 400 });
    }

    const exportData = await universalCrudService.exportEntityHistory(
      entityType,
      entityId,
      platform
    );

    const filename = `${entityType}_${entityId}_history.${format}`;

    // Return as file download
    return new Response(exportData, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error exporting entity history:', error);
    return json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}; 