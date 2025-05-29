#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🪞 ESPELHANDO banco local para Neon Develop...\n')

// Configurações
const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const NEON_DB_URL = process.env.DATABASE_URL

if (!NEON_DB_URL) {
  console.error('❌ DATABASE_URL não definida!')
  process.exit(1)
}

console.log('🔌 Conexões:')
console.log(`   Local: ${LOCAL_DB_URL}`)
console.log(`   Neon:  ${NEON_DB_URL.substring(0, 50)}...`)

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  // 1. Verificar se banco local existe e tem dados
  console.log('\n🔍 Verificando banco local...')
  try {
    const localTest = await localPool.query('SELECT 1')
    console.log('   ✅ Conexão local OK')
    
    const localCats = await localPool.query('SELECT COUNT(*) as count FROM categories')
    const localProds = await localPool.query('SELECT COUNT(*) as count FROM products')
    
    console.log(`   📂 Categorias locais: ${localCats.rows[0].count}`)
    console.log(`   📦 Produtos locais: ${localProds.rows[0].count}`)
    
    if (localCats.rows[0].count == 0 && localProds.rows[0].count == 0) {
      console.log('   ⚠️ Banco local está vazio, continuando mesmo assim...')
    }
    
  } catch (error) {
    console.log('   ❌ Banco local não disponível ou vazio')
    console.log('   🔄 Vamos apenas verificar o estado atual do Neon...')
  }
  
  // 2. Verificar estado atual do Neon
  console.log('\n🔍 Estado atual do Neon Develop...')
  const neonCats = await neonPool.query('SELECT COUNT(*) as count FROM categories')
  const neonProds = await neonPool.query('SELECT COUNT(*) as count FROM products')
  
  console.log(`   📂 Categorias Neon: ${neonCats.rows[0].count}`)
  console.log(`   📦 Produtos Neon: ${neonProds.rows[0].count}`)
  
  // 3. Listar categorias atuais do Neon
  console.log('\n📂 Categorias atuais no Neon:')
  const currentNeonCats = await neonPool.query('SELECT name, slug FROM categories ORDER BY name')
  currentNeonCats.rows.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.slug})`)
  })
  
  // 4. Tentar comparar com local (se disponível)
  try {
    console.log('\n📂 Categorias no banco local:')
    const localCatsDetail = await localPool.query('SELECT name, slug FROM categories ORDER BY name')
    localCatsDetail.rows.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug})`)
    })
    
    // Verificar diferenças
    const neonCatNames = new Set(currentNeonCats.rows.map(c => c.name))
    const localCatNames = new Set(localCatsDetail.rows.map(c => c.name))
    
    const onlyInNeon = [...neonCatNames].filter(name => !localCatNames.has(name))
    const onlyInLocal = [...localCatNames].filter(name => !neonCatNames.has(name))
    
    if (onlyInNeon.length > 0) {
      console.log('\n📂 Categorias APENAS no Neon:')
      onlyInNeon.forEach(name => console.log(`   - ${name}`))
    }
    
    if (onlyInLocal.length > 0) {
      console.log('\n📂 Categorias APENAS no Local:')
      onlyInLocal.forEach(name => console.log(`   - ${name}`))
    }
    
    if (onlyInNeon.length === 0 && onlyInLocal.length === 0) {
      console.log('\n✅ Categorias idênticas entre Local e Neon!')
    }
    
  } catch (error) {
    console.log('\n⚠️ Não foi possível comparar com banco local')
  }
  
  // 5. Propor ação
  console.log('\n🤔 ANÁLISE:')
  console.log('   O Neon Develop atualmente tem categorias dos produtos MongoDB')
  console.log('   Mas a API retorna categorias diferentes (Celulares, Games, etc.)')
  console.log('   Isso indica problema de conexão/cache na aplicação')
  
  console.log('\n💡 PRÓXIMOS PASSOS:')
  console.log('   1. Verificar se a aplicação realmente está conectando no Neon')
  console.log('   2. Limpar todos os caches possíveis')
  console.log('   3. Adicionar logs detalhados na conexão do banco')
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await localPool.end().catch(() => {})
  await neonPool.end().catch(() => {})
} 