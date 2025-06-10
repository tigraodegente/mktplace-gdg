import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Verificar se a tabela existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'product_history'
      )
    `);
    
    const exists = tableExists[0]?.exists;
    
    if (!exists) {
      console.log('📋 Tabela product_history não existe, criando...');
      
      // Criar a tabela
      await db.query(`
        CREATE TABLE IF NOT EXISTS product_history (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          product_id UUID NOT NULL,
          user_id UUID,
          user_name VARCHAR(255),
          user_email VARCHAR(255),
          action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'published', 'unpublished', 'duplicated')),
          changes JSONB NOT NULL DEFAULT '{}',
          summary TEXT NOT NULL DEFAULT '',
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Criar índices
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id);
        CREATE INDEX IF NOT EXISTS idx_product_history_created_at ON product_history(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_product_history_action ON product_history(action);
        CREATE INDEX IF NOT EXISTS idx_product_history_user_id ON product_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_product_history_composite ON product_history(product_id, created_at DESC);
      `);
      
      console.log('✅ Tabela product_history criada com sucesso!');
    }
    
    // Verificar se há dados
    const count = await db.query(`
      SELECT COUNT(*) as total FROM product_history
    `);
    
    await db.close();
    
    return json({
      success: true,
      data: {
        tableExists: exists,
        totalRecords: parseInt(count[0]?.total || '0'),
        created: !exists
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar/criar tabela de histórico:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 