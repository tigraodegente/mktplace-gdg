#!/usr/bin/env node

/**
 * Script simples para configurar autenticação
 * Cria usuário admin diretamente no PostgreSQL
 */

import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const JWT_SECRET = process.env.JWT_SECRET || '4ce58f06bf47d72a061bf67c7d3304e998bf0d27c292dfbbe37dcc56c305aba88adf7b26dc22523401f51e3401a35dd9947be810af0cf62b2e24f11b4551c4c3';

async function setupDatabase() {
  console.log('🚀 CONFIGURAÇÃO RÁPIDA DO SISTEMA DE AUTENTICAÇÃO');
  console.log('================================================\n');

  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    console.log('🗄️  Criando tabelas necessárias...');
    
    // Criar tabela de usuários se não existir
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login_at TIMESTAMP
      )
    `;

    // Criar tabela de sessões se não existir
    await sql`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Criar índices
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
    
    console.log('✅ Tabelas criadas com sucesso!');

    console.log('\n👤 Criando usuário administrador...');
    
    const adminEmail = 'admin@mktplace.com';
    const adminPassword = 'admin123456';
    const adminName = 'Administrador';
    
    // Verificar se já existe
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${adminEmail}
    `;

    if (existingUser.length > 0) {
      console.log('ℹ️  Usuário administrador já existe.');
    } else {
      // Hash da senha
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      
      // Criar usuário
      const user = await sql`
        INSERT INTO users (email, name, password_hash, role, is_active, email_verified)
        VALUES (${adminEmail}, ${adminName}, ${passwordHash}, 'super_admin', true, true)
        RETURNING id, email, name, role
      `;

      console.log('✅ Usuário administrador criado com sucesso!');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Senha: ${adminPassword}`);
      console.log(`   Role: super_admin`);
      console.log(`   ID: ${user[0].id}`);
    }

    console.log('\n🔐 Configurações de autenticação:');
    console.log(`   JWT_SECRET: ${JWT_SECRET.substring(0, 20)}...`);
    console.log(`   DATABASE_URL: Conectado com sucesso`);

    console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('=====================================');
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse: http://localhost:5174/login');
    console.log(`2. Email: ${adminEmail}`);
    console.log(`3. Senha: ${adminPassword}`);
    console.log('4. ⚠️  ALTERE A SENHA após o primeiro login!');

  } catch (error) {
    console.error('❌ Erro durante configuração:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setupDatabase(); 