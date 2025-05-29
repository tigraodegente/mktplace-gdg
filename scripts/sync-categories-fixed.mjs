#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔧 SINCRONIZAÇÃO CORRIGIDA: Lidando com arrays no path\n')

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const NEON_DB_URL = process.env.DATABASE_URL

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // Buscar dados do local examinando o path especificamente
  console.log('🔍 Examinando campo path no Local...')
  const pathCheck = await localPool.query(`
    SELECT name, slug, path, array_length(path, 1) as path_length
    FROM categories 
    ORDER BY created_at 
    LIMIT 5
  `)
  
  console.log('\n📊 Análise do campo path:')
  pathCheck.rows.forEach((cat, idx) => {
    console.log(`   ${idx + 1}. ${cat.name}`)
    console.log(`      Slug: ${cat.slug}`)
    console.log(`      Path: ${JSON.stringify(cat.path)}`)
    console.log(`      Path Length: ${cat.path_length}`)
    console.log('')
  })
  
  // Limpar Neon
  console.log('🗑️ Limpando categorias do Neon...')
  await neonPool.query('DELETE FROM categories')
  
  // Copiar com correção do path
  console.log('\n📂 Copiando categorias com correção...')
  const allLocalCategories = await localPool.query(`
    SELECT id, name, slug, description, parent_id, image_url, is_active, position, path, created_at, updated_at
    FROM categories 
    ORDER BY created_at
  `)
  
  let copyCount = 0
  let errorCount = 0
  
  for (const cat of allLocalCategories.rows) {
    try {
      // Corrigir o campo path - converter para array de strings se necessário
      let cleanPath = null
      if (cat.path) {
        if (Array.isArray(cat.path)) {
          // Se já é array, manter como está
          cleanPath = cat.path
        } else if (typeof cat.path === 'string') {
          // Se é string, converter para array
          cleanPath = [cat.path]
        } else {
          // Se é objeto, tentar extrair valores
          cleanPath = Object.values(cat.path).filter(v => typeof v === 'string')
        }
      }
      
      console.log(`   Processando ${cat.name}:`)
      console.log(`      Path original: ${JSON.stringify(cat.path)}`)
      console.log(`      Path limpo: ${JSON.stringify(cleanPath)}`)
      
      await neonPool.query(`
        INSERT INTO categories (id, name, slug, description, parent_id, image_url, is_active, position, path, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        cat.id, 
        cat.name, 
        cat.slug, 
        cat.description, 
        cat.parent_id, 
        cat.image_url,
        cat.is_active !== undefined ? cat.is_active : true, 
        cat.position || 0, 
        cleanPath, 
        cat.created_at || new Date(), 
        cat.updated_at || new Date()
      ])
      
      copyCount++
      console.log(`      ✅ Copiada com sucesso`)
      
    } catch (error) {
      errorCount++
      console.log(`      ❌ Erro: ${error.message}`)
      console.log(`      Dados problemáticos:`, {
        id: cat.id,
        parent_id: cat.parent_id,
        path: cat.path
      })
    }
    console.log('')
  }
  
  console.log(`📊 RESULTADO:`)
  console.log(`   ✅ Copiadas: ${copyCount}`)
  console.log(`   ❌ Erros: ${errorCount}`)
  
  // Verificar resultado final
  if (copyCount > 0) {
    const finalCheck = await neonPool.query('SELECT name, slug, is_active FROM categories ORDER BY name')
    console.log(`\n📂 ${finalCheck.rows.length} categorias no Neon:`)
    finalCheck.rows.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug}) [ativo: ${cat.is_active}]`)
    })
    
    console.log('\n🎉 SUCESSO! Agora teste:')
    console.log('   curl http://localhost:5173/api/categories')
    console.log('\n   O menu mobile deve mostrar as categorias corretas!')
  }
  
} catch (error) {
  console.error('❌ Erro geral:', error.message)
  console.error(error)
} finally {
  await localPool.end().catch(() => {})
  await neonPool.end().catch(() => {})
} 