#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs';

async function checkPermissions() {
  const connector = new DatabaseConnector({ forceConnection: true });
  
  try {
    await connector.connectNeon();
    
    console.log('🔍 Verificando tabelas de permissões...\n');
    
    // Verificar se existe a tabela permissions
    const permissionsExists = await connector.queryNeon(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissions'
      );
    `);
    
    console.log('📋 Tabela permissions existe:', permissionsExists.rows[0].exists);
    
    if (permissionsExists.rows[0].exists) {
      // Contar permissões
      const permissionsCount = await connector.queryNeon('SELECT COUNT(*) FROM permissions');
      console.log('📊 Total de permissões:', permissionsCount.rows[0].count);
      
      // Listar algumas permissões
      const somePermissions = await connector.queryNeon('SELECT name, description, category FROM permissions LIMIT 10');
      console.log('\n🔑 Primeiras 10 permissões:');
      somePermissions.rows.forEach(p => {
        console.log(`   ${p.name} (${p.category}) - ${p.description}`);
      });
    }
    
    // Verificar se existe a tabela role_permissions
    const rolePermissionsExists = await connector.queryNeon(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissions'
      );
    `);
    
    console.log('\n📋 Tabela role_permissions existe:', rolePermissionsExists.rows[0].exists);
    
    if (rolePermissionsExists.rows[0].exists) {
      const rolePermissionsCount = await connector.queryNeon('SELECT COUNT(*) FROM role_permissions');
      console.log('📊 Total de permissões por papel:', rolePermissionsCount.rows[0].count);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connector.disconnect();
  }
}

checkPermissions(); 