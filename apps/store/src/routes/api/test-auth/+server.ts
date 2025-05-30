import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ cookies, platform }) => {
  try {
    const sessionToken = cookies.get('session_id');
    console.log('🔍 Session token found:', !!sessionToken);
    
    if (!sessionToken) {
      return json({
        success: false,
        authenticated: false,
        error: 'No session token found'
      });
    }

    const authResult = await requireAuth(cookies, platform);
    console.log('👤 Auth result:', authResult.success ? authResult.user?.email : authResult.error?.message);

    return json({
      success: true,
      authenticated: authResult.success,
      user: authResult.user || null,
      sessionToken: sessionToken.substring(0, 10) + '...',
      error: authResult.error || null
    });

  } catch (error) {
    console.error('❌ Auth test error:', error);
    return json({
      success: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 