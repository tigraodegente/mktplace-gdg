#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('🚀 Aplicando migration do sistema de permissões...');
    
    // Ler o arquivo de migration
    const migrationPath = path.join(__dirname, '../schema/migrations/001_add_permissions_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Conectar ao banco (usando postgres diretamente)
    const { default: postgres } = await import('postgres');
    
    // URL do banco (ajustar conforme sua configuração)
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
    
    const sql = postgres(databaseUrl, {
      ssl: 'require', // Neon precisa SSL
      max: 1
    });
    
    console.log('📦 Conectado ao banco de dados');
    
    // Executar migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration aplicada com sucesso!');
    console.log('');
    console.log('📊 Sistema de permissões instalado:');
    console.log('   - Tabela permissions criada');
    console.log('   - Tabela role_permissions criada'); 
    console.log('   - Permissões base inseridas');
    console.log('   - Função user_has_permission() criada');
    console.log('   - Campos adicionados na tabela users');
    console.log('');
    
    // Verificar se funcionou
    const permissionsCount = await sql`
      SELECT COUNT(*) as count FROM permissions
    `;
    
    console.log(`📈 ${permissionsCount[0].count} permissões criadas`);
    
    // Fechar conexão
    await sql.end();
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
applyMigration(); 