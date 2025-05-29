#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('📂 SINCRONIZAÇÃO SIMPLIFICADA: Apenas categorias e produtos essenciais\n')

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const NEON_DB_URL = process.env.DATABASE_URL

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('🔍 Verificando conexões...')
  await localPool.query('SELECT 1')
  await neonPool.query('SELECT 1')
  console.log('   ✅ Ambas as conexões OK')
  
  // Limpar apenas categorias
  console.log('\n🗑️ Limpando categorias do Neon...')
  await neonPool.query('DELETE FROM categories')
  console.log('   ✅ Categorias limpas')
  
  // Copiar APENAS categorias do local
  console.log('\n📂 Copiando categorias do Local...')
  const localCategories = await localPool.query('SELECT * FROM categories ORDER BY created_at')
  
  console.log(`   Encontradas ${localCategories.rows.length} categorias no Local:`)
  localCategories.rows.forEach(cat => {
    console.log(`      - ${cat.name} (${cat.slug})`)
  })
  
  for (const cat of localCategories.rows) {
    await neonPool.query(`
      INSERT INTO categories (id, name, slug, description, parent_id, image_url, is_active, position, path, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      cat.id, cat.name, cat.slug, cat.description, cat.parent_id, cat.image_url,
      cat.is_active, cat.position, cat.path, cat.created_at, cat.updated_at
    ])
  }
  console.log(`   ✅ ${localCategories.rows.length} categorias copiadas`)
  
  // Verificar resultado
  console.log('\n✅ VERIFICAÇÃO FINAL:')
  const neonCategoriesAfter = await neonPool.query('SELECT name, slug, is_active FROM categories ORDER BY name')
  
  console.log(`   📂 ${neonCategoriesAfter.rows.length} categorias no Neon:`)
  neonCategoriesAfter.rows.forEach(cat => {
    console.log(`      - ${cat.name} (${cat.slug}) [ativo: ${cat.is_active}]`)
  })
  
  // Testar a API agora
  console.log('\n🧪 TESTE PRÁTICO:')
  console.log('   Agora teste a API de categorias:')
  console.log('   curl http://localhost:5173/api/categories')
  console.log('')
  console.log('   Você deve ver as categorias do Local!')
  console.log('   Celulares, Games, Eletrônicos, etc.')
  
  console.log('\n🎉 SINCRONIZAÇÃO DE CATEGORIAS COMPLETA!')
  console.log('   O problema das categorias no menu mobile deve estar resolvido')
  
} catch (error) {
  console.error('❌ Erro:', error.message)
  console.error(error)
} finally {
  await localPool.end().catch(() => {})
  await neonPool.end().catch(() => {})
} 