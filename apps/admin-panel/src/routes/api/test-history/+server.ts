import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async () => {
  try {
    console.log('🔌 Dev: NEON - Testando inserção direta no histórico');
    const db = getDatabase();
    
    // Testar inserção direta
    const result = await db.query(`
      INSERT INTO product_history (
        product_id, user_id, user_name, user_email, action, changes, summary, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      ) RETURNING *
    `, [
      '92b2d74c-f488-44af-a196-45c87a912174', // product_id de teste
      null, // user_id
      'Teste Sistema',
      'test@sistema.com',
      'test',
      JSON.stringify({name: {old: 'Antigo', new: 'Novo', label: 'Nome'}}),
      'Teste de inserção direta'
    ]);
    
    console.log('✅ Inserção direta no histórico funcionou:', result[0]);
    
    return json({
      success: true,
      message: 'Inserção direta funcionou',
      data: result[0]
    });
    
  } catch (error) {
    console.error('❌ Erro na inserção direta:', error);
    return json({
      success: false,
      error: 'Erro na inserção direta',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 