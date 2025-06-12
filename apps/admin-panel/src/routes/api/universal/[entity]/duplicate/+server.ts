/**
 * Universal Duplicate API
 * POST /api/universal/{entity}/duplicate
 * Body: { entity_id: string, overrides?: Record<string, any> }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { universalCrudService } from '$lib/services/universalCrudService';

export const POST: RequestHandler = async ({ params, request, platform }) => {
  try {
    const entityType = params.entity;
    
    if (!entityType) {
      return json({
        success: false,
        error: 'Entity type is required',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    const body = await request.json();
    const { entity_id, overrides = {} } = body;

    if (!entity_id) {
      return json({
        success: false,
        error: 'entity_id is required in request body',
        code: 'MISSING_ENTITY_ID'
      }, { status: 400 });
    }

    // Extract user context from headers for audit
    const userContext = {
      ip_address: request.headers.get('cf-connecting-ip') || 
                 request.headers.get('x-forwarded-for') || 
                 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      session_id: request.headers.get('x-session-id') || undefined
    };

    const result = await universalCrudService.duplicateEntity(
      entityType,
      entity_id,
      overrides,
      { 
        context: userContext,
        platform 
      }
    );

    if (result.success) {
      return json(result, { status: 201 });
    } else {
      return json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error duplicating entity:', error);
    return json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}; 