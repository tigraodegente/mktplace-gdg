import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async () => {
  try {
    console.log('🔌 Dev: NEON - Verificando/criando tabela product_history');
    const db = getDatabase();
    
    // Verificar se a tabela existe
    const checkTable = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_history'
    `);
    
    if (checkTable.length > 0) {
      console.log('✅ Tabela product_history já existe');
      return json({
        success: true,
        message: 'Tabela product_history já existe',
        existed: true
      });
    }
    
    // Criar a tabela
    await db.query(`
      CREATE TABLE product_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        user_id UUID,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        changes JSONB,
        summary TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Criar índices para performance
    await db.query(`
      CREATE INDEX idx_product_history_product_id ON product_history(product_id);
      CREATE INDEX idx_product_history_created_at ON product_history(created_at DESC);
      CREATE INDEX idx_product_history_action ON product_history(action);
    `);
    
    console.log('✅ Tabela product_history criada com sucesso');
    
    return json({
      success: true,
      message: 'Tabela product_history criada com sucesso',
      created: true
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela product_history:', error);
    return json({
      success: false,
      error: 'Erro ao criar tabela product_history',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 