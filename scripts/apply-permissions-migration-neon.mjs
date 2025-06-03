#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyPermissionsMigration() {
  const connector = new DatabaseConnector({ forceConnection: true });
  
  try {
    await connector.connectNeon();
    
    console.log('🚀 Aplicando migration do sistema de permissões no Neon...');
    
    // Ler arquivo SQL da migração
    const migrationPath = join(__dirname, '../schema/migrations/001_add_permissions_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Dividir em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`📝 Executando ${commands.length} comandos...`);
    
    for (let i = 0; i < commands.length; i++) {
      try {
        console.log(`🔄 Executando comando ${i + 1}/${commands.length}...`);
        await connector.queryNeon(commands[i]);
        console.log(`✅ Comando ${i + 1} executado com sucesso`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Comando ${i + 1} - Item já existe, pulando...`);
        } else {
          console.error(`❌ Erro no comando ${i + 1}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Migration aplicada com sucesso!');
    
    // Verificar resultado
    const permissionsCount = await connector.queryNeon('SELECT COUNT(*) FROM permissions');
    console.log(`📊 Total de permissões criadas: ${permissionsCount.rows[0].count}`);
    
    const rolePermissionsCount = await connector.queryNeon('SELECT COUNT(*) FROM role_permissions');
    console.log(`📊 Total de permissões por papel: ${rolePermissionsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
  } finally {
    await connector.disconnect();
  }
}

applyPermissionsMigration(); 