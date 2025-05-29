#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔒 SINCRONIZAÇÃO SEGURA: Categorias com validação\n')

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const NEON_DB_URL = process.env.DATABASE_URL

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('🔍 Verificando estruturas das tabelas...')
  
  // Examinar estrutura local
  const localStruct = await localPool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'categories' 
    ORDER BY ordinal_position
  `)
  
  // Examinar estrutura Neon
  const neonStruct = await neonPool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'categories' 
    ORDER BY ordinal_position
  `)
  
  console.log('\n📊 Estrutura LOCAL:')
  localStruct.rows.forEach(col => {
    console.log(`   ${col.column_name}: ${col.data_type}`)
  })
  
  console.log('\n📊 Estrutura NEON:')
  neonStruct.rows.forEach(col => {
    console.log(`   ${col.column_name}: ${col.data_type}`)
  })
  
  // Buscar dados do local com cuidado
  console.log('\n📂 Examinando dados do Local...')
  const localCategories = await localPool.query(`
    SELECT id, name, slug, description, parent_id, image_url, is_active, position, path, created_at, updated_at
    FROM categories 
    ORDER BY created_at 
    LIMIT 3
  `)
  
  console.log('\n🔍 Primeiras 3 categorias do Local (para debug):')
  localCategories.rows.forEach((cat, idx) => {
    console.log(`   ${idx + 1}. ${cat.name}`)
    console.log(`      ID: ${cat.id} (tipo: ${typeof cat.id})`)
    console.log(`      Slug: ${cat.slug}`)
    console.log(`      Parent ID: ${cat.parent_id}`)
    console.log(`      Path: ${cat.path} (tipo: ${typeof cat.path})`)
    console.log(`      Is Active: ${cat.is_active}`)
    console.log('')
  })
  
  // Limpar Neon
  console.log('🗑️ Limpando categorias do Neon...')
  await neonPool.query('DELETE FROM categories')
  
  // Copiar com validação
  console.log('\n📂 Copiando categorias com validação...')
  const allLocalCategories = await localPool.query(`
    SELECT id, name, slug, description, parent_id, image_url, is_active, position, path, created_at, updated_at
    FROM categories 
    ORDER BY created_at
  `)
  
  let copyCount = 0
  let errorCount = 0
  
  for (const cat of allLocalCategories.rows) {
    try {
      // Validar e limpar dados
      const cleanData = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parent_id: cat.parent_id,
        image_url: cat.image_url,
        is_active: cat.is_active !== undefined ? cat.is_active : true,
        position: cat.position || 0,
        path: Array.isArray(cat.path) ? cat.path : (cat.path ? [cat.path] : null),
        created_at: cat.created_at || new Date(),
        updated_at: cat.updated_at || new Date()
      }
      
      await neonPool.query(`
        INSERT INTO categories (id, name, slug, description, parent_id, image_url, is_active, position, path, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        cleanData.id, cleanData.name, cleanData.slug, cleanData.description, cleanData.parent_id, 
        cleanData.image_url, cleanData.is_active, cleanData.position, cleanData.path, 
        cleanData.created_at, cleanData.updated_at
      ])
      
      copyCount++
      console.log(`   ✅ ${cat.name} copiada`)
      
    } catch (error) {
      errorCount++
      console.log(`   ❌ Erro ao copiar ${cat.name}: ${error.message}`)
    }
  }
  
  console.log(`\n📊 RESULTADO:`)
  console.log(`   ✅ Copiadas: ${copyCount}`)
  console.log(`   ❌ Erros: ${errorCount}`)
  
  // Verificar resultado final
  const finalCheck = await neonPool.query('SELECT name, slug, is_active FROM categories ORDER BY name')
  console.log(`\n📂 ${finalCheck.rows.length} categorias no Neon após sincronização:`)
  finalCheck.rows.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.slug}) [ativo: ${cat.is_active}]`)
  })
  
  if (finalCheck.rows.length > 0) {
    console.log('\n🎉 SUCESSO! Agora teste:')
    console.log('   curl http://localhost:5173/api/categories')
    console.log('   As categorias do menu mobile devem aparecer!')
  }
  
} catch (error) {
  console.error('❌ Erro geral:', error.message)
  console.error(error)
} finally {
  await localPool.end().catch(() => {})
  await neonPool.end().catch(() => {})
} 