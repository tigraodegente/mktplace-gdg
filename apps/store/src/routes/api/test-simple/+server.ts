import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    // Teste simples sem banco
    return json({
      status: 'ok',
      environment: platform?.env ? 'production' : 'development',
      hasHyperdrive: !!platform?.env?.HYPERDRIVE_DB,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}; 