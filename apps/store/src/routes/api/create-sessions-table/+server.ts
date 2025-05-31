import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Verificar se users existe primeiro
      const userTable = await db.query`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'users' AND table_schema = 'public'
      `;
      
      if (!userTable.length) {
        throw new Error('Tabela users não encontrada');
      }
      
      // Verificar estrutura da tabela users
      const userColumns = await db.query`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public'
      `;
      
      console.log('📋 Colunas da tabela users:', userColumns.map(c => c.column_name));
      
      // Criar tabela sessions sem foreign key primeiro
      await db.execute`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          token TEXT NOT NULL UNIQUE,
          ip_address TEXT,
          user_agent TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      
      // Adicionar foreign key depois
      try {
        await db.execute`
          ALTER TABLE sessions 
          ADD CONSTRAINT fk_sessions_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `;
      } catch (e) {
        console.log('⚠️ Foreign key já existe ou erro:', e);
      }
      
      // Criar índices
      await db.execute`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
      await db.execute`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
      
      return { success: true };
    });
    
    return json({
      success: true,
      message: 'Tabela sessions criada com sucesso!'
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao criar tabela sessions:', error);
    return json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}; 