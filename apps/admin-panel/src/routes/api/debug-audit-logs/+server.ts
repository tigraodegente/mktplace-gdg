import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const db = getDatabase(platform);
    
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Buscar registros da tabela audit_logs
    const auditLogs = await db.query(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT $1
    `, [limit]);
    
    // Contar total de registros
    const totalResult = await db.query('SELECT COUNT(*) as total FROM audit_logs');
    const total = totalResult[0]?.total || 0;
    
    await db.close();
    
    return json({
      success: true,
      data: auditLogs,
      meta: {
        total: parseInt(total),
        limit,
        showing: auditLogs.length
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar audit_logs:', error);
    return json({
      success: false,
      error: 'Erro ao buscar audit_logs',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 