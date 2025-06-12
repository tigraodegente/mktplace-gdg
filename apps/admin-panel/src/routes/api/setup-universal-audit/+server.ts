import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    console.log('🔧 Configurando sistema universal de auditoria...');
    const db = getDatabase(platform);
    
    // 1. Verificar se audit_logs já existe
    const checkAuditLogs = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
    `);
    
    if (checkAuditLogs.length > 0) {
      console.log('✅ Tabela audit_logs já existe');
      
      // Verificar se tem todas as colunas necessárias
      const checkColumns = await db.query(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
        AND column_name IN ('entity_type', 'entity_id', 'action', 'changes', 'user_name', 'user_email')
      `);
      
      if (checkColumns.length < 6) {
        console.log('❌ Tabela audit_logs existe mas está incompleta. Removendo e recriando...');
        await db.query('DROP TABLE IF EXISTS audit_logs CASCADE');
      } else {
        console.log('✅ Tabela audit_logs tem todas as colunas necessárias');
        await db.close();
        return json({
          success: true,
          message: 'Sistema universal de auditoria já está configurado',
          tables_created: [],
          data_migrated: false
        });
      }
    }
    
    if (checkAuditLogs.length === 0 || checkAuditLogs.length > 0) {
      console.log('📋 Criando tabela audit_logs...');
      
      // Criar tabela audit_logs
      await db.query(`
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          
          -- Entity identification
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100) NOT NULL,
          
          -- Action details
          action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'duplicate', 'restore', 'archive')),
          
          -- Change data
          changes JSONB,
          old_values JSONB,
          new_values JSONB,
          
          -- User context
          user_id UUID,
          user_name VARCHAR(255),
          user_email VARCHAR(255),
          
          -- Request context
          ip_address INET,
          user_agent TEXT,
          session_id VARCHAR(255),
          
          -- Additional metadata
          metadata JSONB,
          source VARCHAR(50) DEFAULT 'admin_panel',
          
          -- Timestamps
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Criar índices
      await db.query(`
        CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
        CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
        CREATE INDEX idx_audit_action ON audit_logs(action);
        CREATE INDEX idx_audit_entity_date ON audit_logs(entity_type, entity_id, created_at DESC);
      `);
      
      console.log('✅ Tabela audit_logs criada com índices');
    }
    
    // 2. Verificar se entity_configs já existe
    const checkEntityConfigs = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'entity_configs'
    `);
    
    if (checkEntityConfigs.length === 0) {
      console.log('📋 Criando tabela entity_configs...');
      
      await db.query(`
        CREATE TABLE entity_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type VARCHAR(50) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          display_name_plural VARCHAR(100) NOT NULL,
          api_endpoint VARCHAR(200) NOT NULL,
          table_name VARCHAR(100) NOT NULL,
          primary_key VARCHAR(50) DEFAULT 'id',
          features JSONB DEFAULT '{}',
          duplication_config JSONB,
          field_mappings JSONB DEFAULT '{}',
          ui_config JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Inserir configurações iniciais
      await db.query(`
        INSERT INTO entity_configs (entity_type, display_name, display_name_plural, api_endpoint, table_name, features, duplication_config) VALUES 
        ('products', 'Produto', 'Produtos', '/api/products', 'products', 
         '{"history": true, "duplicate": true, "archive": true, "export": true}',
         '{"exclude_fields": ["id", "created_at", "updated_at"], "transform_fields": {"name": "{name} - Cópia", "sku": "{sku}-COPY-{timestamp}"}}'),
        
        ('banners', 'Banner', 'Banners', '/api/banners', 'banners',
         '{"history": true, "duplicate": true, "archive": true}',
         '{"exclude_fields": ["id", "created_at", "updated_at"], "transform_fields": {"title": "{title} - Cópia"}}'),
        
        ('users', 'Usuário', 'Usuários', '/api/users', 'users',
         '{"history": true, "archive": true}',
         '{"exclude_fields": ["id", "password", "created_at", "updated_at", "email"], "transform_fields": {"email": "{email}.copy"}}')
      `);
      
      console.log('✅ Tabela entity_configs criada com dados iniciais');
    } else {
      console.log('✅ Tabela entity_configs já existe');
    }
    
    // 3. Migrar dados existentes de product_history para audit_logs
    const checkProductHistory = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_history'
    `);
    
    let dataMigrated = false;
    if (checkProductHistory.length > 0) {
      console.log('📋 Migrando dados de product_history para audit_logs...');
      
      try {
        const result = await db.query(`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, changes, user_name, user_email, created_at
          )
          SELECT 
            'products' as entity_type,
            product_id::text as entity_id,
            action,
            changes,
            user_name,
            user_email,
            created_at
          FROM product_history
          WHERE NOT EXISTS (
            SELECT 1 FROM audit_logs al 
            WHERE al.entity_type = 'products' 
            AND al.entity_id = product_history.product_id::text
            AND al.created_at = product_history.created_at
          )
        `);
        
        console.log(`✅ Dados migrados de product_history para audit_logs`);
        dataMigrated = true;
      } catch (error) {
        console.log('⚠️ Erro ao migrar dados (provavelmente já migrados):', error);
      }
    }
    
    await db.close();
    
    console.log('🎉 Sistema universal de auditoria configurado com sucesso!');
    
    return json({
      success: true,
      message: 'Sistema universal de auditoria configurado com sucesso',
      tables_created: ['audit_logs', 'entity_configs'],
      data_migrated: dataMigrated
    });
    
  } catch (error) {
    console.error('❌ Erro ao configurar sistema universal:', error);
    return json({
      success: false,
      error: 'Erro ao configurar sistema universal de auditoria',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 