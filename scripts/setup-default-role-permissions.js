#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDefaultRolePermissions() {
  try {
    console.log('🚀 Configurando permissões padrão por role...');
    
    // Conectar ao banco
    const { default: postgres } = await import('postgres');
    
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
    
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1
    });
    
    console.log('📦 Conectado ao banco de dados');
    
    // Limpar permissões existentes por role
    await sql`DELETE FROM role_permissions`;
    console.log('🧹 Permissões de roles limpas');
    
    // Permissões para ADMIN (acesso total)
    const adminPermissions = [
      // Usuários
      'users.read', 'users.write', 'users.delete', 'users.manage_permissions',
      // Produtos
      'products.read', 'products.write', 'products.delete', 'products.moderate',
      // Pedidos  
      'orders.read', 'orders.write', 'orders.cancel', 'orders.refund',
      // Vendedores
      'sellers.read', 'sellers.write', 'sellers.approve', 'sellers.suspend',
      // Catálogo
      'catalog.read', 'catalog.write', 'catalog.categories', 'catalog.brands',
      // Promoções
      'promotions.read', 'promotions.write', 'promotions.approve',
      // Relatórios
      'reports.sales', 'reports.users', 'reports.financial', 'reports.analytics',
      // Sistema
      'system.settings', 'system.maintenance', 'system.logs',
      // Financeiro
      'financial.read', 'financial.write', 'financial.reports'
    ];
    
    // Permissões para VENDOR (vendedor)
    const vendorPermissions = [
      // Produtos próprios
      'products.read', 'products.write',
      // Pedidos próprios
      'orders.read', 'orders.write',
      // Catálogo (leitura)
      'catalog.read',
      // Relatórios próprios
      'reports.sales'
    ];
    
    // Permissões para CUSTOMER (cliente)
    const customerPermissions = [
      // Produtos (leitura)
      'products.read',
      // Pedidos próprios
      'orders.read',
      // Catálogo (leitura)
      'catalog.read'
    ];
    
    // Inserir permissões para ADMIN
    for (const permission of adminPermissions) {
      try {
        await sql`
          INSERT INTO role_permissions (role, permission_id) 
          SELECT 'admin', id FROM permissions WHERE name = ${permission}
          ON CONFLICT (role, permission_id) DO NOTHING
        `;
      } catch (error) {
        console.warn(`⚠️ Erro ao inserir permissão admin ${permission}:`, error.message);
      }
    }
    console.log(`✅ ${adminPermissions.length} permissões configuradas para ADMIN`);
    
    // Inserir permissões para VENDOR
    for (const permission of vendorPermissions) {
      try {
        await sql`
          INSERT INTO role_permissions (role, permission_id) 
          SELECT 'vendor', id FROM permissions WHERE name = ${permission}
          ON CONFLICT (role, permission_id) DO NOTHING
        `;
      } catch (error) {
        console.warn(`⚠️ Erro ao inserir permissão vendor ${permission}:`, error.message);
      }
    }
    console.log(`✅ ${vendorPermissions.length} permissões configuradas para VENDOR`);
    
    // Inserir permissões para CUSTOMER
    for (const permission of customerPermissions) {
      try {
        await sql`
          INSERT INTO role_permissions (role, permission_id) 
          SELECT 'customer', id FROM permissions WHERE name = ${permission}
          ON CONFLICT (role, permission_id) DO NOTHING
        `;
      } catch (error) {
        console.warn(`⚠️ Erro ao inserir permissão customer ${permission}:`, error.message);
      }
    }
    console.log(`✅ ${customerPermissions.length} permissões configuradas para CUSTOMER`);
    
    // Verificar resultado
    const roleStats = await sql`
      SELECT 
        role,
        COUNT(*) as permissions_count
      FROM role_permissions 
      GROUP BY role
      ORDER BY role
    `;
    
    console.log('\n📊 Resumo das permissões por role:');
    roleStats.forEach(stat => {
      console.log(`   ${stat.role}: ${stat.permissions_count} permissões`);
    });
    
    await sql.end();
    
    console.log('\n✅ Permissões padrão configuradas com sucesso!');
    console.log('\n🎯 Próximos passos:');
    console.log('   1. Implementar sistema de autenticação');
    console.log('   2. Criar middleware de proteção de rotas');
    console.log('   3. Testar PermissionGate com usuário real');
    
  } catch (error) {
    console.error('❌ Erro ao configurar permissões:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
setupDefaultRolePermissions(); 